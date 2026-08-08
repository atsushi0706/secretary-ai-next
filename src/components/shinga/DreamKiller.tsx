"use client";

/**
 * ドリームキラーとの一戦。パラレルウォークの上に、バンとかぶさる。
 *
 * 【流れ】
 *   バン！（画面が暗くなる・キャラが飛び込む）
 *     → 「戦う」「戦わない」を選ぶ
 *     → 戦うなら、言い返す。HPが減る。ゼロで降参して消える
 *
 * 【気をつけたところ】
 * ・**逃げ道を必ず残す。** 「戦わない」はいつでも選べるし、責めない。
 *   途中でも「もういい」で抜けられる。ここで追い詰めたら、この機能は害になる。
 * ・HPが残っている間、ゲージのそばに応援がふわっと出る（ひとりで殴り合わせない）。
 * ・音声入力で言い返せる（打つより話すほうが、言葉に力が乗る）。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useDictation } from "@/components/useDictation";
import { handleEnter } from "@/lib/enter-key";
import { CHEERS, DK_MAX_HP, DK_LEFT } from "@/lib/dreamkiller";

type Line = { who: "dk" | "me"; text: string };
type Phase = "burst" | "choose" | "fight" | "left" | "won";

export function DreamKiller({
  theme, seed, onClose,
}: {
  /** いま歩いている理想（ドリームキラーが茶々を入れる相手） */
  theme: string;
  seed: number;
  onClose: (result: "won" | "left" | "skip") => void;
}) {
  const [phase, setPhase] = useState<Phase>("burst");
  const [face, setFace] = useState("/dk/dk-1.jpg");
  const [hp, setHp] = useState(DK_MAX_HP);
  const [log, setLog] = useState<Line[]>([]);
  const [said, setSaid] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cheer, setCheer] = useState("");
  const [shake, setShake] = useState(false);
  const [dmg, setDmg] = useState<number | null>(null);
  const d = useDictation();
  const boxRef = useRef<HTMLDivElement>(null);

  const post = useCallback(async (body: Record<string, unknown>) => {
    const r = await fetch("/api/dreamkiller", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const t = await r.text();
    let j: any = {};
    try { j = JSON.parse(t); } catch { j = { error: `うまく返ってこなかった（${r.status}）` }; }
    if (!r.ok) throw new Error(j.error || "うまくいかなかった");
    return j;
  }, []);

  /* 現れる */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await post({ action: "appear", theme, seed });
        if (!alive) return;
        setFace(j.face);
        setHp(j.hp ?? DK_MAX_HP);
        setLog([{ who: "dk", text: j.say }]);
        setTimeout(() => alive && setPhase("choose"), 900);
      } catch (e: any) {
        // 出てこられないなら、静かに引っ込む（歩いている邪魔をしない）
        if (alive) onClose("skip");
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 応援は、HPが残っている間だけ、ときどき出す */
  useEffect(() => {
    if (phase !== "fight" || hp <= 0) return;
    const pick = () => setCheer(CHEERS[Math.floor((Date.now() / 1000) % CHEERS.length)]);
    pick();
    const t = setInterval(pick, 5200);
    return () => clearInterval(t);
  }, [phase, hp, log.length]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  async function strike() {
    const t = said.trim();
    if (!t || busy) return;
    setBusy(true); setErr(""); setSaid("");
    setLog((p) => [...p, { who: "me", text: t }]);
    try {
      const before = hp;
      const j = await post({
        action: "hit", theme, said: t, hp,
        dkSaid: [...log].reverse().find((l) => l.who === "dk")?.text ?? "",
        log: log.slice(-6),
      });
      setDmg(before - (j.hp ?? before));
      setShake(true);
      setTimeout(() => setShake(false), 480);
      setTimeout(() => setDmg(null), 1400);
      setHp(j.hp ?? 0);
      setLog((p) => [...p, { who: "dk", text: j.say }]);
      if (j.defeated) setTimeout(() => setPhase("won"), 700);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally { setBusy(false); }
  }

  async function mic() {
    if (d.phase === "recording") {
      const t = await d.stop("ドリームキラーに言い返している");
      if (t) setSaid((p) => (p ? `${p} ${t}` : t));
    } else if (d.phase === "idle") { await d.start(); }
  }

  function leave() {
    setLog((p) => [...p, { who: "dk", text: DK_LEFT }]);
    setPhase("left");
  }

  const pct = Math.round((hp / DK_MAX_HP) * 100);

  return (
    <div className={`dk ${phase === "burst" ? "is-burst" : ""}`}>
      <div className="dk-bg" aria-hidden />
      {phase === "burst" && <div className="dk-bang" aria-hidden><span>！</span></div>}

      <div className={`dk-card ${shake ? "is-shake" : ""}`}>
        <div className="dk-face-wrap">
          <img className="dk-face" src={face} alt="ドリームキラー" />
          {dmg != null && dmg > 0 && <div className="dk-dmg">-{dmg}</div>}
        </div>

        {/* HP。残っている間は、そばに応援がふわっと出る */}
        {phase !== "left" && (
          <div className="dk-hp">
            <div className="dk-hp-top">
              <span className="nm">ドリームキラー</span>
              <span className="v">{hp} / {DK_MAX_HP}</span>
            </div>
            <div className="dk-hp-bar"><span style={{ width: `${pct}%` }} /></div>
            {phase === "fight" && hp > 0 && cheer && (
              <div key={cheer + log.length} className="dk-cheer">{cheer}</div>
            )}
          </div>
        )}

        <div className="dk-log" ref={boxRef}>
          {log.map((l, i) => (
            <div key={i} className={`dk-line ${l.who === "me" ? "is-me" : ""}`}>
              {l.who === "dk" && <span className="who">ドリームキラー</span>}
              <p>{l.text}</p>
            </div>
          ))}
          {busy && <div className="dk-line"><p className="typing-dots"><span /><span /><span /></p></div>}
        </div>

        {err && <div className="dk-err">{err}</div>}

        {/* 現れた直後：戦うか、戦わないか */}
        {phase === "choose" && (
          <div className="dk-choose">
            <button className="go" onClick={() => setPhase("fight")}>言い返す</button>
            <button className="no" onClick={leave}>いまはやめておく</button>
          </div>
        )}

        {/* 戦っている間 */}
        {phase === "fight" && (
          <div className="dk-input">
            <textarea
              value={said}
              onChange={(e) => setSaid(e.target.value)}
              onKeyDown={(e) => handleEnter(e, () => void strike())}
              placeholder={d.phase === "recording" ? "聞いてるよ…" : "🎙 言い返してみて"}
              rows={2}
              disabled={busy}
            />
            <div className="dk-btns">
              {d.supported && (
                <button className={`mic ${d.phase === "recording" ? "on" : ""}`} onClick={() => void mic()}
                  disabled={busy || d.phase === "transcribing"}>
                  {d.phase === "recording" ? "■" : d.phase === "transcribing" ? "…" : "🎙"}
                </button>
              )}
              <button className="go" onClick={() => void strike()} disabled={busy || !said.trim()}>
                言い返す
              </button>
            </div>
            {/* 途中でも、いつでも抜けられる */}
            <button className="dk-quit" onClick={leave}>もういい（歩きにもどる）</button>
          </div>
        )}

        {/* 倒した */}
        {phase === "won" && (
          <div className="dk-end">
            <div className="dk-won">言い切ったね</div>
            <button className="go" onClick={() => onClose("won")}>歩きにもどる</button>
          </div>
        )}

        {/* 戦わなかった／途中でやめた */}
        {phase === "left" && (
          <div className="dk-end">
            <button className="go" onClick={() => onClose("left")}>歩きにもどる</button>
          </div>
        )}
      </div>
    </div>
  );
}
