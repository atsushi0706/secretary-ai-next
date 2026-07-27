/**
 * 主人公レベルアップ機能。
 * 「望む世界」と「その世界を生きる主人公像」が、現実にどれだけ表れているかを
 * 5つの領域で可視化する。競争ではなく、自己認識→行動→現実化の成長支援。
 */
import { supabaseAdmin } from "./supabase";

export type HeroDomain = "inner" | "embodiment" | "relationship" | "delivery" | "socialization";

export const DOMAINS: { key: HeroDomain; label: string; hint: string }[] = [
  { key: "inner", label: "内側", hint: "望む世界と主人公像が、自分の中で明確か" },
  { key: "embodiment", label: "体現", hint: "その生き方が、自分の習慣・選択に表れているか" },
  { key: "relationship", label: "関係", hint: "身近な人との関わりに表れているか" },
  { key: "delivery", label: "提供", hint: "必要な人に、価値として届けられているか" },
  { key: "socialization", label: "社会化", hint: "自分を超えて、広がっているか" },
];

export type HeroLevels = Record<HeroDomain, number>;

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

export async function saveHeroAssessment(
  userId: string,
  levels: HeroLevels,
  assessment: any,
  prevHistory: { at: string; levels: HeroLevels }[] | null,
): Promise<void> {
  const supa = supabaseAdmin();
  const at = new Date().toISOString();
  const history = [...(prevHistory ?? []), { at, levels }].slice(-30); // 直近30回ぶんの推移
  const { error } = await supa.from("hero").upsert({
    user_id: userId, levels, assessment, history, assessed_at: at, updated_at: at,
  });
  if (error) throw error;
}

export function hasIdentity(h: HeroRow | null): boolean {
  return !!(h && (h.desired_world?.trim() || h.hero_statement?.trim()));
}
