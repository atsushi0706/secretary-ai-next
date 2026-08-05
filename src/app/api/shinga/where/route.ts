/**
 * ホームで話しかけられたとき、「いま、どの部屋がよさそうか」を見立てる。
 *
 * 【なぜ必要か】
 * 地図に扉が並んでいても、初めての人には「どれが自分に要るのか」が分からない。
 * だから、思っていることをそのまま喋ってもらって、こちらが行き先を出す。
 *
 * 【守ること】
 * - **鍵が開いている部屋にしか案内しない。**押しても開かないボタンは出さない。
 * - 決めつけない。1つに絞らず、多くても2つ。
 * - 「ここじゃないかも」と思ったら、無理に部屋へ入れない（そのまま話す道も残す）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { complete } from "@/lib/ai";
import { isModeKey, MODES, type ModeKey } from "@/lib/modes";
import { WORK_GUIDE, guideListFor } from "@/lib/work-guide";
import { getUserSettings } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const b = await req.json().catch(() => ({}));
    const text = String(b?.text ?? "").trim().slice(0, 1200);
    if (!text) return NextResponse.json({ error: "何か話してみて" }, { status: 400 });

    const open = (Array.isArray(b?.openWorks) ? b.openWorks : [])
      .map(String).filter(isModeKey) as ModeKey[];
    // 説明を持っている部屋だけを候補にする（何の部屋か言えないものは勧めない）
    const cands = open.filter((k) => WORK_GUIDE[k]);
    if (cands.length === 0) {
      return NextResponse.json({ ok: true, say: "", picks: [] });
    }

    const s: any = await getUserSettings(userId).catch(() => null);
    const who = s?.user_call_name || "きみ";

    const prompt = `あなたは ${s?.secretary_name || "清瀬リンク"}。${who} の相棒。
${who} が、いま思っていることを話してくれた。
**どの部屋がいまの ${who} に合いそうか**を見立てて、短く声をかける。

# 部屋の一覧（**この中からしか選ばない**）
${guideListFor(cands)}

# 守ること
- ここに無い部屋は選ばない。名前も出さない（鍵がかかっていて開けない）。
- **多くても2つ。**迷ったら1つでいい。全部並べない。
- 決めつけない。「〜がよさそう」「〜はどうかな」くらいの温度で。
- ${who} が言っていないことを足さない。話してくれたことだけで見立てる。
- 声かけは短く（60字以内）。説明しすぎない。
- どれもピンとこないなら picks を空にして、そのまま話を受ける一言だけ返す。

# 出す形（JSONだけ。前後に何も書かない）
{
  "say": "${who} への短い声かけ（60字以内）",
  "picks": [{"mode": "walk", "why": "この部屋を勧める理由（25字以内）"}]
}

# ${who} が話したこと
${text}`;

    const raw = await complete({ userId, prompt, maxTokens: 500, temperature: 0.6 });
    const m = String(raw ?? "").match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ ok: true, say: "うん、受け取った。", picks: [] });

    const j = JSON.parse(m[0]);
    const picks = (Array.isArray(j.picks) ? j.picks : [])
      .filter((p: any) => isModeKey(p?.mode) && cands.includes(p.mode))
      .map((p: any) => ({
        mode: p.mode as ModeKey,
        label: MODES[p.mode as ModeKey].label,
        why: String(p.why ?? "").trim().slice(0, 40),
      }))
      .slice(0, 2);

    return NextResponse.json({
      ok: true,
      say: String(j.say ?? "").trim().slice(0, 120) || "うん、受け取った。",
      picks,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
