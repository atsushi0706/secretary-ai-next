/**
 * 各ユーザーの refresh_token を使って Google API を叩く薄いラッパー。
 * NextAuth の session に access_token が入っているが、サーバー側で
 * 確実に最新の token を使うため毎回 refresh する。
 */
import { google } from "googleapis";
import { getUserSettings } from "./supabase";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 真の現在時刻(UTC基準の絶対時刻)。 +9h された偽UTC は時刻比較で破綻するため
// 比較・計算では必ずこれを使う(jstToUtc など他のヘルパーと整合する)
export function jstNow(): Date {
  return new Date();
}

// 表示用: JST の "YYYY-MM-DD HH:MM" 文字列を返す
export function formatJstDateTime(d: Date = new Date()): string {
  const j = new Date(d.getTime() + JST_OFFSET_MS);
  const y = j.getUTCFullYear();
  const m = String(j.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(j.getUTCDate()).padStart(2, "0");
  const hh = String(j.getUTCHours()).padStart(2, "0");
  const mi = String(j.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${dd} ${hh}:${mi}`;
}

export function jstDateStr(d: Date = new Date()): string {
  // YYYY-MM-DD（JSTベース）
  const jst = new Date(d.getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, 10);
}

async function getOAuthClient(userId: string) {
  const s = await getUserSettings(userId);
  if (!s?.google_refresh_token) {
    throw new Error("Google 認証情報がありません。ログインし直してください。");
  }
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: s.google_refresh_token });
  return client;
}

export async function getCalendarEvents(
  userId: string, daysAhead = 1,
): Promise<Array<{
  title: string;
  start: string | null;
  end: string | null;
  all_day: boolean;
  location: string;
  description: string;
  calendar: string;
  holiday: boolean;
}>> {
  const auth = await getOAuthClient(userId);
  const cal = google.calendar({ version: "v3", auth });
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + daysAhead + 1);

  // 全カレンダー横断
  const lists = await cal.calendarList.list();
  const out: any[] = [];
  for (const c of lists.data.items ?? []) {
    if (!c.id) continue;
    const isHoliday = ((c.id + (c.summary ?? "")).toLowerCase()
      .includes("holiday")) || (c.summary ?? "").includes("祝日");
    try {
      const r = await cal.events.list({
        calendarId: c.id,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });
      for (const e of r.data.items ?? []) {
        const startRaw = e.start?.dateTime ?? e.start?.date ?? null;
        const endRaw = e.end?.dateTime ?? e.end?.date ?? null;
        const allDay = !!e.start?.date;
        out.push({
          title: e.summary ?? "(無題)",
          start: startRaw, end: endRaw, all_day: allDay,
          location: e.location ?? "", description: e.description ?? "",
          calendar: c.summary ?? "", holiday: isHoliday,
        });
      }
    } catch (err) {
      // 個別カレンダーが取れなくても続ける
      console.warn(`Failed to fetch calendar ${c.id}:`, err);
    }
  }
  out.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  return out;
}

export async function getTasks(userId: string, includeCompleted = false) {
  const auth = await getOAuthClient(userId);
  const tasksApi = google.tasks({ version: "v1", auth });
  const lists = await tasksApi.tasklists.list({ maxResults: 100 });
  const allTasks: any[] = [];
  for (const tl of lists.data.items ?? []) {
    if (!tl.id) continue;
    const r = await tasksApi.tasks.list({
      tasklist: tl.id,
      showCompleted: includeCompleted,
      showHidden: includeCompleted,
      maxResults: 100,
    });
    for (const t of r.data.items ?? []) {
      allTasks.push({
        id: t.id, tasklist_id: tl.id, tasklist_title: tl.title,
        title: t.title ?? "(無題)", notes: t.notes ?? "",
        due: t.due ?? null, status: t.status ?? "needsAction",
        updated: t.updated ?? "",
      });
    }
  }
  return allTasks;
}

export async function completeTask(userId: string, tasklistId: string, taskId: string) {
  const auth = await getOAuthClient(userId);
  await google.tasks({ version: "v1", auth }).tasks.patch({
    tasklist: tasklistId, task: taskId, requestBody: { status: "completed" },
  });
}

export async function deleteTask(userId: string, tasklistId: string, taskId: string) {
  const auth = await getOAuthClient(userId);
  await google.tasks({ version: "v1", auth }).tasks.delete({
    tasklist: tasklistId, task: taskId,
  });
}

/**
 * カレンダー予定を ID 指定で削除。
 * primary 以外のカレンダーから登録されたものも消せるよう calendarId 指定対応。
 */
export async function deleteCalendarEvent(
  userId: string,
  calendarId: string,
  eventId: string,
) {
  const auth = await getOAuthClient(userId);
  const cal = google.calendar({ version: "v3", auth });
  await cal.events.delete({ calendarId, eventId });
}

/**
 * 条件にマッチするカレンダー予定を検索 → 一括削除。
 *  - dateJST: "YYYY-MM-DD" その日のJST 0時〜翌0時の範囲で探す
 *  - titleMatch: タイトルにこの文字列が部分一致するもののみ (省略可、その場合は date のみで絞る)
 *  - startHHMM: "HH:MM" 開始時刻が一致するもののみ (省略可)
 *  - deleteAll: true なら titleMatch を無視して、その日の全予定を削除
 * 戻り値: 削除に成功したタイトルの配列
 */
export async function deleteCalendarEventsByCriteria(
  userId: string,
  criteria: {
    dateJST: string;
    titleMatch?: string;
    startHHMM?: string;
    deleteAll?: boolean;
  },
): Promise<string[]> {
  const auth = await getOAuthClient(userId);
  const cal = google.calendar({ version: "v3", auth });

  // JST 0時〜翌0時の範囲
  const [yStr, mStr, dStr] = criteria.dateJST.split("-");
  const y = parseInt(yStr, 10), m = parseInt(mStr, 10) - 1, d = parseInt(dStr, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return [];
  const dayStart = new Date(Date.UTC(y, m, d, -9, 0, 0)); // JST 0時 = UTC 前日15時
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const lists = await cal.calendarList.list();
  const deleted: string[] = [];

  for (const c of lists.data.items ?? []) {
    if (!c.id) continue;
    // 祝日カレンダー(読取専用)はスキップ
    const cIdLower = (c.id + (c.summary ?? "")).toLowerCase();
    if (cIdLower.includes("holiday") || (c.summary ?? "").includes("祝日")) continue;

    try {
      const r = await cal.events.list({
        calendarId: c.id,
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });
      for (const e of r.data.items ?? []) {
        if (!e.id) continue;
        const title = (e.summary ?? "").trim();

        // タイトルマッチ判定
        if (!criteria.deleteAll && criteria.titleMatch) {
          if (!title.includes(criteria.titleMatch)) continue;
        }
        // 開始時刻マッチ判定 (HH:MM JST)
        if (criteria.startHHMM) {
          const startRaw = e.start?.dateTime ?? e.start?.date ?? null;
          if (!startRaw) continue;
          const startDate = new Date(startRaw);
          // JST に変換
          const jstHH = String((startDate.getUTCHours() + 9) % 24).padStart(2, "0");
          const jstMI = String(startDate.getUTCMinutes()).padStart(2, "0");
          if (`${jstHH}:${jstMI}` !== criteria.startHHMM) continue;
        }

        try {
          await cal.events.delete({ calendarId: c.id, eventId: e.id });
          deleted.push(title || "(無題)");
        } catch (err) {
          console.warn(`Failed to delete event ${e.id} from ${c.id}:`, err);
        }
      }
    } catch (err) {
      console.warn(`Failed to list events in calendar ${c.id}:`, err);
    }
  }
  return deleted;
}

export async function addCalendarEvent(
  userId: string,
  args: {
    title: string;
    startISO: string; // 例: "2026-06-08T14:00:00+09:00"
    endISO: string;
    description?: string;
    calendarId?: string; // 省略時は primary
    colorId?: string;
  },
) {
  const auth = await getOAuthClient(userId);
  const cal = google.calendar({ version: "v3", auth });
  const r = await cal.events.insert({
    calendarId: args.calendarId ?? "primary",
    requestBody: {
      summary: args.title,
      description: args.description,
      start: { dateTime: args.startISO, timeZone: "Asia/Tokyo" },
      end: { dateTime: args.endISO, timeZone: "Asia/Tokyo" },
      colorId: args.colorId,
    },
  });
  return r.data;
}

export async function addTask(
  userId: string, title: string, opts: { notes?: string; due?: string | null } = {},
  tasklistId = "@default",
) {
  const auth = await getOAuthClient(userId);
  const body: any = { title };
  if (opts.notes) body.notes = opts.notes;
  if (opts.due) {
    body.due = opts.due.length === 10 ? `${opts.due}T00:00:00.000Z` : opts.due;
  }
  const r = await google.tasks({ version: "v1", auth }).tasks.insert({
    tasklist: tasklistId, requestBody: body,
  });
  return r.data;
}

export type Schedule = {
  busy_minutes: number;
  free_minutes: number;
  busy_text: string;
  free_text: string;
  all_day: string[];
  after_hours_text: string;
  work_start: number;       // 時 (整数)。互換のため残す。分は work_start_text の方が正確
  work_end: number;
  work_start_text: string;  // "HH:MM" (例: "09:30")
  work_end_text: string;
  is_off_day: boolean;      // シフトで休みに設定されてる曜日
};

export type WeekDayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type WeeklySchedule = Partial<Record<WeekDayKey, string | null>>;

const DAY_KEYS_FROM_SUN = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAY_JA_FROM_SUN = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"] as const;

/** JST 上での曜日を日本語で返す ("月曜日" 〜 "日曜日"). LLM が曜日推論で間違うのを防ぐため明示用 */
export function jstDayOfWeekJa(d: Date): string {
  const p = toJstParts(d);
  const wd = new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay();
  return DAY_JA_FROM_SUN[wd];
}

/**
 * JST 上での曜日キーを取得 ("mon", "tue", ...).
 * targetDate が "2026-06-22T00:00:00+09:00" のような JST 0時を指してることを想定。
 */
function jstDayKey(d: Date): WeekDayKey {
  const p = toJstParts(d);
  const wd = new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay(); // 0=Sun..6=Sat
  return DAY_KEYS_FROM_SUN[wd];
}

/** "HH:MM-HH:MM" をパースして { startH, startM, endH, endM } を返す。形式不正なら null */
function parseShiftRange(s: string | null | undefined): {
  startH: number; startM: number; endH: number; endM: number;
} | null {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/^(\d{1,2}):(\d{2})\s*[-–〜~]\s*(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const startH = parseInt(m[1], 10), startM = parseInt(m[2], 10);
  const endH = parseInt(m[3], 10), endM = parseInt(m[4], 10);
  if (startH < 0 || startH > 24 || endH < 0 || endH > 24) return null;
  if (startM < 0 || startM > 59 || endM < 0 || endM > 59) return null;
  if (endH * 60 + endM <= startH * 60 + startM) return null;
  return { startH, startM, endH, endM };
}

/** weeklySchedule からその日の (startH, startM, endH, endM) または「休み」を返す */
function shiftForDate(
  targetDate: Date,
  weeklySchedule: WeeklySchedule | null | undefined,
  fallbackStartH: number,
  fallbackEndH: number,
): { startH: number; startM: number; endH: number; endM: number; isOff: boolean } {
  if (!weeklySchedule) {
    return { startH: fallbackStartH, startM: 0, endH: fallbackEndH, endM: 0, isOff: false };
  }
  const dayKey = jstDayKey(targetDate);
  if (!(dayKey in weeklySchedule)) {
    return { startH: fallbackStartH, startM: 0, endH: fallbackEndH, endM: 0, isOff: false };
  }
  const raw = weeklySchedule[dayKey];
  if (raw === null) {
    return { startH: 0, startM: 0, endH: 0, endM: 0, isOff: true };
  }
  const parsed = parseShiftRange(raw);
  if (!parsed) {
    return { startH: fallbackStartH, startM: 0, endH: fallbackEndH, endM: 0, isOff: false };
  }
  return { ...parsed, isOff: false };
}

// JST 基準で Date を分解する（サーバーが UTC で動いていても正確に JST の年月日時分が取れる）
function toJstParts(d: Date) {
  const j = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return {
    y: j.getUTCFullYear(),
    m: j.getUTCMonth(),       // 0-11
    d: j.getUTCDate(),
    h: j.getUTCHours(),
    mi: j.getUTCMinutes(),
  };
}

// JST の y/m/d/h/mi から「絶対時刻」(=UTC基準の Date オブジェクト) を作る
function jstToUtc(y: number, m: number, d: number, h: number, mi: number): Date {
  // JST = UTC + 9h なので、JST の時刻と同じ瞬間の UTC を作るには JSTから9h引く
  return new Date(Date.UTC(y, m, d, h - 9, mi, 0));
}

// JST 上の "YYYY-MM-DD" 文字列
function jstDateKey(d: Date): string {
  const p = toJstParts(d);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export function computeSchedule(
  events: Awaited<ReturnType<typeof getCalendarEvents>>,
  targetDate: Date,
  workStart = 9, workEnd = 17,
  now?: Date,
  weeklySchedule?: WeeklySchedule | null,
): Schedule {
  // targetDate は通常 "YYYY-MM-DDT00:00:00+09:00" で渡される → JST 0時を指す
  // それを JST 基準で分解して、稼働時間の絶対時刻を作る
  const tj = toJstParts(targetDate);

  // 週次シフトがあればその曜日のシフトで上書き
  const shift = shiftForDate(targetDate, weeklySchedule, workStart, workEnd);
  const startHText = String(shift.startH).padStart(2, "0") + ":" + String(shift.startM).padStart(2, "0");
  const endHText = String(shift.endH).padStart(2, "0") + ":" + String(shift.endM).padStart(2, "0");

  // 休みの日: 時間割を作らず、固定予定だけ拾って返す
  if (shift.isOff) {
    const allDayOff: string[] = [];
    const timedOff: Array<[Date, Date, string]> = [];
    const targetDateStrOff = `${tj.y}-${String(tj.m + 1).padStart(2, "0")}-${String(tj.d).padStart(2, "0")}`;
    for (const e of events) {
      if (e.holiday) continue;
      if (e.all_day) {
        if (e.start && e.start.startsWith(targetDateStrOff)) allDayOff.push(e.title);
        continue;
      }
      if (!e.start || !e.end) continue;
      const s = new Date(e.start);
      if (jstDateKey(s) !== targetDateStrOff) continue;
      timedOff.push([s, new Date(e.end), e.title]);
    }
    timedOff.sort((a, b) => a[0].getTime() - b[0].getTime());
    const fmtOff = (d: Date) => {
      const p = toJstParts(d);
      return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
    };
    return {
      busy_minutes: 0,
      free_minutes: 0,
      busy_text: timedOff.map(([s, en, t]) => `  ${fmtOff(s)}-${fmtOff(en)} ${t}`).join("\n") || "  なし",
      free_text: "  （お休みの日）",
      all_day: allDayOff,
      after_hours_text: "",
      work_start: 0,
      work_end: 0,
      work_start_text: "",
      work_end_text: "",
      is_off_day: true,
    };
  }

  let dayStart = jstToUtc(tj.y, tj.m, tj.d, shift.startH, shift.startM);
  const dayEnd = jstToUtc(tj.y, tj.m, tj.d, shift.endH, shift.endM);
  if (now) {
    const nj = toJstParts(now);
    if (nj.y === tj.y && nj.m === tj.m && nj.d === tj.d) {
      if (now > dayStart) dayStart = now < dayEnd ? now : dayEnd;
    }
  }

  const timed: Array<[Date, Date, string]> = [];
  const allDay: string[] = [];
  const afterHours: Array<[Date, Date, string]> = [];
  const targetDateStr = `${tj.y}-${String(tj.m + 1).padStart(2, "0")}-${String(tj.d).padStart(2, "0")}`;

  for (const e of events) {
    if (e.holiday) continue;
    if (e.all_day) {
      if (e.start && e.start.startsWith(targetDateStr)) allDay.push(e.title);
      continue;
    }
    if (!e.start || !e.end) continue;
    const s = new Date(e.start);
    const en = new Date(e.end);
    // JST 上で「同じ日」かを比較（サーバUTCに依存しない）
    if (jstDateKey(s) !== targetDateStr) continue;
    if (en <= dayStart || s >= dayEnd) {
      afterHours.push([s, en, e.title]);
    } else {
      timed.push([
        s < dayStart ? dayStart : s,
        en > dayEnd ? dayEnd : en,
        e.title,
      ]);
    }
  }

  timed.sort((a, b) => a[0].getTime() - b[0].getTime());
  const free: Array<[Date, Date]> = [];
  let cursor = dayStart; let busyMin = 0;
  for (const [s, en] of timed) {
    if (s > cursor) free.push([cursor, s]);
    busyMin += Math.max(0, Math.floor((en.getTime() - s.getTime()) / 60000));
    if (en > cursor) cursor = en;
  }
  if (cursor < dayEnd) free.push([cursor, dayEnd]);
  const freeMin = free.reduce(
    (acc, [a, b]) => acc + Math.max(0, Math.floor((b.getTime() - a.getTime()) / 60000)), 0,
  );
  // 時刻表示も JST 基準（サーバUTCに依存しない）
  const fmt = (d: Date) => {
    const p = toJstParts(d);
    return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
  };
  return {
    busy_minutes: busyMin,
    free_minutes: freeMin,
    busy_text: timed.map(([s, en, t]) => `  ${fmt(s)}-${fmt(en)} ${t}`).join("\n") || "  なし",
    free_text: free.map(([a, b]) => `  ${fmt(a)}-${fmt(b)} (${Math.floor((b.getTime() - a.getTime()) / 60000)}分)`).join("\n") || "  まとまった空きなし",
    all_day: allDay,
    after_hours_text: afterHours.map(([s, en, t]) => `  ${fmt(s)}-${fmt(en)} ${t}`).join("\n"),
    work_start: shift.startH, work_end: shift.endH,
    work_start_text: startHText,
    work_end_text: endHText,
    is_off_day: false,
  };
}
