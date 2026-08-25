"use client";

/**
 * 漫画のコマの絵。
 *
 * いまは線画（SVG）。本物の絵ができたら、台本の Panel に `img` を足せばそちらが出る。
 * ここは「何が描いてあるかが一目で分かる」ことだけを目標にした簡素な絵。
 * 主線は黒、影はトーン（斜線パターン）。
 */

const INK = "#1c1c1c";
const TONE = "url(#lrn-tone)";

function Defs() {
  return (
    <defs>
      <pattern id="lrn-tone" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="1.2" opacity=".55" />
      </pattern>
      <pattern id="lrn-tone2" width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2.5" r="1" fill={INK} opacity=".5" />
      </pattern>
    </defs>
  );
}

/* 部品 ────────────────────────────── */

/** 横たわる少年（ベッド） */
function Bed({ x = 0, y = 0, s = 1, eyesOpen = true }: { x?: number; y?: number; s?: number; eyesOpen?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* ベッド */}
      <rect x="10" y="95" width="200" height="30" rx="4" fill="#fff" />
      <line x1="10" y1="125" x2="10" y2="150" /><line x1="210" y1="125" x2="210" y2="150" />
      <rect x="10" y="60" width="200" height="38" rx="6" fill={TONE} />
      {/* 枕と頭 */}
      <rect x="20" y="66" width="52" height="26" rx="10" fill="#fff" />
      <circle cx="48" cy="76" r="16" fill="#fff" />
      <path d="M33 70 q8 -18 30 -10 q6 4 2 10" fill={INK} />
      {eyesOpen ? <><line x1="42" y1="78" x2="47" y2="78" /><line x1="53" y1="78" x2="58" y2="78" /></>
        : <><path d="M41 79 q3 2 6 0" /><path d="M52 79 q3 2 6 0" /></>}
      {/* 布団 */}
      <path d="M72 66 q80 -10 130 6 v26 h-130 z" fill="#fff" />
      <path d="M72 66 q80 -10 130 6" />
    </g>
  );
}

/** 指先 */
function Hand({ x = 0, y = 0, s = 1, twitch = false }: { x?: number; y?: number; s?: number; twitch?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth="2.6" fill="#fff" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 120 q-10 -40 10 -70 q8 -10 14 4 l4 30 q6 -30 10 -40 q10 -12 14 2 l-2 36 q6 -24 10 -32 q10 -10 14 4 l-6 34 q6 -14 10 -18 q10 -6 10 8 l-10 40 q-6 30 -34 34 q-30 2 -44 -32 z" />
      {twitch && (
        <g stroke={INK} strokeWidth="2">
          <line x1="88" y1="40" x2="100" y2="28" /><line x1="98" y1="56" x2="114" y2="52" /><line x1="72" y1="30" x2="76" y2="16" />
        </g>
      )}
    </g>
  );
}

/** 立っている人（横向き）。arms: 腕の向き */
function Person({ x = 0, y = 0, s = 1, sit = false, motion = false, hair = "short", arms = false }:
  { x?: number; y?: number; s?: number; sit?: boolean; motion?: boolean; hair?: "short" | "long"; arms?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth="2.4" fill="#fff" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="40" cy="22" r="16" />
      {hair === "long"
        ? <path d="M24 20 q4 -22 32 -14 q6 8 2 24 q-2 16 -6 22 M26 22 q-4 14 0 26" fill={INK} />
        : <path d="M25 16 q10 -16 30 -6 q4 6 -2 8 q-12 -6 -28 2" fill={INK} />}
      {sit ? (
        <>
          <path d="M28 40 h24 l4 40 h-32 z" fill={TONE} />
          <path d="M24 80 h34 l-2 28 M30 80 l-2 28" />
          <rect x="12" y="78" width="56" height="6" fill="#fff" />
        </>
      ) : (
        <>
          <path d="M26 40 h28 l6 50 h-40 z" fill={TONE} />
          <path d="M30 90 l-2 44 M50 90 l4 44" />
          <line x1="26" y1="134" x2="36" y2="134" /><line x1="52" y1="134" x2="62" y2="134" />
        </>
      )}
      {arms ? <path d="M26 46 l-14 22 M54 46 l14 22" /> : <path d="M26 46 v28 M54 46 v28" />}
      {motion && (
        <g stroke={INK} strokeWidth="2" opacity=".8">
          <path d="M76 100 q10 -20 4 -40" /><path d="M84 108 q14 -26 6 -52" />
          <path d="M-6 120 l-10 -6 M-6 128 l-12 0" />
        </g>
      )}
    </g>
  );
}

/** 人影（医師・家族） */
function Silhouette({ x = 0, y = 0, s = 1, tall = 1 }: { x?: number; y?: number; s?: number; tall?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={INK}>
      <circle cx="30" cy="20" r="15" />
      <path d={`M10 40 q20 -12 40 0 l6 ${80 * tall} h-52 z`} />
    </g>
  );
}

/** 目のアップ */
function Eye({ x = 0, y = 0, s = 1, wide = false }: { x?: number; y?: number; s?: number; wide?: boolean }) {
  const h = wide ? 38 : 26;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth="3" fill="#fff" strokeLinecap="round">
      <path d={`M0 ${h} q80 -${h * 2} 160 0 q-80 ${h * 1.6} -160 0 z`} />
      <circle cx="80" cy={h} r={wide ? 20 : 16} fill={INK} />
      <circle cx="80" cy={h} r={wide ? 9 : 7} fill="#fff" stroke="none" />
      <circle cx="72" cy={h - 8} r="4" fill="#fff" stroke="none" />
      <path d={`M6 ${h - 8} q74 -${h * 2 + 10} 148 0`} strokeWidth="5" />
      {wide && <g strokeWidth="2"><line x1="20" y1="-6" x2="10" y2="-20" /><line x1="140" y1="-6" x2="150" y2="-20" /></g>}
    </g>
  );
}

/* コマ ────────────────────────────── */

const SCENES: Record<string, (w: number, h: number) => React.ReactNode> = {
  /* 病床の少年（部屋） */
  bed: (w, h) => (
    <>
      <rect x="0" y="0" width={w} height={h * 0.55} fill="url(#lrn-tone2)" opacity=".5" />
      <rect x={w * 0.62} y={h * 0.08} width={w * 0.26} height={h * 0.3} fill="#fff" stroke={INK} strokeWidth="2.4" />
      <line x1={w * 0.75} y1={h * 0.08} x2={w * 0.75} y2={h * 0.38} stroke={INK} strokeWidth="2" />
      <Bed x={w * 0.08} y={h * 0.32} s={Math.min(w / 260, h / 190)} />
    </>
  ),
  /* 指先。動かない */
  finger: (w, h) => (
    <>
      <rect x="0" y="0" width={w} height={h} fill="url(#lrn-tone2)" opacity=".35" />
      <Hand x={w * 0.15} y={h * 0.1} s={Math.min(w / 140, h / 170)} />
    </>
  ),
  "finger-look": (w, h) => (
    <>
      <Hand x={w * 0.25} y={h * 0.15} s={Math.min(w / 150, h / 180)} />
      <Eye x={w * 0.02} y={h * 0.05} s={0.35 * Math.min(w / 160, h / 160)} />
    </>
  ),
  "finger-try": (w, h) => (
    <>
      <rect x="0" y="0" width={w} height={h} fill={TONE} opacity=".5" />
      <Hand x={w * 0.2} y={h * 0.12} s={Math.min(w / 150, h / 180)} />
      <g stroke={INK} strokeWidth="2.2">
        <path d={`M${w * 0.7} ${h * 0.3} q6 6 0 12`} /><path d={`M${w * 0.74} ${h * 0.5} q6 6 0 12`} />
      </g>
    </>
  ),
  /* 医師と家族 */
  doctor: (w, h) => (
    <>
      <Silhouette x={w * 0.05} y={h * 0.12} s={Math.min(w / 220, h / 150)} tall={1.1} />
      <Silhouette x={w * 0.36} y={h * 0.18} s={Math.min(w / 220, h / 150) * 0.9} />
      <Silhouette x={w * 0.62} y={h * 0.16} s={Math.min(w / 220, h / 150) * 0.95} />
      <rect x="0" y={h * 0.82} width={w} height={h * 0.18} fill={TONE} />
    </>
  ),
  /* 天井を見つめる */
  ceiling: (w, h) => (
    <>
      <rect x="0" y="0" width={w} height={h} fill="url(#lrn-tone2)" opacity=".25" />
      <circle cx={w * 0.5} cy={h * 0.22} r={Math.min(w, h) * 0.12} fill="#fff" stroke={INK} strokeWidth="2.4" />
      <line x1={w * 0.5} y1="0" x2={w * 0.5} y2={h * 0.1} stroke={INK} strokeWidth="2.4" />
      <Eye x={w * 0.5 - 80 * Math.min(w / 220, h / 220)} y={h * 0.62} s={Math.min(w / 220, h / 220)} />
    </>
  ),
  /* ベッドから部屋を眺める。奥に妹 */
  "room-sister": (w, h) => (
    <>
      <rect x="0" y="0" width={w} height={h} fill="url(#lrn-tone2)" opacity=".2" />
      <path d={`M0 ${h * 0.78} q${w * 0.5} -30 ${w} 0 v${h * 0.22} h-${w} z`} fill={TONE} />
      <Person x={w * 0.6} y={h * 0.22} s={Math.min(w / 220, h / 250) * 0.9} sit hair="long" />
      <rect x={w * 0.05} y={h * 0.08} width={w * 0.22} height={h * 0.34} fill="#fff" stroke={INK} strokeWidth="2.4" />
    </>
  ),
  /* 妹が立ち上がる。足→膝→腰 */
  "sister-stand": (w, h) => (
    <>
      <Person x={w * 0.35} y={h * 0.12} s={Math.min(w / 200, h / 210)} hair="long" motion />
      <g stroke={INK} strokeWidth="2.4" fill="none">
        <path d={`M${w * 0.14} ${h * 0.86} l0 -${h * 0.2}`} markerEnd="url(#lrn-arrow)" />
        <path d={`M${w * 0.14} ${h * 0.6} l0 -${h * 0.18}`} />
        <path d={`M${w * 0.14} ${h * 0.36} l0 -${h * 0.14}`} />
      </g>
    </>
  ),
  /* 妹の動きを観察するエリクソン（横長） */
  observe: (w, h) => (
    <>
      <Bed x={w * 0.02} y={h * 0.25} s={Math.min(w / 520, h / 190)} />
      <Person x={w * 0.68} y={h * 0.12} s={Math.min(w / 380, h / 200)} hair="long" motion />
      <path d={`M${w * 0.22} ${h * 0.44} q${w * 0.2} -${h * 0.3} ${w * 0.42} -${h * 0.12}`} stroke={INK} strokeWidth="1.6" strokeDasharray="6 6" fill="none" />
    </>
  ),
  "sister-move": (w, h) => (
    <>
      <Person x={w * 0.3} y={h * 0.1} s={Math.min(w / 200, h / 210)} hair="long" motion />
    </>
  ),
  /* 歩いていた記憶とベッドの自分 */
  "memory-walk": (w, h) => (
    <>
      <g opacity=".45">
        <Person x={w * 0.55} y={h * 0.06} s={Math.min(w / 230, h / 230)} />
        <Person x={w * 0.72} y={h * 0.1} s={Math.min(w / 230, h / 230) * 0.9} arms />
      </g>
      <rect x="0" y={h * 0.5} width={w} height={h * 0.5} fill="#fff" />
      <Bed x={w * 0.05} y={h * 0.5} s={Math.min(w / 260, h / 320)} />
    </>
  ),
  breath: (w, h) => (
    <g stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round">
      <path d={`M${w * 0.2} ${h * 0.75} q${w * 0.3} -${h * 0.7} ${w * 0.6} 0`} fill={TONE} />
      <path d={`M${w * 0.35} ${h * 0.25} q${w * 0.15} -${h * 0.2} ${w * 0.3} 0`} />
      <path d={`M${w * 0.42} ${h * 0.15} q${w * 0.08} -${h * 0.12} ${w * 0.16} 0`} opacity=".6" />
    </g>
  ),
  foot: (w, h) => (
    <g stroke={INK} strokeWidth="2.6" fill="#fff" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${w * 0.3} ${h * 0.1} v${h * 0.5} q0 ${h * 0.2} ${w * 0.35} ${h * 0.22} l${w * 0.1} 0 q${w * 0.05} -${h * 0.1} -${w * 0.08} -${h * 0.16} q-${w * 0.18} -${h * 0.06} -${w * 0.2} -${h * 0.12} v-${h * 0.44} z`} />
      <line x1={w * 0.3} y1={h * 0.55} x2={w * 0.55} y2={h * 0.62} />
    </g>
  ),
  /* ピク……と動く指 */
  twitch: (w, h) => (
    <>
      <rect x="0" y="0" width={w} height={h} fill="url(#lrn-tone2)" opacity=".2" />
      <Hand x={w * 0.32} y={h * 0.08} s={Math.min(w / 240, h / 180)} twitch />
      <g stroke={INK} strokeWidth="2.2" opacity=".7">
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const cx = w * 0.5, cy = h * 0.5, r1 = Math.min(w, h) * 0.46, r2 = r1 + 26;
          return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2} />;
        })}
      </g>
    </>
  ),
  eye: (w, h) => (
    <>
      <rect x="0" y="0" width={w} height={h} fill={TONE} opacity=".35" />
      <Eye x={w * 0.5 - 80 * Math.min(w / 200, h / 110)} y={h * 0.5 - 30 * Math.min(w / 200, h / 110)} s={Math.min(w / 200, h / 110)} wide />
    </>
  ),
  /* 自分の身体を観察する */
  "bed-observe": (w, h) => (
    <>
      <rect x="0" y="0" width={w} height={h} fill="url(#lrn-tone2)" opacity=".18" />
      <Bed x={w * 0.5 - 110 * Math.min(w / 300, h / 260)} y={h * 0.08} s={Math.min(w / 300, h / 260)} />
      <Hand x={w * 0.62} y={h * 0.5} s={Math.min(w / 420, h / 300)} />
    </>
  ),
  /* 次回：腕を組んだ男性 */
  "man-arms": (w, h) => (
    <>
      <rect x="0" y="0" width={w} height={h} fill="url(#lrn-tone2)" opacity=".2" />
      <g transform={`translate(${w * 0.5 - 40 * Math.min(w / 180, h / 200)} ${h * 0.12}) scale(${Math.min(w / 180, h / 200)})`} stroke={INK} strokeWidth="2.6" fill="#fff" strokeLinejoin="round">
        <circle cx="40" cy="24" r="18" />
        <path d="M22 18 q14 -18 36 -6 q4 6 -4 6 q-14 -4 -30 2" fill={INK} />
        <path d="M30 30 l4 4 M50 30 l-4 4" strokeWidth="3" />
        <path d="M16 46 h48 l8 60 h-64 z" fill={TONE} />
        <path d="M12 62 q28 26 56 0 M20 70 q20 12 40 0" strokeWidth="4" />
      </g>
    </>
  ),
  /* 次回：静かな表情のエリクソン */
  "erickson-calm": (w, h) => (
    <g transform={`translate(${w * 0.5 - 40 * Math.min(w / 180, h / 200)} ${h * 0.12}) scale(${Math.min(w / 180, h / 200)})`} stroke={INK} strokeWidth="2.6" fill="#fff" strokeLinejoin="round">
      <circle cx="40" cy="24" r="18" />
      <path d="M24 16 q12 -12 32 -4 q2 6 -4 6 q-12 -4 -28 0" fill={INK} opacity=".6" />
      <line x1="31" y1="24" x2="36" y2="24" /><line x1="44" y1="24" x2="49" y2="24" />
      <path d="M36 33 q4 3 8 0" />
      <path d="M18 46 h44 l6 60 h-56 z" fill="#fff" />
      <path d="M40 46 v20" />
    </g>
  ),
  "erickson-say": (w, h) => (
    <>
      <rect x="0" y="0" width={w} height={h} fill="url(#lrn-tone2)" opacity=".15" />
      <g transform={`translate(${w * 0.5 - 40 * Math.min(w / 160, h / 170)} ${h * 0.08}) scale(${Math.min(w / 160, h / 170)})`} stroke={INK} strokeWidth="2.6" fill="#fff" strokeLinejoin="round">
        <circle cx="40" cy="26" r="22" />
        <path d="M20 18 q14 -16 40 -6 q2 6 -4 8 q-14 -6 -34 0" fill={INK} opacity=".6" />
        <line x1="29" y1="26" x2="35" y2="26" /><line x1="45" y1="26" x2="51" y2="26" />
        <path d="M34 37 q6 5 12 0" />
        <path d="M14 52 h52 l8 70 h-68 z" fill="#fff" />
        <path d="M40 52 v24" />
      </g>
    </>
  ),
};

export function MangaArt({ art, className = "" }: { art: string; className?: string }) {
  // 描く箱は 300×300 を基準にして、CSS で引き伸ばす（縦横比はコマ側の都合に合わせる）
  const W = 300, H = 300;
  const draw = SCENES[art];
  return (
    <svg className={`lrn-art ${className}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Defs />
      <defs>
        <marker id="lrn-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill={INK} />
        </marker>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="#fff" />
      {draw ? draw(W, H) : (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="16" fill={INK}>{art}</text>
      )}
    </svg>
  );
}
