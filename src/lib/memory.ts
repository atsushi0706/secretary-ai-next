/**
 * 本人についての記憶（GPTのような、時間で更新されるもの）。
 *
 * 【これまでとの違い】
 * これまでは「この部屋では過去を持ち込まない／ここは覚えておく」という仕切りだった。
 * これからは**一本の記憶**を全部屋で共有し、**時間軸で更新する**（淳くんの指定）。
 *   ・「ジムを探している」→ 通い始めたら、その記憶を**上書き**する（増やすのではなく）
 *   ・もう違うと分かったことは忘れる
 * 覚える・上書きする・忘れる、の3つで、人間の記憶に寄せる。
 *
 * 【守ること】
 * ・事実だけ。推測・診断・評価は覚えない（「山の上でガンガン」事件を繰り返さない）
 * ・その日限りの気分や予定は覚えない。続く事実だけ
 * ・本人がいつでも見られる・消せる（/memory）
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { jstDateStr } from "./google";

export type MemoryKind = "work" | "person" | "health" | "habit" | "like" | "plan" | "other";
export const KIND_JA: Record<MemoryKind, string> = {
  work: "仕事", person: "人", health: "からだ", habit: "習慣",
  like: "好み", plan: "進行中", other: "その他",
};
export const isKind = (v: unknown): v is MemoryKind =>
  typeof v === "string" && v in KIND_JA;

export type UserMemory = {
  id: string; kind: MemoryKind; fact: string;
  status: string; created_at: string; updated_at: string;
};

/** 覚えておく数の上限。多すぎる記憶は、無いのと同じ（毎回全部渡すので） */
export const MEMORY_CAP = 60;
/** 1回の整理で足していい数。少ないほうがいい */
export const ADD_CAP = 5;

/* ── 整理の中身（純粋な関数。検査はここを直接動かす） ────── */

export type MemoryOps = {
  add: { kind: MemoryKind; fact: string }[];
  update: { id: string; fact: string }[];
  forget: string[];
};

/**
 * AIが返した操作を、信用せずに均す。
 * ・知らないidの update / forget は捨てる
 * ・fact は80字まで。空は捨てる
 * ・追加は ADD_CAP 個まで、全体が MEMORY_CAP を超えるぶんは捨てる
 */
export function sanitizeOps(raw: any, current: { id: string }[]): MemoryOps {
  const ids = new Set(current.map((m) => m.id));
  const fact = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 80);

  const update = (Array.isArray(raw?.update) ? raw.update : [])
    .map((u: any) => ({ id: String(u?.id ?? ""), fact: fact(u?.fact) }))
    .filter((u: any) => u.fact && ids.has(u.id));

  const forget = (Array.isArray(raw?.forget) ? raw.forget : [])
    .map((f: any) => String(f ?? ""))
    .filter((f: string) => ids.has(f));

  const room = Math.max(0, MEMORY_CAP - (current.length - forget.length));
  const add = (Array.isArray(raw?.add) ? raw.add : [])
    .map((a: any) => ({ kind: (isKind(a?.kind) ? a.kind : "other") as MemoryKind, fact: fact(a?.fact) }))
    .filter((a: any) => a.fact)
    .slice(0, Math.min(ADD_CAP, room));

  return { add, update, forget };
}

/** 会話に渡す形。記憶が無ければ空文字 */
export function memoryBlock(mems: { kind: MemoryKind; fact: string; updated_at?: string }[], who: string): string {
  if (!mems.length) return "";
  const lines = mems.slice(0, MEMORY_CAP).map((m) => `- ${m.fact}（${KIND_JA[m.kind] ?? "その他"}）`);
  return `# ${who} について、きみが覚えていること
${lines.join("\n")}

## 記憶の使い方（守ること）
- **関係あるときだけ**使う。列挙しない。「覚えてるよ」とわざわざ言わない
- いまの発言と食い違ったら、**いま言っていることが正しい**（記憶のほうが古い）
- ワークの筋は壊さない。記憶は、相づちと理解の解像度を上げるためだけに使う
- 記憶に無いことを、覚えているかのように言わない`;
}

/* ── 読み書き ──────────────────────────────────── */

export async function listMemories(userId: string, limit = MEMORY_CAP): Promise<UserMemory[]> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("user_memories")
      .select("id, kind, fact, status, created_at, updated_at")
      .eq("user_id", userId).eq("status", "active")
      .order("updated_at", { ascending: false }).limit(limit);
    return (data ?? []) as UserMemory[];
  } catch { return []; }   // 表が無くても、会話は止めない
}

export async function forgetMemory(userId: string, id: string): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("user_memories")
    .update({ status: "forgotten", updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("id", id);
}

/**
 * 記憶の整理を1回まわす（覚える・上書きする・忘れる）。
 * 1日1回で足りる。呼び出し側で回数を持て余さないよう、
 * 同じ日に2回目を呼んでも中で静かに帰る。
 */
export async function extractMemories(userId: string, force = false): Promise<{ ran: boolean; added: number; updated: number; forgotten: number }> {
  const none = { ran: false, added: 0, updated: 0, forgotten: 0 };
  const supa = supabaseAdmin();
  const today = jstDateStr();

  // 今日はもう整理したか（meta の1行で見る）
  const { data: meta } = await supa.from("user_memories")
    .select("id, fact").eq("user_id", userId).eq("status", "meta").maybeSingle();
  if (!force && meta && String((meta as any).fact) === today) return none;

  // 材料：昨日と今日、本人が言ったこと
  const since = jstDateStr(new Date(Date.now() - 86400000));
  const [iw, rv, current] = await Promise.all([
    supa.from("shinga_conversations").select("content")
      .eq("user_id", userId).eq("role", "user").gte("date", since)
      .order("id", { ascending: false }).limit(80),
    supa.from("conversations").select("content")
      .eq("user_id", userId).eq("role", "user").gte("date", since)
      .order("id", { ascending: false }).limit(40),
    listMemories(userId),
  ]);
  const said = [...(iw.data ?? []), ...(rv.data ?? [])]
    .map((r: any) => String(r.content ?? "").trim())
    .filter((t) => t && !t.startsWith("[["))
    .slice(0, 100);
  if (!said.length) return none;

  const NL = String.fromCharCode(10);
  const prompt = `あなたは記憶の整理係。下の「いま覚えていること」と「最近本人が言ったこと」を見比べて、記憶を最新にする。

# いま覚えていること
${current.length ? current.map((m) => `${m.id} :: ${m.fact}（${KIND_JA[m.kind] ?? "他"}）`).join(NL) : "（まだ何も無い）"}

# 最近本人が言ったこと
${said.map((t) => `- ${t.slice(0, 120)}`).join(NL)}

# 返す形（JSONだけ。説明を書かない）
{"add":[{"kind":"work|person|health|habit|like|plan|other","fact":"60字以内"}],"update":[{"id":"…","fact":"60字以内"}],"forget":["id"]}

# 決まり
- **事実だけ。** 推測・診断・性格の評価は書かない。本人の言葉に無いことを足さない
- **時間で更新する。** 同じことの新しい状態が出たら add ではなく update
  （例：「ジムを探している」と覚えていて、通い始めた話が出たら、その記憶を update）
- もう違うと分かったものは forget
- その日限りの気分・単発の予定は覚えない。**続く事実だけ**（仕事・人・習慣・からだ・好み・進行中の計画）
- 追加は${ADD_CAP}個まで。少ないほうがいい。確信が無ければ何もしない（空配列でよい）`;

  let ops: MemoryOps = { add: [], update: [], forget: [] };
  try {
    const raw = await complete({ userId, prompt, maxTokens: 900, temperature: 0, prefer: "claude" });
    const m = String(raw ?? "").match(/\{[\s\S]*\}/);
    if (m) ops = sanitizeOps(JSON.parse(m[0]), current);
  } catch { return none; }

  const now = new Date().toISOString();
  for (const u of ops.update) {
    await supa.from("user_memories").update({ fact: u.fact, updated_at: now })
      .eq("user_id", userId).eq("id", u.id);
  }
  for (const f of ops.forget) {
    await supa.from("user_memories").update({ status: "forgotten", updated_at: now })
      .eq("user_id", userId).eq("id", f);
  }
  if (ops.add.length) {
    await supa.from("user_memories").insert(
      ops.add.map((a) => ({ user_id: userId, kind: a.kind, fact: a.fact, status: "active" })));
  }
  // 今日はもう整理した、の印
  if (meta) await supa.from("user_memories").update({ fact: today, updated_at: now }).eq("id", (meta as any).id);
  else await supa.from("user_memories").insert({ user_id: userId, kind: "other", fact: today, status: "meta" });

  return { ran: true, added: ops.add.length, updated: ops.update.length, forgotten: ops.forget.length };
}

/** この表を作るSQL */
export const MEMORY_MIGRATION = `
create table if not exists public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind text not null default 'other',
  fact text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_memories_user_idx on public.user_memories (user_id, status, updated_at desc);
alter table public.user_memories enable row level security;
`.trim();
