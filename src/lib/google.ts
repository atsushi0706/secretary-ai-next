/**
 * 各ユーザーの refresh_token を使って Google API を叩く薄いラッパー。
 * NextAuth の session に access_token が入っているが、サーバー側で
 * 確実に最新の token を使うため毎回 refresh する。
 */
import { google } from "googleapis";
import { getUserSettings } from "./supabase";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function jstNow(): Date {
  return new Date(Date.now() + JST_OFFSET_MS);
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
  work_start: number;
  work_end: number;
};

export function computeSchedule(
  events: Awaited<ReturnType<typeof getCalendarEvents>>,
  targetDate: Date,
  workStart = 9, workEnd = 17,
  now?: Date,
): Schedule {
  const y = targetDate.getFullYear();
  const m = targetDate.getMonth();
  const d = targetDate.getDate();
  let dayStart = new Date(y, m, d, workStart, 0, 0);
  const dayEnd = new Date(y, m, d, workEnd, 0, 0);
  if (now && now.getFullYear() === y && now.getMonth() === m && now.getDate() === d) {
    if (now > dayStart) dayStart = now < dayEnd ? now : dayEnd;
  }

  const timed: Array<[Date, Date, string]> = [];
  const allDay: string[] = [];
  const afterHours: Array<[Date, Date, string]> = [];
  const targetIso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  for (const e of events) {
    if (e.holiday) continue;
    if (e.all_day) {
      if (e.start && e.start.startsWith(targetIso)) allDay.push(e.title);
      continue;
    }
    if (!e.start || !e.end) continue;
    const s = new Date(e.start);
    const en = new Date(e.end);
    const sJst = new Date(s.getFullYear(), s.getMonth(), s.getDate(),
      s.getHours(), s.getMinutes());
    const enJst = new Date(en.getFullYear(), en.getMonth(), en.getDate(),
      en.getHours(), en.getMinutes());
    if (sJst.toDateString() !== targetDate.toDateString()) continue;
    if (enJst <= dayStart || sJst >= dayEnd) {
      afterHours.push([sJst, enJst, e.title]);
    } else {
      timed.push([
        sJst < dayStart ? dayStart : sJst,
        enJst > dayEnd ? dayEnd : enJst,
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
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return {
    busy_minutes: busyMin,
    free_minutes: freeMin,
    busy_text: timed.map(([s, en, t]) => `  ${fmt(s)}-${fmt(en)} ${t}`).join("\n") || "  なし",
    free_text: free.map(([a, b]) => `  ${fmt(a)}-${fmt(b)} (${Math.floor((b.getTime() - a.getTime()) / 60000)}分)`).join("\n") || "  まとまった空きなし",
    all_day: allDay,
    after_hours_text: afterHours.map(([s, en, t]) => `  ${fmt(s)}-${fmt(en)} ${t}`).join("\n"),
    work_start: workStart, work_end: workEnd,
  };
}
