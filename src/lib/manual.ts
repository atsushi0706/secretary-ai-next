/**
 * 自分の取扱説明書。サーバ専用。
 *
 * 材料は2つ：
 *  ① 生年月日から出る「持って生まれた性質」（算命学の星・大運・姓名判断）＝ 変わらない土台
 *  ② 16問で測った「いまの出方（クセ）」            ＝ 同じ星でも人によって違うところ
 *
 * ①だけだと「よくある占い」になり、②だけだと「よくある性格診断」になる。
 * この2つを突き合わせて、**その人にしか当てはまらない文章**にするのがここの仕事。
 *
 * チェーン3段（一撃生成しない）:
 *   ① 見立て … 星の性質と16問の答えを突き合わせ、一致点・ねじれ・言い切れることを整理
 *   ② 執筆   … 見立てをもとに、章ごとの長文を書く
 *   ③ 要約   … 表紙に出す一行と、今日からの一手を3つ
 *
 * 掟：占い用語（算命学・命式・星の名前・画数・大運）は一切表に出さない。
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { readStar } from "./star";
import { computeLife, computeChart, computeYears, NIKKAN_NATURE, GOGYO_MEANING } from "./sanmei";
import { diagnoseSeimei } from "./seimei";
import { splitFullName } from "./name";
import { getUserSettings } from "./supabase";
import { jstDateStr } from "./google";
import {
  AXIS_KEYS, describeAxis, scoreAxes, QUESTIONS,
  type Answers, type AxisScores,
} from "./manual-quiz";

export type ManualSection = { heading: string; body: string };

export type Manual = {
  id?: number;
  date: string;
  /** 表紙の一行（この人を一言で。占い用語なし） */
  headline: string;
  /** 章立て本文 */
  sections: ManualSection[];
  /** 今日からの一手（3つ） */
  actions: string[];
  scores: AxisScores;
  created_at?: string;
};

/** JSONオブジェクトを取り出す（配列を先に拾ってしまう共通版は使わない） */
function parseObject<T>(text: string): T | null {
  let t = String(text ?? "").trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");
  const start = t.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { try { return JSON.parse(t.slice(start, i + 1)) as T; } catch { return null; } } }
  }
  return null;
}

/* ────────────────────────────── 保存・取得 */

export async function latestManual(userId: string): Promise<Manual | null> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("manuals")
      .select("id, date, headline, sections, actions, scores, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return (data as Manual) ?? null;
  } catch { return null; }
}

export async function listManuals(userId: string, limit = 10): Promise<Manual[]> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("manuals")
      .select("id, date, headline, sections, actions, scores, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    return (data ?? []) as Manual[];
  } catch { return []; }
}

export async function saveAnswers(userId: string, answers: Answers): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("manual_answers").upsert({
    user_id: userId, answers, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

export async function loadAnswers(userId: string): Promise<Answers> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("manual_answers").select("answers").eq("user_id", userId).maybeSingle();
    // jsonb を往復すると数値キーが文字列キーになって返る。
    // そのままだと answers[q.id]（数値）で読めず「保存されていない」ように見える。
    const raw = (data?.answers ?? {}) as Record<string, unknown>;
    const out: Answers = {};
    for (const [k, v] of Object.entries(raw)) {
      const id = Number(k), val = Number(v);
      if (Number.isFinite(id) && Number.isFinite(val)) out[id] = val;
    }
    return out;
  } catch { return {}; }
}

/* ────────────────────────────── 材料集め */

type Base = {
  callName: string;
  hasBirth: boolean;
  natureBlock: string;   // 星の性質（用語なし）
  stageBlock: string;    // 大運（今どの10年か）
  nameBlock: string;     // 姓名判断（用語なし）
};

async function gatherBase(userId: string): Promise<Base> {
  const s: any = await getUserSettings(userId).catch(() => null);
  const callName = String(s?.user_call_name || s?.display_name || "きみ").slice(0, 20);
  const birth = String(s?.birth_date ?? "").trim();
  const gender = s?.birth_gender === "male" || s?.birth_gender === "female" ? s.birth_gender : null;

  let natureBlock = "（生年月日が未登録のため、持って生まれた性質は分からない）";
  let stageBlock = "";
  let nameBlock = "";

  const star = birth ? readStar(birth) : null;
  const chart = computeChart(birth);

  if (star || chart) {
    const lines: string[] = [];

    // ① 本質（日干）— ここが人物像の核。これまで渡していなかった
    if (chart) {
      const n = NIKKAN_NATURE[chart.nikkan];
      if (n) {
        lines.push(`## 本質（この人の核）`);
        lines.push(`- core：${n.core}`);
        lines.push(`- この核が活きる動き方：${n.work}`);
        lines.push(`- この核ゆえに起きるつまずき：${n.caution}`);
      }

      // ② 五行の偏り＝得意と欠け。「向いていること」「弱み」の根拠になる
      lines.push(`\n## 持って生まれたバランス`);
      lines.push(`- 内訳：${Object.entries(chart.gogyo).map(([k, v]) => `${k}${v}`).join(" / ")}（3つ以上＝強く出る、0＝欠け）`);
      for (const g of chart.strong) {
        lines.push(`- 強く出ている「${g}」：${GOGYO_MEANING[g]?.much ?? ""}`);
      }
      for (const g of chart.missing) {
        lines.push(`- 欠けている「${g}」：${GOGYO_MEANING[g]?.none ?? ""}`);
      }
      if (chart.strong.length === 0 && chart.missing.length === 0) {
        lines.push(`- 大きな偏りがない。器用に対応できる反面、"これ"という尖りを自分で選ぶ必要がある`);
      }

      // ③ 生まれ持ったエネルギーの段階
      lines.push(`\n## 生まれ持ったエネルギーの質`);
      lines.push(`- ${chart.energy.label}：${chart.energy.meaning}`);

      if (chart.nearBoundary) {
        lines.push(`\n※ 季節の変わり目の生まれ。計算がわずかにぶれる可能性があるので、断定を避けて「〜の傾向が強い」と書くこと。`);
      }
    }

    // ④ 対人の出方（既存の星）
    if (star) {
      lines.push(`\n## 人との関わりで出る性質`);
      lines.push(`- ${star.profile.nature}`);
      lines.push(`- 心を開くとき：${star.profile.howToTalk}`);
      lines.push(`- 効かない言葉／地雷：${star.profile.avoid}`);
      lines.push(`- 止まったときの動かし方：${star.profile.whenStuck}`);
      lines.push(`- 今の時期：${star.season.label}。${star.season.meaning}（合う動き方：${star.season.advice}）`);
    }
    natureBlock = lines.join("\n");
  }

  // ⑤ バイオリズム＝10年ごとの流れ。過去・今・これからを全部渡す
  if (birth && gender) {
    const life = computeLife(birth, gender);
    if (life?.periods?.length) {
      const rows = life.periods.map((p, i) => {
        const mark = i === life.currentIndex ? "◀ いまここ" : i < life.currentIndex ? "（過ぎた）" : "";
        return `- ${p.ageStart}〜${p.ageEnd}歳：${p.label} ／ ${p.meaning} ${mark}`;
      });
      stageBlock = [
        "## 人生の流れ（10年ごと。これがバイオリズムの土台）",
        ...rows,
        life.nearBoundary ? "※ ちょうど流れの変わり目にいる（前後の性質が混ざる）" : "",
        "※ 過去の10年は「なぜあの時期がああだったか」の説明に使い、",
        "　 これからの10年は「何が追い風になるか」を具体的に書くために使う。",
      ].filter(Boolean).join("\n");
    }
  }

  // ⑥ 年ごとの流れ。10年だけだと「で、来年は？」に答えられない。
  //    ここも全部その人の生年月日から計算する（誰かの結果を写さない）。
  if (birth) {
    const years = computeYears(birth, undefined, 4);
    if (years?.length) {
      const rows = years.map((y) => {
        const when = y.isThisYear ? "今年" : y.year === years[0].year + 1 ? "来年" : `${y.year}年`;
        return `- ${when}（${y.year}年・${y.age}歳）：${y.theme.label}／${y.theme.meaning}
  この年の流れ：${y.phase.label}（${y.phase.meaning}）
  気をつけること：${y.theme.watch}`;
      });
      stageBlock = [
        stageBlock,
        "",
        "## 年ごとの流れ（ここが一番聞かれるところ）",
        ...rows,
        "※ 「来年は◯◯と縁がある」のように、**年を名指しして具体的に**書く。",
        "※ ただし、ここに書いていないことを付け足さない。占い・運勢という言葉も使わない。",
      ].filter(Boolean).join("\n");
    }
  }

  // 分け方は1か所（lib/name.ts）に寄せる
  const sp = splitFullName(s?.birth_name);
  {
    if (sp.ok) {
      try {
        const r = diagnoseSeimei(sp.family, sp.given);
        const clean = (t: string) => String(t ?? "").replace(/^【[^】]*】/, "").trim();
        nameBlock = [
          `- 名前が帯びている働き（内側の性質）：${clean(r.jinkakuMeaning)}`,
          `- 名前が帯びている働き（若い頃の土台）：${clean(r.chikakuMeaning)}`,
          `- 名前が帯びている働き（人生全体）：${clean(r.soukakuMeaning)}`,
          "※ これは吉凶ではなく「その名前が帯びている傾向」として扱う。良い悪いを書かない。",
        ].filter(Boolean).join("\n");
      } catch { /* 未対応の字があっても止めない */ }
    }
  }

  return { callName, hasBirth: !!(star || chart), natureBlock, stageBlock, nameBlock };
}

/** 16問の答えを、AIが読める形にする */
function quizBlock(answers: Answers, scores: AxisScores): string {
  const lines = AXIS_KEYS.map((k) => `- ${describeAxis(k, scores[k])}`);
  const raw = QUESTIONS.map((q) => {
    const a = answers[q.id];
    if (typeof a !== "number") return null;
    const w = a === 2 ? "そう" : a === 1 ? "ややそう" : a === 0 ? "どちらとも" : a === -1 ? "やや違う" : "違う";
    return `  ・「${q.text}」→ ${w}`;
  }).filter(Boolean);
  return [
    "### 4つの軸（16問から算出）",
    ...lines,
    "",
    "### 本人の回答そのもの（強く出ている項目に注目する）",
    ...raw,
  ].join("\n");
}

/* ────────────────────────────── 生成チェーン */

const SECTIONS_SPEC = `章立ては、この8つを必ずこの順で。見出しの言葉は変えてよいが、中身の役割は守る。
1. あなたという人（核＝本質から書く。読んだ瞬間「そうそれ」と言わせる。350〜480字）
2. 強み（3つ。**それぞれ根拠つき**で。「持って生まれた◯◯が強いから、こういう場面で効く」まで。400〜550字）
3. つまずきやすいところ（弱みではなく"強みの裏側"と"欠けているもの"から。責めない。350〜480字）
4. 向いていること（職種名の羅列は禁止。**どんな関わり方・どんな役回りが噛み合うか**を、
   本質と欠けから根拠づけて書く。向かないことも1つ添える。350〜480字）
5. 消耗と回復（何で消耗し、何で戻るか。16問の答えと欠けている要素に直結させる。300〜420字）
6. これからの流れ（**バイオリズム。ここが一番求められている**）
   - 過去の10年が何だったかを一言で振り返る（「あの時期がしんどかったのは〜」と腑に落とす）
   - **いまの10年**が何をする時期かを、はっきり言い切る
   - **次の10年**に何が来るか、そこへ向けて今から何を仕込むか
   - **今年・来年・再来年**を、年を名指しして具体的に書く
     （「来年は知らない世界と縁ができる」のように、渡された材料のとおりに）
   500〜750字。年齢と西暦は必ず入れる。
7. 整える方向（今この時期に、何を減らし何を足すか。300〜420字）
8. 向かう方向（この人が最終的にどこへ向かうと自然か。希望で終わる。280〜400字）`;

export async function generateManual(userId: string, answers: Answers): Promise<Manual> {
  const scores = scoreAxes(answers);
  const base = await gatherBase(userId);
  const quiz = quizBlock(answers, scores);
  const past = await listManuals(userId, 3);

  // ── ① 見立て：土台と回答を突き合わせる（ここが"その人だけ"になる肝）
  const readRaw = await complete({
    userId,
    prompt: `あなたは人を深く見る観察者。ある人の「持って生まれた性質」と「本人が答えたクセ」を突き合わせて、
その人にしか当てはまらない見立てを作る。

# 持って生まれた性質（生年月日から。本人には根拠を明かさない）
${base.natureBlock}
${base.stageBlock ? `\n## 今いる人生の流れ\n${base.stageBlock}` : ""}
${base.nameBlock ? `\n## 名前が持つ働き\n${base.nameBlock}` : ""}

# 本人が答えたクセ（16問）
${quiz}

# やること
0. **本質を掴む**：核（core）と、強く出ているもの／欠けているものから、この人の設計を一言で。
1. **一致**：生まれ持った性質と、本人の答えが重なっているところ。ここはその人の"芯"。
2. **ねじれ**：本来こうなのに、答えでは逆に出ているところ。
   → これは矛盾ではなく「そう振る舞わざるを得なかった歴史」があると見る。そこに生きづらさが宿る。
3. **言い切れること**：この2つが揃って初めて言える、その人だけの特徴（一般論は書かない）。
4. **触れてはいけないこと**：この人に言うと逆効果になる励まし方。

# 掟
- 占い用語（算命学・命式・星の名前・画数・大運）は絶対に使わない。日常語だけ。
- 「〜型」「〜タイプ」と分類名を付けない。人はラベルに自分を閉じ込めるから。
- 決めつけない。ただし当たり障りのない一般論も書かない。**具体的に踏み込む**。

# 出力（JSONのみ）
{
 "core": "この人の芯を一文で",
 "match": ["一致していること（3つ・各40〜70字）"],
 "twist": ["ねじれ（1〜2つ・各50〜90字。責める書き方をしない）"],
 "unique": ["この人だけに言えること（3つ・各40〜80字）"],
 "avoid": ["逆効果になる励まし方（2つ）"],
 "fit": ["この人に噛み合う役回り（3つ・各30〜60字・根拠つき）"],
 "unfit": ["噛み合わない環境（1〜2つ）"],
 "flow": "10年ごとの流れの読み（過去→今→次を一続きで。100〜160字）"
}`,
    maxTokens: 2000,
    temperature: 0.8,
  });
  const read = parseObject<any>(readRaw) ?? {};

  // ── ② 執筆：長文の取扱説明書
  const pastHeads = past.map((p) => `- ${p.date}：${p.headline}`).join("\n");
  const writePrompt = `あなたは、その人の「取扱説明書」を書くライター。本人が読んで、
「これは自分のことだ」「これ、人にも見せたい」と思える長文を書く。

# 見立て（先に整理した内容。これを土台に書く）
${JSON.stringify(read)}

# 持って生まれた性質（根拠は明かさない。文章に溶かして使う）
${base.natureBlock}
${base.stageBlock ? `\n## 今いる人生の流れ\n${base.stageBlock}` : ""}

# 本人が答えたクセ
${quiz}
${pastHeads ? `\n# 前に書いた取扱説明書（同じ書き出し・同じ言い回しを繰り返さない）\n${pastHeads}` : ""}

# 呼び方
本文では「${base.callName}」と呼びかけてよい（多用しない。2〜3回まで）。

${SECTIONS_SPEC}

# 書き方の掟
- **占い用語を1つも出さない**（算命学・命式・星・画数・大運・運勢・五行・日干…すべて禁止）
  ただし**中身は本気の鑑定**であること。「持って生まれた〜」「あなたの設計は〜」と日常語で言い切る。
- **当たり障りのないことを書いたら失格。** 「人によります」「バランスが大事」は禁句。
  渡された材料（核・偏り・欠け・エネルギーの段階・10年の流れ）を必ず根拠として使い、
  「なぜそう言えるのか」が読み手に伝わる書き方をする。
- 年齢・時期は具体的に書く（「30代後半から」など）。ぼかさない。
- 「〜型」「〜タイプ」と分類しない
- 断定と余白のバランス：「きみはこうだ」と言い切る箇所を各章に1つは置く。
  ただし全体は「〜かもしれない」で逃げない程度に、しかし決めつけない。
- 一般論を書かない。**16問の答えに実際に触れる**（「◯◯と答えたきみは」のように）
- 慰めない。褒めちぎらない。事実として書く。読後に静かな納得が残るように。
- 敬体（です・ます）ではなく、友人が真剣に話す距離のタメ口寄りで。ただし馴れ馴れしくしない。
- **強調したい言葉は **こう** で囲む**（各章1〜2箇所まで）

# 出力（JSONのみ。前置きもコードブロックの説明も書かない）
{
 "headline": "この人を一言で表す見出し（15〜28字。かっこよく、でも本人が照れない程度に）",
 "sections": [ { "heading": "章タイトル（8〜16字）", "body": "本文" } ],
 "actions": ["今日からできる一手（3つ・各25〜45字・具体的な行動）"]
}`;

  let w: any = null;
  let lastRaw = "";
  for (let attempt = 0; attempt < 2 && !w; attempt++) {
    lastRaw = await complete({
      userId,
      prompt: attempt === 0 ? writePrompt
        : `${writePrompt}\n\n# 前回、JSONとして読めなかった。今度は必ず { から } までのJSONだけを返して。本文の中で改行するときは \\n と書き、生の改行は入れない。`,
      maxTokens: 8000,
      temperature: attempt === 0 ? 0.85 : 0.6,
    });
    const parsed = parseObject<any>(lastRaw);
    if (parsed && Array.isArray(parsed.sections) && parsed.sections.length >= 3) w = parsed;
  }
  if (!w) {
    const head = String(lastRaw ?? "").replace(/\s+/g, " ").slice(0, 120);
    throw new Error(`取扱説明書を組み立てられませんでした。${head ? `（AIの返事の先頭：${head}…）` : "（返事が空でした）"}`);
  }

  const sections: ManualSection[] = (w.sections as any[])
    .filter((s) => s && typeof s.body === "string" && s.body.trim())
    .map((s) => ({ heading: String(s.heading ?? "").slice(0, 40), body: String(s.body).slice(0, 3000) }))
    .slice(0, 10);

  const manual: Manual = {
    date: jstDateStr(),
    headline: String(w.headline ?? "").slice(0, 60) || `${base.callName}の取扱説明書`,
    sections,
    actions: Array.isArray(w.actions) ? w.actions.map((a: any) => String(a).slice(0, 80)).slice(0, 3) : [],
    scores,
  };

  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("manuals").insert({
      user_id: userId, ...manual, created_at: new Date().toISOString(),
    }).select("id, date, headline, sections, actions, scores, created_at").single();
    if (data) return data as Manual;
  } catch { /* 保存できなくても、いま読めるものは返す */ }
  return manual;
}
