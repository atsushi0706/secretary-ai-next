/**
 * クエスト → リアルバースのタスク候補を作るロジック。
 *
 * ここは「UI」でも「データ保存」でもなく、純粋な変換ロジックだけを置く。
 * 将来 AI に差し替えるときは suggestTasks() の中身だけを入れ替えれば済む
 * (呼び出し側のシグネチャは変えない)。
 */

export type TimeKey = "quick" | "mid" | "long";

export type TaskCandidate = {
  title: string;
  /** "YYYY-MM-DD" */
  due: string;
  time: TimeKey;
  urgency: "high" | "low";
  importance: "high" | "low";
  /** なぜこのタスクなのか (UI のヒント表示用) */
  hint?: string;
};

export type QuestSeed = {
  title: string;
  body?: string | null;
  category?: string | null;
};

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/**
 * キーワードごとの追加候補。
 * 「クエストの種類が違えば最初の一歩も違う」ぶんだけをここで足す。
 */
const KEYWORD_STEPS: Array<{ words: string[]; steps: Array<Omit<TaskCandidate, "due"> & { offset: number }> }> = [
  {
    words: ["家族", "妻", "夫", "子ども", "子供", "親"],
    steps: [
      { title: "家族全員の予定を確認する", time: "quick", urgency: "low", importance: "high", offset: 1, hint: "相手がいるクエストは、まず相手の時間から" },
      { title: "候補の場所・過ごし方を3つ書き出す", time: "mid", urgency: "low", importance: "high", offset: 3 },
    ],
  },
  {
    words: ["旅", "出かけ", "自然", "散歩", "歩", "場所"],
    steps: [
      { title: "行き先の候補を3か所調べる", time: "mid", urgency: "low", importance: "high", offset: 3 },
      { title: "移動手段と所要時間を確認する", time: "quick", urgency: "low", importance: "low", offset: 4 },
    ],
  },
  {
    words: ["音楽", "歌", "楽器", "絵", "書", "表現", "作品"],
    steps: [
      { title: "15分だけ、実際に手を動かしてみる", time: "quick", urgency: "low", importance: "high", offset: 1, hint: "上手くやろうとしない。触るだけでいい" },
      { title: "続けられる時間帯を1つ決める", time: "quick", urgency: "low", importance: "high", offset: 3 },
    ],
  },
  {
    words: ["講座", "商品", "サービス", "仕事", "働き方", "事業"],
    steps: [
      { title: "誰のためのものか、1行で書く", time: "quick", urgency: "low", importance: "high", offset: 2 },
      { title: "原型（ラフ）を1つ作る", time: "long", urgency: "low", importance: "high", offset: 6 },
    ],
  },
  {
    words: ["習慣", "毎日", "続け", "やめ"],
    steps: [
      { title: "いつ・どこでやるかを1つに決める", time: "quick", urgency: "low", importance: "high", offset: 1 },
      { title: "1週間ぶんの記録場所を用意する", time: "quick", urgency: "low", importance: "low", offset: 2 },
    ],
  },
];

/**
 * クエストからタスク候補を 3〜5個ほど提案する。
 *
 * 現状はルールベース（AI接続なしでも動く土台）。
 * @param quest    クエスト
 * @param todayStr "YYYY-MM-DD" (JST基準で呼び出し側が渡す)
 */
export function suggestTasks(quest: QuestSeed, todayStr: string): TaskCandidate[] {
  const text = `${quest.title} ${quest.body ?? ""}`;
  const out: TaskCandidate[] = [];

  // 1. どんなクエストでも共通の「最初の一歩」
  out.push({
    title: `「${quest.title}」について、いま分かっていることを書き出す`,
    due: todayStr,
    time: "quick",
    urgency: "low",
    importance: "high",
    hint: "考えるより先に、頭の外に出す",
  });

  // 2. クエストの内容に応じた具体行動
  for (const rule of KEYWORD_STEPS) {
    if (!rule.words.some((w) => text.includes(w))) continue;
    for (const s of rule.steps) {
      const { offset, ...rest } = s;
      out.push({ ...rest, due: addDays(todayStr, offset) });
    }
    break; // 最初にマッチした1カテゴリだけ使う（候補を増やしすぎない）
  }

  // 3. キーワードに当てはまらなかった場合の汎用ステップ
  if (out.length === 1) {
    out.push({
      title: "必要な情報を3つ調べる",
      due: addDays(todayStr, 3),
      time: "mid",
      urgency: "low",
      importance: "high",
    });
    out.push({
      title: "最初の一歩になる行動を1つ決める",
      due: addDays(todayStr, 2),
      time: "quick",
      urgency: "low",
      importance: "high",
    });
  }

  // 4. どんなクエストでも共通の「実際に動く時間」
  out.push({
    title: `「${quest.title}」に取り組む時間を予定に入れる`,
    due: addDays(todayStr, 7),
    time: "long",
    urgency: "low",
    importance: "high",
    hint: "予定に入っていないことは起きない",
  });

  return out.slice(0, 5);
}
