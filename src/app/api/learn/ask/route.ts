/**
 * 質問チケット：講義の途中で先生（エリクソン）を止めて聞く。
 *
 * 大事なのは「いまどの場面まで授業を受けているか」を先生に渡すこと。
 * まだ教えていない内容を、突然前提にして答えない。
 *
 * 2段：①答える → ②「まだ教えていない場面の内容を前提にしていないか」を別の目で確かめて、
 * 混ざっていたら直す（一撃生成にしない）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getClaude, CLAUDE_MODEL } from "@/lib/claude";
import { getEpisode } from "@/lib/learn";
import { nowLine } from "@/lib/now-line";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function text(res: any): string {
  return (res?.content ?? []).map((c: any) => (c.type === "text" ? c.text : "")).join("").trim();
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "この部屋はまだ開いていません" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const ep = getEpisode(String(b?.ep ?? ""));
  if (!ep) return NextResponse.json({ error: "その回はありません" }, { status: 404 });
  const question = String(b?.question ?? "").trim().slice(0, 600);
  if (!question) return NextResponse.json({ error: "質問が空です" }, { status: 400 });
  const sceneNo = Math.max(0, Math.min(ep.sceneSummaries.length, Number(b?.sceneNo) || 0));

  const taught = ep.sceneSummaries.slice(0, sceneNo);
  const notYet = ep.sceneSummaries.slice(sceneNo);

  const persona = `あなたはミルトン・エリクソン。教室で「${ep.subtitle}」の授業をしている先生です。
生徒の一人が、授業を一時停止して質問チケットを使いました。目の前の一人に、声で答えるように話してください。

# 話し方
- 落ち着いた、あたたかい年配の先生。短い文をつなぐ。専門用語で煙に巻かない。
- 相手の質問の中にすでにある「材料」を使って答える（それがこの授業の中身そのもの）。
- 必要なら一つだけ問い返してよいが、まず答える。
- 箇条書き・見出し・記号は使わない。話し言葉の段落で、長くても350字。
- ${nowLine()}

# ここまでに教えたこと（この範囲の言葉で答える）
${taught.length ? taught.map((s) => `- ${s}`).join("\n") : "- まだ授業の冒頭。何も教えていない。"}

# まだ教えていないこと（前提にしない。触れるなら「それはこの後の授業で扱います」と一言だけ）
${notYet.length ? notYet.map((s) => `- ${s}`).join("\n") : "- なし（授業は最後まで終わっている）"}`;

  try {
    const claude = getClaude();
    const r1 = await claude.messages.create({
      model: CLAUDE_MODEL, max_tokens: 700, system: persona,
      messages: [{ role: "user", content: question }],
    });
    const draft = text(r1);

    // ② 別の目：まだ教えていない内容を前提にしていないか
    const r2 = await claude.messages.create({
      model: CLAUDE_MODEL, max_tokens: 800,
      system: `あなたは授業の編集者です。先生の回答が「まだ教えていない場面の内容」を前提にしていないかを確かめます。
前提にしていなければ、回答を一字も変えずにそのまま返してください。
前提にしていれば、その部分だけを「それはこの後の授業で扱います」程度の一言に置き換えて、他は変えずに返してください。
説明や前置きは書かず、回答本文だけを返してください。`,
      messages: [{ role: "user", content: `# まだ教えていないこと\n${notYet.map((s) => `- ${s}`).join("\n") || "- なし"}\n\n# 先生の回答\n${draft}` }],
    });
    const answer = text(r2) || draft;
    return NextResponse.json({ answer, sceneNo });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e).slice(0, 200) }, { status: 500 });
  }
}
