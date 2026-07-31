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
// 対話の中身から読み取った偏り（回数では見えない"状態"）
type Lean = { lean: "image" | "real" | "zone"; strength: number; pattern: string; message: string };

export function InnerHud({ guideName }: { guideName: string }) {
  const [g, setG] = useState<Grounding>({ imageDays: 0, realDays: 0 });
  const [quest, setQuest] = useState<Quest>({ date: "", items: [], percent: 0 });
  const [level, setLevel] = useState<Level | null>(null);
  const [lean, setLean] = useState<Lean | null>(null);
  const [ready, setReady] = useState(false);

  function apply(d: { grounding?: Grounding; quest?: Quest; level?: Level; lean?: Lean | null }) {
    if (d.grounding) setG(d.grounding);
    if (d.quest) setQuest(d.quest);
    if (d.level) setLevel(d.level);
    if (d.lean !== undefined) setLean(d.lean ?? null);
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
      <BalanceMeter imageDays={g.imageDays} realDays={g.realDays} lean={lean} />

      {/* ハイヤークエスト＝未来から降りてきたクエストと同じもの。
          まだ決まっていない日も「どこにあるか」が分かるよう、場所だけは常に見せる。 */}
      {quest.items.length === 0 && (
        <div className="ihud-quest is-empty">
          <div className="q-head">
            <span className="q-title">🔨 ハイヤークエスト</span>
            <span className="q-badge">受け取り待ち</span>
          </div>
          <p className="q-lead">
            上の<b>「🎴 未来からのクエストが届いてる」</b>を開いて受け取ると、ここに「今日の一手」が入るよ。
          </p>
        </div>
      )}
      {quest.items.length > 0 && (
      <div className={`ihud-quest ${solvedToday ? "is-solved" : ""}`}>
        <div className="q-head">
          <span className="q-title">🔨 ハイヤークエスト</span>
          {solvedToday
            ? <span className="q-badge done">今日、理想を現実におろせた ✓</span>
            : <span className="q-badge">未来から降りてきた、今日の一手</span>}
        </div>

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
                {/* 未来から届いたクエストは、やってもやらなくても消さずに残す（記録として） */}
              </li>
            ))}
          </ul>
        )}

      </div>
      )}
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
function BalanceMeter({ imageDays, realDays, lean }: { imageDays: number; realDays: number; lean?: Lean | null }) {
  const [open, setOpen] = useState(false); // 説明はふだん畳んでおく（うるさくしない）
  const total = imageDays + realDays;
  const diff = realDays - imageDays; // 正＝現実寄り / 負＝空想寄り
  const byCount = total === 0 ? 50 : Math.max(8, Math.min(92, 50 + (diff / total) * 42));
  // 対話から読み取った偏りを重ねる（回数では見えない"状態"の方を強めに効かせる）
  const byTalk = lean
    ? lean.lean === "real" ? 50 + (lean.strength / 100) * 42
      : lean.lean === "image" ? 50 - (lean.strength / 100) * 42
      : 50
    : null;
  // 対話がはっきり偏りを示しているときは、回数と食い違っても対話を信じる。
  // （例：✓は毎日あるのに、話しているのは不安ばかり ＝ 実際は空想寄り。
  //   ここで平均すると打ち消し合って「整っている」に見えてしまう）
  const talkStrong = !!lean && lean.lean !== "zone" && lean.strength >= 50;
  const pos = byTalk == null ? byCount
    : talkStrong ? Math.max(8, Math.min(92, byTalk))
    : Math.max(8, Math.min(92, byCount * 0.4 + byTalk * 0.6));
  const off = Math.abs(pos - 50); // 中央からのズレ
  const state = (total === 0 && !lean) ? "neutral" : off <= 9 ? "zone" : off <= 22 ? "flow" : pos > 50 ? "real" : "image";

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
      <button className="b-head" onClick={() => setOpen((v) => !v)}>
        <span className="b-status">{status}</span>
        <span className="b-toggle">{open ? "▲ 閉じる" : "▼ くわしく"}</span>
      </button>

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

      {/* 対話から見つけた癖と、真ん中へ戻す一言（回数では見えない状態） */}
      {lean && lean.lean !== "zone" && lean.message && (
        <div className="b-read">
          <div className="br-pattern">👀 {lean.pattern}</div>
          <div className="br-msg">{lean.message}</div>
        </div>
      )}

      {!open ? null : (
      <>
      <div className="b-why">{why}</div>

      {/* 真ん中に戻す調整方法（効く方を強調） */}
      <div className="b-fix">
        <div className="b-fix-title">🎯 ど真ん中（ゾーン）に整えるには</div>
        <div className={`b-fix-row ${needImage ? "is-hot" : ""}`}>
          <b>🔮 空想を足す</b>：パラレルウォークで理想を思いっきり描く<span className="arr">→ 針が左へ</span>
        </div>
        <div className={`b-fix-row ${needReal ? "is-hot" : ""}`}>
          <b>🔨 現実に落とす</b>：ホームの<b>ハイヤークエスト</b>を1個やって<b>✓（できた）</b>を付ける<span className="arr">→ 針が右へ</span>
        </div>
        <div className="b-fix-note">
          ＝ 空想したら、その日のうちに小さく1個やって✓。これを続けると、ゾーンに居つづけられる。<br />
          <b>針が右（現実）に寄るのは</b>、パラレルウォークをしない日が続いて<b>✓だけを重ねたとき</b>。
          そのときは✓を減らすんじゃなく<b>パラレルウォークで空想を足す</b>。
          こなすだけの毎日にならないよう、理想を見る時間を戻すのが正解だよ。
        </div>
      </div>
      </>
      )}
    </div>
  );
}
