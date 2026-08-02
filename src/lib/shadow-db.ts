/**
 * 影獣の鏡：記録の保存。サーバ専用（parts-db と同じ役割分担）。
 *
 * 保存するのは「回収の結果」だけ。
 * 相談の生々しい本文は保存しない（機微な話が入る場所なので、最小限にする）。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";
import type { ShadowCard, ShadowPairId } from "./shadow";

export type ShadowEncounterRow = {
  id: string;
  date: string;
  pair_id: ShadowPairId;
  card: ShadowCard;
  created_at: string;
};

/** 完成カードを1件保存して、これまでの件数を返す */
export async function saveShadowEncounter(
  userId: string,
  card: ShadowCard,
): Promise<{ total: number }> {
  const supa = supabaseAdmin();
  await supa.from("shadow_encounters").insert({
    user_id: userId,
    date: jstDateStr(),
    pair_id: card.pairId,
    card,
  });
  const { count } = await supa.from("shadow_encounters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return { total: count ?? 1 };
}

/** 履歴（新しい順）。パターンの押しつけはしない——並べるだけ */
export async function listShadowEncounters(userId: string, limit = 60): Promise<ShadowEncounterRow[]> {
  const supa = supabaseAdmin();
  const { data } = await supa.from("shadow_encounters")
    .select("id, date, pair_id, card, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ShadowEncounterRow[];
}

export async function deleteShadowEncounter(userId: string, id: string): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("shadow_encounters").delete().eq("user_id", userId).eq("id", id);
}
