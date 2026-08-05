/**
 * ワールドリプレイ（夜の振り返り）。サーバ専用。
 *
 * 【この場所の性格】
 * ダラダラ話す場所ではない。今日を再生して、意味を1つ見つけて、明日へ渡す。それだけ。
 * だからAIには**引き延ばさせない**。「OK、わかった」で受けて、すぐ次へ進む。
 *
 * 【進んだこと は、AIに数えさせない】
 * 「これだけ進んだね」は事実なので、記録から数える。AIに数えさせると盛る／落とすの両方が起きる。
 * AIがやるのは、**その事実に意味をつけること**だけ。
 *
 * 【進んでいない日を、失敗にしない】
 * 何も進まなかった日は「今日は内に向く時期だった」と、その日の流れから意味を渡す。
 * これは慰めではなく、実際に十二運の時期には"動かないほうが効く"局面があるため。
 * ただし占いの用語は一切出さない。
 */
import { supabaseAdmin, getUserSettings } from "./supabase";
import { complete } from "./ai";
import { jstDateStr, jstNow } from "./google";
import { computeCycles } from "./star";

export type ReplayProgress = {
  /** 今日、実際に前へ進んだこと（事実。記録から数える） */
  moved: string[];
  /** 今日、内に向いたこと（ワーク・振り返り。これも「進み」として数える） */
  inward: string[];
  /** 前へ進んだ数（0なら「静かな日」） */
  movedCount: number;
};

export type Replay = {
  date: string;
  weekday: string;
  progress: ReplayProgress;
  /** 今日を1行で受ける言葉（AI。短い） */
  received: string;
  /** 今日の意味（AI。進んでいなくても意味を返す） */
  meaning: string;
  /** 明日の朝いちにやること（最大3つ。AIが今日の話から起こす） */
  tomorrow: string[];
  /**
   * 今日はどんな一日だったか（8種類のどれか）。
   * ——ここも「8つのボタンから選ぶ」形にしていたが、選ばせるより
   *   話した内容から起こして、違えば直してもらうほうが早い。
   *   週のふりかえりがこの記録を使うので、絶対に落とせない。
   */
  dayKind: string;
  /**
   * 明日の夜、どんな感情になっていたいか（AIが今日の話から起こす）。
   * ——ここを空欄にして本人に打たせていたが、打つのは負担が大きい。
   *   話した内容から候補を出して、違えば言い直してもらう形にした。
   */
  emotion: string;
  /**
   * なぜその感情なのか（1〜2文）。
   * 翌朝の「今日のフォーカス」に添える一言。
   * ——以前ここに会話まるごとを入れていたので、朝の画面にやり取りが貼りついていた。
   */
  emotionWhy: string;
};

const WD = ["日", "月", "火", "水", "木", "金", "土"];
const rows = async (q: any): Promise<any[]> => {
  try { const { data } = await q; return Array.isArray(data) ? data : []; } catch { return []; }
};

/** 今日、実際に何が起きたかを記録から数える（AIに数えさせない） */
export async function todaysProgress(userId: string): Promise<ReplayProgress> {
  const supa = supabaseAdmin();
  const today = jstDateStr();

  const [hq, cards, acts, walks, emo, guards, skills] = await Promise.all([
    rows(supa.from("higher_quest").select("items").eq("user_id", userId).eq("date", today)),
    rows(supa.from("quest_cards").select("title, done").eq("user_id", userId).eq("date", today)),
    rows(supa.from("real_actions").select("title, kind, aligned").eq("user_id", userId).eq("date", today)),
    rows(supa.from("walk_logs").select("summary").eq("user_id", userId).eq("date", today)),
    rows(supa.from("emotion_logs").select("level, note").eq("user_id", userId).eq("date", today)),
    rows(supa.from("guardians").select("color").eq("user_id", userId).eq("date", today)),
    rows(supa.from("skill_cards").select("title").eq("user_id", userId).eq("date", today)),
  ]);

  /**
   * 中身が無い記録は、行に出さない。
   * 「やること：」だけが並ぶ画面になっていた（題名が空のまま保存された記録があると起きる）。
   * 空白だけのものも同じ扱いにする。数えるのも同様で、空の行は「進んだこと」に入れない。
   */
  const label = (t: unknown) => String(t ?? "").trim().slice(0, 40);

  const moved: string[] = [];
  for (const q of hq) {
    for (const it of (Array.isArray(q.items) ? q.items : [])) {
      const text = label(it?.text);
      if (it?.done && text) moved.push(`今日の一手：${text}`);
    }
  }
  for (const c of cards) {
    const title = label(c?.title);
    if (c?.done && title) moved.push(`未来からのクエスト：${title}`);
  }
  for (const a of acts) {
    const title = label(a?.title);
    if (!title) continue;
    moved.push(`${a.aligned ? "理想からのタスク" : "やること"}：${title}`);
  }

  const inward: string[] = [];
  if (walks.length) inward.push("パラレルウォークで、望む世界を歩いた");
  if (emo.length) inward.push(`状態を${emo.length}回みつめた`);
  for (const g of guards) inward.push("守り手をひとつ解き放った");
  for (const s of skills) {
    const title = label(s?.title);
    if (title) inward.push(`力を手に入れた：${title}`);
  }

  return { moved: moved.slice(0, 8), inward: inward.slice(0, 5), movedCount: moved.length };
}

/**
 * 今日、各ワークで本人が言ったこと。
 * 振り返りは「引いていい場所」なので、ここは渡す。
 * （個別のワークには渡さない。言っていないことが混ざる事故になるため）
 */
export async function todaysSaid(userId: string): Promise<string> {
  try {
    const supa = supabaseAdmin();
    const today = jstDateStr();
    const { data } = await supa.from("shinga_conversations")
      .select("place, content").eq("user_id", userId).eq("role", "user").eq("date", today)
      .order("created_at", { ascending: true }).limit(24);
    const rows2 = (data ?? []) as any[];
    if (!rows2.length) return "";
    const label: Record<string, string> = {
      walk: "パラレルウォーク", peak: "ピークステート", akashic: "アカシック",
      deep: "内側のワーク", higher: "ハイヤークエスト", map: "自由な会話",
    };
    return rows2.map((r) => `- ${label[r.place] ?? "ワーク"}で：${String(r.content ?? "").slice(0, 110)}`).join("\n");
  } catch { return ""; }
}

/** 今日の流れ（十二運の季節）。用語は外に出さず、意味づけの材料としてだけ使う */
async function todaysSeason(userId: string): Promise<string> {
  try {
    const s: any = await getUserSettings(userId);
    if (!s?.birth_date) return "";
    const cy = computeCycles(s.birth_date, jstNow());
    const day = cy?.find((c) => c.key === "day");
    return day ? `${day.season.label}／${day.season.meaning}／向く動き：${day.season.advice}` : "";
  } catch { return ""; }
}

/**
 * 今日の話を受けて、短く返し、明日の3つを起こす。
 * AIの仕事は「意味づけ」と「明日の粒だし」だけ。事実は上で数えたものを使う。
 */
export async function buildReplay(userId: string, saidToday: string): Promise<Replay> {
  const now = jstNow();
  const date = jstDateStr();
  const weekday = WD[now.getDay()];
  const [progress, season, s, works] = await Promise.all([
    todaysProgress(userId),
    todaysSeason(userId),
    getUserSettings(userId).catch(() => null) as Promise<any>,
    todaysSaid(userId),
  ]);
  const who = s?.user_call_name || "きみ";

  const fallback: Replay = {
    date, weekday, progress,
    received: "オッケー、受け取った。",
    meaning: progress.movedCount > 0
      ? "今日、ちゃんと前に進んでる。"
      : "今日は動かない日だった。それも要る時間だよ。",
    tomorrow: [],
    emotion: "",
    dayKind: "",
    emotionWhy: "",
  };

  const prompt = `あなたは ${s?.secretary_name || "清瀬リンク"}。${who} の相棒。
今日1日を閉じる場（ワールドリプレイ）。**引き延ばさない**のが最優先。

# 絶対のルール
- 長く話さない。共感を重ねない。深掘りの質問をしない。**受けて、意味を1つ渡して、明日へ進む。**
- 事実（下の「今日の記録」）を作り変えない。数えない。増やさない。
- 進んでいない日を失敗にしない。**「今日は内に向く時期だった」という方向で意味を渡す。**
  ただし占い・算命学・十二運などの用語は絶対に出さない。「流れ」「時期」までにする。
- 明日やることは、**${who} が今日話したこと**から起こす。こちらで勝手な宿題を足さない。
  多くても3つ。朝いちで手をつけられる粒まで小さくする（「〜を30分だけ」のように）。
  今日の話から起こせなければ、空の配列にする（無理に作らない）。
- 「最重要」という言い方はしない（別の機能と混ざるため）。

# 出す形（JSONだけ。前後に何も書かない）
{
  "received": "今日の話を受ける一言（20字以内。『オッケー、受け取った』程度の軽さ）",
  "meaning": "今日の意味を1つ（50〜80字）。進んだ日はその進みを指す。動かなかった日は「内に向く時期だった」方向で",
  "tomorrow": ["明日の朝いちにやること（20字以内）", "…最大3つ"],
  "emotion": "明日の夜こうなっていたい、という感情を1語（10字以内。例：満ちている／軽い／誇らしい）",
  "dayKind": "今日はどんな一日だったか。下の8つの中の英字キーを1つだけ",
  "emotion_why": "なぜその感情でいたいのか（40〜70字）。翌朝これだけを読んで思い出せる一言にする"
}

# dayKind の8つ（どれが上等ということはない。判定しない）
full=満ちた日（うれしい・満たされた） / burn=燃えた日（集中して動けた）
calm=しずかな日（おだやか・ゆっくり） / wave=ゆれた日（気持ちが上下した）
fog=もやの日（はっきりしない） / spark=ざわめいた日（焦り・いらいら）
hold=ふんばった日（しんどい中たえた） / empty=からっぽの日（つかれはてた）
——本人の話しぶりから素直に選ぶ。良い日に寄せない。手がかりが無ければ空文字。

# emotion について
${who} が今日話したことから起こす。今日の話に手がかりが無ければ空文字にする。
勝手に立派な感情にしない。今日の話の続きとして自然なものを1つ。

# 今日 ${who} が話したこと（この夜の部屋でのやり取り）
${saidToday.slice(0, 1200) || "（まだ何も話していない）"}

# 今日、ワークの中で ${who} が言ったこと（ここは引いていい。ただし無いことは言わない）
${works || "（今日はワークをしていない）"}

# 今日の記録（事実。ここにあることだけが本当に起きたこと）
- 前に進んだこと（${progress.movedCount}件）：${progress.moved.join(" / ") || "なし"}
- 内に向いたこと：${progress.inward.join(" / ") || "なし"}

# 今日の流れ（内部情報。用語は出さない。意味づけの材料としてだけ使う）
${season || "（読めない）"}`;

  try {
    const raw = await complete({ userId, prompt, maxTokens: 700, temperature: 0.7 });
    const m = String(raw ?? "").match(/\{[\s\S]*\}/);
    if (!m) return fallback;
    const j = JSON.parse(m[0]);
    return {
      date, weekday, progress,
      received: String(j.received ?? "").trim().slice(0, 60) || fallback.received,
      meaning: String(j.meaning ?? "").trim().slice(0, 200) || fallback.meaning,
      tomorrow: (Array.isArray(j.tomorrow) ? j.tomorrow : [])
        .map((t: any) => String(t ?? "").trim())
        .filter(Boolean)
        .slice(0, 3),                      // 何があっても3つまで
      emotion: String(j.emotion ?? "").trim().slice(0, 20),
      dayKind: String(j.dayKind ?? "").trim().slice(0, 10),
      emotionWhy: String(j.emotion_why ?? "").trim().slice(0, 160),
    };
  } catch {
    return fallback;
  }
}
