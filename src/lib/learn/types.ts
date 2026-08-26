/**
 * AIラーニング（学びのピッコマ）の台本の型。
 *
 * 一話 = いくつかの「パート」の並び。
 *   manga      … 日本漫画形式のページ（右→左・上→下）
 *   experience … 先生の声と画面だけで進む、ひとつだけの体験
 *   adventure  … 背景探索・証拠・推理・自己適用を含む、シナリオ駆動の学習ゲーム
 *   classroom  … 旧形式の教室（既存回との互換用）
 *   qa         … 講義終了時の質問タイム（残りチケット）
 *   card       … 今日の原理を獲得
 *   outro      … 次回への導入（掛け合い）
 *
 * 声は「行(Line)」ごとに1ファイル。id がそのまま音声ファイル名になる。
 * 絵（漫画のコマ・先生）は `art` のキーで描き分ける。あとで本物の絵に差し替えるときは
 * `img` を足せばそちらが優先される（キーはそのまま）。
 */
import type { AdventureScenario } from "./adventure";

export type Speaker = "teacher" | "link";

export type Face = "neutral" | "smile" | "think" | "aha" | "laugh" | "shy";

/** スライド（教室の上段に出るもの）。null を渡すと消える */
export type Slide = {
  /** 見出し。改行は \n */
  h?: string;
  /** 箇条書き・流れ。style に応じて描き分ける */
  items?: string[];
  /** big=一言を大きく / flow=↓で繋ぐ / strike=最初の項目に線を入れて次を出す / cross=×で否定 / vs=左右対比 / list=順に出す / steps=番号つき */
  style?: "big" | "flow" | "strike" | "cross" | "vs" | "list" | "steps";
  /** vs のときの左右 */
  left?: string;
  right?: string;
  /** 冒頭漫画のコマを再掲するとき（art キー） */
  recall?: string[];
};

export type Line = {
  id: string;
  who: Speaker;
  text: string;
  /** 読み終わってから次に行くまでの間（秒）。既定 0.7 */
  pause?: number;
  face?: Face;
  /** 相手の反応（顔） */
  react?: Face;
  /** この行に合わせて出すスライド。null で消す */
  slide?: Slide | null;
  /** 演出メモ（画面には出さない） */
  note?: string;
  /** ユーザー入力を含む動的台詞。焼き込み音声を使わず、その場で合成する */
  dynamic?: boolean;
};

export type Panel = {
  /** 横幅の重み（同じ段の中での比率）。既定 1 */
  w?: number;
  /** 絵のキー（MangaArt が描く） */
  art: string;
  /** 本物の絵があればここ。あれば art より優先 */
  img?: string;
  /** ナレーション（上部の帯） */
  narr?: string;
  /** せりふ（吹き出し） */
  say?: { who: string; text: string };
  /** 心の声（角のない吹き出し） */
  think?: string;
  /** 大きな文字（見せ場） */
  big?: string[];
  /** 小さな添え文 */
  sub?: string;
  /** 効果音 */
  sfx?: string;
};

export type Row = {
  /** 縦の重み。既定 1 */
  h?: number;
  /** 右→左の順に並べる（配列の先頭が右） */
  panels: Panel[];
};

export type MangaPage = { rows: Row[] };

/** コマ割り済みの1ページがスマホ1画面に収まる、文字焼き込み済み漫画ページ */
export type MangaFrame = {
  img: string;
  alt: string;
};

/** 第1ページより前に出す、作品のサムネイル兼タイトル画面。説明は置かない。 */
export type EpisodeBriefing = {
  eyebrow: string;
  title: string;
  principle: string;
  hook: string;
  teaser: string;
  cta: string;
  note?: string;
};

export type ExpStep =
  | { kind: "say"; line: Line; wait?: number }
  | { kind: "input"; id: string; title: string; prompt: string; placeholder?: string; helper?: string; hints?: string[]; line?: Line }
  | { kind: "scale"; id: string; title: string; prompt: string; helper?: string; min?: number; max?: number; line?: Line }
  | { kind: "choice"; q: string; help?: string; storeAs?: string; options: { label: string; value?: string; then: ExpStep[] }[] }
  | { kind: "fade"; text?: string };

/** 必要な回だけ使う体験入口。直前の物語と重複する工程説明には使わない。 */
export type ExperienceGate = {
  kicker: string;
  title: string;
  lead: string;
  steps: [string, string, string];
  cta: string;
  note?: string;
};

export type Scene = {
  no: number;
  title: string;
  lines: Line[];
  /** 質問チケットを促す一言（画面端の小さな案内） */
  ticketHint?: string;
};

export type PrincipleCard = {
  series: string;
  no: string;
  name: string;
  /** 大きく出す一文（行で分ける） */
  principle: string[];
};

export type Part =
  | { kind: "manga"; title: string; frames: MangaFrame[]; briefing?: EpisodeBriefing; /** 最後に出す文 */ close?: string[] }
  | { kind: "experience"; title: string; steps: ExpStep[]; minutes?: number; gate?: ExperienceGate }
  | { kind: "classroom"; scenes: Scene[] }
  | { kind: "adventure"; scenario: AdventureScenario }
  | { kind: "qa"; title: string }
  | { kind: "card"; lines: Line[]; card: PrincipleCard; after: Line[] }
  | { kind: "outro"; lines: Line[] }
  | { kind: "teaser"; manga: MangaPage[]; hook: string[]; next: { no: string; title: string; series: string; principle: string }; unlock: string[] };

export type Episode = {
  key: string;
  no: number;
  title: string;
  subtitle: string;
  /** この回のゴール（一覧に出す） */
  goal: { before: string[]; after: string[]; takeaway: string };
  tickets: number;
  parts: Part[];
  /** 質問に答えるAI先生に渡す、場面ごとの要約（教えた順） */
  sceneSummaries: string[];
};

/** 第1話は全台詞を同じ低い男性音声（VOICEVOX 青山龍星）で統一する。 */
export const VOICE_OF: Record<Speaker, string> = { teacher: "13", link: "13" };

export function audioUrl(ep: string, lineId: string): string {
  return `/learn/${ep}/audio/${lineId}.mp3`;
}

/** 一話の中の、声のある行をすべて集める（焼き込み・先読み用） */
export function allLines(ep: Episode): Line[] {
  const out: Line[] = [];
  const fromSteps = (steps: ExpStep[]) => {
    for (const s of steps) {
      if (s.kind === "say" && !s.line.dynamic) out.push(s.line);
      if ((s.kind === "input" || s.kind === "scale") && s.line && !s.line.dynamic) out.push(s.line);
      if (s.kind === "choice") s.options.forEach((o) => fromSteps(o.then));
    }
  };
  for (const p of ep.parts) {
    if (p.kind === "experience") fromSteps(p.steps);
    if (p.kind === "classroom") p.scenes.forEach((s) => out.push(...s.lines.filter((line) => !line.dynamic)));
    if (p.kind === "adventure") {
      p.scenario.nodes.forEach((node) => {
        if (node.kind === "dialogue" && !node.line.dynamic) out.push(node.line as Line);
      });
    }
    if (p.kind === "card") out.push(...p.lines, ...p.after);
    if (p.kind === "outro") out.push(...p.lines);
  }
  return out;
}
