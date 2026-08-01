/**
 * 青写真 → 今月 → 今週 → 今日 のブレイクダウン支援。
 * POST {} → いまの目標を読み、埋まっていない段を清瀬リンクが下書きする。
 * 提案を返すだけで勝手に保存はしない（決めるのは本人）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { complete } from "@/lib/ai";
import { getCurrentGoals, periodLabels } from "@/lib/goals";
import { logError } from "@/lib/supabase";

function parseObject<T>(text: string): T | null {
  let t = String(text ?? "").trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");
  const start = t.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { try { return JSON.parse(t.slice(start, i + 1)) as T; } catch { return null; } } }
  }
  return null;
}

export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const { periods, goals } = await getCurrentGoals(userId);
    const labels = periodLabels(periods);
    const year = goals.year?.vision?.trim();
    if (!year) return NextResponse.json({ error: "まず「年の青写真」を書いてね。そこから下ろしていくよ。" }, { status: 400 });

    const raw = await complete({
      userId,
      prompt: `ある人の「今年の青写真」を、今月・今週・今日へ下ろす手伝いをする。

# 青写真（今年）
${year}

# すでに書いてあるもの（あれば尊重して、その続きとして下ろす）
- 今月（${labels.month}）：${goals.month?.vision?.trim() || "（未記入）"}
- 今週（${labels.week}）：${goals.week?.vision?.trim() || "（未記入）"}

# 下ろし方
- 青写真の言葉づかいを引き継ぐ（別の目標にすり替えない）
- 今月＝方向。今週＝行動のかたまり。今日＝30分以内で終わる小さな一歩を3つ
- 「今日の一歩」は動詞で始める具体的な行動に（例：「◯◯を1件送る」）。立派にしない

# 出力（JSONのみ）
{
 "month": "今月の目標（40字以内）",
 "week": "今週やること（50字以内）",
 "today": ["今日の一歩1", "今日の一歩2", "今日の一歩3"]
}`,
      maxTokens: 600,
      temperature: 0.7,
    });
    const p = parseObject<any>(raw);
    if (!p) return NextResponse.json({ error: "下書きを作れなかった。もう一度試してみて。" }, { status: 502 });
    return NextResponse.json({
      month: String(p.month ?? "").slice(0, 80),
      week: String(p.week ?? "").slice(0, 100),
      today: Array.isArray(p.today) ? p.today.map((t: any) => String(t).slice(0, 60)).slice(0, 3) : [],
    });
  } catch (e: any) {
    await logError(userId, "/api/goals/breakdown", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
