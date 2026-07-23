"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QuestPanel } from "./QuestPanel";

type Season = { label: string; meaning: string; advice: string };
type Cycle = { key: string; period: string; season: Season };
type LifePeriod = { ageStart: number; ageEnd: number; label: string; meaning: string; isCurrent: boolean };
type Life = { startAge: number; periods: LifePeriod[]; currentIndex: number; nearBoundary: boolean };

/**
 * アカシックレコーダー。
 * 誕生日から、年 → 3ヶ月 → 月 → 週 → 今日 の流れを一本で見る。
 * 大きい周期から今日へズームしていく感覚。
 * そのあと、歩いた青写真＝クエストを現実（タスク）へ落とし込む。
 */
export function AkashicPanel() {
  const [cycles, setCycles] = useState<Cycle[] | null>(null);
  const [life, setLife] = useState<Life | null>(null);
  const [hasBirth, setHasBirth] = useState<boolean | null>(null);
  const [hasGender, setHasGender] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [lifeOpen, setLifeOpen] = useState<number | null>(null);
  const [tab, setTab] = useState<"drop" | "reflect">("drop");
  const [view, setView] = useState<"life" | "now">("life");

  useEffect(() => {
    fetch("/api/cycles")
      .then((r) => r.json())
      .then((d) => {
        setHasBirth(!!d.hasBirth);
        setHasGender(!!d.hasGender);
        setCycles(d.cycles ?? null);
        setLife(d.life ?? null);
        if (d.life) setLifeOpen(d.life.currentIndex);
      })
      .catch(() => setHasBirth(false));
  }, []);

  return (
    <div className="singa-panel">
      <div className="singa-panel-title">流れを読む</div>

      {hasBirth === false && (
        <p className="text-xs leading-relaxed opacity-80">
          誕生日を入れると、あなたの<b>人生の流れ</b>が読めます。<br />
          <Link href="/settings" className="text-[var(--singa-gold)] font-bold underline">設定で誕生日を入れる →</Link>
        </p>
      )}

      {/* 人生の10年 / 今の流れ 切替 */}
      {(life || cycles) && (
        <div className="akashic-tabs" style={{ marginTop: 0 }}>
          <button className={view === "life" ? "is-on" : ""} onClick={() => setView("life")}>人生の流れ</button>
          <button className={view === "now" ? "is-on" : ""} onClick={() => setView("now")}>今の流れ</button>
        </div>
      )}

      {/* 人生の10年周期（大運） */}
      {view === "life" && (
        life ? (
          <div className="akashic-life">
            {life.periods.map((p, i) => (
              <button
                key={i}
                className={`akashic-decade ${p.isCurrent ? "is-now" : ""} ${lifeOpen === i ? "is-open" : ""}`}
                onClick={() => setLifeOpen(lifeOpen === i ? null : i)}
              >
                <span className="age">{p.ageStart}〜{p.ageEnd}歳</span>
                <span className="lb">{p.label}{p.isCurrent && <em>いまここ</em>}</span>
                {lifeOpen === i && <span className="mn">{p.meaning}</span>}
              </button>
            ))}
            {life.nearBoundary && <div className="akashic-hint">※誕生日が季節の変わり目付近。境目は前後することがあります。</div>}
          </div>
        ) : hasBirth ? (
          <p className="text-xs leading-relaxed opacity-80">
            <b>性別</b>も入れると、人生の10年ごとの流れが読めます。<br />
            <Link href="/settings" className="text-[var(--singa-gold)] font-bold underline">設定で性別を入れる →</Link>
          </p>
        ) : null
      )}

      {view === "now" && cycles && (
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
