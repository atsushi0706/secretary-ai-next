"use client";

import { useEffect, useState, useMemo } from "react";

type Event = {
  title: string;
  start: string | null;
  end: string | null;
  all_day: boolean;
  location?: string;
  holiday?: boolean;
};

export function MonthCalendar() {
  const [events, setEvents] = useState<Event[]>([]);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar?daysAhead=60")
      .then((r) => r.json()).then((d) => setEvents(d.events ?? []));
  }, []);

  const todayIso = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 10);
  }, []);

  const { year, month, dayEvents } = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const map: Record<string, Event[]> = {};
    for (const e of events) {
      if (!e.start) continue;
      if (e.holiday) continue;
      const dkey = e.start.slice(0, 10);
      (map[dkey] ??= []).push(e);
    }
    return { year: base.getFullYear(), month: base.getMonth() + 1, dayEvents: map };
  }, [events, offset]);

  // 初回マウントで今日を選択
  useEffect(() => {
    if (!selected) setSelected(todayIso);
  }, [todayIso, selected]);

  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startWeekday = first.getDay();
  const dow = ["日", "月", "火", "水", "木", "金", "土"];

  const selectedEvents = selected ? (dayEvents[selected] ?? []) : [];

  return (
    <div className="month-cal">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setOffset(offset - 1)} className="px-2 py-1 text-sm rounded hover:bg-purple-100">◀</button>
        <span className="font-bold text-sm">{year}年 {month}月</span>
        <button onClick={() => setOffset(offset + 1)} className="px-2 py-1 text-sm rounded hover:bg-purple-100">▶</button>
      </div>

      <div className="grid">
        {dow.map((n, i) => (
          <div key={`dow-${i}`} className={`dow${i === 0 ? " sun" : i === 6 ? " sat" : ""}`}>
            {n}
          </div>
        ))}
        {Array.from({ length: startWeekday }).map((_, i) => (
          <div key={`pre-${i}`} className="cell other" />
        ))}
        {Array.from({ length: last.getDate() }, (_, idx) => {
          const d = idx + 1;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isToday = dateStr === todayIso;
          const isSelected = dateStr === selected;
          const evs = dayEvents[dateStr] ?? [];
          const dots = Math.min(evs.length, 3);
          return (
            <button
              key={`d-${d}`}
              type="button"
              onClick={() => setSelected(dateStr)}
              className={`cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
            >
              <span className="dnum">{d}</span>
              {dots > 0 && (
                <span className="dots">
                  {Array.from({ length: dots }).map((_, i) => (
                    <span key={i} className="dot" />
                  ))}
                  {evs.length > 3 && <span className="dot-extra">+</span>}
                </span>
              )}
            </button>
          );
        })}
        {Array.from({ length: (7 - ((startWeekday + last.getDate()) % 7)) % 7 }).map((_, i) => (
          <div key={`post-${i}`} className="cell other" />
        ))}
      </div>

      {selected && (
        <div className="mt-3 pt-3 border-t border-purple-100">
          <div className="text-xs font-bold text-purple-700 mb-1">
            {selected.slice(5).replace("-", "/")} の予定
            {selectedEvents.length > 0 && (
              <span className="ml-2 text-gray-500 font-normal">{selectedEvents.length}件</span>
            )}
          </div>
          {selectedEvents.length === 0 ? (
            <div className="text-xs text-gray-400">予定なし</div>
          ) : (
            <ul className="space-y-1">
              {selectedEvents
                .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""))
                .map((e, i) => {
                  let timeText = "終日";
                  if (!e.all_day && e.start) {
                    try {
                      const s = new Date(e.start);
                      timeText = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
                    } catch { /* keep terminal default */ }
                  }
                  return (
                    <li key={i} className="text-xs flex gap-2">
                      <span className="text-[var(--accent)] font-bold tabular-nums shrink-0">{timeText}</span>
                      <span className="truncate">{e.title}</span>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
