/**
 * 主人公レベル（本人が現在地を選ぶ → 会話で増減）。
 *
 * 設計の要（淳くんの結論）:
 * - AIが無から数字を当てない。本人が「今どのへんか」をボタンで選ぶ＝基礎値。
 * - そこから、会話（パラレルウォーク／ピークステート／ふだんの話）で増減する。
 * - 内面（内側・体現・関係）＝状態値。完成(Lv100)を置かない。深さの"今"。
 * - 外（提供・社会化）＝到達・規模で測れる。段階そのものが定義。
 * - 不明は「まだ分からない」として残す（数字を作らない）。
 *
 * 「どこに到達したら？」の答え＝各領域の段階ラベルそのもの。
 */
import { supabaseAdmin } from "./supabase";

export { DOMAINS, STEPS } from "./hero-domains";
export type { HeroDomain, Step } from "./hero-domains";
import { DOMAINS, STEPS, type HeroDomain } from "./hero-domains";

/** レベル。null = まだ分からない（不明） */
export type HeroLevels = Record<HeroDomain, number | null>;

export function emptyLevels(): HeroLevels {
  return { inner: null, embodiment: null, relationship: null, delivery: null, socialization: null };
}

/** 変化の履歴の1点。note=何が動いたか、source="選び直し"|"会話" */
export type HeroSnapshot = { at: string; levels: HeroLevels; note?: string; source?: "選び直し" | "会話" | "週チェック" };

export type HeroRow = {
  enemy_world: string;
  desired_world: string;
  needed_people: string;
  hero_statement: string;
  levels: HeroLevels | null;
  assessment: any | null;
  history: HeroSnapshot[] | null;
  assessed_at: string | null;
};

export function labelOf(d: HeroDomain): string {
  return DOMAINS.find((x) => x.key === d)?.label ?? d;
}

export async function getHero(userId: string): Promise<HeroRow | null> {
  const supa = supabaseAdmin();
  const { data, error } = await supa.from("hero").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as HeroRow) ?? null;
}

export async function saveHeroIdentity(
  userId: string,
  f: { enemy_world: string; desired_world: string; needed_people: string; hero_statement: string },
): Promise<void> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("hero").upsert({ user_id: userId, ...f, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** 本人が選んだ現在地（＝基礎値）を保存し、変化の履歴に積む */
export async function saveHeroLevels(
  userId: string,
  levels: HeroLevels,
  prevHistory: HeroSnapshot[] | null,
): Promise<void> {
  const supa = supabaseAdmin();
  const at = new Date().toISOString();
  const history = [...(prevHistory ?? []), { at, levels, source: "選び直し" as const }].slice(-80);
  const { error } = await supa.from("hero").upsert({ user_id: userId, levels, history, updated_at: at, assessed_at: at });
  if (error) throw error;
}

export function hasIdentity(h: HeroRow | null): boolean {
  return !!(h && (h.desired_world?.trim() || h.hero_statement?.trim()));
}

// ── 会話での増減 ───────────────────────────────────────────────
// 基礎値（本人が選んだ値）を起点に、会話で出てきた"具体的な変化の証拠"だけ小さく動かす。
// 不明(null)の領域は動かさない。1回の増減は控えめに丸める。

export type HeroDelta = { domain: HeroDomain; delta: number; reason?: string };
const MAX_STEP = 6; // 1メッセージで動かせる上限

/**
 * 会話で観測された増減を適用する。
 * - 既知の領域だけ。不明はそのまま不明。
 * - ±MAX_STEP に丸め、1〜100 にクランプ。
 * - 実際に動いたときだけ history に理由つきで積んで保存する。
 */
export async function applyHeroDeltas(
  userId: string,
  deltas: HeroDelta[],
  hero: HeroRow | null,
): Promise<{ changed: { domain: HeroDomain; from: number; to: number; reason?: string }[]; hero: HeroRow | null }> {
  if (!hero || !hero.levels || !deltas.length) return { changed: [], hero };
  const levels: HeroLevels = { ...hero.levels };
  const changed: { domain: HeroDomain; from: number; to: number; reason?: string }[] = [];
  for (const d of deltas) {
    const cur = levels[d.domain];
    if (cur == null) continue; // 不明は動かさない
    const step = Math.max(-MAX_STEP, Math.min(MAX_STEP, Math.round(Number(d.delta) || 0)));
    if (step === 0) continue;
    const next = Math.max(1, Math.min(100, cur + step));
    if (next === cur) continue;
    levels[d.domain] = next;
    changed.push({ domain: d.domain, from: cur, to: next, reason: (d.reason ?? "").trim() || undefined });
  }
  if (!changed.length) return { changed: [], hero };

  const at = new Date().toISOString();
  const note = changed
    .map((c) => `${labelOf(c.domain)} ${c.from}→${c.to}${c.reason ? `（${c.reason}）` : ""}`)
    .join(" / ");
  const history = [...(hero.history ?? []), { at, levels, note, source: "会話" as const }].slice(-80);
  const supa = supabaseAdmin();
  const { error } = await supa.from("hero").upsert({ user_id: userId, levels, history, updated_at: at });
  if (error) throw error;
  return { changed, hero: { ...hero, levels, history } };
}

/**
 * 会話中にAIへ渡す「今の現在地」＋増減のルール。
 * identity が無い／レベル未設定なら空（増減もさせない）。
 */
export function buildHeroLevelPrompt(hero: HeroRow | null, who: string): string {
  if (!hasIdentity(hero) || !hero?.levels) return "";
  const lv = hero.levels;
  const known = DOMAINS.filter((d) => lv[d.key] != null);
  if (!known.length) return "";

  const lines = DOMAINS.map((d) => {
    const v = lv[d.key];
    const tag = d.kind === "state" ? "内面・状態" : "外・規模";
    return v == null
      ? `- ${d.label}（${tag}）：まだ不明（＝動かさない）`
      : `- ${d.label}（${tag}）：いま ${v}／100 … ${d.hint}`;
  });

  return `
# ${who} の「主人公レベル」（今の現在地・本人が選んだ基礎値）
${lines.join("\n")}

## 会話でこのレベルを動かすとき（＜hero_delta＞）
${who} 自身の言葉に「その領域が具体的に動いた証拠」が出たときだけ、返事の最後にそっと付ける（本文では一切説明しない）:
<hero_delta>[{"domain":"領域キー","delta":2,"reason":"${who}の言葉での具体的理由"}]</hero_delta>
- domain のキー：inner / embodiment / relationship / delivery / socialization
- 不明の領域（上で「不明」のもの）は動かさない。勝手に数字を作らない。
- delta は控えめに。前進の証拠は +1〜+4、大きな一歩でも +6 まで。
  つまずき・後退の告白は -1〜-3 くらい。友達として、下げすぎない。
- 動かすのは"証拠があるときだけ"。毎回は付けない。何もなければ付けない。
- 例：「昨日はじめて人に伝えられた」→ relationship を +3。「また流されちゃった」→ relationship を -2。
- これは判定でも評価でもない。${who} が進んだ手応えを一緒に見える化するだけ。宣言しない。`;
}
