import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getClaude, CLAUDE_MODEL } from "@/lib/claude";
import { INNER_WORLD_ANSWER_LABELS, type InnerWorldAnswerKey } from "@/lib/inner-world-map/course";

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

function clean(value: unknown, max: number): string {
  return String(value ?? "").replace(/[\u0000-\u001f]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "この教材はまだ公開されていません" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const moduleId = Math.min(6, Math.max(1, Number(body?.moduleId) || 1));
  const question = clean(body?.question, 500);
  const answer = clean(body?.answer, 1600);
  const fallback = clean(body?.fallback, 180);
  const contextObject = typeof body?.context === "object" && body.context !== null ? body.context as Record<string, unknown> : {};
  const context = Object.entries(contextObject)
    .slice(-12)
    .map(([key, value]) => {
      const label = key in INNER_WORLD_ANSWER_LABELS
        ? INNER_WORLD_ANSWER_LABELS[key as InnerWorldAnswerKey]
        : clean(key, 60);
      return `${label}：${clean(value, 180)}`;
    })
    .filter((line) => !line.endsWith("："))
    .join("\n");

  if (!question || !answer) return NextResponse.json({ error: "question and answer are required" }, { status: 400 });

  try {
    const claude = getClaude();
    const result = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 150,
      system: `あなたはメンタルコーチの清瀬淳。SINGA WORLDの「インナーワールドマップ」で、顕在意識・潜在意識・文化的催眠・深層自己を教えています。現在は全6講の第${moduleId}講です。

目的はセッションを進めることではありません。学習者が直前に学んだ概念を自分の一場面へ正しく当てはめられたかを受け取り、その答えから見えた核を一つだけ返すことです。

返答の原則：
- 相手の文を言い換えただけのオウム返しにしない。
- 「なるほど」「つまり」「〜ということですね」から始めない。
- 相手が言っていない原因、幼少期、診断、信念、深層自己を勝手に作らない。
- 一つ前の答えとの関係が本当にある時だけ、一点を結ぶ。原因探しや追加セッションへ進めない。
- この返答の直後には追加入力欄がない。質問、確認、宿題で終わらず、今の答えから見えた核を一つ伝えて文を閉じる。
- 本人を責めない。外的要因を否定しない。
- 深刻な症状や危険が書かれている場合は、分析を続けず、信頼できる医療・心理の専門家へ相談するよう短く促す。
- 専門用語を使わず、小学校高学年でも意味が取れる一文にする。
- 55〜90文字ほど。見出し、箇条書き、引用符、前置き、疑問符は書かない。必ず一文だけ。
- 答えが短く情報が少ない時は、教材側の定型文「${fallback}」をそのまま返してよい。`,
      messages: [{
        role: "user",
        content: `今の学習確認：${question}\n本人の短いノート：${answer}\n\nここまでの学習ノート：\n${context || "まだなし"}`,
      }],
    });
    const reply = clean(responseText(result), 180) || fallback;
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: fallback, degraded: true });
  }
}
