/**
 * 週刊レポート。毎週金曜にまとめて作り、**マスターが確認してから**各ユーザーへ届く。
 *
 * 【なぜ自動で送らないか】
 * 相手の1週間を要約して送る、という重い行為を、AIの出力のまま届けたくない。
 * 誤読や踏み込みすぎがあったときに、届いたあとでは取り返しがつかない。
 * だから必ず人（淳くん）の目を通す。
 *
 *   金曜  ： 全員ぶんを作る → status="draft" で溜める → マスターに「できたよ」と通知
 *   マスター： /admin で全員ぶんを読む → OKを出す（承認）
 *   承認後 ： 各ユーザーへ配信（通知が飛び、本人の画面で読めるようになる）
 *
 * 承認していないものは、本人からは絶対に見えない。
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { jstDateStr, jstNow } from "./google";
import { getUserSettings } from "./supabase";
import { listDayMarks, dayKind } from "./day-marks";
import { listTomorrow, jstWeekdayJa } from "./tomorrow";
import { listWalkLogs, listEmotions } from "./shinga";

export type WeeklyStatus = "draft" | "approved" | "sent";

/**
 * その週の「中身」。手紙の文章だけだと、あとから箱を開けたときに
 * 「何に悩んで、それをどう解釈して、何が進んだのか」が拾えない。
 * だから分けて持たせて、宝箱の中で1つずつ並べられるようにする。
 */
export type WeeklyFacets = {
  /** その週、前に進んだこと */
  progressed: string[];
  /** その週、何に引っかかっていたか */
  struggled: string;
  /** それをどう捉え直したか（解釈の変化） */
  reframed: string;
  /** 手に入れたもの（力・気づき） */
  gained: string[];
};

export type WeeklyReport = {
  id: string;
  user_id: string;
  /** その週の月曜（YYYY-MM-DD） */
  week_start: string;
  body: string;
  facets?: WeeklyFacets | null;
  status: WeeklyStatus;
  created_at: string;
};

/** その週の月曜（JST） */
export function weekStartStr(at: Date = jstNow()): string {
  const dow = at.getDay();                 // 0=日
  const back = dow === 0 ? 6 : dow - 1;    // 月曜まで戻す
  return jstDateStr(new Date(at.getTime() - back * 86400000));
}

/** 1人ぶんの週刊レポートを作る（保存はしない）。手紙と、宝箱に並べる中身を一緒に返す */
export async function buildWeekly(userId: string): Promise<{ body: string; facets: WeeklyFacets }> {
  const s: any = await getUserSettings(userId).catch(() => null);
  const who = s?.user_call_name || "きみ";

  const [marks, tomorrows, walks, emotions] = await Promise.all([
    listDayMarks(userId, 7).catch(() => []),
    listTomorrow(userId, 7).catch(() => []),
    listWalkLogs(userId, 7).catch(() => []),
    listEmotions(userId, 30).catch(() => []),
  ]);

  const from = jstDateStr(new Date(Date.now() - 7 * 86400000));
  const emo7 = emotions.filter((e: any) => e.date >= from);

  const material = [
    marks.length
      ? `# どんな一日だったか（本人が選んだ言葉）\n${marks.map((m: any) => `- ${m.date}：${dayKind(m.kind).label}`).join("\n")}`
      : "",
    tomorrows.length
      ? `# 毎晩そのとき決めた「明日の感情」と「明日やること」\n${tomorrows.map((t: any) =>
          `- ${t.date}(${["日","月","火","水","木","金","土"][t.weekday] ?? "?"})：感情「${t.emotion || "—"}」／やること：${(t.actions ?? []).join("・") || "—"}`,
        ).join("\n")}`
      : "",
    emo7.length
      ? `# 状態チェック（1=穏やか〜10=しんどい）\n${emo7.slice(0, 20).map((e: any) => `- ${e.date} ${e.level}${e.note ? `（${e.note}）` : ""}`).join("\n")}`
      : "",
    walks.length ? `# 歩いたときに語ったこと\n${walks.slice(0, 4).map((w: any) => `- ${w.date}: ${String(w.summary ?? "").slice(0, 200)}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  const emptyFacets: WeeklyFacets = { progressed: [], struggled: "", reframed: "", gained: [] };
  if (!material.trim()) {
    return {
      body: `${who}へ。\n今週は記録がまだ少なかったから、まとめはお休み。\n書けなかった週があっても、それはそれでいい。来週またここで会おう。`,
      facets: emptyFacets,
    };
  }

  const prompt = `あなたは ${s?.secretary_name || "清瀬リンク"}。${who} の相棒。
下は ${who} の1週間の記録。**手紙**として、1週間をふりかえる文章を書く。

# 書き方（厳守）
- 友達の距離。タメ口。あたたかく。絵文字は少し。
- **曜日ごとの流れに触れる**（「週の頭は〜だったのが、金曜には〜」のように）。
  記録にある曜日だけを使う。無い曜日を作らない。
- 本人が選んだ言葉（どんな一日だったか・明日の感情）を、**その言葉のまま**引く。言い換えて否定しない。
- 数えられることは数える（何日記録した、何回歩いた）。ただし数字を並べるだけにしない。
- できなかったことを責めない。空いた日は「休んだ」として受け取る。
- 決めつけない。「〜な気がする」「〜かも」と余白を残す。
- 占い・算命学の用語は出さない。
- 最後に、来週へ向けた小さな一言をひとつだけ（押し付けない）。
- 全体で8〜12行。見出しや箇条書きは使わず、話しかけるように書ききる。

# 出す形（JSONだけ。前後に何も書かない）
{
  "letter": "上のルールで書いた手紙の本文",
  "progressed": ["その週、前に進んだこと（20字以内）", "…最大4つ"],
  "struggled": "その週、何に引っかかっていたか（40字以内。記録から。無ければ空文字）",
  "reframed": "それをどう捉え直したか（50字以内。捉え直しが見えなければ空文字）",
  "gained": ["手に入れたもの・気づき（20字以内）", "…最大3つ"]
}
※ progressed / gained は**記録にあることだけ**。無ければ空配列にする。作らない。

# ${who} の1週間
${material}`;

  try {
    const raw = await complete({ userId, prompt, maxTokens: 1800, temperature: 0.8 });
    const m = String(raw ?? "").match(/\{[\s\S]*\}/);
    if (!m) return { body: String(raw ?? "").trim(), facets: emptyFacets };
    const j = JSON.parse(m[0]);
    const arr = (v: any, n: number) =>
      (Array.isArray(v) ? v : []).map((x: any) => String(x ?? "").trim()).filter(Boolean).slice(0, n);
    return {
      body: String(j.letter ?? "").trim() || `${who}へ。今週もおつかれさま。`,
      facets: {
        progressed: arr(j.progressed, 4),
        struggled: String(j.struggled ?? "").trim().slice(0, 80),
        reframed: String(j.reframed ?? "").trim().slice(0, 100),
        gained: arr(j.gained, 3),
      },
    };
  } catch {
    return {
      body: `${who}へ。\n今週もおつかれさま。うまく言葉にできなかったけど、続いていること自体がちゃんと効いてるよ。`,
      facets: emptyFacets,
    };
  }
}

/** 週刊レポートを下書きとして保存（同じ週は上書き） */
export async function saveWeeklyDraft(userId: string, body: string, facets?: WeeklyFacets): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("weekly_reports").upsert(
    {
      user_id: userId,
      week_start: weekStartStr(),
      body,
      facets: facets ?? null,
      status: "draft",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_start" },
  );
}

/** 承認待ちの一覧（マスターが読む） */
export async function listDrafts(weekStart?: string): Promise<WeeklyReport[]> {
  const supa = supabaseAdmin();
  const q = supa.from("weekly_reports")
    .select("id, user_id, week_start, body, facets, status, created_at")
    .eq("status", "draft").order("created_at", { ascending: false });
  const { data } = weekStart ? await q.eq("week_start", weekStart) : await q;
  return (data ?? []) as WeeklyReport[];
}

/** 承認する（ここで初めて本人に見える／通知が飛ぶ） */
export async function approveWeekly(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const supa = supabaseAdmin();
  const { data } = await supa.from("weekly_reports")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .in("id", ids).select("id");
  return (data ?? []).length;
}

/** 本人が読めるレポート（承認ずみのものだけ）。未承認は絶対に返さない */
export async function listMyWeekly(userId: string, limit = 8): Promise<WeeklyReport[]> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("weekly_reports")
      .select("id, user_id, week_start, body, facets, status, created_at")
      .eq("user_id", userId).in("status", ["approved", "sent"])
      .order("week_start", { ascending: false }).limit(limit);
    return (data ?? []) as WeeklyReport[];
  } catch { return []; }
}

export { jstWeekdayJa };
