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

function cleanSentence(value: string, maxLength = 90): string {
  return value
    .replace(/[「」『』]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "この部屋はまだ開いていません" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const raw = String(body?.text ?? "").trim().slice(0, 1200);
  const mode = body?.mode === "insight" ? "insight" : "situation";
  const question = String(body?.question ?? "").trim().slice(0, 300);
  if (!raw) return NextResponse.json({ error: "text is empty" }, { status: 400 });

  try {
    const claude = getClaude();
    const result = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 120,
      system: mode === "insight" ? `学習者の回答から、問いへ直接答えている核を一つだけ抜き出してください。
- 詳細を順番に復唱したり、複数の考えを列挙したりしない。
- 本人が言っていない原因、診断、助言、専門語を足さない。
- 「つまり『〜』ってことだね」という自然な会話の〜へ、そのまま入る短い節にする。
- 45文字程度まで。引用符、見出し、前置き、解説は書かない。
- 必ず一文または一節だけ返す。` : `学習者が自由に話した内容を、後の会話でその人の具体例として使える日本語一文へまとめてください。
- 本人が「何をしようとして」「何に止められているか」を残す。
- 本人が言っていない原因、診断、助言を足さない。
- 抽象語だけにしない。意味を変えない。
- 55文字程度まで。見出し、引用符、前置き、解説は書かない。
- 必ず一文だけ返す。`,
      messages: [{ role: "user", content: mode === "insight" ? `問い：${question || "この場面から何を考えた？"}\n回答：${raw}` : raw }],
    });
    const summary = cleanSentence(responseText(result), mode === "insight" ? 60 : 90);
    if (!summary) throw new Error("empty summary");
    return NextResponse.json({ summary });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message.slice(0, 160) : "summary failed" }, { status: 500 });
  }
}
