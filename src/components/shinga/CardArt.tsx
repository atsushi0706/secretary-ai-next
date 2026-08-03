"use client";

/**
 * スキルカードの柄。
 *
 * 【なぜ絵をAIで描かせないか】
 * カードは手に入るたびに増える。そのたびに画像を生成すると、お金も時間もかかるし、
 * 出るまで待たされる。しかも二度と同じ柄が再現できない（作り直すと別物になる）。
 *
 * そこで「そのカード自身の名前から、柄を決める」ことにした。
 * 同じカードなら何度開いても必ず同じ紋章が出るし、違うカードなら必ず違う紋章になる。
 * つまり **その人が手に入れたカードだけの柄** が、その場で・ただで・一瞬で出る。
 *
 * 決まるもの：対称の数、環の数、光条の本数、中心のかたち、傾き、飾りの位置。
 * 金・銀・銅で色と枠の豪華さが変わる（金だけ箔の輝きが走る）。
 */

type Rarity = "gold" | "silver" | "bronze";

/** 文字列から数のタネを作る（同じ文字列なら必ず同じ数になる） */
function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** タネから、同じ順番で同じ数を出し続ける小さな乱数（毎回同じ絵になる） */
function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

const PALETTE: Record<Rarity, { a: string; b: string; line: string; glow: string; bg1: string; bg2: string }> = {
  gold:   { a: "#fff3cf", b: "#c9a55e", line: "#f0dca8", glow: "#eed69b", bg1: "#2a2114", bg2: "#0f0b06" },
  silver: { a: "#f2f5fa", b: "#94a0b4", line: "#dbe2ec", glow: "#c9d4e2", bg1: "#1b1f27", bg2: "#0a0c10" },
  bronze: { a: "#f0d6b8", b: "#a9764a", line: "#e0bb96", glow: "#cfa276", bg1: "#241a12", bg2: "#0e0906" },
};

export function CardArt({
  seed, rarity, size = 120, className,
}: {
  /** カードを一意に決める文字（key + title を渡す） */
  seed: string;
  rarity: Rarity;
  size?: number;
  className?: string;
}) {
  const p = PALETTE[rarity] ?? PALETTE.bronze;
  const r = rng(seedOf(seed));
  const uid = `ca${seedOf(seed).toString(36)}`;

  // このカードだけの形を決める
  const fold = 3 + Math.floor(r() * 6);          // 対称の数（3〜8）
  const rings = 2 + Math.floor(r() * 3);         // 環の数
  const rays = fold * (1 + Math.floor(r() * 2)); // 光条の本数
  const tilt = Math.floor(r() * 360);            // 全体の傾き
  const coreKind = Math.floor(r() * 3);          // 中心のかたち（円 / 多角形 / 星）
  const dotRing = r() > 0.45;                    // 点の環を足すか
  const petal = 0.42 + r() * 0.22;               // 花びらの伸び

  const C = 100;                                  // viewBox の中心
  const pts = (n: number, rad: number, rot = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + (rot * Math.PI) / 180;
      return `${(C + Math.cos(a) * rad).toFixed(1)},${(C + Math.sin(a) * rad).toFixed(1)}`;
    }).join(" ");

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id={`${uid}bg`} cx="50%" cy="38%">
          <stop offset="0%" stopColor={p.bg1} />
          <stop offset="100%" stopColor={p.bg2} />
        </radialGradient>
        <linearGradient id={`${uid}ln`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.a} />
          <stop offset="55%" stopColor={p.line} />
          <stop offset="100%" stopColor={p.b} />
        </linearGradient>
        {/* 金だけ、箔がななめに走る */}
        <linearGradient id={`${uid}foil`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity=".55" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}gl`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* 地 */}
      <rect x="0" y="0" width="200" height="200" rx="18" fill={`url(#${uid}bg)`} />

      {/* 二重の枠。金はいちばん太く、銅はいちばん素朴 */}
      <rect x="7" y="7" width="186" height="186" rx="14" fill="none"
        stroke={`url(#${uid}ln)`} strokeWidth={rarity === "gold" ? 2.4 : rarity === "silver" ? 1.8 : 1.4} opacity=".9" />
      {rarity !== "bronze" && (
        <rect x="14" y="14" width="172" height="172" rx="10" fill="none"
          stroke={p.line} strokeWidth=".7" opacity=".45" />
      )}

      <g transform={`rotate(${tilt} ${C} ${C})`} filter={`url(#${uid}gl)`}>
        {/* 光条 */}
        <g opacity={rarity === "gold" ? 0.5 : 0.34}>
          {Array.from({ length: rays }, (_, i) => {
            const a = (i / rays) * Math.PI * 2;
            const inner = 26, outer = 78 + (i % 2) * 8;
            return (
              <line key={i}
                x1={C + Math.cos(a) * inner} y1={C + Math.sin(a) * inner}
                x2={C + Math.cos(a) * outer} y2={C + Math.sin(a) * outer}
                stroke={p.line} strokeWidth={i % 2 ? 0.6 : 1.2} strokeLinecap="round" />
            );
          })}
        </g>

        {/* 環 */}
        {Array.from({ length: rings }, (_, i) => (
          <circle key={i} cx={C} cy={C} r={40 + i * 16} fill="none"
            stroke={`url(#${uid}ln)`} strokeWidth={i === 0 ? 1.6 : 0.8} opacity={0.85 - i * 0.18} />
        ))}

        {/* 花びら（対称の数だけ、外へ伸びる） */}
        <g opacity=".85">
          {Array.from({ length: fold }, (_, i) => {
            const a = (i / fold) * Math.PI * 2;
            const tipX = C + Math.cos(a) * (74 * petal + 40);
            const tipY = C + Math.sin(a) * (74 * petal + 40);
            const lx = C + Math.cos(a - 0.34) * 40, ly = C + Math.sin(a - 0.34) * 40;
            const rx = C + Math.cos(a + 0.34) * 40, ry = C + Math.sin(a + 0.34) * 40;
            return (
              <path key={i} d={`M${lx},${ly} Q${tipX},${tipY} ${rx},${ry}`}
                fill="none" stroke={`url(#${uid}ln)`} strokeWidth="1.3" />
            );
          })}
        </g>

        {/* 点の環 */}
        {dotRing && Array.from({ length: fold * 2 }, (_, i) => {
          const a = (i / (fold * 2)) * Math.PI * 2 + 0.2;
          return <circle key={i} cx={C + Math.cos(a) * 88} cy={C + Math.sin(a) * 88} r="1.6" fill={p.glow} opacity=".8" />;
        })}

        {/* 中心 */}
        {coreKind === 0 && (
          <>
            <circle cx={C} cy={C} r="20" fill="none" stroke={`url(#${uid}ln)`} strokeWidth="2" />
            <circle cx={C} cy={C} r="8" fill={p.glow} opacity=".9" />
          </>
        )}
        {coreKind === 1 && (
          <polygon points={pts(fold, 24)} fill="none" stroke={`url(#${uid}ln)`} strokeWidth="2" />
        )}
        {coreKind === 2 && (
          <>
            <polygon points={pts(fold, 26)} fill="none" stroke={`url(#${uid}ln)`} strokeWidth="1.4" />
            <polygon points={pts(fold, 26, 180 / fold)} fill="none" stroke={p.line} strokeWidth="1" opacity=".7" />
            <circle cx={C} cy={C} r="6" fill={p.glow} />
          </>
        )}
      </g>

      {/* 金だけ、斜めに箔が走る */}
      {rarity === "gold" && (
        <rect x="0" y="0" width="200" height="200" rx="18" fill={`url(#${uid}foil)`} style={{ mixBlendMode: "overlay" }} />
      )}

      {/* 四隅の飾り（金＝二重、銀＝一重、銅＝点） */}
      {[[16, 16], [184, 16], [16, 184], [184, 184]].map(([x, y], i) =>
        rarity === "bronze"
          ? <circle key={i} cx={x} cy={y} r="2" fill={p.line} opacity=".8" />
          : <g key={i} opacity=".9">
              <circle cx={x} cy={y} r="3.4" fill="none" stroke={p.line} strokeWidth="1" />
              {rarity === "gold" && <circle cx={x} cy={y} r="1.4" fill={p.glow} />}
            </g>
      )}
    </svg>
  );
}
