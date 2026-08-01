/**
 * 取扱説明書のための16問。クライアント・サーバ共用（DBアクセス禁止）。
 *
 * 設計の芯：
 *  - 生年月日で決まるのは「持って生まれた性質」。ここは変わらない。
 *  - でも同じ星でも、育ち方・今の状態で"出方"が全然ちがう。
 *    16問はその「出方（クセ）」を測る。だから同じ人でも、時期を変えてやると結果が動く。
 *  - MBTIのような性格分類はしない。分類名を付けると人は自分をそこに閉じ込めるから。
 *    測るのは「どっちに寄っているか」という軸だけ。
 *
 * 4つの軸（各4問）：
 *  drive     … 動き出す力の源（内側から湧く ↔ 外との約束で動く）
 *  process   … 物事の進め方（先に形を決める ↔ やりながら決める）
 *  relation  … 人との距離（自分の世界を守る ↔ 人の中で力が出る）
 *  recover   … 消耗と回復（静けさで戻る ↔ 刺激で戻る）
 */

export type AxisKey = "drive" | "process" | "relation" | "recover";

export type Axis = {
  key: AxisKey;
  label: string;
  /** -100寄りの極 */
  low: string;
  /** +100寄りの極 */
  high: string;
};

export const AXES: Record<AxisKey, Axis> = {
  drive: {
    key: "drive", label: "動き出す力",
    low: "内から湧く（納得が先）", high: "外と約束すると動く（期待が燃料）",
  },
  process: {
    key: "process", label: "進め方",
    low: "形を決めてから動く", high: "動きながら形にする",
  },
  relation: {
    key: "relation", label: "人との距離",
    low: "自分の世界を守りたい", high: "人の中で力が出る",
  },
  recover: {
    key: "recover", label: "回復のしかた",
    low: "静けさで戻る", high: "刺激と交流で戻る",
  },
};

export const AXIS_KEYS = Object.keys(AXES) as AxisKey[];

export type Question = {
  id: number;
  axis: AxisKey;
  text: string;
  /** true なら「そう」が +、false なら「そう」が −（同じ軸を両方向から聞いて、答えの癖を打ち消す） */
  positive: boolean;
};

/** 5段階で答える（-2 まったく違う 〜 +2 すごく当てはまる） */
export const SCALE: { value: number; label: string }[] = [
  { value: -2, label: "違う" },
  { value: -1, label: "どちらかといえば違う" },
  { value: 0, label: "どちらとも" },
  { value: 1, label: "どちらかといえばそう" },
  { value: 2, label: "そう" },
];

export const QUESTIONS: Question[] = [
  // drive（動き出す力）
  { id: 1, axis: "drive", text: "自分が納得していないことは、正しくても手が動かない", positive: false },
  { id: 2, axis: "drive", text: "人に「やる」と宣言すると、急にやれるようになる", positive: true },
  { id: 3, axis: "drive", text: "誰にも見られていなくても、自分のペースで進められる", positive: false },
  { id: 4, axis: "drive", text: "締切や約束がないと、いつまでも始められない", positive: true },

  // process（進め方）
  { id: 5, axis: "process", text: "全体像が見えないまま走り出すのは気持ち悪い", positive: false },
  { id: 6, axis: "process", text: "とりあえず手をつけると、やることが見えてくる", positive: true },
  { id: 7, axis: "process", text: "準備が整うまで動けず、そのうち熱が冷めることがある", positive: false },
  { id: 8, axis: "process", text: "途中で方針が変わっても、そんなに困らない", positive: true },

  // relation（人との距離）
  { id: 9, axis: "relation", text: "人に気を遣うと、自分が何をしたかったか分からなくなる", positive: false },
  { id: 10, axis: "relation", text: "誰かと話しているうちに、自分の考えがまとまる", positive: true },
  { id: 11, axis: "relation", text: "頼まれると断れず、抱えすぎてしまう", positive: true },
  { id: 12, axis: "relation", text: "ひとりで考える時間がないと、自分を保てない", positive: false },

  // recover（回復）
  { id: 13, axis: "recover", text: "疲れたときは、誰とも会わない時間がいちばん効く", positive: false },
  { id: 14, axis: "recover", text: "落ち込んだとき、人と話すと回復が早い", positive: true },
  { id: 15, axis: "recover", text: "新しい刺激より、いつもの場所のほうが落ち着く", positive: false },
  { id: 16, axis: "recover", text: "新しい場所や人に触れると、気持ちが上がる", positive: true },
];

export type Answers = Record<number, number>;   // 質問id → -2..2
export type AxisScores = Record<AxisKey, number>; // -100..100

/** 回答から4軸のスコアを出す */
export function scoreAxes(answers: Answers): AxisScores {
  const out = {} as AxisScores;
  for (const key of AXIS_KEYS) {
    const qs = QUESTIONS.filter((q) => q.axis === key);
    let sum = 0, n = 0;
    for (const q of qs) {
      const a = answers[q.id];
      if (typeof a !== "number") continue;
      sum += (q.positive ? a : -a);
      n++;
    }
    // 1問あたり最大2点。全部そろえば ±(2 * 問題数)
    out[key] = n === 0 ? 0 : Math.round((sum / (n * 2)) * 100);
  }
  return out;
}

/** スコアを日本語の一言に（AIに渡す＆画面に出す） */
export function describeAxis(key: AxisKey, score: number): string {
  const a = AXES[key];
  const side = score >= 0 ? a.high : a.low;
  const abs = Math.abs(score);
  const strength = abs >= 60 ? "はっきり" : abs >= 25 ? "やや" : "どちらかといえば";
  return `${a.label}：${strength}「${side}」（${score > 0 ? "+" : ""}${score}）`;
}

export function answeredCount(answers: Answers): number {
  return QUESTIONS.filter((q) => typeof answers[q.id] === "number").length;
}
