/**
 * シンガワールドの「場所」。
 *
 * ここが UI の骨格になる。ユーザーはボタンで移動するのではなく、
 * 中央のAIと話すことで移動する。AIが <move>キー</move> を返すと地図が動く。
 */

export type PlaceKey =
  | "map"        // 地図の全体（まだどこにも行っていない）
  | "sky"        // 可能性の空 — クエスト
  | "forest"     // 直感の森 — 歩きながら話す
  | "river"      // 感情の川 — 状態パラメーター
  | "sanctuary"  // 自己開示の聖域 — ただ話す
  | "shadow"     // 影の洞窟 — 向き合う
  | "garden"     // 癒しの庭 — 休む
  | "treasure";  // 心の宝 — 振り返り

export type Place = {
  key: PlaceKey;
  en: string;
  ja: string;
  /** 地図上のどこにあるか（％）。中央のAIから見た位置 */
  x: number;
  y: number;
  /** その場所の空気の色 */
  hue: string;
  /** 一言 */
  tagline: string;
  /** AI に渡す説明（ここに来たとき何をする場所か） */
  role: string;
  /** その場所で開く道具（UIパネル） */
  panel: "none" | "quests" | "state" | "reflect" | "walk";
};

export const PLACES: Record<PlaceKey, Place> = {
  map: {
    key: "map", en: "The Inner Map", ja: "地図", x: 50, y: 50,
    hue: "#a8812f",
    tagline: "今日はどこへ行く？",
    role: "まだ行き先が決まっていない。相手の様子を見て、どこへ行きたいかを一緒に決める場所。",
    panel: "none",
  },
  sky: {
    key: "sky", en: "The Sky of Possibilities", ja: "可能性の空", x: 22, y: 16,
    hue: "#4a76b8",
    tagline: "やってみたいことを、置いておく場所。",
    role: "人生で体験したいこと・挑戦したいことを見つけて、クエストとして置く場所。仕事に限らず、遊びも家族との時間も含む。",
    panel: "quests",
  },
  forest: {
    key: "forest", en: "The Forest of Intuition", ja: "直感の森", x: 16, y: 44,
    hue: "#3f6b4f",
    tagline: "歩きながら、浮かんできたことを話す。",
    role: "歩きながら話す場所。整理させず、浮かんできたことをそのまま受け取る。まとめようとしない。",
    panel: "walk",
  },
  river: {
    key: "river", en: "The River of Emotion", ja: "感情の川", x: 50, y: 40,
    hue: "#3b8fa8",
    tagline: "いまの状態を、数字にしておく。",
    role: "いまの心の状態と体のエネルギーを記録する場所。1日2回まで。良し悪しを判定せず、ただ受け取る。",
    panel: "state",
  },
  sanctuary: {
    key: "sanctuary", en: "The Sanctuary of Self-Disclosure", ja: "自己開示の聖域", x: 80, y: 20,
    hue: "#8a6bb0",
    tagline: "本当のことを、話していい場所。",
    role: "誰にも言えないことを話す場所。解決しようとせず、良し悪しを付けず、ただ聞く。",
    panel: "none",
  },
  shadow: {
    key: "shadow", en: "The Cave of Shadow", ja: "影の洞窟", x: 12, y: 76,
    hue: "#4b3b6b",
    tagline: "見たくなかったものと、向き合う。",
    role: "避けてきたこと・怖いことに向き合う場所。急がせない。本人が触れられる分だけ触れる。",
    panel: "none",
  },
  garden: {
    key: "garden", en: "The Garden of Healing", ja: "癒しの庭", x: 44, y: 82,
    hue: "#5b8f6b",
    tagline: "何もしなくていい場所。",
    role: "休む場所。何かをさせようとしない。提案も指示もしない。ねぎらうだけ。",
    panel: "none",
  },
  treasure: {
    key: "treasure", en: "The Treasure of the Heart", ja: "心の宝", x: 82, y: 72,
    hue: "#b8862f",
    tagline: "やってみて、どうだった？",
    role: "リアルバースで動いた結果を振り返る場所。何が変わったか、青写真と何が違ったかを一緒に見る。",
    panel: "reflect",
  },
};

export const PLACE_KEYS = Object.keys(PLACES) as PlaceKey[];

export function isPlaceKey(v: unknown): v is PlaceKey {
  return typeof v === "string" && v in PLACES;
}

/** AI に渡す「行ける場所の一覧」 */
export function placesForPrompt(): string {
  return PLACE_KEYS
    .filter((k) => k !== "map")
    .map((k) => {
      const p = PLACES[k];
      return `- ${k}（${p.ja}）: ${p.role}`;
    })
    .join("\n");
}
