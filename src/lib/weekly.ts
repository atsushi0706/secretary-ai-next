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

  /**
   * 材料は、多いほど良い。
   *
   * 前は「どんな一日だったか／明日の感情／状態チェック／歩いた話」の4つしか渡しておらず、
   * **リアルバースで実際にやったこと（チェックを入れたタスク）が1件も入っていなかった。**
   * だから手紙が短く、何をやった週なのかが書けなかった。
   * その週に残った記録は、全部渡す。
   */
  const supa = supabaseAdmin();
  const from = jstDateStr(new Date(Date.now() - 7 * 86400000));
  const q = (table: string, cols: string) =>
    supa.from(table).select(cols).eq("user_id", userId).gte("date", from)
      .order("date", { ascending: true }).limit(200)
      .then((r: any) => (r.data ?? []) as any[], () => [] as any[]);

  const [marks, tomorrows, walks, emotions, acts, hq, cards, skills, guards, said] = await Promise.all([
    listDayMarks(userId, 7).catch(() => []),
    listTomorrow(userId, 7).catch(() => []),
    listWalkLogs(userId, 7).catch(() => []),
    listEmotions(userId, 30).catch(() => []),
    q("real_actions", "date, title, kind, aligned"),      // リアルバースでやったこと
    q("higher_quest", "date, items"),                     // 今日の一手
    q("quest_cards", "date, title, done"),                // 未来からのクエスト
    q("skill_cards", "date, title, body"),                // 手に入れた力
    q("guardians", "date, color"),                        // 解き放った守り手
    supa.from("shinga_conversations").select("date, place, content")
      .eq("user_id", userId).eq("role", "user").gte("date", from)
      .order("created_at", { ascending: true }).limit(60)
      .then((r: any) => (r.data ?? []) as any[], () => [] as any[]),
  ]);

  const emo7 = emotions.filter((e: any) => e.date >= from);
  const wd = (d: string) => {
    try { return jstWeekdayJa(new Date(`${d}T00:00:00+09:00`)); } catch { return ""; }
  };
  const line = (t: unknown, n = 60) => String(t ?? "").trim().replace(/\s+/g, " ").slice(0, n);

  // 日ごとに、その日あったことを1行にまとめる（週の流れが見えるように）
  const byDay = new Map<string, string[]>();
  const add = (d: string, t: string) => {
    if (!d || !t) return;
    const list = byDay.get(d) ?? [];
    list.push(t);
    byDay.set(d, list);
  };
  for (const m of marks as any[]) add(m.date, `気分：${dayKind(m.kind).label}`);
  for (const a of acts) { const t = line(a.title); if (t) add(a.date, `${a.aligned ? "理想からのタスク" : "やること"}を片づけた：${t}`); }
  for (const r of hq) for (const it of (Array.isArray(r.items) ? r.items : [])) {
    const t = line(it?.text); if (it?.done && t) add(r.date, `今日の一手をやった：${t}`);
  }
  for (const c of cards) { const t = line(c.title); if (c.done && t) add(c.date, `未来からのクエストをやった：${t}`); }
  for (const w of walks as any[]) { const t = line(w.summary, 120); if (t) add(w.date, `パラレルウォークで語った：${t}`); }
  for (const k of skills) { const t = line(k.title); if (t) add(k.date, `力を手に入れた：${t}`); }
  for (const g of guards) add(g.date, "守り手をひとつ解き放った");
  for (const e of emo7 as any[]) add(e.date, `状態 ${e.level}/10${e.note ? `（${line(e.note, 40)}）` : ""}`);
  for (const t of tomorrows as any[]) {
    const acts2 = (t.actions ?? []).map((x: any) => line(x, 30)).filter(Boolean);
    add(t.date, `夜に決めた：明日の感情「${line(t.emotion, 20) || "—"}」／${acts2.join("・") || "やることは決めず"}`);
  }
  const PLACE: Record<string, string> = {
    walk: "パラレルウォーク", peak: "ピークステート", akashic: "アカシック",
    deep: "内側のワーク", higher: "ハイヤークエスト", map: "自由な会話",
  };
  for (const c of said) { const t = line(c.content, 90); if (t) add(c.date, `${PLACE[c.place] ?? "ワーク"}で言った：「${t}」`); }

  const days = [...byDay.keys()].sort();
  const NL = String.fromCharCode(10);
  const timeline = days
    .map((d) => `## ${d}（${wd(d)}）` + NL + (byDay.get(d) ?? []).map((x) => `- ${x}`).join(NL))
    .join(NL + NL);

  const doneCount = acts.filter((a) => line(a.title)).length;
  const counts = [
    "# 数えられること",
    `- 記録が残った日：${days.length}日`,
    `- 片づけたタスク：${doneCount}件`,
    `- パラレルウォーク：${(walks as any[]).length}回`,
    `- 状態チェック：${(emo7 as any[]).length}回`,
  ].join(NL);
  const material = [
    timeline ? "# 1日ずつの記録（これが週の流れそのもの）" + NL + timeline : "",
    counts,
  ].filter(Boolean).join(NL + NL);

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
- **600〜1000字**で書く。短くまとめない。1週間ぶんの出来事があるのだから、ちゃんと厚く書く。
- 見出しや箇条書きは使わない。話しかけるように、段落で書ききる。

## この順で書く（各段落、記録に沿って具体的に）
1. **週のはじまり** … 月曜・火曜あたりが、どんな入り方だったか。
   本人が選んだ言葉（気分・その日の記録）を、**そのまま引く**。
2. **途中で何が変わったか** … 週の中で流れが変わった瞬間を1つ見つけて、そこを書く。
   「何曜のこれがきっかけかも」と、記録を名指しする。変化が無ければ「静かなまま進んだ」と書く。
3. **何に引っかかっていたか** … しんどかったこと・止まっていたこと。
   本人の言葉から拾う。責めない。**見当たらなければ、この段落ごと書かない**（無いと書かない）。
4. **実際にやったこと** … 片づけたタスク、今日の一手、クエスト。
   **タイトルを具体的に挙げる**（「◯◯を片づけてた」のように）。ここを省かない。
5. **歩いた話・内側のこと** … ワークで語ったこと。本人の言葉を引く。
   **記録があるワークのことだけ書く。**行っていない部屋の名前は出さない。
   どのワークの記録も無ければ、この段落ごと書かない。
6. **来週へ** … 小さな一言をひとつだけ。押し付けない。

## 守ること
- **記録に無いことは書かない。** 曜日も、やったことも、勝手に作らない。
- 本人が選んだ言葉は、言い換えて否定しない。
- 数えられることは数える。ただし数字を並べるだけにしない。
- できなかったことを責めない。空いた日は「休んだ」として受け取る。
- 決めつけない。「〜な気がする」「〜かも」と余白を残す。
- 占い・算命学の用語は出さない。

## **やらなかったことに触れない**（ここがいちばん壊れやすい）
記録に無いものは、**無いと書かずに、ただ書かない。**
やらなかったワークの名前を出さない。少なかった理由を説明しない。数の少なさに触れない。

  × パラレルウォークが無かったから、1件だけだったね
  × 今週はクリスタルルームに行っていないみたいだね
  × 記録が少なめの週だったけど
  ○ （その話には触れず、**あった記録のことだけ**を書く）

やったことが1つしか無い週なら、**その1つを厚く書く。**
「1つしかない」とは言わない。少ないことを埋め合わせようとして、
足りなさの説明を始めるのがいちばんよくない。

# 出す形（JSONだけ。前後に何も書かない）
{
  "letter": "上のルールで書いた手紙の本文（600〜1000字）",
  "progressed": ["その週、前に進んだこと（20字以内）", "…最大4つ"],
  "struggled": "その週、何に引っかかっていたか（40字以内。記録から。無ければ空文字）",
  "reframed": "それをどう捉え直したか（50字以内。捉え直しが見えなければ空文字）",
  "gained": ["手に入れたもの・気づき（20字以内）", "…最大3つ"]
}
※ progressed / gained は**記録にあることだけ**。無ければ空配列にする。作らない。

# ${who} の1週間
${material}`;

  try {
    const raw = await complete({ userId, prompt, maxTokens: 3200, temperature: 0.8 });
    const m = String(raw ?? "").match(/\{[\s\S]*\}/);
    if (!m) return { body: String(raw ?? "").trim(), facets: emptyFacets };
    const j = JSON.parse(m[0]);
    const arr = (v: any, n: number) =>
      (Array.isArray(v) ? v : []).map((x: any) => String(x ?? "").trim()).filter(Boolean).slice(0, n);
    /*
     * 「やらなかったこと」に触れていないか、こちらでも見る。
     * 指示に書いても、少ない週ほど足りなさの説明を始めてしまう。
     * 見つけたら、その文だけ落とす（手紙ごと捨てない）。
     */
    const letter = dropAbsenceTalk(String(j.letter ?? "").trim());
    return {
      body: letter || `${who}へ。今週もおつかれさま。`,
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

/**
 * 「やっていないこと」の話を落とす。
 *
 * 「パラレルウォークが無かったから1件だけ」のように、
 * **やらなかったワークを名指しして、少なさを説明する**文が混じることがある。
 * 言わなくていい。文の単位で落とす（手紙ごと捨てない）。
 */
const ABSENCE = [
  /(が|は)(無かった|なかった|見当たら|見あたら)/,
  /(して|行って|やって)(い?ない|なかった|いなかった)/,
  /(記録|回数|件数)(が|は)?(少な|わずか|ほとんど)/,
  /(だけ|しか).{0,6}(だった|なかった|ない)/,
  /(今週|この週)(は)?.{0,10}(少な|静か)(かった|め)/,
];
export function dropAbsenceTalk(text: string): string {
  if (!text) return text;
  const NL = String.fromCharCode(10);
  const paras = text.split(NL).map((para) => {
    const sens = para.split(/(?<=。)/);
    const out: string[] = [];
    let 直前を落とした = false;
    for (const sen of sens) {
      if (ABSENCE.some((re) => re.test(sen))) { 直前を落とした = true; continue; }
      /*
       * 落とした文を受けている「でも」「だけど」は、受ける相手がいなくなるので取る。
       * （「…1件だけだった。でも、その1件が濃かった。」の前半を落とすと、
       *   「でも、」だけが浮いて読みにくくなる）
       */
      out.push(直前を落とした ? sen.replace(/^\s*(でも|だけど|ただ|けど)、?\s*/, "") : sen);
      直前を落とした = false;
    }
    return out.join("");
  });
  // 中身が空になった行は落とす。元の改行の間隔はそのまま
  return paras.filter((p) => p.trim()).join(NL).trim();
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

/**
 * まだ開いていない、届いているレポートの数。
 * 通知を許可していない人は「届いたこと」に気づけないので、
 * 地図の宝箱に印を出すために使う。
 * （読んだかどうかは status で持つ：approved＝未読／sent＝読んだ）
 */
export async function countUnreadWeekly(userId: string): Promise<number> {
  try {
    const supa = supabaseAdmin();
    const { count } = await supa.from("weekly_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "approved");
    return count ?? 0;
  } catch { return 0; }
}

/** 宝箱を開いた＝読んだ、として印を消す */
export async function markWeeklyRead(userId: string): Promise<void> {
  try {
    const supa = supabaseAdmin();
    await supa.from("weekly_reports")
      .update({ status: "sent" })
      .eq("user_id", userId).eq("status", "approved");
  } catch { /* 印が消えなくても、読むことはできる */ }
}

/**
 * 全員ぶんを、週ごとにまとめて読む（親アカウント用）。
 * 承認待ちだけでなく、**すでに送ったものも含めて**一覧にする。
 * 承認の場では下書きしか見えないので、
 * 「先週みんなに何を送ったか」を後から追えなかった。
 */
export async function listAllWeekly(limitWeeks = 6): Promise<{
  week_start: string;
  reports: (WeeklyReport & { name: string })[];
}[]> {
  const supa = supabaseAdmin();
  const { data } = await supa.from("weekly_reports")
    .select("id, user_id, week_start, body, facets, status, created_at")
    .order("week_start", { ascending: false }).limit(400);
  const rows = (data ?? []) as WeeklyReport[];
  if (!rows.length) return [];

  const { data: users } = await supa.from("user_settings").select("user_id, user_call_name, display_name, email");
  const nameOf = new Map((users ?? []).map((u: any) =>
    [u.user_id, u.user_call_name || u.display_name || u.email || String(u.user_id).slice(0, 8) + "…"]));

  const byWeek = new Map<string, (WeeklyReport & { name: string })[]>();
  for (const r of rows) {
    const list = byWeek.get(r.week_start) ?? [];
    list.push({ ...r, name: nameOf.get(r.user_id) ?? String(r.user_id).slice(0, 8) + "…" });
    byWeek.set(r.week_start, list);
  }
  return [...byWeek.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, limitWeeks)
    .map(([week_start, reports]) => ({
      week_start,
      reports: reports.sort((a, b) => a.name.localeCompare(b.name, "ja")),
    }));
}

export { jstWeekdayJa };
