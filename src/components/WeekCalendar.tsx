"use client";

import { useEffect, useState, useMemo, Fragment } from "react";

type Event = {
  title: string;
  start: string | null;
  end: string | null;
  all_day: boolean;
  location?: string;
  holiday?: boolean;
};

const HOUR_START = 9;
const HOUR_END = 18; // 17時最後ぶんを表示するため18まで枠を取る
const HOURS = HOUR_END - HOUR_START;
const HOUR_PX = 44;

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  // 月曜始まり: getDay() 0=日,1=月,...,6=土
  const dow = c.getDay();
  const diff = (dow === 0 ? -6 : 1 - dow);
  c.setDate(c.getDate() + diff);
  return c;
}

export function WeekCalendar() {
  const [events, setEvents] = useState<Event[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    fetch("/api/calendar?daysAhead=21")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []));
  }, []);

  const { days, todayStr, allDaySlots, slotsByDay } = useMemo(() => {
    const today = new Date();
    const baseMon = startOfWeek(today);
    baseMon.setDate(baseMon.getDate() + weekOffset * 7);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(baseMon.getTime() + i * 86400000));
    }
    const todayStr = localDateStr(today);
    const dayStrs = days.map(localDateStr);

    const slotsByDay: Record<string, Array<{
      title: string; top: number; height: number; time: string; loc?: string;
    }>> = {};
    const allDaySlots: Record<string, string[]> = {};
    for (const d of dayStrs) { slotsByDay[d] = []; allDaySlots[d] = []; }

    for (const e of events) {
      if (e.holiday || !e.start) continue;
      const startDate = e.start.slice(0, 10);
      if (!dayStrs.includes(startDate)) continue;
      if (e.all_day) {
        allDaySlots[startDate].push(e.title);
        continue;
      }
      try {
        const s = new Date(e.start);
        const en = e.end ? new Date(e.end) : new Date(s.getTime() + 30 * 60000);
        const startHour = s.getHours() + s.getMinutes() / 60;
        const endHour = en.getHours() + en.getMinutes() / 60;
        // 9-18 の範囲にクランプ
        const clampedStart = Math.max(HOUR_START, startHour);
        const clampedEnd = Math.min(HOUR_END, endHour);
        if (clampedEnd <= clampedStart) continue;
        const top = (clampedStart - HOUR_START) * HOUR_PX;
        const height = Math.max(20, (clampedEnd - clampedStart) * HOUR_PX);
        const fmt = (d: Date) =>
          `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        slotsByDay[startDate].push({
          title: e.title,
          top, height,
          time: `${fmt(s)}–${fmt(en)}`,
          loc: e.location || undefined,
        });
      } catch { /* skip */ }
    }

    return { days, todayStr, allDaySlots, slotsByDay };
  }, [events, weekOffset]);

  const dow = ["月", "火", "水", "木", "金", "土", "日"];
  const firstDay = days[0];
  const lastDay = days[6];
  const headerLabel = `${firstDay.getMonth() + 1}/${firstDay.getDate()} – ${lastDay.getMonth() + 1}/${lastDay.getDate()}`;

  return (
    <div className="week-cal">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="px-2 py-1 text-sm rounded hover:bg-purple-100"
        >
          ◀
        </button>
        <span className="font-bold text-sm">{headerLabel}</span>
        <div className="flex gap-1">
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
            >
              今週
            </button>
          )}
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="px-2 py-1 text-sm rounded hover:bg-purple-100"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="week-grid">
        {/* ヘッダー行 */}
        <div className="time-col-head" />
        {days.map((d, i) => {
          const ds = localDateStr(d);
          const isToday = ds === todayStr;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div key={ds} className={`day-head${isToday ? " today" : ""}${isWeekend ? " weekend" : ""}`}>
              <div className="dow">{dow[i]}</div>
              <div className="date">{d.getMonth() + 1}/{d.getDate()}</div>
              {allDaySlots[ds].length > 0 && (
                <div className="all-day" title={allDaySlots[ds].join(" / ")}>
                  📌 {allDaySlots[ds][0]}
                  {allDaySlots[ds].length > 1 && ` +${allDaySlots[ds].length - 1}`}
                </div>
              )}
            </div>
          );
        })}

        {/* 時刻ラベル列 + 各日付列 */}
        <div className="time-col" style={{ height: HOURS * HOUR_PX }}>
          {Array.from({ length: HOURS }).map((_, i) => (
            <div key={i} className="time-tick" style={{ top: i * HOUR_PX }}>
              {HOUR_START + i}:00
            </div>
          ))}
        </div>
        {days.map((d) => {
          const ds = localDateStr(d);
          const slots = slotsByDay[ds];
          const isToday = ds === todayStr;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={`col-${ds}`}
              className={`day-col${isToday ? " today" : ""}${isWeekend ? " weekend" : ""}`}
              style={{ height: HOURS * HOUR_PX }}
            >
              {/* 時刻の罫線 */}
              {Array.from({ length: HOURS }).map((_, i) => (
                <div key={i} className="hour-line" style={{ top: i * HOUR_PX }} />
              ))}
              {/* 予定ブロック */}
              {slots.map((s, i) => (
                <div
                  key={i}
                  className="event-block"
                  style={{ top: s.top, height: s.height }}
                  title={`${s.time} ${s.title}${s.loc ? "\n@" + s.loc : ""}`}
                >
                  <div className="ev-time">{s.time}</div>
                  <div className="ev-title">{s.title}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
