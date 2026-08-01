"use client";

/** 手紙などの本文に混ざるMarkdown記号を、そのまま出さずに整える */
function mdLiteHtml(text: string): string {
  let s = String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/^#{1,3}\s+(.+)$/gm, "<strong>$1</strong>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/^[-・]\s+(.+)$/gm, "・$1");
  return s.replace(/\n/g, "<br/>");
}

import { useEffect, useState } from "react";
import Link from "next/link";
import { decadeUnlock, remainingLabel } from "@/lib/akashic";

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
/**
 * 過去の10年を開いたときの「なぜ、この時期はこうだったのか」。
 * ただ解放するだけでは意味がないので、その時期のテーマを"理由"として言葉にして渡す。
 * 決めつけではなく「そういう流れの中にいた」という許しの向きで。
 */
function whyPast(p: LifePeriod): string {
  return (
    `ふりかえると、この10年は「${p.label}」がテーマの時期。\n${p.meaning}\n` +
    `だからこの頃は、うまく進めたことも、しんどかったことも、この流れの中で起きていた。` +
    `${p.ageStart}〜${p.ageEnd}歳のきみは、この時期の力学の中で、ちゃんとやってきたんだね。`
  );
}

export function AkashicPanel() {
  const [cycles, setCycles] = useState<Cycle[] | null>(null);
  const [life, setLife] = useState<Life | null>(null);
  const [hasBirth, setHasBirth] = useState<boolean | null>(null);
  const [hasGender, setHasGender] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [lifeOpen, setLifeOpen] = useState<number | null>(null);
  const [view, setView] = useState<"life" | "now" | "deep">("life");
  const [activeDays, setActiveDays] = useState(0);
  const [elapsedDays, setElapsedDays] = useState(0);
  const [master, setMaster] = useState(false);

  useEffect(() => {
    fetch("/api/cycles")
      .then((r) => r.json())
      .then((d) => {
        setHasBirth(!!d.hasBirth);
        setHasGender(!!d.hasGender);
        setCycles(d.cycles ?? null);
        setLife(d.life ?? null);
        setActiveDays(d.activeDays ?? 0);
        setElapsedDays(d.elapsedDays ?? 0);
        setMaster(!!d.master);
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
          <button className={view === "deep" ? "is-on" : ""} onClick={() => setView("deep")}>深層記録</button>
        </div>
      )}

      {view === "deep" && <DeepReads />}

      {/* 人生の10年周期（大運） */}
      {view === "life" && (
        life ? (
          <div className="akashic-life">
            {life.periods.map((p, i) => {
              const offset = i - life.currentIndex; // 過去=負 / 今=0 / 未来=正
              const u = decadeUnlock(offset, elapsedDays, master);
              if (!u.unlocked) {
                // まだ開いていない未来の10年：内容は見せず、「あと約◯ヶ月で開く」だけ明記する
                return (
                  <div key={i} className="akashic-decade is-locked" aria-disabled>
                    <span className="age">{p.ageStart}〜{p.ageEnd}歳</span>
                    <span className="lb"><span className="lock">🔒</span>{remainingLabel(u.remaining)}で開くよ</span>
                  </div>
                );
              }
              const isPast = offset < 0;
              return (
                <button
                  key={i}
                  className={`akashic-decade ${p.isCurrent ? "is-now" : ""} ${isPast ? "is-past" : ""} ${lifeOpen === i ? "is-open" : ""}`}
                  onClick={() => setLifeOpen(lifeOpen === i ? null : i)}
                >
                  <span className="age">{p.ageStart}〜{p.ageEnd}歳</span>
                  <span className="lb">
                    {p.label}
                    {p.isCurrent && <em>いまここ</em>}
                    {isPast && <em className="past">ふりかえり</em>}
                  </span>
                  {lifeOpen === i && (
                    <span className="mn">{isPast ? whyPast(p) : p.meaning}</span>
                  )}
                </button>
              );
            })}
            <div className="akashic-hint">
              {master ? "マスター表示：すべて開放中。" : `過去と「今の10年」はいつでも見れる。この先の10年は、続けていくほど少しずつ開いていくよ（次は1ヶ月後、その先は3ヶ月後）。`}
            </div>
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
    </div>
  );
}

/** 深層記録：レベル(%)が上がるほど、自分についての記録が開いていく */
type DeepCh = { key: string; title: string; need: number; hint: string; unlocked: boolean; body: string };
function DeepReads() {
  const [level, setLevel] = useState(0);
  const [hasBirth, setHasBirth] = useState(true);
  const [chs, setChs] = useState<DeepCh[]>([]);
  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/deep-read").then((r) => r.json()).then((d) => {
      if (d.error) { setErr(d.error); return; }
      setLevel(d.level ?? 0); setHasBirth(!!d.hasBirth); setChs(d.chapters ?? []);
    }).catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  async function openCh(key: string) {
    setBusy(key); setErr("");
    try {
      const r = await fetch("/api/deep-read", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || `HTTP ${r.status}`); return; }
      setChs((prev) => prev.map((c) => (c.key === key ? { ...c, body: d.body } : c)));
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(""); }
  }

  return (
    <div className="deepreads">
      <div className="dr-lv">いまのレベル <b>{level}%</b> — 続けるほど、記録が開いていく</div>
      {!hasBirth && <div className="dr-err">設定で生年月日を入れると、記録が読めるようになるよ</div>}
      {err && <div className="dr-err">{err}</div>}
      {chs.map((c) => (
        <div key={c.key} className={`dr-ch ${c.unlocked ? "is-open" : "is-locked"}`}>
          <div className="dr-head">
            <span className="dr-title">{c.unlocked ? "📖" : "🔒"} {c.title}</span>
            <span className="dr-need">{c.unlocked ? "解放ずみ" : `${c.need}%で開く`}</span>
          </div>
          <div className="dr-hint">{c.hint}</div>
          {c.unlocked && !c.body && (
            <button className="dr-btn" disabled={busy === c.key || !hasBirth} onClick={() => openCh(c.key)}>
              {busy === c.key ? "記録を読み解いてる…" : "この記録をひらく →"}
            </button>
          )}
          {c.body && <p className="dr-body" dangerouslySetInnerHTML={{ __html: mdLiteHtml(c.body) }} />}
        </div>
      ))}
    </div>
  );
}
