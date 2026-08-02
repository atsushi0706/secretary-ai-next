/**
 * 今日のあなたの取扱説明書。
 *
 * 【誰が書いているか】
 * 差出人は「10年後、理想が叶っている自分」。
 * その人から見れば、今日はもう通り過ぎた1日で、どこが効いたかを知っている。
 * だから予言ではなく、**先に知っている人からの手引き**として渡す。
 *
 * 【中身の骨格（淳くんの指定）】
 *  - よいこと2つ … ①チャレンジしてみるとよい方向性 ②この方向性は良い流れ
 *  - 気をつけること1つ
 * 決めつけない。断定しない。今日を縛らない。
 *
 * 【材料】
 *  - 今日の流れ（十二運の季節・年/月/週/今日）
 *  - いまの10年（大運）
 *  - 生まれ持った本質（日干）と、多い五行・欠けている五行
 *  - 本人が置いた今年の理想（青写真）
 * ※ 算命学・十二運などの用語は絶対に外に出さない。
 *
 * 1日1通。同じ日に何度開いても同じものが出る（生成は1回だけ＝料金も1回だけ）。
 */
import { supabaseAdmin, getUserSettings } from "./supabase";
import { complete } from "./ai";
import { jstDateStr, jstNow } from "./google";
import { computeCycles } from "./star";
import { computeChart, computeLife, NIKKAN_NATURE } from "./sanmei";
import { getCurrentGoals } from "./goals";

export type ManualPoint = { title: string; body: string };
export type TodayManual = {
  date: string;
  /** その日のひとこと（見出し） */
  headline: string;
  /** よいこと2つ（①チャレンジの方向 ②追い風の方向） */
  good: ManualPoint[];
  /** 気をつけること1つ */
  care: ManualPoint;
  /** 10年後の自分からの、短い締め */
  closing: string;
};

function fallback(date: string): TodayManual {
  return {
    date,
    headline: "今日は、いつもどおりで大丈夫",
    good: [
      { title: "ひとつだけ、先に手をつける", body: "小さくていい。動き出しさえすれば、今日はそこから続いていくよ。" },
      { title: "うまくいってることを、数える", body: "止まってるように見えても、続いていること自体がちゃんと効いてる。" },
    ],
    care: { title: "詰め込みすぎないこと", body: "全部やろうとすると、いちばん大事なひとつが薄まる。今日はひとつでいい。" },
    closing: "この日のきみが決めたことが、こっちまで繋がってる。",
  };
}

/** 今日ぶんが保存済みならそれを返す（生成は1日1回） */
export async function loadTodayManual(userId: string): Promise<TodayManual | null> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("today_manuals")
      .select("data").eq("user_id", userId).eq("date", jstDateStr()).maybeSingle();
    return (data?.data as TodayManual) ?? null;
  } catch {
    return null;
  }
}

/** 今日ぶんを作る（すでにあればそれを返す） */
export async function getTodayManual(userId: string, force = false): Promise<TodayManual> {
  const date = jstDateStr();
  if (!force) {
    const cached = await loadTodayManual(userId);
    if (cached) return cached;
  }

  const s: any = await getUserSettings(userId).catch(() => null);
  const who = s?.user_call_name || "きみ";
  const birth: string | null = s?.birth_date ?? null;
  const g = s?.birth_gender;
  const gender: "male" | "female" | null = g === "male" || g === "female" ? g : null;

  const now = jstNow();
  const cycles = birth ? computeCycles(birth, now) : null;
  const chart = birth ? computeChart(birth) : null;
  const life = birth && gender ? computeLife(birth, gender, now) : null;
  const nowDecade = life?.periods?.[life.currentIndex] ?? null;
  const nature = chart ? NIKKAN_NATURE[chart.nikkan] : null;

  const goals = await getCurrentGoals(userId).catch(() => null as any);
  const yearVision = String(goals?.goals?.year?.vision ?? "").trim();

  const cy = (k: string) => cycles?.find((c) => c.key === k) ?? null;
  const today = cy("day"), week = cy("week"), month = cy("month"), year = cy("year");

  // ここは全部「内部情報」。用語のまま外に出さない。
  const material = [
    today ? `今日の流れ：${today.season.label}（${today.season.meaning}）／向く動き：${today.season.advice}` : "",
    week ? `今週の流れ：${week.season.label}（${week.season.meaning}）` : "",
    month ? `今月の流れ：${month.season.label}（${month.season.meaning}）` : "",
    year ? `今年の流れ：${year.season.label}（${year.season.meaning}）` : "",
    nowDecade ? `いまの10年：${nowDecade.label}（${nowDecade.meaning}）` : "",
    nature ? `生まれ持った本質：${nature.core}／活きる場：${nature.work}／つまずきやすい所：${nature.caution}` : "",
    chart?.strong?.length ? `強く出る性質：${chart.strong.join("・")}` : "",
    chart?.missing?.length ? `もともと薄い性質：${chart.missing.join("・")}（ここは無理に埋めなくていい）` : "",
    yearVision ? `本人が置いている今年の理想：${yearVision}` : "",
  ].filter(Boolean).join("\n");

  const prompt = `あなたは「10年後、${who}の理想が叶っている状態にいる${who}自身」。
そこから振り返って、**今日1日の取扱説明書**を書く。
きみにとって今日はもう通り過ぎた日で、どこが効いたかを知っている。だから予言ではなく、先に知っている人の手引きとして書く。

# 書き方（厳守）
- ${who} に話しかける。友達の距離。タメ口。あたたかく。断定しない。
- 「〜するといい」より「〜が効きやすい日」「〜は今日ちょっと重いかも」のように、**余白を残す**。
- 占い・算命学・十二運などの用語は**絶対に出さない**。「星が」「運気が」も使わない。日常の言葉だけ。
- 説教しない。急かさない。できていないことを責めない。
- 抽象で終わらせない。今日その場でできる行動の粒度まで下ろす。
- 未来の具体（何が起きるか）は言わない。言えるのは"今日の扱い方"だけ。

# 出す形（JSONだけ。前後に何も書かない）
{
  "headline": "今日をひとことで（20字以内・体言止めか短い言い切り）",
  "good": [
    { "title": "チャレンジしてみるとよい方向（14字以内）", "body": "なぜ今日それが効くか＋今日できる形（60〜90字）" },
    { "title": "そのまま乗っていい良い流れ（14字以内）", "body": "すでに動いていて追い風になっているもの＋活かし方（60〜90字）" }
  ],
  "care": { "title": "今日ひとつだけ気をつけること（14字以内）", "body": "責めない書き方で。避け方まで（60〜90字）" },
  "closing": "10年後の自分から、今日のきみへ一言（40字以内）"
}

# 今日の材料（内部情報。そのまま引用しない・用語を出さない）
${material || "（生年月日が未設定。一般的な、今日を大事にするための手引きにする）"}`;

  let out: TodayManual = fallback(date);
  try {
    const raw = await complete({ userId, prompt, maxTokens: 1200, temperature: 0.85 });
    const m = String(raw ?? "").match(/\{[\s\S]*\}/);
    if (m) {
      const j = JSON.parse(m[0]);
      const pt = (v: any, d: ManualPoint): ManualPoint => ({
        title: String(v?.title ?? "").trim() || d.title,
        body: String(v?.body ?? "").trim() || d.body,
      });
      const base = fallback(date);
      out = {
        date,
        headline: String(j.headline ?? "").trim() || base.headline,
        good: [pt(j.good?.[0], base.good[0]), pt(j.good?.[1], base.good[1])],
        care: pt(j.care, base.care),
        closing: String(j.closing ?? "").trim() || base.closing,
      };
    }
  } catch { /* 失敗しても、当たり障りのない手引きは必ず渡す */ }

  try {
    const supa = supabaseAdmin();
    await supa.from("today_manuals").upsert(
      { user_id: userId, date, data: out, updated_at: new Date().toISOString() },
      { onConflict: "user_id,date" },
    );
  } catch { /* 保存できなくても表示はする */ }

  return out;
}
