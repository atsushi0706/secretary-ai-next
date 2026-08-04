/**
 * クリスタルの色。**画面からもサーバからも使う**ので、DBは触らない。
 *
 * 36色。並んだときに「同じ色ばかり」に見えないよう、色相を10度ずつずらして一周させる。
 * どの色になるかは、名前から決める（同じ名前なら同じ色）。
 * 適当に散らすと、開き直すたびに色が変わって「あれ、どれだっけ」になるため。
 */

export const CRYSTAL_COLORS = 36;

/** 名前から色番号を決める（同じ名前なら、いつでも同じ色） */
export function colorOf(name: string, salt = ""): number {
  const s = `${name}${salt}`;
  let h = 2166136261;                       // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % CRYSTAL_COLORS;
}

export type CrystalHue = {
  /** 面の明るい側 */
  light: string;
  /** 面の暗い側 */
  dark: string;
  /** 芯の光 */
  core: string;
  /** まわりのにじみ */
  glow: string;
};

/**
 * 色番号 → 実際の色。
 * 明度・彩度は固定して、色相だけ回す。こうすると36個並んでも印象がそろう。
 */
export function hueOf(i: number): CrystalHue {
  const n = ((i % CRYSTAL_COLORS) + CRYSTAL_COLORS) % CRYSTAL_COLORS;
  const h = n * (360 / CRYSTAL_COLORS);
  return {
    light: `hsl(${h} 82% 74%)`,
    dark: `hsl(${(h + 14) % 360} 62% 38%)`,
    core: `hsl(${h} 95% 88%)`,
    glow: `hsla(${h} 90% 62% / .55)`,
  };
}
