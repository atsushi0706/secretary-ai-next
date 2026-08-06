/**
 * 速学力プレゼント企画のポイント。サーバ専用。
 *
 * ─────────────────────────────────────────────
 * 【いちばん大事な決めごと：足し算のカウンタを持たない】
 *
 * 「ポイントを+1する」という書き込みを作ると、そこが必ず穴になる。
 * 画面から叩かれる／二重に走る／やり直しで重複する。上位3名に景品が出るので、
 * そこが崩れると企画そのものが成り立たない。
 *
 * だから **ポイントは持たない。毎回、残っている記録から数え直す。**
 *   ・記録はどれも「あとから足されるだけ」の表（会話・ワーク・完了の記録）
 *   ・同じ記録から数えれば、何度数えても同じ値になる
 *   ・内訳を出せるので、本人にも運営にも説明できる
 *   ・あとで配点を直したら、過去ぶんも正しく数え直る
 *
 * ─────────────────────────────────────────────
 * 【水増しを防ぐ3つの仕掛け】
 *
 * ① 同じものを何度もやっても増えない
 *    「その日・その部屋で1点」「同じ題名は1日1回」のように、**日と対象で丸める**。
 *
 * ② 1日に稼げる量に上限を置く
 *    まとめて荒稼ぎできないようにする。毎日少しずつ使った人が上に来る形にする。
 *
 * ③ 中身のないものは数えない
 *    ・会話は **本人が2回以上話している** ものだけ（挨拶だけの部屋は0点）
 *    ・ワークは work_sessions に残ったものだけ（あの記録は本人の発言2つ以上が条件）
 *
 * ─────────────────────────────────────────────
 * 【タスクの不正について（淳くんの指摘）】
 * タスクは自分で自由に足せて消せるので、
 * 「作る→すぐチェック→消す」を繰り返せば無限に稼げてしまう。
 * ここは次の3つで塞ぐ：
 *   ・**同じ題名は1日1回**しか数えない（同じものを繰り返しても増えない）
 *   ・**1日の上限**を置く（理想から生まれたタスク3点／ふつうのタスク2点まで）
 *   ・完了の記録（real_actions）は残るので、消しても稼ぎ直せない
 *      —— 逆に言えば、消しても点は消えない。**やった事実は残る**。
 */
import { supabaseAdmin } from "./supabase";
import { MODES, isModeKey } from "./modes";

/** 部屋の名前を日本語にする（内訳に walk / akashic と出ていたので） */
function roomName(place: unknown): string {
  const p = String(place ?? "").trim();
  if (!p || p === "map") return "地図で";
  if (isModeKey(p)) return MODES[p].label;
  const byPlace: Record<string, string> = {
    peak: "ピークステート", walk: "パラレルウォーク", akashic: "アカシックレコーダー",
    higher: "ハイヤークエスト", deep: "内側のワーク",
  };
  return byPlace[p] ?? p;
}

/* ── 企画の期間 ────────────────────────────────── */

/**
 * 期間（JSTの日付・両端を含む）。
 *
 * 数え始めは **8月11日**。企画を伝えた日から数えないと、
 * 先に使っていた人が有利になって、公平でなくなる。
 * ここを変えれば過去ぶんも数え直る（ポイントを貯めていないので）。
 */
export const CAMPAIGN = {
  name: "速学力プレゼント企画",
  from: "2026-08-11",
  to: "2026-08-31",
  prize: "上位3名に、非売品の電子書籍『速学力』",
} as const;

export const inCampaign = (date: string) =>
  date >= CAMPAIGN.from && date <= CAMPAIGN.to;

/** 期間の残り日数（JSTの今日から。終わっていれば0） */
export function daysLeft(today: string): number {
  if (today > CAMPAIGN.to) return 0;
  const a = new Date(`${(today < CAMPAIGN.from ? CAMPAIGN.from : today)}T00:00:00+09:00`);
  const b = new Date(`${CAMPAIGN.to}T00:00:00+09:00`);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

/* ── 配点 ──────────────────────────────────────── */

/**
 * 配点。ここを見れば、何が何点かが全部分かるようにしておく。
 * あとで変えても、記録から数え直すので過去ぶんも正しくなる。
 */
export const RULES = {
  /** 会話：その部屋で話し始めた（本人が2回以上話していること） */
  talkStart: 1,
  /** 会話：3往復ごとに1点。同じ部屋・同じ日で最大4点（＝12往復ぶん） */
  talkPerThree: 1,
  talkMaxPerRoom: 4,
  /** ワークを終えた（同じ日・同じワークは1点まで） */
  work: 1,
  /** パラレルウォークを歩いた。**いちばん高い**（1日1回） */
  walk: 3,
  /** 実際に歩いた歩数のぶん。500歩で1点、1000歩以上で2点（1日1回） */
  steps500: 1,
  steps1000: 2,
  /** 夜、その日を閉じた（ふりかえり） */
  reflect: 2,
  /** クリスタルを1粒残した */
  crystal: 1,
  /** 今日の説明書に答えた */
  manual: 1,
  /** 理想から生まれたタスクを終えた（1日3点まで） */
  alignedTask: 1,
  alignedTaskMax: 3,
  /** ふつうのタスクを終えた（1日2点まで） */
  task: 1,
  taskMax: 2,
  /** いまの状態をみつめた */
  state: 1,
  /** 週のふりかえりが届いた */
  weekly: 1,
  /** 1日に稼げる上限。まとめて荒稼ぎできないようにする */
  dailyCap: 35,
} as const;

/**
 * 何をすると何点入るか（画面に出す一覧）。
 *
 * 【なぜ出すのか】
 * 何が点になるのか分からないと、そもそもやる気にならない。
 * 配点は隠すものではないので、押せば全部見えるようにする。
 * ——上限や「同じものは1回」も一緒に書く。
 *   あとで「増えないじゃないか」と思わせないため。
 */
export const RULE_LIST: { label: string; points: string; note?: string }[] = [
  { label: "パラレルウォークを歩く", points: "3pt", note: "いちばん高い。1日1回" },
  { label: "実際に歩く（歩数）", points: "1〜2pt", note: "500歩で1pt／1000歩以上で2pt" },
  { label: "夜、その日を閉じる（ふりかえり）", points: "2pt" },
  { label: "部屋で話す", points: "1pt", note: "ひとことだけは入らない。2回以上話すこと" },
  { label: "たくさん話す", points: "＋1pt", note: "3往復ごと。同じ部屋で4ptまで" },
  { label: "ワークを終える", points: "1pt", note: "同じ日・同じワークは1回まで" },
  { label: "クリスタルを残す", points: "1pt", note: "1日3粒まで" },
  { label: "今日の説明書に答える", points: "1pt" },
  { label: "いまの状態をみつめる", points: "1pt" },
  { label: "理想からのタスクを終える", points: "1pt", note: "1日3ptまで" },
  { label: "やることを終える", points: "1pt", note: "1日2ptまで" },
  { label: "週のふりかえりが届く", points: "1pt" },
];

/* ── 数える ────────────────────────────────────── */

export type Breakdown = { label: string; points: number; detail: string };
export type DayPoints = { date: string; points: number; raw: number; capped: boolean };
export type Score = {
  total: number;
  days: number;
  breakdown: Breakdown[];
  byDay: DayPoints[];
  /** 上限で削られた合計（正直に出す） */
  trimmed: number;
};

const rows = async (q: any): Promise<any[]> => {
  try { const { data, error } = await q; if (error) return []; return Array.isArray(data) ? data : []; }
  catch { return []; }
};
/** 題名を丸める（空白と大小の違いで別物にしない） */
const norm = (t: unknown) => String(t ?? "").replace(/\s+/g, "").toLowerCase();

/**
 * その人のポイントを、記録から数える。
 *
 * 数えかたは「日ごとに積んで、最後に1日の上限で丸める」。
 * 内訳は「何で何点入ったか」を人に読める形で返す。
 */
export async function scoreOf(userId: string): Promise<Score> {
  const supa = supabaseAdmin();
  const from = CAMPAIGN.from, to = CAMPAIGN.to;

  const [talks, works, walks, crystals, manuals, acts, emos, closes, weeklies, steps] =
    await Promise.all([
      rows(supa.from("shinga_conversations").select("date, place, role, content")
        .eq("user_id", userId).gte("date", from).lte("date", to)),
      rows(supa.from("work_sessions").select("date, mode")
        .eq("user_id", userId).gte("date", from).lte("date", to)),
      rows(supa.from("walk_logs").select("date")
        .eq("user_id", userId).gte("date", from).lte("date", to)),
      rows(supa.from("crystals").select("date")
        .eq("user_id", userId).gte("date", from).lte("date", to)),
      rows(supa.from("manual_answers").select("date")
        .eq("user_id", userId).gte("date", from).lte("date", to)),
      rows(supa.from("real_actions").select("date, title, kind, aligned")
        .eq("user_id", userId).gte("date", from).lte("date", to)),
      rows(supa.from("emotion_logs").select("date")
        .eq("user_id", userId).gte("date", from).lte("date", to)),
      rows(supa.from("tomorrow_focus").select("date")
        .eq("user_id", userId).gte("date", from).lte("date", to)),
      rows(supa.from("weekly_reports").select("week_start, status")
        .eq("user_id", userId).gte("week_start", from).lte("week_start", to)),
      rows(supa.from("step_logs").select("date, steps")
        .eq("user_id", userId).gte("date", from).lte("date", to)),
    ]);

  /** 日 → 内訳名 → 点 */
  const day = new Map<string, Map<string, number>>();
  const add = (d: string, label: string, p: number) => {
    if (!d || !inCampaign(d) || p <= 0) return;
    const m = day.get(d) ?? new Map<string, number>();
    m.set(label, (m.get(label) ?? 0) + p);
    day.set(d, m);
  };

  /* ① 会話 ─────────────────────────────────────
     その日・その部屋ごとに、本人が何回話したかを数える。
     ・2回以上話していれば「話し始めた」で1点
     ・3往復ごとに1点（同じ部屋で最大4点）
     挨拶だけ／ひとことだけの部屋は0点にする（中身のないものは数えない）。 */
  {
    const per = new Map<string, number>();   // "日|部屋" → 本人の発言数
    for (const r of talks) {
      if (r.role !== "user") continue;
      if (!String(r.content ?? "").trim()) continue;
      const k = `${r.date}|${r.place ?? "map"}`;
      per.set(k, (per.get(k) ?? 0) + 1);
    }
    for (const [k, n] of per) {
      const [d, place] = k.split("|");
      if (n < 2) continue;                                   // ひとことだけは数えない
      add(d, `${roomName(place)}で話した`, RULES.talkStart);
      const extra = Math.min(RULES.talkMaxPerRoom, Math.floor(n / 3) * RULES.talkPerThree);
      if (extra > 0) add(d, `${roomName(place)}で${n}往復ぶん話した`, extra);
    }
  }

  /* ② ワークを終えた（同じ日・同じワークは1点まで） */
  {
    const seen = new Set<string>();
    for (const r of works) {
      const k = `${r.date}|${r.mode}`;
      if (seen.has(k)) continue;
      seen.add(k);
      add(r.date, `${roomName(r.mode)}のワークを終えた`, RULES.work);
    }
  }

  /* ③ パラレルウォーク（1日1点） */
  {
    const seen = new Set<string>();
    for (const r of walks) {
      if (seen.has(r.date)) continue;
      seen.add(r.date);
      add(r.date, "パラレルウォークを歩いた", RULES.walk);
    }
  }

  /* ③-2 実際に歩いた歩数（1日1回。500歩で1点、1000歩以上で2点）
     ここは端末が数えた歩数なので、手で増やせない。 */
  {
    const per = new Map<string, number>();
    for (const r of steps) {
      const n = Number(r.steps) || 0;
      per.set(String(r.date), Math.max(per.get(String(r.date)) ?? 0, n));
    }
    for (const [d, n] of per) {
      if (n >= 1000) add(d, `${n}歩 歩いた`, RULES.steps1000);
      else if (n >= 500) add(d, `${n}歩 歩いた`, RULES.steps500);
    }
  }

  /* ④ クリスタルを残した（1粒ごと。ただし1日3粒まで） */
  {
    const per = new Map<string, number>();
    for (const r of crystals) per.set(r.date, (per.get(r.date) ?? 0) + 1);
    for (const [d, n] of per) {
      add(d, `クリスタルを${Math.min(3, n)}粒 残した`, Math.min(3, n) * RULES.crystal);
    }
  }

  /* ⑤ 今日の説明書に答えた（1日1点） */
  {
    const seen = new Set<string>();
    for (const r of manuals) {
      if (seen.has(r.date)) continue;
      seen.add(r.date);
      add(r.date, "今日の説明書に答えた", RULES.manual);
    }
  }

  /* ⑥ タスクを終えた ───────────────────────────
     ここが水増しの狙われどころ。
     ・同じ題名は1日1回しか数えない
     ・理想から生まれたもの（aligned）は1日3点まで／ふつうのものは1日2点まで
     完了の記録は残るので、あとでタスクを消しても稼ぎ直せない。 */
  {
    const seen = new Set<string>();          // "日|題名" で丸める
    const cnt = new Map<string, { aligned: number; plain: number }>();
    for (const r of acts) {
      const t = norm(r.title);
      if (!t) continue;                      // 題名の無いものは数えない
      const k = `${r.date}|${t}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const c = cnt.get(r.date) ?? { aligned: 0, plain: 0 };
      if (r.aligned) {
        if (c.aligned >= RULES.alignedTaskMax) continue;
        c.aligned += 1;
        add(r.date, "理想からのタスクを終えた", RULES.alignedTask);
      } else {
        if (c.plain >= RULES.taskMax) continue;
        c.plain += 1;
        add(r.date, "やることを終えた", RULES.task);
      }
      cnt.set(r.date, c);
    }
  }

  /* ⑦ 状態をみつめた（1日1点） */
  {
    const seen = new Set<string>();
    for (const r of emos) {
      if (seen.has(r.date)) continue;
      seen.add(r.date);
      add(r.date, "いまの状態をみつめた", RULES.state);
    }
  }

  /* ⑧ 夜、その日を閉じた */
  {
    const seen = new Set<string>();
    for (const r of closes) {
      if (seen.has(r.date)) continue;
      seen.add(r.date);
      add(r.date, "夜、その日を閉じた", RULES.reflect);
    }
  }

  /* ⑨ 週のふりかえりが届いた（下書きのままは数えない） */
  {
    for (const r of weeklies) {
      if (r.status === "draft") continue;
      add(String(r.week_start), "週のふりかえりが届いた", RULES.weekly);
    }
  }

  /*
   * じぶんワークは点にしない。
   * 作った日が記録されていないので、どの日に乗せても嘘になる。
   * （じぶんワークを**走らせた**ぶんは、work_sessions に残るので②で数えている）
   */

  /* ── 1日の上限で丸めて、合計する ───────────────── */
  const byDay: DayPoints[] = [...day.entries()]
    .map(([d, m]) => {
      const raw = [...m.values()].reduce((a, b) => a + b, 0);
      const points = Math.min(RULES.dailyCap, raw);
      return { date: d, points, raw, capped: raw > RULES.dailyCap };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const total = byDay.reduce((a, b) => a + b.points, 0);
  const trimmed = byDay.reduce((a, b) => a + (b.raw - b.points), 0);

  // 内訳は、名前ごとにまとめて多い順（上限で削られたぶんは、上の trimmed で正直に出す）
  const merged = new Map<string, number>();
  for (const m of day.values()) {
    for (const [label, p] of m) merged.set(label, (merged.get(label) ?? 0) + p);
  }
  const breakdown: Breakdown[] = [...merged.entries()]
    .map(([label, points]) => ({ label, points, detail: label }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 24);

  return { total, days: byDay.length, breakdown, byDay, trimmed };
}

/** 上位を出す（運営用）。全員ぶん数えるので、人数が増えたら重い */
export async function ranking(limit = 20): Promise<{ userId: string; name: string; total: number; days: number }[]> {
  const supa = supabaseAdmin();
  const users = await rows(supa.from("user_settings").select("user_id, birth_name, display_name, user_call_name, email"));
  const out: { userId: string; name: string; total: number; days: number }[] = [];
  for (const u of users) {
    const s = await scoreOf(String(u.user_id));
    if (s.total <= 0) continue;
    out.push({
      userId: String(u.user_id),
      name: String(u.birth_name || u.display_name || u.user_call_name || u.email || u.user_id).slice(0, 40),
      total: s.total, days: s.days,
    });
  }
  return out.sort((a, b) => b.total - a.total || b.days - a.days).slice(0, limit);
}
