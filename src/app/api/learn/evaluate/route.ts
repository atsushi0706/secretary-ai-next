import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getClaude, CLAUDE_MODEL } from "@/lib/claude";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function responseText(response: unknown): string {
  const content = typeof response === "object" && response !== null && "content" in response && Array.isArray(response.content)
    ? response.content
    : [];
  return content.map((item) => {
    if (typeof item !== "object" || item === null || !("type" in item) || item.type !== "text" || !("text" in item)) return "";
    return typeof item.text === "string" ? item.text : "";
  }).join("").trim();
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "この部屋はまだ開いていません" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const question = String(body?.question ?? "").trim().slice(0, 400);
  const answer = String(body?.answer ?? "").trim().slice(0, 1200);
  const correctCriteria = String(body?.correctCriteria ?? "").trim().slice(0, 600);
  const incorrectCriteria = String(body?.incorrectCriteria ?? "").trim().slice(0, 600);
  const episode = String(body?.episode ?? "").trim().slice(0, 20);
  const context = String(body?.context ?? "").trim().slice(0, 1800);
  if (!question || !answer || !correctCriteria || !incorrectCriteria) {
    return NextResponse.json({ error: "required fields are missing" }, { status: 400 });
  }

  try {
    const claude = getClaude();
    const result = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 180,
      system: `あなたは催眠学習ゲームの回答判定者です。学習者の自由回答を、提示された基準だけで判定してください。
- 表現の上手さではなく、必要な考えが含まれるかを見る。
- 問いの主語・状況・本人が実際に言ったことを、場面情報から確認する。
- 単語が一つ一致しただけでは正解にしない。提案全体が安全で、本人の意思を守るかを見る。
- 危険な行動、同意のない操作、結果の断定が混ざる回答は、他が合っていても不正解にする。
- 学習者が言っていない内容を補って正解にしない。
- 不正解でも責めず、どこを一つ直せばよいか具体的に返す。
- JSON以外は書かない。
出力形式：{"correct":trueまたはfalse,"feedback":"50文字程度の日本語"}`,
      messages: [{
        role: "user",
        content: `話：${episode || "未指定"}\n場面：${context || "場面情報なし"}\n問い：${question}\n正解の基準：${correctCriteria}\n不正解の基準：${incorrectCriteria}\n学習者の回答：${answer}`,
      }],
    });
    const raw = responseText(result).replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw) as { correct?: unknown; feedback?: unknown };
    if (typeof parsed.correct !== "boolean" || typeof parsed.feedback !== "string" || !parsed.feedback.trim()) {
      throw new Error("invalid evaluation");
    }
    return NextResponse.json({ correct: parsed.correct, feedback: parsed.feedback.trim().slice(0, 120) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message.slice(0, 160) : "evaluation failed" }, { status: 500 });
  }
}
