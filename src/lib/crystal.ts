/**
 * クリスタルルームの記録。サーバ専用。
 *
 * 【何を残すか】
 * やり取りを全部残すと、あとから読み返せない量になる。
 * かといって一行にすると「あの時、何だったっけ」が防げない。
 * だから **どういう流れで、どこまでまとまったか** を、
 * **本人の言葉をベースに**まとめて残す。AIの言い回しに置き換えない。
 *
 * 【名前は本人がつける】
 * 保管庫に並んだとき、名前が無いと何がなんだか分からない。
 * だから壁打ちの終わりに、必ず名前をつけてもらう。
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { jstDateStr } from "./google";
import { colorOf } from "./crystal-colors";

export type Crystal = {
  id: string;
  user_id: string;
  date: string;
  /** 本人がつけた名前（保管庫に出る） */
  name: string;
  /** 色番号 0〜35 */
  color: number;
  /** 何の話だったか（1〜2行） */
  headline: string;
  /** どういう流れで、どこまでまとまったか */
  summary: string;
  /** 決まったこと（本人の言葉） */
  points: string[];
  /** どこから手をつけるか */
  next_steps: string[];
  created_at: string;
};

export type CrystalDraft = {
  headline: string;
  summary: string;
  points: string[];
  next_steps: string[];
};

/** 表がまだ無くても、アプリを止めない */
function missing(e: any): boolean {
  const m = String(e?.message ?? e ?? "");
  return /relation .* does not exist|could not find the table|schema cache/i.test(m);
}

export async function listCrystals(userId: string, limit = 200): Promise<Crystal[]> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("crystals")
      .select("id, user_id, date, name, color, headline, summary, points, next_steps, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as Crystal[];
  } catch { return []; }
}

export async function saveCrystal(
  userId: string,
  c: { name: string; headline: string; summary: string; points: string[]; next_steps: string[] },
): Promise<Crystal | null> {
  const supa = supabaseAdmin();
  const name = c.name.trim().slice(0, 40) || "名もなきクリスタル";
  const row = {
    user_id: userId,
    date: jstDateStr(),
    name,
    color: colorOf(name, userId),
    headline: c.headline.slice(0, 120),
    summary: c.summary.slice(0, 2000),
    points: c.points.slice(0, 8),
    next_steps: c.next_steps.slice(0, 6),
  };
  const { data, error } = await supa.from("crystals").insert(row).select().single();
  if (error) throw error;
  return data as Crystal;
}

export const CRYSTAL_MIGRATION = `-- クリスタル保管庫
create table if not exists public.crystals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date date not null,
  name text not null,
  color int not null default 0,
  headline text default '',
  summary text default '',
  points jsonb default '[]'::jsonb,
  next_steps jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
create index if not exists crystals_user_idx on public.crystals (user_id, created_at desc);`;

export function isMissingCrystals(e: any): boolean { return missing(e); }

/**
 * 壁打ちのやり取りから、まとめを作る。
 *
 * ここでの掟は1つだけ：**本人が言っていないことを書かない。**
 * まとめは、あとから読み返して「そうそう、これ」と思えないと意味がない。
 * AIが気を利かせて足すと、その瞬間に別人の記録になる。
 */
export async function buildCrystalDraft(
  userId: string,
  who: string,
  lines: { role: "assistant" | "user"; content: string }[],
): Promise<CrystalDraft> {
  const talk = lines
    .map((l) => `${l.role === "user" ? who : "相棒"}：${String(l.content ?? "").slice(0, 700)}`)
    .join("\n")
    .slice(0, 9000);

  const empty: CrystalDraft = { headline: "", summary: "", points: [], next_steps: [] };
  if (!talk.trim()) return empty;

  const prompt = `下は、${who} と相棒がアイデアを練った壁打ちの記録。
あとから ${who} が読み返して「そうそう、これ」と思えるまとめを作る。

# 掟（最重要）
- **${who} が言っていないことを書かない。** 気を利かせて足さない。
- 相棒が出した案でも、${who} が「それいいね」と受け取ったものだけを残す。
  受け取っていない案は書かない。
- **${who} の言葉をそのまま使う。**きれいな言い回しに直さない。
- 決まっていないことを、決まったように書かない。迷ったままなら「まだ決めていない」と書く。

# 出す形（JSONだけ。前後に何も書かない）
{
  "headline": "何の話だったか（30字以内・体言止め）",
  "summary": "どういう流れで、どこまでまとまったか（200〜400字）。最初はこうだった → こう変わった → いまここ、が分かるように",
  "points": ["決まったこと（30字以内）", "…最大6つ。無ければ空配列"],
  "next_steps": ["どこから手をつけるか（25字以内・すぐ動ける粒）", "…最大4つ。話に出ていなければ空配列"]
}

# 壁打ちの記録
${talk}`;

  try {
    const raw = await complete({ userId, prompt, maxTokens: 2000, temperature: 0.5 });
    const m = String(raw ?? "").match(/\{[\s\S]*\}/);
    if (!m) return empty;
    const j = JSON.parse(m[0]);
    const arr = (v: any, n: number) =>
      (Array.isArray(v) ? v : []).map((x: any) => String(x ?? "").trim()).filter(Boolean).slice(0, n);
    return {
      headline: String(j.headline ?? "").trim().slice(0, 60),
      summary: String(j.summary ?? "").trim().slice(0, 1200),
      points: arr(j.points, 6),
      next_steps: arr(j.next_steps, 4),
    };
  } catch { return empty; }
}
