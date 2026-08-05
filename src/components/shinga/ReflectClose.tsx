"use client";

import { useCallback, useEffect, useState } from "react";
import { VoiceInput } from "./VoiceInput";

/**
 * 「今日はどんな一日だったか」の8種類。
 * ——前は、この8つを本人に選ばせてから話に入っていた。
 *   いまは話した内容から起こして、違っていたら押し直してもらう。
 *   週のふりかえりがこの記録を使うので、ここで必ず1つ残す。
 */
const DAY_KINDS = [
  { kind: "full", emoji: "🌸", label: "満ちた日" },
  { kind: "burn", emoji: "🔥", label: "燃えた日" },
  { kind: "calm", emoji: "🍃", label: "しずかな日" },
  { kind: "wave", emoji: "🌊", label: "ゆれた日" },
  { kind: "fog", emoji: "🌫", label: "もやの日" },
  { kind: "spark", emoji: "⚡", label: "ざわめいた日" },
  { kind: "hold", emoji: "🪨", label: "ふんばった日" },
  { kind: "empty", emoji: "🌙", label: "からっぽの日" },
];

/**
 * 1日を閉じる板（ワールドリプレイの締め）。
 *
 * 【なぜ作り直したか】
 * 前は「今日どうだった？」を書く欄・「明日なにする？」を書く欄・「明日の感情」を書く欄が
 * 縦に並んだ**記入用紙**だった。ワークなのに、書類を埋める作業になっていた。
 * しかも入力欄が多いので、話すより打つほうが早い作りになっていた。
 *
 * いまは：
 *   ・振り返りそのものは、ほかの部屋と同じ**普通のチャット**でやる（話すだけでいい）
 *   ・この板は最後にひらく。**話した内容から**明日の一手と感情を起こして、確かめるだけ
 *   ・打つ必要はない。違ったらマイクで言い直せばいい
 */
type Replay = {
  received: string;
  meaning: string;
  tomorrow: string[];
  emotion: string;
  dayKind: string;
  progress?: { moved: string[]; inward: string[]; movedCount: number };
};

export function ReflectClose({
  said,
  onClose,
  onDone,
}: {
  /** 今夜ここで話したこと（会話まるごと） */
  said: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [rep, setRep] = useState<Replay | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [extra, setExtra] = useState("");      // 話して足したぶん
  const [emo, setEmo] = useState("");
  const [kind, setKind] = useState("");
  const [handing, setHanding] = useState(false);
  const [done, setDone] = useState<{ placed: string[] } | null>(null);

  const run = useCallback(async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/replay", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ said }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "うまく起こせなかった"); return; }
      const rp: Replay = d.replay;
      setRep(rp);
      // 出てきたものは最初から全部チェック。外すのは本人
      setPicked(Object.fromEntries((rp.tomorrow ?? []).map((t) => [t, true])));
      setEmo(rp.emotion ?? "");
      setKind(DAY_KINDS.some((k) => k.kind === rp.dayKind) ? rp.dayKind : "");
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [said]);
  useEffect(() => { void run(); }, [run]);

  /** 明日へ渡す。チェックの入ったものが明日づけのタスクになる */
  async function handOver() {
    if (handing) return;
    setHanding(true);
    try {
      const actions = [
        ...(rep?.tomorrow ?? []).filter((t) => picked[t]),
        ...extra.split(/[\n、,]/).map((a) => a.trim()).filter(Boolean),
      ].slice(0, 3);
      const r = await fetch("/api/tomorrow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotion: emo, why: said.slice(0, 400), actions }),
      });
      const res = await r.json();
      if (!r.ok) { setErr(res.error || "引き継げなかった"); return; }
      // どんな一日だったかも残す（週のふりかえりが使う）。失敗しても引き継ぎは止めない
      if (kind) {
        void fetch("/api/daily", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind }),
        }).catch(() => {});
      }
      setDone({ placed: res.placed ?? [] });
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setHanding(false); }
  }

  if (done) {
    return (
      <div className="rc-wrap">
        <div className="rc-card is-done">
          <b>✓ 明日へ渡した</b>
          {emo && <span className="rc-emo">明日の夜の感情：<em>{emo}</em></span>}
          {done.placed.length > 0 && (
            <span className="rc-acts">明日のタスクに置いた：{done.placed.join("／")}</span>
          )}
          <span className="rc-note">朝、リアルバースを開くと、この感情が最初に出るよ。</span>
          <button className="rc-go" onClick={onDone}>おやすみ🌙</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rc-wrap">
      <div className="rc-card">
        <div className="rc-head">
          <span>今日を閉じる</span>
          <button className="rc-x" onClick={onClose} title="まだ話す">×</button>
        </div>

        {busy && <div className="rc-busy">今日の話から起こしてる…</div>}
        {err && <div className="rc-err">{err}</div>}

        {rep && (
          <>
            {/* 今日ほんとうに進んだこと（事実。AIには数えさせない） */}
            {rep.progress && (
              <div className={`rc-moved ${rep.progress.movedCount === 0 ? "is-quiet" : ""}`}>
                <div className="rc-moved-t">
                  {rep.progress.movedCount > 0
                    ? `今日、これだけ進んだ（${rep.progress.movedCount}）`
                    : "今日は、静かな日だった"}
                </div>
                {rep.progress.moved.map((m, i) => <div key={i} className="rc-line">✓ {m}</div>)}
                {rep.progress.inward.map((m, i) => <div key={`i${i}`} className="rc-line is-in">◦ {m}</div>)}
                {rep.progress.movedCount === 0 && rep.progress.inward.length === 0 && (
                  <div className="rc-line is-in">◦ 何もしなかった日も、要る時間だよ。</div>
                )}
              </div>
            )}

            {/* 受けと、今日の意味 */}
            <div className="rc-say">
              <div className="rc-recv">{rep.received}</div>
              <div className="rc-mean">{rep.meaning}</div>
            </div>

            {/* 今日はどんな一日だったか（話から起こす。違えば押して直す） */}
            <div className="rc-sec">
              <div className="rc-q">今日は、こんな一日だった？</div>
              <div className="rc-kinds">
                {DAY_KINDS.map((k) => (
                  <button key={k.kind} className={kind === k.kind ? "on" : ""}
                    onClick={() => setKind(kind === k.kind ? "" : k.kind)}>
                    <span className="e">{k.emoji}</span><span className="l">{k.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 明日の一手（今日の話から起こしたもの。外すのは本人） */}
            <div className="rc-sec">
              <div className="rc-q">明日の朝いち、これでいい？</div>
              {rep.tomorrow.length > 0 ? (
                <div className="rc-picks">
                  {rep.tomorrow.map((t) => (
                    <label key={t} className={picked[t] ? "on" : ""}>
                      <input type="checkbox" checked={!!picked[t]}
                        onChange={(e) => setPicked({ ...picked, [t]: e.target.checked })} />
                      {t}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rc-none">今日の話からは起こせなかった。話して足してもいいよ。</div>
              )}
              <div className="rc-add">
                <VoiceInput mode="quest" compact onText={(t) => setExtra((p) => (p ? `${p}、${t}` : t))} />
                <span className="rc-addlabel">
                  {extra ? extra : "足したいことがあれば、マイクで話して"}
                </span>
                {extra && <button className="rc-clear" onClick={() => setExtra("")}>消す</button>}
              </div>
            </div>

            {/* 明日の感情（これも今日の話から起こす） */}
            <div className="rc-sec">
              <div className="rc-q">明日の夜、こうなっていたい？</div>
              <div className="rc-emorow">
                <span className={`rc-emoval ${emo ? "" : "is-empty"}`}>
                  {emo || "（まだ決まってない）"}
                </span>
                <VoiceInput mode="quest" compact onText={(t) => setEmo(t.slice(0, 20))} />
              </div>
              <div className="rc-hint">違ったら、マイクで言い直してね。</div>
            </div>

            <button className="rc-go" disabled={handing || (!emo.trim() && !Object.values(picked).some(Boolean) && !extra.trim())}
              onClick={() => void handOver()}>
              {handing ? "渡してる…" : "明日へ渡して、今日を閉じる"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
