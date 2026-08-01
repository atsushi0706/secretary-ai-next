"use client";

/**
 * 自分の取扱説明書。
 *
 * 流れ：16問に答える → 生成 → 長文を読む。
 * 一度作れば以後はいつでも読み返せて、「また答える」で何度でも作り直せる。
 * （同じ生年月日でも、そのときの答え方が変われば内容も変わる）
 */
import { useEffect, useRef, useState } from "react";
import {
  QUESTIONS, SCALE, AXES, AXIS_KEYS, answeredCount, scoreAxes,
  type Answers, type AxisScores,
} from "@/lib/manual-quiz";

type Section = { heading: string; body: string };
type Manual = {
  id?: number; date: string; headline: string;
  sections: Section[]; actions: string[]; scores: AxisScores;
};

/** **強調** を金色の太字に。改行も反映 */
function rich(text: string) {
  const parts = String(text ?? "").split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <b key={i} className="mn-em">{p.slice(2, -2)}</b>
      : <span key={i}>{p}</span>
  );
}

export function ManualScreen({ guideName, onBack }: { guideName: string; onBack: () => void }) {
  const [manual, setManual] = useState<Manual | null>(null);
  const [history, setHistory] = useState<Manual[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [mode, setMode] = useState<"loading" | "read" | "quiz">("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [hasBirth, setHasBirth] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const quizTop = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 答えを選ぶたびに、少し待ってから保存する（作り直さなくても残る） */
  function pick(id: number, value: number) {
    setAnswers((a) => {
      const next = { ...a, [id]: value };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch("/api/manual", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", answers: next }),
        }).catch(() => {});
      }, 700);
      return next;
    });
  }

  useEffect(() => {
    fetch("/api/manual").then((r) => r.json()).then((d) => {
      if (d.needsMigration) setNeedsMigration(true);
      setAnswers(d.answers ?? {});
      setHistory(d.history ?? []);
      setHasBirth(d.hasBirth !== false);
      // 16問そろっていないのに結果を見せない（「やってないのに決められてる」を防ぐ）
      const ans = d.answers ?? {};
      const filled = Object.values(ans).filter((v) => typeof v === "number").length;
      if (d.manual && filled >= QUESTIONS.length) { setManual(d.manual); setMode("read"); }
      else setMode("quiz");
    }).catch(() => setMode("quiz"));
  }, []);

  const done = answeredCount(answers);
  const ready = done >= QUESTIONS.length;

  async function generate() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/manual", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "生成に失敗");
      setManual(d.manual);
      setHistory((h) => [d.manual, ...h]);
      setMode("read");
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally { setBusy(false); }
  }

  if (mode === "loading") return null;

  /* ── 16問 ── */
  if (mode === "quiz") {
    const live = scoreAxes(answers);
    return (
      <div className="mn-screen" ref={quizTop}>
        <button className="singa-back" onClick={() => (manual ? setMode("read") : onBack())}>
          {manual ? "← 説明書にもどる" : "← 地図にもどる"}
        </button>

        <div className="mn-head">
          <h2>自分の取扱説明書</h2>
          <p className="mn-lead">
            生まれ持った性質は、生年月日でだいたい決まっている。<br />
            でも<b>その出方</b>は人それぞれ。16問で、きみの出方を教えて。
          </p>
        </div>

        {!hasBirth && (
          <p className="mn-warn">
            生年月日が未登録だと、生まれ持った性質のぶんが薄くなるよ。
            設定に入れておくと、ぐっと自分ごとになる。
          </p>
        )}
        {needsMigration && <p className="mn-warn">データベースの準備がまだ（supabase/parts-and-cards.sql を実行してね）</p>}

        <div className="mn-progress">
          <span className="mp-track"><span className="mp-fill" style={{ width: `${(done / QUESTIONS.length) * 100}%` }} /></span>
          <span className="mp-count">{done} / {QUESTIONS.length}</span>
        </div>

        <div className="mn-qlist">
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className={`mn-q ${typeof answers[q.id] === "number" ? "is-done" : ""}`}>
              <div className="mq-text"><span className="mq-no">{i + 1}</span>{q.text}</div>
              <div className="mq-scale">
                {SCALE.map((s) => (
                  <button key={s.value}
                    className={`mq-opt ${answers[q.id] === s.value ? "on" : ""}`}
                    onClick={() => pick(q.id, s.value)}
                    title={s.label}>
                    <span className="o-dot" />
                    <span className="o-label">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 答えるほど、その場で傾きが見える */}
        {done > 0 && (
          <div className="mn-axes">
            {AXIS_KEYS.map((k) => {
              const v = live[k];
              return (
                <div key={k} className="ma-row">
                  <span className="ma-low">{AXES[k].low}</span>
                  <span className="ma-track">
                    <span className="ma-needle" style={{ left: `${50 + v / 2.2}%` }} />
                  </span>
                  <span className="ma-high">{AXES[k].high}</span>
                </div>
              );
            })}
          </div>
        )}

        {err && <p className="mn-err">{err}</p>}
        <button className="mn-generate" onClick={() => void generate()} disabled={!ready || busy}>
          {busy ? "書いています…（1分ほどかかるよ）" : ready ? "📖 取扱説明書をつくる" : `あと ${QUESTIONS.length - done} 問`}
        </button>
      </div>
    );
  }

  /* ── 読む ── */
  return (
    <div className="mn-screen">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>

      <div className="mn-cover">
        <div className="mc-kicker">自分の取扱説明書</div>
        <h2 className="mc-headline">{manual!.headline}</h2>
        <div className="mc-date">{manual!.date}</div>
      </div>

      {/* 4つの軸 */}
      <div className="mn-axes is-result">
        {AXIS_KEYS.map((k) => {
          const v = manual!.scores?.[k] ?? 0;
          return (
            <div key={k} className="ma-row">
              <span className="ma-low">{AXES[k].low}</span>
              <span className="ma-track"><span className="ma-needle" style={{ left: `${50 + v / 2.2}%` }} /></span>
              <span className="ma-high">{AXES[k].high}</span>
            </div>
          );
        })}
      </div>

      <div className="mn-body">
        {manual!.sections.map((s, i) => (
          <section key={i} className="mn-sec">
            <h3><span className="ms-no">{String(i + 1).padStart(2, "0")}</span>{s.heading}</h3>
            <p>{rich(s.body)}</p>
          </section>
        ))}
      </div>

      {manual!.actions?.length > 0 && (
        <div className="mn-actions">
          <div className="mac-title">🔨 今日からできる一手</div>
          {manual!.actions.map((a, i) => (
            <div key={i} className="mac-row"><span className="mac-n">{i + 1}</span>{a}</div>
          ))}
        </div>
      )}

      <div className="mn-foot">
        <button className="mn-again" onClick={() => { setMode("quiz"); window.scrollTo({ top: 0 }); }}>
          もう一度、16問から作り直す
        </button>
        <p className="mn-note">
          生まれ持った性質は変わらないけど、<b>その出方</b>は時期で変わる。
          «しばらく経ってからやると、違う説明書になるよ»
        </p>
      </div>

      {history.length > 1 && (
        <div className="mn-history">
          <div className="mh-title">前に作ったもの</div>
          {history.slice(1).map((h) => (
            <button key={h.id ?? h.date} className="mh-item" onClick={() => { setManual(h); window.scrollTo({ top: 0 }); }}>
              <span className="mh-date">{h.date}</span>
              <span className="mh-head">{h.headline}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
