"use client";

import { useEffect, useMemo, useState } from "react";

type Event = {
  title: string;
  start: string | null;
  end: string | null;
  all_day: boolean;
  location?: string;
  holiday?: boolean;
};

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  const dow = c.getDay();
  const diff = (dow === 0 ? -6 : 1 - dow);
  c.setDate(c.getDate() + diff);
  return c;
}

// サイドバーに収まるコンパクトな週ビュー
// 上部に日付タブ(日-土)、下に選択日の予定リスト
export function WeekCalendarCompact() {
  const [events, setEvents] = useState<Event[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar?daysAhead=21")
      .then((r) => r.json()).then((d) => setEvents(d.events ?? []));
  }, []);

  const { days, todayStr, weekNum, eventsByDay } = useMemo(() => {
    const today = new Date();
    const baseMon = startOfWeek(today);
    baseMon.setDate(baseMon.getDate() + weekOffset * 7);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(baseMon.getTime() + i * 86400000));
    }
    const todayStr = localDateStr(today);
    // 月の第何週か（その月の最初の月曜を第1週とする雑な計算）
    const monthStart = new Date(days[0].getFullYear(), days[0].getMonth(), 1);
    const monthStartMon = startOfWeek(monthStart);
    const diffWeeks = Math.floor((days[0].getTime() - monthStartMon.getTime()) / (7 * 86400000)) + 1;

    const eventsByDay: Record<string, Event[]> = {};
    for (const d of days) eventsByDay[localDateStr(d)] = [];
    for (const e of events) {
      if (!e.start || e.holiday) continue;
      const d = e.start.slice(0, 10);
      if (eventsByDay[d]) eventsByDay[d].push(e);
    }
    return { days, todayStr, weekNum: diffWeeks, eventsByDay };
  }, [events, weekOffset]);

  useEffect(() => {
    // 表示中の週に「今日」があれば今日を、なければ初日を選択
    const wantToday = days.find((d) => localDateStr(d) === todayStr);
    setSelected(wantToday ? todayStr : localDateStr(days[0]));
  }, [days, todayStr]);

  const dow = ["月", "火", "水", "木", "金", "土", "日"];
  const monthLabel = `${days[0].getFullYear()}年${days[0].getMonth() + 1}月 第${weekNum}週`;
  const selectedEvents = selected ? eventsByDay[selected] ?? [] : [];

  return (
    <div className="week-compact">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setWeekOffset((o) => o - 1)} className="px-2 py-1 text-sm rounded hover:bg-purple-100">◀</button>
        <span className="font-bold text-xs">{monthLabel}</span>
        <button onClick={() => setWeekOffset((o) => o + 1)} className="px-2 py-1 text-sm rounded hover:bg-purple-100">▶</button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const ds = localDateStr(d);
          const isToday = ds === todayStr;
          const isSel = ds === selected;
          const evCount = eventsByDay[ds]?.length ?? 0;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <button
              key={ds}
              type="button"
              onClick={() => setSelected(ds)}
              className={`flex flex-col items-center py-1 rounded-md text-xs transition ${
                isSel ? "bg-[var(--accent)] text-white" :
                isToday ? "bg-purple-100 text-purple-700 font-bold" :
                "hover:bg-purple-50"
              }`}
            >
              <span className={`text-[10px] ${isSel ? "" : (isWeekend && d.getDay() === 0 ? "text-red-500" : isWeekend ? "text-blue-500" : "text-gray-500")}`}>
                {dow[i]}
              </span>
              <span className="font-bold leading-tight">{d.getDate()}</span>
              {evCount > 0 && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isSel ? "bg-white" : "bg-[var(--accent)]"}`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-purple-100 space-y-1.5">
        {selectedEvents.length === 0 ? (
          <div className="text-xs text-gray-400">予定なし</div>
        ) : (
          selectedEvents
            .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""))
            .map((e, i) => {
              let timeText = "終日";
              if (!e.all_day && e.start) {
                try {
                  const s = new Date(e.start);
                  timeText = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
                } catch { /* keep */ }
              }
              return (
                <div key={i} className="text-xs flex gap-2 items-start">
                  <span className="text-[var(--accent)] font-bold tabular-nums shrink-0 mt-0.5">
                    {timeText}
                  </span>
                  <span className="flex-1 break-words">{e.title}</span>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
