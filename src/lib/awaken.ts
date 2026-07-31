/**
 * 覚醒能力（六角形チャート）とスキルカード。
 *
 * 主人公レベル(%)＝「理想の現実にどれだけ近づいたか」＝外側の進捗。
 * それとは別に、各ワークで磨かれる"内側の能力"をここで持つ。
 *
 * 六角形のうち4つを解放、残り2つは鍵つき（設計が決まったら開ける）。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";

export type AbilityKey = "image" | "insight" | "grounding" | "resonance" | "locked1" | "locked2";

export type Ability = {
  key: AbilityKey;
  label: string;
  desc: string;
  how: string;          // 何をすると伸びるか
  locked: boolean;      // 鍵つき（まだ開けない）
  value: number;        // 0-100
};

/** どのワークが、どの能力を、どれだけ磨くか */
const GAIN = {
  walk: { image: 6 },                 // パラレルウォーク → イメージ力
  card: { image: 4, grounding: 3 },   // 未来からのクエスト（受け取る）→ イメージ＋現実化
  wall: { insight: 7 },               // ウォールブレイク → 内観力
  quest: { grounding: 6 },            // クエストを✓（現実に落とす）→ 現実化力
  emotion: { insight: 2 },            // 気持ちのチェック → 内観力
  breath: { resonance: 4 },           // 呼吸で整える → 共鳴力（状態を合わせる力）
} as const;

export const ABILITIES: Omit<Ability, "value">[] = [
  { key: "image", label: "イメージ力", desc: "まだ無いものを、ありありと描く力", how: "パラレルウォーク / 未来からのクエスト", locked: false },
  { key: "insight", label: "内観力", desc: "自分の奥にあるものを、見つめて言葉にする力", how: "ウォールブレイク / きもちのチェック", locked: false },
  { key: "grounding", label: "現実化力", desc: "描いたものを、今日の一手に落とす力", how: "ハイヤークエストを✓する", locked: false },
  { key: "resonance", label: "共鳴力", desc: "自分の状態を、望む周波数に合わせる力", how: "ピークステート（呼吸で整える）", locked: false },
  { key: "locked1", label: "？？？", desc: "まだ開かない能力", how: "解放条件は、これから明かされる", locked: true },
  { key: "locked2", label: "？？？", desc: "まだ開かない能力", how: "解放条件は、これから明かされる", locked: true },
];

export type SkillCard = {
  id?: number;
  key: string;
  title: string;
  body: string;
  rarity: "bronze" | "silver" | "gold";
  source: string;
  date: string;
};

const MAX = 100;

/** 実データから、各能力の現在値を算出する */
export async function computeAbilities(userId: string): Promise<Ability[]> {
  const supa = supabaseAdmin();
  const [walks, cards, wall, quests, emo, breath] = await Promise.all([
    supa.from("walk_logs").select("date").eq("user_id", userId).then((r) => r.data ?? [], () => []),
    supa.from("quest_cards").select("date, done").eq("user_id", userId).then((r) => r.data ?? [], () => []),
    supa.from("shinga_conversations").select("date").eq("user_id", userId).eq("role", "user").eq("place", "deep")
      .then((r) => r.data ?? [], () => []),
    supa.from("higher_quest").select("date, items").eq("user_id", userId).then((r) => r.data ?? [], () => []),
    supa.from("emotion_logs").select("date").eq("user_id", userId).then((r) => r.data ?? [], () => []),
    supa.from("shinga_conversations").select("date").eq("user_id", userId).eq("place", "peak")
      .then((r) => r.data ?? [], () => []),
  ]);

  const days = (rows: any[]) => new Set(rows.map((r) => r?.date).filter(Boolean)).size;
  const questDoneDays = new Set<string>();
  for (const q of quests as any[]) {
    const items = Array.isArray(q.items) ? q.items : [];
    if (items.some((it: any) => it?.done)) questDoneDays.add(q.date);
  }

  const acc: Record<string, number> = { image: 0, insight: 0, grounding: 0, resonance: 0 };
  const add = (g: Record<string, number>, n: number) => {
    for (const [k, v] of Object.entries(g)) acc[k] = (acc[k] ?? 0) + v * n;
  };
  add(GAIN.walk, days(walks as any[]));
  add(GAIN.card, days((cards as any[]).filter((c) => c?.done)));
  add(GAIN.wall, days(wall as any[]));
  add(GAIN.quest, questDoneDays.size);
  add(GAIN.emotion, days(emo as any[]));
  add(GAIN.breath, days(breath as any[]));

  return ABILITIES.map((a) => ({
    ...a,
    value: a.locked ? 0 : Math.min(MAX, Math.round(acc[a.key] ?? 0)),
  }));
}

/** 手に入れたスキルカードを読む（新しい順） */
export async function listSkillCards(userId: string): Promise<SkillCard[]> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("skill_cards").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(60);
    return (data ?? []) as SkillCard[];
  } catch { return []; }
}

/** スキルカードを1枚授ける（同じkeyは1枚だけ） */
export async function grantSkillCard(
  userId: string,
  card: { key: string; title: string; body: string; rarity: SkillCard["rarity"]; source: string },
): Promise<void> {
  try {
    const supa = supabaseAdmin();
    await supa.from("skill_cards").upsert(
      { user_id: userId, ...card, date: jstDateStr(), created_at: new Date().toISOString() },
      { onConflict: "user_id,key" },
    );
  } catch { /* テーブル未作成でも本体は動かす */ }
}
