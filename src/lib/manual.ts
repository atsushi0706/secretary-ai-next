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
import { computeLife } from "./sanmei";
import { diagnoseSeimei } from "./seimei";
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
    return (data?.answers ?? {}) as Answers;
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
  if (star) {
    natureBlock = [
      `- 根っこの性質：${star.profile.nature}`,
      `- この人が心を開くとき：${star.profile.howToTalk}`,
      `- 効かない言葉／地雷：${star.profile.avoid}`,
      `- 止まったときの動かし方：${star.profile.whenStuck}`,
      `- 今の時期：${star.season.label}。${star.season.meaning}（合う動き方：${star.season.advice}）`,
    ].join("\n");
  }

  if (birth && gender) {
    const life = computeLife(birth, gender);
    const cur = life?.periods?.[life.currentIndex];
    if (cur) {
      stageBlock = `- 今いる10年（${cur.ageStart}〜${cur.ageEnd}歳）：${cur.label} ／ ${cur.meaning}`;
      const next = life!.periods[life!.currentIndex + 1];
      if (next) stageBlock += `\n- 次の10年（${next.ageStart}歳〜）：${next.label} ／ ${next.meaning}`;
      if (life!.nearBoundary) stageBlock += "\n- ※ ちょうど流れの変わり目にいる";
    }
  }

  const family = String(s?.birth_name ?? "").trim();
  if (family) {
    // birth_name は「姓 名」の想定。分けられなければ全体を名として扱う
    const parts = family.split(/[\s　]+/).filter(Boolean);
    const fam = parts.length >= 2 ? parts[0] : parts[0] ?? "";
    const giv = parts.length >= 2 ? parts.slice(1).join("") : "";
    if (fam && giv) {
      try {
        const r = diagnoseSeimei(fam, giv);
        // ※ 吉凶の記号（【大吉】等）は表に出さないので、意味の文だけを渡す
        const clean = (s: string) => String(s ?? "").replace(/^【[^】]*】/, "").trim();
        nameBlock = [
          `- 名前が帯びている働き（内側の性質）：${clean(r.jinkakuMeaning)}`,
          `- 名前が帯びている働き（若い頃の土台）：${clean(r.chikakuMeaning)}`,
          `- 名前が帯びている働き（人生全体）：${clean(r.soukakuMeaning)}`,
          "※ これは吉凶ではなく「その名前が帯びている傾向」として扱う。良い悪いを書かない。",
        ].filter(Boolean).join("\n");
      } catch { /* 未対応の字があっても止めない */ }
    }
  }

  return { callName, hasBirth: !!star, natureBlock, stageBlock, nameBlock };
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

const SECTIONS_SPEC = `章立ては、この7つを必ずこの順で。見出しの言葉は変えてよいが、中身の役割は守る。
1. あなたという人（全体像。読んだ瞬間「そうそれ」と言わせる。300〜420字）
2. 強み（3つ。それぞれ「どういう場面で効くか」まで具体的に。350〜480字）
3. つまずきやすいところ（弱みではなく"強みの裏側"として書く。責めない。320〜450字）
4. 向いていること（職種名を並べない。「こういう関わり方が向く」という書き方。300〜420字）
5. 消耗と回復（何で消耗し、何で戻るか。本人の16問の答えに直結させる。280〜400字）
6. 整える方向（今この時期に、何を減らし何を足すか。250〜380字）
7. 向かう方向（これから10年、どこへ向かうと自然か。希望で終わる。250〜380字）`;

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
 "avoid": ["逆効果になる励まし方（2つ）"]
}`,
    maxTokens: 1600,
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
- **占い用語を1つも出さない**（算命学・命式・星・画数・大運・運勢…すべて禁止）
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
      maxTokens: 6000,
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
    .slice(0, 9);

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
