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
// 対話の中身から読み取った偏り（回数では見えない"状態"）
type Lean = { lean: "image" | "real" | "zone"; strength: number; pattern: string; message: string };
// 針の位置は「実際にやったこと」で決める（AIの所見は言葉にだけ使う）
type BalanceNext = { key: string; label: string; how: string };
type BalanceSide = { days: number; today: number; items: string[] };
type Balance = {
  pos: number; state: "zone" | "flow" | "image" | "real" | "neutral";
  linkedToday: boolean; linkedCount: number;
  image: BalanceSide; real: BalanceSide; next: BalanceNext[];
};

export function InnerHud({ guideName, onTalkBalance }: {
  guideName: string;
  /** メーターから「どうすれば戻る？」の対話へ入る */
  onTalkBalance?: () => void;
}) {
  const [g, setG] = useState<Grounding>({ imageDays: 0, realDays: 0 });
  const [quest, setQuest] = useState<Quest>({ date: "", items: [], percent: 0 });
  const [lean, setLean] = useState<Lean | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [ready, setReady] = useState(false);
  // ✓を付けた瞬間に出す「効いたよ」の合図（言われないと気づかない問題への答え）
  const [burst, setBurst] = useState<string | null>(null);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function apply(d: { grounding?: Grounding; balance?: Balance; quest?: Quest; lean?: Lean | null }) {
    if (d.grounding) setG(d.grounding);
    if (d.balance) setBalance(d.balance);
    if (d.quest) setQuest(d.quest);
    if (d.lean !== undefined) setLean(d.lean ?? null);
  }

  useEffect(() => {
    // まず速い読み込み（所見はキャッシュ）。画面を待たせない
    fetch("/api/inner-hud").then((r) => r.json()).then((d) => {
      if (!d.error) apply(d);
    }).catch(() => {}).finally(() => setReady(true));
    // 所見の作り直しは裏で。できたら差し替える（できなくても画面はそのまま）
    fetch("/api/inner-hud", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lean_refresh" }),
    }).then((r) => r.json()).then((d) => {
      if (d?.ok) setLean(d.lean ?? null);
    }).catch(() => {});
  }, []);

  async function post(body: any) {
    const r = await fetch("/api/inner-hud", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) return;
    apply(d);
    // ✓を付けた＝現実化。目に見える形で返す
    if (body.action === "done" && body.done) {
      setBurst("🔨 現実化 +1 ── 針が右へ動いた");
      if (burstTimer.current) clearTimeout(burstTimer.current);
      burstTimer.current = setTimeout(() => setBurst(null), 3000);
    }
  }

  const solvedToday = quest.items.some((it) => it.done);

  if (!ready) return null;

  return (
    <div className="ihud">
      {/* 空想↔現実のバランス（中央＝フロー） */}
      <BalanceMeter balance={balance} imageDays={g.imageDays} realDays={g.realDays} lean={lean} onTalk={onTalkBalance} />
      {burst && <div className="hud-burst">{burst}</div>}

      {/* ハイヤークエスト＝未来から降りてきたクエストと同じもの。
          まだ決まっていない日も「どこにあるか」が分かるよう、場所だけは常に見せる。 */}
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
 * 空想↔現実のバランス。%ではなく"どっちに寄ってるか"。中央＝フロー（空想を現実に落とし込めている＝最適）。
 * 現実に寄りすぎ＝やることに追われて未来が見えてない。空想に寄りすぎ＝上に浮いて地に足がついてない。
 */
function BalanceMeter({ balance, imageDays, realDays, lean, onTalk }: {
  balance?: Balance | null; imageDays: number; realDays: number; lean?: Lean | null; onTalk?: () => void;
}) {
  const [open, setOpen] = useState(false); // 説明はふだん畳んでおく（うるさくしない）

  /**
   * 針の位置は、サーバが「実際にやったこと」から決めた値をそのまま使う。
   *
   * 以前はここでAIの所見（lean）を強く効かせていた。その結果、
   * パラレルウォークをやるほど"理想の話"が増えて「空想寄り」と判定され、
   * **ワークをやるほど針が空想側へ振れる**という逆転が起きていた。
   * AIの言葉は下の吹き出しにだけ使い、位置には触らせない。
   */
  const total = imageDays + realDays;
  const fallbackPos = total === 0 ? 50
    : Math.max(8, Math.min(92, 50 + ((realDays - imageDays) / total) * 42));
  const pos = balance ? balance.pos : fallbackPos;
  const state: "zone" | "flow" | "image" | "real" | "neutral" = balance
    ? balance.state
    : total === 0 ? "neutral"
    : Math.abs(fallbackPos - 50) <= 9 ? "zone"
    : Math.abs(fallbackPos - 50) <= 22 ? "flow"
    : fallbackPos > 50 ? "real" : "image";
  const linked = !!balance?.linkedToday;

  const status = linked ? `🟢 今日、理想を現実に合わせた（${balance!.linkedCount}）`
    :
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

  // 真ん中（ゾーン／フロー）にいるなら、戻し方は出さない。
  // いま整っている人に「これをやれ」と並べるのは、ただの雑音になる。
  const offCenter = state === "image" || state === "real";
  const fixes = offCenter ? (balance?.next ?? []) : [];

  return (
    <div className={`balance ${state}`}>
      {/* 閉じているときは、この2つだけ。中身は「くわしく」を押したときに出す。
          以前は下の中身が閉じる対象の外に置いてあり、閉じても出たままだった。 */}
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

      {open && (
        <>
          <div className="b-legend"><span className="dot zone" />中央＝ゾーン<span className="dot flow" />その外側＝フロー</div>
          <div className="b-why">{why}</div>

          {/* きょう、理想と現実がつながったか */}
          {balance && (
            <div className={`b-today ${linked ? "is-linked" : ""}`}>
              {linked ? (
                <>
                  <b>✓ 今日、理想を現実に合わせた</b>
                  <span>だから真ん中。予定がずれても、1つ合わせれば戻ってこられる。</span>
                </>
              ) : (
                <>
                  <b>今日はまだ、理想を現実に合わせていない</b>
                  <span>1つでいい。合わせたら、その日は真ん中に戻るよ。</span>
                </>
              )}
            </div>
          )}

          {/* 真ん中から外れているときだけ、具体策を出す */}
          {fixes.length > 0 && (
            <ul className="b-next">
              {fixes.map((n) => (
                <li key={n.key}><b>{n.label}</b><span>{n.how}</span></li>
              ))}
            </ul>
          )}

          {/* 対話から見つけた癖と、真ん中へ戻す一言 */}
          {lean && lean.lean !== "zone" && lean.message && (
            <div className="b-read">
              <div className="br-pattern">👀 {lean.pattern}</div>
              <div className="br-msg">{lean.message}</div>
            </div>
          )}

          {/* 言いっぱなしにしない。「じゃあどうする？」を一緒に決める場所へ */}
          {state !== "neutral" && onTalk && (
            <button className="b-talk" onClick={onTalk}>
              {offCenter ? "💬 どうすれば真ん中に戻る？ 話しながら決める"
                         : "💬 この流れを保つには？ 話しながら決める"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
