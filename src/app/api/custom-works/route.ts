/**
 * じぶんワーク API。
 * GET    : 一覧
 * POST   : { action:"draft", purpose } → AIが下書き（保存はしない）
 *          { action:"save", work }     → 保存（新規/更新）
 *          { action:"complete", id }   → やった回数+1。初回完走で銀カード
 * DELETE : { id }
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { complete } from "@/lib/ai";
import { supabaseAdmin, logError } from "@/lib/supabase";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { grantSkillCard } from "@/lib/awaken";
import { isValidWork, type CustomWork } from "@/lib/custom-work-types";

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

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("custom_works")
      .select("id, name, emoji, purpose, intro, closing, steps, cards, runs, created_at")
      .eq("user_id", userId).order("created_at", { ascending: true }).limit(12);
    return NextResponse.json({ works: data ?? [] });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ works: [], needsMigration: true });
    return NextResponse.json({ works: [] });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const b = await req.json().catch(() => ({}));

  try {
    if (b.action === "draft") {
      const purpose = String(b.purpose ?? "").trim().slice(0, 200);
      if (!purpose) return NextResponse.json({ error: "どんな時間にしたいか、ひとこと教えて" }, { status: 400 });
      const raw = await complete({
        userId,
        prompt: `ユーザーが自分用のワーク（内省の時間）を作りたい。案内役（やさしい友達口調）が進行する前提で、下書きを作って。

# ユーザーの望み
${purpose}

# 作り方
- 問いは3〜6個。1つずつ聞く前提なので、短く・答えやすく・順番に深くなるように
- 途中に1回だけ「カードを引く」を入れると流れが変わって良い（合わないテーマなら入れない）
- 問いの言葉は、やさしい話し言葉。詰問にしない
- name は8〜14字。emoji は雰囲気に合うもの1つ

# 出力（JSONのみ）
{
 "name": "ワークの名前",
 "emoji": "🌙",
 "intro": "始まりのひとこと（案内役が言う。30〜60字）",
 "steps": [
   {"kind":"q","q":"問いかけ1"},
   {"kind":"card","deck":"oracle","lead":"ここで一枚、引いてみよう"},
   {"kind":"q","q":"問いかけ2"}
 ],
 "closing": "どう締めたいか（例：今日の自分にひとこと置いて、深呼吸して終わる）"
}`,
        maxTokens: 900,
        temperature: 0.8,
      });
      const d = parseObject<any>(raw);
      if (!d || !Array.isArray(d.steps)) return NextResponse.json({ error: "下書きを作れなかった。もう一度試してみて。" }, { status: 502 });
      return NextResponse.json({ draft: d });
    }

    if (b.action === "save") {
      const w = b.work as CustomWork;
      if (!w?.name?.trim()) return NextResponse.json({ error: "ワークの名前を入れてね" }, { status: 400 });
      if (!Array.isArray(w?.steps) || w.steps.length === 0) {
        return NextResponse.json({ error: "進め方を1つ以上入れてね（💬 問いかけ か 🎴 カード）" }, { status: 400 });
      }
      if (w.steps.some((st: any) => st?.kind === "q" && !String(st.q ?? "").trim())) {
        return NextResponse.json({ error: "空っぽの問いかけがあるよ。文を入れるか、✕で消してね" }, { status: 400 });
      }
      if (!isValidWork(w)) return NextResponse.json({ error: "ワークの形が不完全です" }, { status: 400 });
      const supa = supabaseAdmin();
      const row = {
        user_id: userId,
        name: String(w.name).slice(0, 30),
        emoji: String(w.emoji ?? "🌟").slice(0, 4),
        purpose: String(w.purpose ?? "").slice(0, 300),
        intro: String(w.intro ?? "").slice(0, 200),
        closing: String(w.closing ?? "").slice(0, 200),
        steps: w.steps.slice(0, 10),
        cards: (w.cards ?? []).slice(0, 24),
      };
      if (w.id) {
        await supa.from("custom_works").update(row).eq("user_id", userId).eq("id", w.id);
        return NextResponse.json({ ok: true, id: w.id });
      }
      const { data, error } = await supa.from("custom_works").insert(row).select("id").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, id: data.id });
    }

    if (b.action === "complete") {
      const id = Number(b.id);
      const supa = supabaseAdmin();
      const { data } = await supa.from("custom_works").select("runs, name").eq("user_id", userId).eq("id", id).maybeSingle();
      if (data) {
        await supa.from("custom_works").update({ runs: (data.runs ?? 0) + 1 }).eq("user_id", userId).eq("id", id);
        // 初めて自分のワークを完走した記念（1回だけ）
        await grantSkillCard(userId, {
          key: "custom-first-run",
          title: "自分の道をつくった者",
          body: `与えられたワークではなく、自分で作った「${data.name}」を最後まで歩いた。道は、もう自分で敷ける。`,
          rarity: "silver",
          source: "じぶんワーク",
        }).catch(() => {});
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ error: "保存先がまだ作られていません。Supabase で custom_works のSQLを流してね。", needsMigration: true }, { status: 503 });
    await logError(userId, "/api/custom-works", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    await supabaseAdmin().from("custom_works").delete().eq("user_id", userId).eq("id", Number(b.id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
