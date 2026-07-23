/**
 * シンガワールドの5つのゾーン。新しい地図（内なる世界の宝の地図）に対応。
 *
 * 中央がピークステート（状態づくり）。すべての土台。
 * その周りに4つ。会話の中で、その場所へ「上がっていく／移動していく」。
 *
 * x / y は地図画像の上での位置（％）。地図の絵と合わせてある。
 */

export type PlaceKey =
  | "peak"     // ピークステート（中央・状態づくり）
  | "walk"     // パラレルウォーク（左上）
  | "akashic"  // アカシックレコーダー（右上）
  | "higher"   // ハイヤークエスト（左下）
  | "deep";    // ディープアイデンティティ（右下）

export type Place = {
  key: PlaceKey;
  en: string;
  ja: string;
  /** 地図の上での位置（％） */
  x: number;
  y: number;
  /** そのゾーンの光の色 */
  hue: string;
  /** 一言 */
  tagline: string;
  /** この場所で開く道具（UIパネル） */
  panel: "none" | "peak" | "akashic";
};

export const PLACES: Record<PlaceKey, Place> = {
  peak: {
    key: "peak", en: "Peak State", ja: "ピークステート", x: 50, y: 54,
    hue: "#e8c15a",
    tagline: "すべての土台になる、状態づくりの中核。",
    panel: "peak",
  },
  walk: {
    key: "walk", en: "Parallel Walk", ja: "パラレルウォーク", x: 24, y: 26,
    hue: "#6f78d0",
    tagline: "可能性の道を歩き、自分の未来を探索する。",
    panel: "none",
  },
  akashic: {
    key: "akashic", en: "Akashic Recorder", ja: "アカシックレコーダー", x: 78, y: 24,
    hue: "#e0b45a",
    tagline: "記録から洞察を受け取り、サイクルを見て現実に活かす。",
    panel: "akashic",
  },
  higher: {
    key: "higher", en: "Higher Quest", ja: "ハイヤークエスト", x: 17, y: 84,
    hue: "#c9a24a",
    tagline: "魂が本当に何を求めているのかを確かめる、上昇のワーク。",
    panel: "none",
  },
  deep: {
    key: "deep", en: "Deep Identity", ja: "ディープアイデンティティ", x: 84, y: 84,
    hue: "#8a6bc0",
    tagline: "今の現実をつくっている、深層の自分を見つめる。",
    panel: "none",
  },
};

export const PLACE_KEYS = Object.keys(PLACES) as PlaceKey[];

export function isPlaceKey(v: unknown): v is PlaceKey {
  return typeof v === "string" && v in PLACES;
}

/** AI に渡す「行ける場所の一覧」 */
export function placesForPrompt(): string {
  return PLACE_KEYS
    .map((k) => {
      const p = PLACES[k];
      return `- ${k}（${p.ja}）: ${p.tagline}`;
    })
    .join("\n");
}
