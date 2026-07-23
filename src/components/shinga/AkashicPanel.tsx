"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QuestPanel } from "./QuestPanel";

type Season = { label: string; meaning: string; advice: string };
type Cycle = { key: string; period: string; season: Season };

/**
 * アカシックレコーダー。
 * 誕生日から、年 → 3ヶ月 → 月 → 週 → 今日 の流れを一本で見る。
 * 大きい周期から今日へズームしていく感覚。
 * そのあと、歩いた青写真＝クエストを現実（タスク）へ落とし込む。
 */
export function AkashicPanel() {
  const [cycles, setCycles] = useState<Cycle[] | null>(null);
  const [hasBirth, setHasBirth] = useState<boolean | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"drop" | "reflect">("drop");

  useEffect(() => {
    fetch("/api/cycles")
      .then((r) => r.json())
      .then((d) => { setHasBirth(!!d.hasBirth); setCycles(d.cycles ?? null); })
      .catch(() => setHasBirth(false));
  }, []);

  return (
    <div className="singa-panel">
      <div className="singa-panel-title">いまの流れ</div>

      {hasBirth === false && (
        <p className="text-xs leading-relaxed opacity-80">
          誕生日を入れると、あなたの<b>年・月・今日の流れ</b>が読めます。<br />
          <Link href="/settings" className="text-[var(--singa-gold)] font-bold underline">設定で誕生日を入れる →</Link>
        </p>
      )}

      {cycles && (
        <div className="akashic-flow">
          {cycles.map((c, i) => {
            const isOpen = open === c.key;
            return (
              <button
                key={c.key}
                className={`akashic-ring depth-${i} ${isOpen ? "is-open" : ""}`}
                onClick={() => setOpen(isOpen ? null : c.key)}
              >
                <span className="period">{c.period}</span>
                <span className="season">{c.season.label}</span>
                {isOpen && (
                  <span className="detail">
                    {c.season.meaning}
                    <em>{c.season.advice}</em>
                  </span>
                )}
              </button>
            );
          })}
          <div className="akashic-hint">大きい流れから今日へ。タップで詳しく。</div>
        </div>
      )}

      <div className="akashic-tabs">
        <button className={tab === "drop" ? "is-on" : ""} onClick={() => setTab("drop")}>現実に落とし込む</button>
        <button className={tab === "reflect" ? "is-on" : ""} onClick={() => setTab("reflect")}>やってみて振り返る</button>
      </div>
      <QuestPanel embedded reflectMode={tab === "reflect"} />
    </div>
  );
}
