"use client";

import { useCallback, useEffect, useState } from "react";
import { emoColor, emoName } from "./EmotionMeter";
import { VoiceInput } from "./VoiceInput";

/**
 * 1日の振り返り（夜20時の通知で開く場所）。
 *
 *  1. まず「今日はどんな一日だった？」を8種類から選ぶ（選び直せる）
 *  2. 今日の状態チェックの経過（何時に・どの状態だったか）を並べる
 *  3. 2回以上チェックしていたら「はじまり → いま」の矢印
 *  4. 締めのひとこと
 *
 * チェックしていないものは出さない。無いものを有るように見せない。
 */
type Check = { level: number; at: string; note: string };
type Kind = { kind: string; emoji: string; label: string; hint: string };
type Mark = { date: string; kind: string };
type Daily = {
  empty: boolean;
  start: { level: number } | null;
  now: { level: number } | null;
  count?: number;
  checks: Check[];
  dayKind: string | null;
  kinds: Kind[];
  marks: Mark[];
  closing?: string;
};

const hm = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const md = (s: string) => s.slice(5).replace("-", "/");

export function DailyReflection({ guideName, avatarUrl, onBack }: { guideName: string; avatarUrl: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<Daily | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // 今日どうだった → 明日どうする → 明日の感情、と1つずつ進む
  const [today, setToday] = useState("");
  const [acts, setActs] = useState("");
  const [emo, setEmo] = useState("");
  const [why, setWhy] = useState("");
  const [handOver, setHandOver] = useState<{ placed: string[] } | null>(null);
  const [handBusy, setHandBusy] = useState(false);
  // ワールドリプレイ：今日の進み（事実）と、AIからの短い受け・意味・明日の3つ
  const [prog, setProg] = useState<{ moved: string[]; inward: string[]; movedCount: number } | null>(null);
  const [replay, setReplay] = useState<{ received: string; meaning: string; tomorrow: string[] } | null>(null);
  const [replayBusy, setReplayBusy] = useState(false);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/daily")
      .then((r) => r.json())
      .then((data) => { if (data.error) setErr(data.error); else { setErr(null); setD(data); } })
      .catch((e) => setErr(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  // 話す前でも「今日これだけ進んだ」は出せる（事実だから）
  useEffect(() => {
    fetch("/api/replay").then((r) => r.json()).then((d) => { if (d?.progress) setProg(d.progress); }).catch(() => {});
  }, []);

  /** 今日の話を渡して、短い受け・意味・明日の3つを返してもらう */
  async function runReplay() {
    if (replayBusy) return;
    setReplayBusy(true);
    try {
      const r = await fetch("/api/replay", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ said: today }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "うまく再生できなかった"); return; }
      setReplay(d.replay);
      setProg(d.replay?.progress ?? prog);
      // 出てきた明日の一手は、最初から全部チェックしておく（外すのは本人）
      setPicked(Object.fromEntries((d.replay?.tomorrow ?? []).map((t: string) => [t, true])));
      setActs((d.replay?.tomorrow ?? []).join("、"));
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setReplayBusy(false); }
  }

  async function pickKind(kind: string) {
    if (saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/daily", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const res = await r.json();
      if (!r.ok) { setErr(res.error || "保存できなかった"); return; }
      load();   // 選んだ言葉を締めのひとことにも反映させる
    } finally { setSaving(false); }
  }

  /** 明日へ引き継ぐ（感情＋やること）。やることは明日づけのタスクになる */
  async function handOverToTomorrow() {
    if (handBusy) return;
    setHandBusy(true);
    try {
      const actions = acts.split(/[\n、,]/).map((a) => a.trim()).filter(Boolean).slice(0, 3);
      const r = await fetch("/api/tomorrow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotion: emo, why: why || today, actions }),
      });
      const res = await r.json();
      if (!r.ok) { setErr(res.error || "引き継げなかった"); return; }
      setHandOver({ placed: res.placed ?? [] });
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setHandBusy(false); }
  }

  const kinds = d?.kinds ?? [];
  const kindOf = (k: string) => kinds.find((x) => x.kind === k);

  return (
    <div className="rep">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>
      <div className="rep-card">
        <div className="rep-head">
          <img className="singa-face" src={avatarUrl} alt={guideName} />
          <div>
            <div className="rep-sub">ワールドリプレイ</div>
            <div className="rep-who">{guideName} より</div>
          </div>
        </div>

        {loading && <div className="rep-loading">今日をふりかえっている…</div>}
        {err && <div className="rep-err">{err}</div>}

        {/* ① 今日はどんな一日だった？（未選択なら最初に。選んだあとも選び直せる） */}
        {!loading && d && (
          <div className="dk-sec">
            <div className="dk-q">{d.dayKind ? "今日はこんな一日" : "今日は、どんな一日だった？"}</div>
            <div className="dk-grid">
              {kinds.map((k) => (
                <button key={k.kind}
                  className={`dk-chip ${d.dayKind === k.kind ? "on" : ""}`}
                  disabled={saving}
                  onClick={() => void pickKind(k.kind)}>
                  <span className="e">{k.emoji}</span>
                  <span className="l">{k.label}</span>
                  <span className="h">{k.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ② 今日のチェックの経過（記録があるときだけ） */}
        {!loading && d && d.checks.length > 0 && (
          <div className="dk-timeline">
            <div className="dk-tl-title">今日のチェック（{d.checks.length}回）</div>
            {d.checks.map((c, i) => (
              <div key={i} className="dk-tl-row">
                <span className="t">{hm(c.at)}</span>
                <span className="dot" style={{ background: emoColor(c.level) }} />
                <span className="v">{emoName(c.level)}</span>
                {c.note && <span className="n">{c.note}</span>}
              </div>
            ))}
          </div>
        )}

        {/* ③ はじまり→いま（今日2回以上チェックしたときだけ。1回では変化は語れない） */}
        {!loading && d?.start && d?.now && (
          <div className="daily-arc">
            <div className="pt">
              <span className="dot" style={{ background: emoColor(d.start.level) }} />
              <span className="t">はじまり</span>
              <span className="v">{emoName(d.start.level)}</span>
            </div>
            <span className="arrow">→</span>
            <div className="pt">
              <span className="dot" style={{ background: emoColor(d.now.level) }} />
              <span className="t">いま</span>
              <span className="v">{emoName(d.now.level)}</span>
            </div>
          </div>
        )}

        {d?.empty && (
          <p className="rep-empty">
            今日はまだ記録が少ないみたい。<br />
            上の8つから「今日がどんな一日だったか」だけでも置いていってね🌱
          </p>
        )}

        {/* ④ 締めのひとこと */}
        {!loading && d && !d.empty && d.closing && <p className="rep-body">{d.closing}</p>}

        {/* ④-2 今日どうだった → 明日どうする → 明日の感情 */}
        {!loading && d && !d.empty && (
          handOver ? (
            <div className="hv-done">
              <b>✓ 明日へ引き継いだ</b>
              {emo && <span className="hv-emo">明日の最優先感情：<em>{emo}</em></span>}
              {handOver.placed.length > 0 && (
                <span className="hv-acts">明日のタスクに置いた：{handOver.placed.join("／")}</span>
              )}
              <span className="hv-note">朝、リアルバースを開くと、この感情が最初に出るよ。</span>
            </div>
          ) : (
            <div className="hv-box">
              {/* ① 今日の出来事（1回だけ聞く。深掘りしない） */}
              <div className="hv-step">
                <div className="hv-q">今日は、どんな1日だった？</div>
                <textarea value={today} onChange={(e) => setToday(e.target.value)} rows={2}
                  placeholder="思ったことを、そのまま。ひとことでいい。" />
                <VoiceInput mode="reflect" compact onText={(t) => setToday((p) => (p ? `${p} ${t}` : t))} />
                {!replay && (
                  <button className="rp-go" disabled={replayBusy} onClick={() => void runReplay()}>
                    {replayBusy ? "今日を再生してる…" : "▶ 今日を再生する"}
                  </button>
                )}
              </div>

              {/* ② 今日これだけ進んだ（事実。AIには数えさせない） */}
              {prog && (
                <div className={`rp-moved ${prog.movedCount === 0 ? "is-quiet" : ""}`}>
                  <div className="rp-moved-t">
                    {prog.movedCount > 0 ? `今日、これだけ進んだ（${prog.movedCount}）` : "今日は、静かな日だった"}
                  </div>
                  {prog.moved.map((m, i) => <div key={i} className="rp-line">✓ {m}</div>)}
                  {prog.inward.map((m, i) => <div key={`i${i}`} className="rp-line is-in">◦ {m}</div>)}
                  {prog.movedCount === 0 && prog.inward.length === 0 && (
                    <div className="rp-line is-in">◦ 何もしなかった日も、要る時間だよ。</div>
                  )}
                </div>
              )}

              {/* ③ 受けと、今日の意味（AIはここだけ。短い） */}
              {replay && (
                <div className="rp-say">
                  <div className="rp-recv">{replay.received}</div>
                  <div className="rp-mean">{replay.meaning}</div>
                </div>
              )}

              {/* ④ 明日の朝いちにやること（最大3つ） */}
              <div className="hv-step">
                <div className="hv-q">明日の朝いち、なにから手をつける？</div>
                {replay && replay.tomorrow.length > 0 && (
                  <div className="rp-picks">
                    {replay.tomorrow.map((t) => (
                      <label key={t} className={picked[t] ? "on" : ""}>
                        <input type="checkbox" checked={!!picked[t]}
                          onChange={(e) => {
                            const next = { ...picked, [t]: e.target.checked };
                            setPicked(next);
                            setActs(replay.tomorrow.filter((x) => next[x]).join("、"));
                          }} />
                        {t}
                      </label>
                    ))}
                  </div>
                )}
                <textarea value={acts} onChange={(e) => setActs(e.target.value)} rows={2}
                  placeholder="1つでいい。読点で区切ると複数入る。" />
                <div className="hv-hint">
                  ここに書いたものが、明日づけのタスクになるよ。<b>多くても3つまで</b>にしよう。
                </div>
              </div>

              <div className="hv-step is-emo">
                <div className="hv-q">最後にひとつ。<b>明日の夜、どんな感情になっていたい？</b></div>
                <div className="hv-sub">理想の先に得ている感情って、どんな感情だろう。</div>
                <input value={emo} onChange={(e) => setEmo(e.target.value)} maxLength={20}
                  placeholder="例：満ちている / 軽い / 誇らしい" />
                <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2}
                  placeholder="なんでその感情？（書かなくてもいい）" />
              </div>

              <button className="hv-go" disabled={handBusy || (!emo.trim() && !acts.trim())}
                onClick={() => void handOverToTomorrow()}>
                {handBusy ? "引き継いでる…" : "明日へ引き継いで、今日を閉じる"}
              </button>
            </div>
          )
        )}

        {/* ⑤ この一週間の並び（経過） */}
        {!loading && (d?.marks?.length ?? 0) > 0 && (
          <div className="dk-week">
            <div className="dk-tl-title">この頃の一日たち</div>
            <div className="dk-week-row">
              {[...d!.marks].reverse().map((m) => {
                const k = kindOf(m.kind);
                return (
                  <span key={m.date} className="dk-day" title={`${m.date} ${k?.label ?? ""}`}>
                    <span className="e">{k?.emoji ?? "・"}</span>
                    <span className="d">{md(m.date)}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
