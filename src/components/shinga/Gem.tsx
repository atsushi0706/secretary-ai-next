"use client";

/**
 * クリスタル（宝石）の絵。
 *
 * 【なぜ作り直したか】
 * 前は CSS の clip-path で五角形を切って、上から下へグラデーションをかけただけだった。
 * 平らな紫の五角形にしか見えず、宝石に見えない。
 *
 * 宝石らしさは「形」ではなく **面（ファセット）の分かれ方** から来る。
 * ダイヤモンドのカットは
 *   ・上のテーブル（平らな天面）
 *   ・その周りのクラウン（斜めの面が放射状に並ぶ）
 *   ・下のパビリオン（先が尖るまで細くなる面）
 * に分かれていて、面ごとに明るさが違う。だから同じ色でも立体に見える。
 *
 * ここでは、その面をそれぞれ別のポリゴンとして描いて、
 * 面ごとに明るさを変えている。**輪郭を1つ切るのではなく、面を並べる。**
 */

/** 石の色。名前は保管庫でも使うので、増やしても既存の石は壊れない */
export const GEM_HUES = [
  { key: "amethyst", label: "紫", top: "#f0d9ff", mid: "#b57ce0", deep: "#6d3fa0", glow: "#c48cff" },
  { key: "sapphire", label: "青", top: "#d6ecff", mid: "#6fa8e6", deep: "#2d5aa0", glow: "#7ab8ff" },
  { key: "emerald", label: "緑", top: "#d8ffe9", mid: "#5fc48f", deep: "#1f7a52", glow: "#6fe3a8" },
  { key: "topaz", label: "金", top: "#fff2cf", mid: "#e6bb64", deep: "#a37a20", glow: "#ffd479" },
  { key: "ruby", label: "紅", top: "#ffdbe2", mid: "#e06a86", deep: "#96263f", glow: "#ff8ba3" },
  { key: "aqua", label: "水", top: "#d8fbff", mid: "#63cbd8", deep: "#1f7a86", glow: "#7ce6f2" },
  { key: "rose", label: "桃", top: "#ffe4f2", mid: "#e08cc0", deep: "#9c3d78", glow: "#ffa3da" },
  { key: "moon", label: "白", top: "#ffffff", mid: "#cfd6e8", deep: "#7d8699", glow: "#e8eeff" },
] as const;

export type GemHue = typeof GEM_HUES[number]["key"];

/** 名前から色を引く。知らない名前でも落ちない */
export function gemHue(key: string | null | undefined) {
  return GEM_HUES.find((h) => h.key === key) ?? GEM_HUES[0];
}

/**
 * 名前から、いつも同じ色を選ぶ。
 * 保管庫に並べたとき、同じ石がいつも同じ色でないと「あれ、どれだっけ」になる。
 */
export function hueFor(seed: string): GemHue {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) % 100000;
  return GEM_HUES[n % GEM_HUES.length].key;
}

export function Gem({
  hue = "amethyst",
  size = 84,
  /** できあがった瞬間だけ、輝きを回す */
  sparkle = false,
}: {
  hue?: string;
  size?: number;
  sparkle?: boolean;
}) {
  const h = gemHue(hue);
  const w = size * 0.74;

  return (
    <svg className={`gem ${sparkle ? "is-sparkle" : ""}`}
      width={w} height={size} viewBox="0 0 74 100" aria-hidden
      style={{ ["--glow" as any]: h.glow }}>
      <defs>
        {/* 面ごとの明るさを作るための、3段の塗り */}
        <linearGradient id={`g-t-${h.key}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity=".95" />
          <stop offset="100%" stopColor={h.top} />
        </linearGradient>
        <linearGradient id={`g-m-${h.key}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={h.top} />
          <stop offset="100%" stopColor={h.mid} />
        </linearGradient>
        <linearGradient id={`g-d-${h.key}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={h.mid} />
          <stop offset="100%" stopColor={h.deep} />
        </linearGradient>
      </defs>

      {/* ── クラウン（上の斜めの面）。放射状に分かれているのが宝石らしさ ── */}
      {/* テーブル（平らな天面） */}
      <polygon points="26,20 48,20 55,27 19,27" fill={`url(#g-t-${h.key})`} />
      {/* 天面のまわり、左右の斜め面 */}
      <polygon points="26,20 19,27 4,30 15,14" fill={`url(#g-m-${h.key})`} opacity=".92" />
      <polygon points="48,20 55,27 70,30 59,14" fill={`url(#g-m-${h.key})`} opacity=".78" />
      {/* 肩の面 */}
      <polygon points="15,14 26,20 48,20 59,14 37,8" fill={`url(#g-t-${h.key})`} opacity=".7" />
      <polygon points="4,30 19,27 55,27 70,30 37,33" fill={`url(#g-m-${h.key})`} opacity=".55" />

      {/* ── パビリオン（下の面）。先が尖るまで細くなる ── */}
      <polygon points="4,30 37,33 37,96" fill={`url(#g-d-${h.key})`} />
      <polygon points="70,30 37,33 37,96" fill={`url(#g-d-${h.key})`} opacity=".82" />
      <polygon points="19,27 37,33 26,66" fill={`url(#g-m-${h.key})`} opacity=".42" />
      <polygon points="55,27 37,33 48,66" fill={`url(#g-m-${h.key})`} opacity=".3" />

      {/* 輪郭を細く重ねて、面の切れ目をはっきりさせる */}
      <g stroke="#fff" strokeOpacity=".28" strokeWidth=".7" fill="none">
        <path d="M4,30 L15,14 L37,8 L59,14 L70,30 L37,96 Z" />
        <path d="M19,27 L26,20 L48,20 L55,27 Z" />
        <path d="M4,30 L37,33 L70,30" />
        <path d="M15,14 L26,20 M59,14 L48,20 M37,8 L37,20" />
        <path d="M19,27 L26,66 M55,27 L48,66" />
      </g>

      {/* いちばん明るい一点。これがあると「光っている」に見える */}
      <ellipse cx="31" cy="23" rx="6" ry="2.6" fill="#fff" opacity=".75" />
    </svg>
  );
}
