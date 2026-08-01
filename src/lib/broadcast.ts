/**
 * 発信スタジオ：ワーク1回ぶんの素材 → 編集者AI（チェーン3段）→ 保存。サーバ専用。
 *
 * 【重要】素材は必ず「ワーク1回」を指定して渡す。混ぜない。
 *   以前は直近3日の会話をまとめて要約していたが、それだと個別のワークの中身が消え、
 *   たまたま会話に出ていた話題が主役になり、本人のメソッドとも無関係な投稿が出た。
 *   素材は work_sessions（ワークが終わるたびに1件たまる）から1件選ぶ。
 *
 * チェーン（一撃生成しない）:
 *   ① 編集会議 … その1回の体験・世界観・メソッド・過去投稿を見て「この回の企画」を決める
 *   ② 執筆     … 決まった企画どおりにスライドとキャプションを書く
 *   ③ 採掘     … その体験からメソッド資産（原理・問い・言葉）を拾って蓄積する
 *
 * 守ること：
 *  - 内面の会話を逐語で外に出さない（work-session の時点で要約済み・それ以上は遡らない）
 *  - 本人が体験していない実績・変化を作らない
 *  - 過去の投稿と同じ型を繰り返さない（過去10回ぶんの企画を渡して外させる）
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { jstDateStr } from "./google";
import { getHero } from "./hero";
import { getWorkSession, listWorkSessions, markUsed, materialText } from "./work-session";
import {
  type BroadcastPost, type Method, type MethodAssets, type Slide, EMPTY_ASSETS,
} from "./broadcast-types";

/**
 * AIの返事から JSON オブジェクトを取り出す。
 *
 * ※ 共通の extractJson は「配列を先に探す」作りなので、
 *   {"slides":[...]} を渡すと中の配列だけを拾ってしまい、本体が失われる。
 *   ここは必ずオブジェクトとして読みたいので、専用に持つ。
 *   文字列リテラルの中の { } は数えない（本文に括弧が入っても壊れないように）。
 */
function parseObject<T>(text: string): T | null {
  let t = String(text ?? "").trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");
  const start = t.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, escaped = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(t.slice(start, i + 1)) as T; } catch { return null; }
      }
    }
  }
  return null; // 閉じ括弧が無い＝途中で切れている
}

/* ────────────────────────────── メソッド */

export async function getMethod(userId: string): Promise<Method | null> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("methods").select("name, tagline, assets")
      .eq("user_id", userId).maybeSingle();
    if (!data) return null;
    return {
      name: String(data.name ?? ""),
      tagline: String(data.tagline ?? ""),
      assets: { ...EMPTY_ASSETS, ...(data.assets ?? {}) },
    };
  } catch { return null; }
}

export async function saveMethod(userId: string, m: { name: string; tagline?: string }): Promise<void> {
  const supa = supabaseAdmin();
  const cur = await getMethod(userId);
  await supa.from("methods").upsert({
    user_id: userId,
    name: m.name.slice(0, 60),
    tagline: (m.tagline ?? cur?.tagline ?? "").slice(0, 120),
    assets: cur?.assets ?? EMPTY_ASSETS,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

/** 資産を追記（重複を除き、各40件まで） */
async function appendAssets(userId: string, add: Partial<MethodAssets>): Promise<void> {
  const cur = await getMethod(userId);
  if (!cur) return; // メソッド未設定なら貯めない（名前が付いてから育てる）
  const merged: MethodAssets = { ...cur.assets };
  for (const k of Object.keys(EMPTY_ASSETS) as (keyof MethodAssets)[]) {
    const inc = (add[k] ?? []).map((s) => String(s).trim()).filter((s) => s.length >= 4);
    merged[k] = [...new Set([...merged[k], ...inc])].slice(-40);
  }
  const supa = supabaseAdmin();
  await supa.from("methods").update({ assets: merged, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

/* ────────────────────────────── 投稿の保存・取得 */

export async function listPosts(userId: string, limit = 20): Promise<BroadcastPost[]> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("broadcast_posts")
      .select("id, date, angle, format, title, slides, caption, hashtags, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    return (data ?? []) as BroadcastPost[];
  } catch { return []; }
}

export async function updatePost(
  userId: string, id: number,
  patch: { slides?: Slide[]; caption?: string; title?: string },
): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("broadcast_posts").update({
    ...(patch.slides ? { slides: patch.slides } : {}),
    ...(patch.caption != null ? { caption: patch.caption } : {}),
    ...(patch.title != null ? { title: patch.title } : {}),
  }).eq("user_id", userId).eq("id", id);
}

export async function deletePost(userId: string, id: number): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("broadcast_posts").delete().eq("user_id", userId).eq("id", id);
}

/** 世界観（主人公設定）を文字列に */
async function worldText(userId: string): Promise<string> {
  const h: any = await getHero(userId).catch(() => null);
  if (!h) return "（未設定）";
  return [
    h.desired_world?.trim() ? `- 増やしたい世界：${h.desired_world.trim()}` : "",
    h.enemy_world?.trim() ? `- 減らしたい世界：${h.enemy_world.trim()}` : "",
    h.needed_people?.trim() ? `- その世界に必要な人：${h.needed_people.trim()}` : "",
    h.hero_statement?.trim() ? `- 主人公像：${h.hero_statement.trim()}` : "",
  ].filter(Boolean).join("\n") || "（未設定）";
}

/* ────────────────────────────── 生成チェーン */

const SLIDE_SPEC = `# 文字の演出（画像デザインに直結する）
- いちばん立てたい言葉は **強調** で囲む（1スライド1〜2箇所。金色の太字になる）
- cover と quote の title/body は、読みやすい位置で \\n を入れて2〜3行に割る（1行10〜14字）

スライドの kind は次から選ぶ：
- cover: 表紙。title=フックの一言（\\nで2〜3行に）、body=続きを読みたくなる副題
- body: title=見出し、body=本文（120字以内）
- list: title=見出し、items=3〜5個（チェックリスト・手順・診断）
- quote: body=大きく置く言葉（40字以内）
- compare: title=見出し、items=各行「左|右」形式で2〜4行（例「止まる人|進む人」を1行目に）
- manga: panels=4コマ。各 {scene, speaker, line, narration?}。speaker が本人なら "自分"
- ask: title=問いかけ、body=読者への促し
- signature: 触らなくてよい（アプリ側で自動付与）`;

/**
 * 投稿を作る。**どのワークの体験から作るか**を必ず指定する。
 * sessionId を省いたときは、まだ投稿にしていない最新の1件を使う（それも無ければエラー）。
 */
export async function generatePost(userId: string, sessionId?: number): Promise<BroadcastPost> {
  const sessions = await listWorkSessions(userId, 20);
  const target = sessionId != null
    ? await getWorkSession(userId, sessionId)
    : (sessions.find((w) => !w.used) ?? null);

  if (!target) {
    throw new Error(sessions.length === 0
      ? "まだ発信の素材がありません。どれかワークをやり終えると、その体験がここに貯まります。"
      : "その素材が見つかりませんでした。一覧から選び直してみて。");
  }

  const material = materialText(target);
  const [world, method, past] = await Promise.all([
    worldText(userId),
    getMethod(userId),
    listPosts(userId, 10),
  ]);

  const methodText = method?.name
    ? [
        `名前：${method.name}${method.tagline ? `（${method.tagline}）` : ""}`,
        method.assets.principles.length ? `原理：${method.assets.principles.slice(-6).join("／")}` : "",
        method.assets.questions.length ? `問い：${method.assets.questions.slice(-6).join("／")}` : "",
        method.assets.phrases.length ? `言い回し：${method.assets.phrases.slice(-8).join("／")}` : "",
        method.assets.works.length ? `ワーク：${method.assets.works.slice(-4).join("／")}` : "",
      ].filter(Boolean).join("\n")
    : "（まだ名前だけ／未設定。無理にメソッド語りをしない）";

  const pastText = past.length
    ? past.map((p) => `- [${p.date}] 企画:${p.angle}／構成:${p.format}／表紙:${p.slides?.[0]?.title ?? ""}`).join("\n")
    : "（まだ投稿なし）";

  // ── ① 編集会議：この回の企画を決める（型に流し込まない要）
  const planRaw = await complete({
    userId,
    prompt: `あなたはSNS発信の編集者。ある人のワーク体験を「フォロワーの役に立つカルーセル投稿」に変える企画会議をする。

# この人の世界観（発信の軸）
${world}

# この人のメソッド
${methodText}

# 今回の素材（この1回のワークだけ。ここに無い話題は使わない）
${material}

# 過去の投稿（同じ企画・構成・書き出しを繰り返さないこと）
${pastText}

# 企画の選び方
- **素材に書かれていない話題を持ち出さない。** 素材がこの体験なら、投稿もこの体験の話になる。
- **メソッドが設定されているなら、その考え方のレンズでこの体験を語る。**
  （例：メソッドが「人生脚本の書き換え」なら、この体験を"脚本"の言葉で読み解く）
  メソッドと無関係な一般論に流れない。
- 素材が一番活きる切り口を選ぶ。自分語りではなく「読者が持ち帰れるもの」を主役に。
- 切り口の例（これに縛られず独自企画も可）：ワークを読者に渡す／メソッド解説／診断・チェックリスト／常識を覆す／比較／体験ストーリー／世界観メッセージ／問いかけ／4コマ。
- 過去の投稿と企画・構成・表紙の型が被るなら、必ず別の切り口へずらす。
- 枚数は内容で決める（表紙＋中身3〜7枚。署名はアプリが足すので数えない）。
- 素材が薄い日は、無理に膨らませず「短くて濃い」1案にする。

# 出力（JSONのみ）
{
 "angle": "この回の企画を一言で",
 "why": "なぜこの素材にはこの切り口か（一文）",
 "format": "構成の説明（例：診断リスト型5枚。表紙→3つの兆候→処方→問い）",
 "outline": ["スライド1で言うこと", "スライド2で言うこと", "..."],
 "usable": ["素材のうち、変換して使ってよい要素（逐語ではなく要約で）"]
}`,
    maxTokens: 1200,
    temperature: 0.9,
  });
  const plan = parseObject<any>(planRaw) ?? {};
  const angle = String(plan.angle ?? "今日の気づきを渡す").slice(0, 60);
  const format = String(plan.format ?? "表紙＋本文3枚").slice(0, 120);

  // ── ② 執筆：企画どおりに書く
  const writePrompt = `あなたはSNS発信のライター。編集会議で決まった企画どおりに、カルーセル投稿を書く。

# 決まった企画
- 企画：${angle}
- 理由：${String(plan.why ?? "")}
- 構成：${format}
- 各スライドの狙い：${JSON.stringify(plan.outline ?? [])}
- 使ってよい素材（要約済み）：${JSON.stringify(plan.usable ?? [])}

# この人の世界観・声
${world}

# メソッド（あれば言葉遣いに滲ませる。押し売りしない）
${methodText}

# 書くときの掟
- **素材に書かれていないことは書かない。** この体験の話として最後まで通す。
- メソッドがあるなら、その言葉づかい・考え方で語る（押し売りはしない）。
- 読者への価値が主役。自分語りで終わらせない。
- 体験は「実際にあったこと」だけ。数字・実績・他人の変化を作らない。
- 内面の会話・固有名詞・個人が特定される事情は書かない（体験は一般化して使う）。
- 同じ書き出しの連発、AIっぽい定型文（「〜しませんか？」の乱発）を避ける。
- 1枚1メッセージ。スマホで2秒で読める文字量に。
- 日本語。敬体か常体かは表紙の勢いに合わせて統一。

${SLIDE_SPEC}

# 出力（JSONのみ）
{
 "title": "管理用タイトル（15字以内）",
 "slides": [ { "kind": "cover", "title": "...", "body": "..." }, ... ],
 "caption": "投稿本文。1〜3行で要点→改行→補足。最後に軽い問いかけ1つ（任意）",
 "hashtags": ["タグ", "3〜6個", "#は付けない"]
}

# 出力の注意（守らないと画面に出せない）
- JSON以外は一切書かない（前置き・あとがき・コードブロックの説明も不要）
- 途中で切れないよう、スライドは多くても7枚まで
- 文字列の中で改行したいときは \\n と書く（生の改行を入れない）`;

  // 1回目で読めなければ、より短く・確実な形でもう一度だけ頼む（AIの気まぐれで止めない）
  let w: any = null;
  let lastRaw = "";
  for (let attempt = 0; attempt < 2 && !w; attempt++) {
    lastRaw = await complete({
      userId,
      prompt: attempt === 0
        ? writePrompt
        : `${writePrompt}\n\n# 前回、JSONとして読めなかった。今度は必ず、余計な文字を一切付けず、{ から } までのJSONだけを返して。スライドは5枚以内でよい。`,
      maxTokens: 3200,
      temperature: attempt === 0 ? 0.85 : 0.5,
    });
    const parsed = parseObject<any>(lastRaw);
    if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) w = parsed;
  }
  if (!w) {
    // 何が返ってきたかを添える（原因が分かるように）
    const head = String(lastRaw ?? "").replace(/\s+/g, " ").slice(0, 120);
    throw new Error(`投稿を組み立てられませんでした。AIの返事を読み取れていません。${head ? `（返事の先頭：${head}…）` : "（返事が空でした）"}`);
  }
  const slides: Slide[] = (w.slides as any[])
    .filter((s: any) => s && typeof s.kind === "string")
    .slice(0, 9);
  if (slides.length === 0) throw new Error("投稿を組み立てられませんでした（スライドの形式が不正）");

  const supa = supabaseAdmin();
  const { data, error } = await supa.from("broadcast_posts").insert({
    user_id: userId,
    date: jstDateStr(),
    angle, format,
    title: String(w.title ?? angle).slice(0, 40),
    slides,
    caption: String(w.caption ?? "").slice(0, 1200),
    hashtags: Array.isArray(w.hashtags) ? w.hashtags.map((h: any) => String(h).replace(/^#/, "")).slice(0, 6) : [],
  }).select("id, date, angle, format, title, slides, caption, hashtags, created_at").single();
  if (error) throw error;

  // 使った素材に印を付ける（次からは別の体験が選ばれる）
  if (target.id != null) await markUsed(userId, target.id);

  // ── ③ 採掘：メソッド資産を拾う（失敗しても投稿は返す）
  if (method?.name) {
    try {
      const mineRaw = await complete({
        userId,
        prompt: `下の素材と投稿から、この人のメソッド「${method.name}」に蓄積できる資産を拾って。
本人が実際に言った・やったことだけ。無ければ空配列でよい（作らない）。

# 素材
${material.slice(0, 2400)}

# 今回の投稿
${JSON.stringify(slides).slice(0, 1500)}

# 出力（JSONのみ）
{"principles":["新しい原理(30字以内)"],"questions":["独自の問い"],"works":["実践ワーク(手順を一文で)"],"phrases":["特徴的な言い回し"],"examples":["本人に起きた変化(一文)"]}`,
        maxTokens: 700,
        temperature: 0.4,
      });
      const mined = parseObject<Partial<MethodAssets>>(mineRaw);
      if (mined) await appendAssets(userId, mined);
    } catch { /* 採掘は任意 */ }
  }

  return data as BroadcastPost;
}
