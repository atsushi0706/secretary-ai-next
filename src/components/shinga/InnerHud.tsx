"use client";

import { useEffect, useRef, useState } from "react";

/**
 * インナーワールドのゲームHUD。
 * - 空想↔現実の"バランス"メーター（%ではない。中央＝フロー＝空想を現実に落とし込めている状態が最適）。
 * - 今日のナゾ（最大3・1つ解けば今日クリア）。
 */
type Grounding = { imageDays: number; realDays: number };
type QuestItem = { text: string; done: boolean };
type Quest = { date: string; items: QuestItem[]; percent: number };

export function InnerHud({ guideName }: { guideName: string }) {
  const [g, setG] = useState<Grounding>({ imageDays: 0, realDays: 0 });
  const [quest, setQuest] = useState<Quest>({ date: "", items: [], percent: 0 });
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  function apply(d: { grounding?: Grounding; quest?: Quest }) {
    if (d.grounding) setG(d.grounding);
    if (d.quest) setQuest(d.quest);
  }

  useEffect(() => {
    fetch("/api/inner-hud").then((r) => r.json()).then((d) => {
      if (!d.error) apply(d);
    }).catch(() => {}).finally(() => setReady(true));
  }, []);

  async function post(body: any) {
    const r = await fetch("/api/inner-hud", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) return;
    apply(d);
  }

  const solvedToday = quest.items.some((it) => it.done);

  if (!ready) return null;

  return (
    <div className="ihud">
      {/* 空想↔現実のバランス（中央＝フロー） */}
      <BalanceMeter imageDays={g.imageDays} realDays={g.realDays} />

      {/* ハイヤークエスト＝理想を、今日に1個おろす（＝現実化。これが空想と現実の真ん中に自分を保つ力） */}
      <div className={`ihud-quest ${solvedToday ? "is-solved" : ""}`}>
        <div className="q-head">
          <span className="q-title">🔨 ハイヤークエスト</span>
          {solvedToday
            ? <span className="q-badge done">今日、理想を現実におろせた ✓</span>
            : <span className="q-badge">理想を、今日に1個おろす</span>}
        </div>
        {!solvedToday && quest.items.length === 0 && (
          <p className="q-lead">パラレルウォークで話した理想の中から、どんなに小さくても1個、今日のアクションに。それが「現実化」。</p>
        )}

        {quest.items.length > 0 && (
          <ul className="q-list">
            {quest.items.map((it, i) => (
              <li key={i} className={it.done ? "done" : ""}>
                <button className="q-chk" onClick={() => post({ action: "done", index: i, done: !it.done })}>
                  {it.done ? "✓" : "○"}
                </button>
                <span className="q-text">{it.text}</span>
                <button className="q-del" onClick={() => post({ action: "remove", index: i })} title="消す">×</button>
              </li>
            ))}
          </ul>
        )}

        {quest.items.length < 3 && (
          adding ? (
            <div className="q-add">
              <input
                value={text} autoFocus
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && text.trim()) {
                    post({ action: "add", text }); setText(""); setAdding(false);
                  }
                }}
                placeholder="例：鏡の前で背筋を伸ばして深呼吸する"
              />
              <button onClick={() => { if (text.trim()) { post({ action: "add", text }); setText(""); } setAdding(false); }}>置く</button>
            </div>
          ) : (
            <button className="q-open" onClick={() => setAdding(true)}>
              ＋ 今日おろす理想を書く{quest.items.length > 0 ? "（あと" + (3 - quest.items.length) + "個）" : ""}
            </button>
          )
        )}
      </div>
    </div>
  );
}

/**
 * 空想↔現実のバランス。%ではなく"どっちに寄ってるか"。中央＝フロー（空想を現実に落とし込めている＝最適）。
 * 現実に寄りすぎ＝やることに追われて未来が見えてない。空想に寄りすぎ＝上に浮いて地に足がついてない。
 */
function BalanceMeter({ imageDays, realDays }: { imageDays: number; realDays: number }) {
  const total = imageDays + realDays;
  const diff = realDays - imageDays; // 正＝現実寄り / 負＝空想寄り
  const pos = total === 0 ? 50 : Math.max(10, Math.min(90, 50 + (diff / total) * 42));
  const state = total === 0 ? "neutral" : Math.abs(diff) <= 1 ? "flow" : diff > 0 ? "real" : "image";
  const msg =
    state === "neutral" ? "まだ静か。まず一歩、動いてみよ。"
    : state === "flow" ? "いいバランス。空想を、ちゃんと現実に落とし込めてるね（フロー）😌"
    : state === "real" ? "ちょっと現実に追われ気味かも。一回、上を向いて空想しよ🔮"
    : "ちょっと上に浮いてるかな。ひとつだけ、現実に落としてみよ🔨";
  return (
    <div className={`balance ${state}`}>
      <div className="b-track">
        <span className="b-side left">🔮 空想</span>
        <span className="b-rail">
          <span className="b-center" />
          <span className="b-needle" style={{ left: `${pos}%` }} />
        </span>
        <span className="b-side right">現実 🔨</span>
      </div>
      <div className="b-msg">{msg}</div>
    </div>
  );
}
