"use client";

import { useEffect, useRef, useState } from "react";

/**
 * インナーワールドのゲームHUD（レイトン風の「ステータス＋今日のナゾ」）。
 * - 🔮イメージ力 / 🔨現実化力 の2ゲージ。
 * - 今日のナゾ（最大3・1つ解けば今日100%）。解いた瞬間、ゲージがフワッと伸びる＝歓喜のフィードバック。
 */
type Grounding = { image: number; real: number };
type QuestItem = { text: string; done: boolean };
type Quest = { date: string; items: QuestItem[]; percent: number };

export function InnerHud({ guideName }: { guideName: string }) {
  const [g, setG] = useState<Grounding>({ image: 0, real: 0 });
  const [quest, setQuest] = useState<Quest>({ date: "", items: [], percent: 0 });
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [burst, setBurst] = useState<null | "image" | "real">(null);
  const prevReal = useRef(0);
  const prevImage = useRef(0);

  function apply(d: { grounding?: Grounding; quest?: Quest }) {
    if (d.grounding) {
      // 上がった方を一瞬光らせる（歓喜）
      if (d.grounding.real > prevReal.current) setBurst("real");
      else if (d.grounding.image > prevImage.current) setBurst("image");
      prevReal.current = d.grounding.real;
      prevImage.current = d.grounding.image;
      setG(d.grounding);
    }
    if (d.quest) setQuest(d.quest);
  }

  useEffect(() => {
    fetch("/api/inner-hud").then((r) => r.json()).then((d) => {
      if (!d.error) { prevReal.current = d.grounding?.real ?? 0; prevImage.current = d.grounding?.image ?? 0; apply(d); }
    }).catch(() => {}).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!burst) return;
    const id = setTimeout(() => setBurst(null), 1400);
    return () => clearTimeout(id);
  }, [burst]);

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
      {/* ステータス2ゲージ */}
      <div className="ihud-gauges">
        <Gauge icon="🔮" name="イメージ力" value={g.image} tone="image" pop={burst === "image"} />
        <Gauge icon="🔨" name="現実化力" value={g.real} tone="real" pop={burst === "real"} />
      </div>

      {/* 今日のナゾ */}
      <div className={`ihud-quest ${solvedToday ? "is-solved" : ""}`}>
        <div className="q-head">
          <span className="q-title">🗺 今日のナゾ</span>
          {solvedToday
            ? <span className="q-badge done">解けた！ 100%</span>
            : quest.items.length > 0
              ? <span className="q-badge">1つ解けば今日クリア</span>
              : <span className="q-badge">{guideName}「理想を1つ、今日に置いてみよ」</span>}
        </div>

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
              ＋ 今日の理想の一手を置く{quest.items.length > 0 ? "（あと" + (3 - quest.items.length) + "個）" : ""}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function Gauge({ icon, name, value, tone, pop }: { icon: string; name: string; value: number; tone: "image" | "real"; pop: boolean }) {
  return (
    <div className={`gauge ${tone} ${pop ? "pop" : ""}`}>
      <div className="g-top"><span className="g-ico">{icon}</span><span className="g-name">{name}</span><span className="g-val">{value}%</span></div>
      <div className="g-bar"><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}
