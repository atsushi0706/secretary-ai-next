/**
 * シンガワールドの「場所」。
 *
 * ここが UI の骨格になる。ユーザーはボタンで移動するのではなく、
 * 中央のAIと話すことで移動する。AIが <move>キー</move> を返すと地図が動く。
 *
 * x / y は地図画像（public/singa-map.jpg）の上での位置（％）。
 * 地図の絵に描かれている場所と一致させてある。
 */

export type PlaceKey =
  | "map"        // 地図の全体（まだどこにも行っていない）
  | "sky"        // 可能性の空 — クエスト
  | "forest"     // 直感の森 — 歩きながら話す
  | "clarity"    // 明晰の広場 — 見極める・選ぶ
  | "sanctuary"  // 自己開示の聖域 — ただ話す
  | "shrine"     // シンボルの社 — しるしを読む
  | "river"      // 感情の川 — 状態パラメーター
  | "bridge"     // 勇気の橋 — 一歩踏み出す
  | "shadow"     // 影の洞窟 — 向き合う
  | "garden"     // 癒しの庭 — 休む
  | "treasure";  // 心の宝 — 振り返り

export type Place = {
  key: PlaceKey;
  en: string;
  ja: string;
  /** 地図の上での位置（％） */
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
    key: "map", en: "Treasure Map of the Inner Heart", ja: "心の地図", x: 50, y: 50,
    hue: "#c9a227",
    tagline: "今日はどこへ行く？",
    role: "まだ行き先が決まっていない。相手の様子を見て、どこへ行きたいかを一緒に決める場所。",
    panel: "none",
  },
  sky: {
    key: "sky", en: "The Sky of Possibilities", ja: "可能性の空", x: 20, y: 14,
    hue: "#5566b8",
    tagline: "やってみたいことを、置いておく場所。",
    role: "人生で体験したいこと・挑戦したいことを見つけて、クエストとして置く場所。仕事に限らず、遊びも家族との時間も含む。",
    panel: "quests",
  },
  forest: {
    key: "forest", en: "The Forest of Intuition", ja: "直感の森", x: 15, y: 37,
    hue: "#3f7a55",
    tagline: "魂のささやきを聴く。",
    role: "歩きながら話す場所。整理させず、浮かんできたことをそのまま受け取る。まとめようとしない。",
    panel: "walk",
  },
  clarity: {
    key: "clarity", en: "The Clearing of Clarity", ja: "明晰の広場", x: 56, y: 28,
    hue: "#6fb0c8",
    tagline: "まっすぐ見て、選ぶ。",
    role: "迷っていることを整理して、選ぶ場所。急がせず、選択肢を並べて本人に選ばせる。代わりに決めない。",
    panel: "none",
  },
  sanctuary: {
    key: "sanctuary", en: "The Sanctuary of Self-Disclosure", ja: "自己開示の聖域", x: 82, y: 20,
    hue: "#9a7bc0",
    tagline: "本当のことを話す。見られる。自分でいる。",
    role: "誰にも言えないことを話す場所。解決しようとせず、良し悪しを付けず、ただ聞く。",
    panel: "none",
  },
  shrine: {
    key: "shrine", en: "The Shrine of Symbols", ja: "シンボルの社", x: 91, y: 41,
    hue: "#b08fd0",
    tagline: "すべてのしるしが、鍵を持っている。",
    role: "繰り返し出てくる言葉・夢・気になるものを、しるしとして受け取る場所。意味を決めつけず、本人に感じさせる。",
    panel: "none",
  },
  river: {
    key: "river", en: "The River of Emotion", ja: "感情の川", x: 47, y: 48,
    hue: "#3b9fc8",
    tagline: "感じる。流れる。動かされる。",
    role: "いまの心の状態と体のエネルギーを記録する場所。1日2回まで。良し悪しを判定せず、ただ受け取る。",
    panel: "state",
  },
  bridge: {
    key: "bridge", en: "The Bridge of Courage", ja: "勇気の橋", x: 43, y: 58,
    hue: "#c8913b",
    tagline: "怖さを渡る。育つほうを選ぶ。",
    role: "怖いけれど進みたいことに、一歩踏み出す場所。背中を押しすぎず、渡れる大きさまで小さくする。",
    panel: "quests",
  },
  shadow: {
    key: "shadow", en: "The Cave of Shadow", ja: "影の洞窟", x: 22, y: 64,
    hue: "#6b4b9b",
    tagline: "隠れているものと向き合い、昇る。",
    role: "避けてきたこと・怖いことに向き合う場所。急がせない。本人が触れられる分だけ触れる。",
    panel: "none",
  },
  garden: {
    key: "garden", en: "The Garden of Healing", ja: "癒しの庭", x: 45, y: 79,
    hue: "#5b9f6b",
    tagline: "休む。回復する。もう一度咲く。",
    role: "休む場所。何かをさせようとしない。提案も指示もしない。ねぎらうだけ。",
    panel: "none",
  },
  treasure: {
    key: "treasure", en: "The Treasure of the Heart", ja: "心の宝", x: 78, y: 69,
    hue: "#d8a53b",
    tagline: "あなたの贈り物を、世界に手渡す。",
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
