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
type LevelAction = { key: string; label: string; per: number; days: number; earnedToday: boolean };
type Level = { level: number; max: number; actions: LevelAction[] };

export function InnerHud({ guideName }: { guideName: string }) {
  const [g, setG] = useState<Grounding>({ imageDays: 0, realDays: 0 });
  const [quest, setQuest] = useState<Quest>({ date: "", items: [], percent: 0 });
  const [level, setLevel] = useState<Level | null>(null);
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  function apply(d: { grounding?: Grounding; quest?: Quest; level?: Level }) {
    if (d.grounding) setG(d.grounding);
    if (d.quest) setQuest(d.quest);
    if (d.level) setLevel(d.level);
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
      {/* レベル（旅の進捗・累積で 0→100） */}
      {level && <LevelBar level={level} />}

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
          <p className="q-lead">パラレルウォークで話した理想の中から、どんなに小さくても1個、今日のアクションに。<b>やれたら✓を付ける＝「現実化」</b>。</p>
        )}

        {quest.items.length > 0 && !solvedToday && (
          <p className="q-check-hint">👉 できたら左の <b>○</b> をタップ。それが<b>「現実化」</b>＝上のメーターの針が<b>右（中央のゾーン）</b>へ動くよ。</p>
        )}
        {solvedToday && (
          <p className="q-check-hint done">✓ 今日、現実におろせた。メーターが中央（ゾーン）に近づいたよ😌</p>
        )}

        {quest.items.length > 0 && (
          <ul className="q-list">
            {quest.items.map((it, i) => (
              <li key={i} className={it.done ? "done" : ""}>
                <button className={`q-chk ${it.done ? "is-done" : ""}`} onClick={() => post({ action: "done", index: i, done: !it.done })} title={it.done ? "できた（現実化ずみ）" : "できたらタップ＝現実化"}>
                  {it.done ? "✓" : "○"}
                </button>
                <span className="q-text">{it.text}</span>
                {!it.done && <button className="q-doneb" onClick={() => post({ action: "done", index: i, done: true })}>できた</button>}
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
 * レベル（旅の進捗）。累積で 0→100。何をすると上がるかを常に明示する。
 * 下がらない。100＝ひと区切り（到達）。
 */
function LevelBar({ level }: { level: Level }) {
  const [open, setOpen] = useState(false);
  const pct = Math.max(0, Math.min(100, (level.level / (level.max || 100)) * 100));
  const done = level.level >= level.max;
  return (
    <div className={`ihud-level ${done ? "is-max" : ""}`}>
      <button className="lv-head" onClick={() => setOpen((v) => !v)}>
        {done ? (
          <span className="lv-label lv-title">🏆 人生の冒険者</span>
        ) : (
          <>
            <span className="lv-label">🌱 インナーワールドレベル</span>
            <span className="lv-num">{level.level}<span className="lv-max">%</span></span>
          </>
        )}
        <span className="lv-toggle">{open ? "▲ 閉じる" : "▼ 上げ方"}</span>
      </button>
      <div className="lv-track"><span className="lv-fill" style={{ width: `${pct}%` }} /></div>
      {done && <div className="lv-maxmsg">100%到達。「人生の冒険者」の称号を授かった🏆</div>}
      {open && (
        <ul className="lv-actions">
          {level.actions.map((a) => (
            <li key={a.key} className={a.earnedToday ? "got" : ""}>
              <span className="a-label">{a.label}</span>
              <span className="a-per">＋{a.per}%</span>
              <span className="a-state">{a.earnedToday ? "今日は反映ずみ ✓" : "今日やると上がる"}</span>
            </li>
          ))}
          <li className="lv-note">※ 50%スタート。やった日はぐんと上がり、何もしない日は −2%とゆるやかに下がる。続けていれば100%を保てるよ。</li>
        </ul>
      )}
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
  const pos = total === 0 ? 50 : Math.max(8, Math.min(92, 50 + (diff / total) * 42));
  const off = Math.abs(pos - 50); // 中央からのズレ
  const state = total === 0 ? "neutral" : off <= 9 ? "zone" : off <= 22 ? "flow" : diff > 0 ? "real" : "image";

  const status =
    state === "neutral" ? "まだ静か"
    : state === "zone" ? "🟢 いま“ゾーン”にいます"
    : state === "flow" ? "🟢 いま“フロー”にいます"
    : state === "real" ? "🔨 現実に寄りすぎ（追われ気味）"
    : "🔮 空想に寄りすぎ（地に足がついてない）";

  const why =
    state === "zone" ? "ど真ん中＝最高の状態。空想したことが、ちゃんと今日に落ちてる。"
    : state === "flow" ? "ゾーンのすぐ外。いい流れ。この中にいるのがベスト。"
    : state === "real" ? "やることに追われて、理想（上）を見れてない状態。"
    : state === "image" ? "理想は描けてるけど、まだ現実に落とせてない状態。"
    : "空想（理想を描く）と現実（今日に落とす）が釣り合うと、ど真ん中の“ゾーン”に入るよ。";

  // 真ん中に戻す具体策（今どっちに寄ってるかで、効く方を強調）
  const needImage = state === "real";   // 現実過多 → 空想を足す
  const needReal = state === "image";   // 空想過多 → 現実に落とす

  return (
    <div className={`balance ${state}`}>
      <div className="b-head">
        <span className="b-status">{status}</span>
      </div>

      <div className="b-track">
        <span className="b-side left">🔮 空想</span>
        <span className="b-rail">
          <span className="b-flow" />
          <span className="b-zone" />
          <span className="b-needle" style={{ left: `${pos}%` }} />
        </span>
        <span className="b-side right">現実 🔨</span>
      </div>
      <div className="b-legend"><span className="dot zone" />中央＝ゾーン<span className="dot flow" />その外側＝フロー</div>

      <div className="b-why">{why}</div>

      {/* 真ん中に戻す調整方法（効く方を強調） */}
      <div className="b-fix">
        <div className="b-fix-title">🎯 ど真ん中（ゾーン）に整えるには</div>
        <div className={`b-fix-row ${needImage ? "is-hot" : ""}`}>
          <b>🔮 空想を足す</b>：パラレルウォークで理想を思いっきり描く<span className="arr">→ 針が左へ</span>
        </div>
        <div className={`b-fix-row ${needReal ? "is-hot" : ""}`}>
          <b>🔨 現実に落とす</b>：ハイヤークエストを1個やって<b>✓（できた）</b>を付ける<span className="arr">→ 針が右へ</span>
        </div>
        <div className="b-fix-note">＝ 空想したら、その日のうちに小さく1個やって✓。これを続けると、ゾーンに居つづけられる。</div>
      </div>
    </div>
  );
}
