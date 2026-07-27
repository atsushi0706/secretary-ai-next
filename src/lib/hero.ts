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

export type HeroDomain = "inner" | "embodiment" | "relationship" | "delivery" | "socialization";

export const DOMAINS: {
  key: HeroDomain; label: string; hint: string; kind: "state" | "reach";
}[] = [
  { key: "inner", label: "内側", hint: "望む世界と主人公像が、自分の中で明確か", kind: "state" },
  { key: "embodiment", label: "体現", hint: "その生き方が、自分の習慣・選択に表れているか", kind: "state" },
  { key: "relationship", label: "関係", hint: "身近な人との関わりに表れているか", kind: "state" },
  { key: "delivery", label: "提供", hint: "必要な人に、価値として届けられているか（規模で測れる）", kind: "reach" },
  { key: "socialization", label: "社会化", hint: "自分を超えて、広がっているか（規模で測れる）", kind: "reach" },
];

/** 各領域の段階。これが「どこに到達したら」の定義そのもの。value=その段階の値 */
export type Step = { label: string; value: number };

export const STEPS: Record<HeroDomain, Step[]> = {
  // 内面＝状態値。完成は置かず、"深さの今"を選ぶ
  inner: [
    { label: "まだ言葉にできない", value: 15 },
    { label: "増やしたい世界を言葉にできる", value: 35 },
    { label: "なぜ望むのかも分かっている", value: 55 },
    { label: "古い思い込みに気づけている", value: 72 },
    { label: "迷っても望む方向を思い出せる", value: 90 },
  ],
  embodiment: [
    { label: "まだ生活には出ていない", value: 15 },
    { label: "自分に実践しようとしている", value: 35 },
    { label: "続いている小さな行動がある", value: 58 },
    { label: "言うことと生活がだいたい一致", value: 78 },
    { label: "自分が望む世界の見本になっている", value: 92 },
  ],
  relationship: [
    { label: "まだ身近な人には出せていない", value: 15 },
    { label: "身近な人にも出そうとしている", value: 38 },
    { label: "感謝・応援を言葉にできている", value: 60 },
    { label: "流されず、自分の態度で表せる", value: 78 },
    { label: "相手から肯定的な反応がある", value: 92 },
  ],
  // 外＝規模・到達で測れる
  delivery: [
    { label: "まだ提供していない", value: 12 },
    { label: "誰かに提供したことがある", value: 30 },
    { label: "場があれば提供できる", value: 45 },
    { label: "自分で募集して提供できる", value: 62 },
    { label: "継続的に提供できている", value: 78 },
    { label: "対価が出て、仕事になっている", value: 95 },
  ],
  socialization: [
    { label: "まだ自分ひとりの範囲", value: 12 },
    { label: "方法を言語化できている", value: 35 },
    { label: "他者に教えられる", value: 55 },
    { label: "教材・サービスに体系化している", value: 72 },
    { label: "自分抜きでも価値が届く／広がっている", value: 92 },
  ],
};

/** レベル。null = まだ分からない（不明） */
export type HeroLevels = Record<HeroDomain, number | null>;

export function emptyLevels(): HeroLevels {
  return { inner: null, embodiment: null, relationship: null, delivery: null, socialization: null };
}

export type HeroRow = {
  enemy_world: string;
  desired_world: string;
  needed_people: string;
  hero_statement: string;
  levels: HeroLevels | null;
  assessment: any | null;
  history: { at: string; levels: HeroLevels }[] | null;
  assessed_at: string | null;
};

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
  prevHistory: { at: string; levels: HeroLevels }[] | null,
): Promise<void> {
  const supa = supabaseAdmin();
  const at = new Date().toISOString();
  const history = [...(prevHistory ?? []), { at, levels }].slice(-60);
  const { error } = await supa.from("hero").upsert({ user_id: userId, levels, history, updated_at: at, assessed_at: at });
  if (error) throw error;
}

export function hasIdentity(h: HeroRow | null): boolean {
  return !!(h && (h.desired_world?.trim() || h.hero_statement?.trim()));
}
