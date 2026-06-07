"use client";

import { useEffect, useState, useMemo } from "react";

type Event = {
  title: string;
  start: string | null;
  all_day: boolean;
};

export function MonthCalendar() {
  const [events, setEvents] = useState<Event[]>([]);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetch("/api/calendar?daysAhead=60")
      .then((r) => r.json()).then((d) => setEvents(d.events ?? []));
  }, []);

  const { year, month, dayEvents, today } = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = base.getFullYear();
    const month = base.getMonth() + 1;
    const todayIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 10);
    const map: Record<string, string[]> = {};
    for (const e of events) {
      if (!e.start) continue;
      const dkey = e.start.slice(0, 10);
      const label = e.all_day
        ? e.title
        : (() => {
            try {
              const t = new Date(e.start);
              const hh = String(t.getHours()).padStart(2, "0");
              const mm = String(t.getMinutes()).padStart(2, "0");
              return `${hh}:${mm} ${e.title}`;
            } catch { return e.title; }
          })();
      (map[dkey] ??= []).push(label);
    }
    return { year, month, dayEvents: map, today: todayIso };
  }, [events, offset]);

  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startWeekday = (first.getDay()); // 0=日

  const cells: React.ReactNode[] = [];
  const dow = ["日", "月", "火", "水", "木", "金", "土"];
  dow.forEach((n, i) => {
    cells.push(
      <div key={`dow-${i}`} className={`dow${i === 0 ? " sun" : i === 6 ? " sat" : ""}`}>
        {n}
      </div>
    );
  });
  for (let i = 0; i < startWeekday; i++) cells.push(<div key={`pre-${i}`} className="cell other"></div>);
  for (let d = 1; d <= last.getDate(); d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = dateStr === today;
    const evs = dayEvents[dateStr] ?? [];
    cells.push(
      <div key={`d-${d}`} className={`cell${isToday ? " today" : ""}`}>
        <span className="dnum">{d}</span>
        {evs.slice(0, 3).map((ev, i) => (
          <span key={i} className="ev">{ev}</span>
        ))}
        {evs.length > 3 && <span className="ev">+{evs.length - 3}件</span>}
      </div>
    );
  }
  while (cells.length % 7 !== 0) cells.push(<div key={`post-${cells.length}`} className="cell other"></div>);

  return (
    <div className="month-cal">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setOffset(offset - 1)} className="px-2 py-1 text-sm rounded hover:bg-purple-100">◀</button>
        <span className="font-bold text-sm">📅 {year}年 {month}月</span>
        <button onClick={() => setOffset(offset + 1)} className="px-2 py-1 text-sm rounded hover:bg-purple-100">▶</button>
      </div>
      <div className="grid">{cells}</div>
    </div>
  );
}
