"use client";

/**
 * 使い方の説明書（1ページで完結させる）。
 *
 * 端末ごとに手順がまるごと違うのは「通知」だけなので、そこはタブで分ける。
 * 画面の絵は、実際のUIをその場で組み立てて見せる（スクショ画像を貼らない）。
 * こうしておくと、アプリの見た目が変わっても説明書だけ古くなることがない。
 */
import Link from "next/link";
import { useEffect, useState } from "react";

type Device = "android" | "iphone" | "pc";

const DEVICES: { key: Device; label: string; sub: string }[] = [
  { key: "android", label: "Android", sub: "Chrome" },
  { key: "iphone", label: "iPhone", sub: "Safari" },
  { key: "pc", label: "パソコン", sub: "Chrome / Edge" },
];

/* ───────────────────────── 画面の見本（実物と同じ見た目を組み立てる） */

/** 上部の領域切り替えタブ（実物と同じ） */
function TabMock({ active }: { active: "realverse" | "shinga" }) {
  return (
    <div className="gd-mock">
      <div className="gm-tabs">
        <div className={`gm-tab ${active === "realverse" ? "on-real" : "off"}`}>
          <span>🧭 リアルバース</span><em>PLAN IT. DO IT. BECOME IT.</em>
        </div>
        <div className={`gm-tab ${active === "shinga" ? "on-singa" : "off"}`}>
          <span>🔑 インナーワールド</span><em>EXPLORE. HEAL. REMEMBER.</em>
        </div>
      </div>
    </div>
  );
}

/** 設定画面の「その他の設定」まわり */
function SettingsMock({ state }: { state: "closed" | "off" | "on" }) {
  return (
    <div className="gd-mock">
      <div className="gm-card">
        <div className="gm-card-head">
          <span>⚙️ その他の設定</span><span className="gm-caret">{state === "closed" ? "▼" : "▲"}</span>
        </div>
        {state !== "closed" && (
          <div className="gm-card-body">
            <div className="gm-h3">🔔 プッシュ通知（おすすめ）</div>
            <p className="gm-p">アプリを閉じていても、朝夜の声かけがスマホ／PCに直接届きます。</p>
            {state === "off"
              ? <span className="gm-btn">🔔 通知をONにする</span>
              : (
                <div className="gm-row">
                  <span className="gm-ok">🔔 通知ON ✓</span>
                  <span className="gm-btn is-ghost">テスト通知を送る</span>
                </div>
              )}
            <p className="gm-note">通知は1日3回（朝6:30 / 昼12:00 / 夜20:00）。</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** ブラウザの許可ダイアログ */
function PermMock() {
  return (
    <div className="gd-mock">
      <div className="gm-perm">
        <div className="gm-perm-head">singaworld.rinq-systeme.jp が<br />通知の送信を求めています</div>
        <div className="gm-perm-btns">
          <span className="gm-perm-no">ブロック</span>
          <span className="gm-perm-yes">許可</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 本体 */

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="gd-step">
      <div className="gs-head"><span className="gs-n">{n}</span><span className="gs-title">{title}</span></div>
      {children && <div className="gs-body">{children}</div>}
    </div>
  );
}

export default function GuidePage() {
  const [device, setDevice] = useState<Device>("android");
  const [health, setHealth] = useState<null | { configured: boolean }>(null);

  useEffect(() => {
    // 使う人が「サーバ側は大丈夫なのか」を自分で確かめられるようにする
    fetch("/api/push/health").then((r) => r.json()).then(setHealth).catch(() => {});
    // 端末をだいたい当てて、最初に開くタブを合わせる
    try {
      const ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/.test(ua)) setDevice("iphone");
      else if (/Android/.test(ua)) setDevice("android");
      else setDevice("pc");
    } catch { /* 判定できなければ Android のまま */ }
  }, []);

  return (
    <main className="gd-page">
      <header className="gd-head">
        <div className="gd-kicker">SINGA WORLD</div>
        <h1>使い方の説明書</h1>
        <p className="gd-lead">
          はじめての人はここだけ読めば動かせます。<br />
          通知の設定は端末ごとに違うので、あとで<b>自分の端末を選んで</b>読んでください。
        </p>
      </header>

      {/* ① これは何をするもの？ */}
      <section className="gd-sec">
        <h2><span className="gd-num">1</span>これは何をするもの？</h2>
        <p className="gd-txt">
          このアプリには<b>2つの世界</b>があります。画面のいちばん上で切り替えます。
        </p>
        <TabMock active="shinga" />
        <div className="gd-two">
          <div className="gd-realm is-real">
            <div className="gr-name">🧭 リアルバース</div>
            <div className="gr-sub">現実の側</div>
            <p>今日の予定・タスク・時間割。<b>やることを決めて、こなす</b>ところ。Googleカレンダーとつながります。</p>
          </div>
          <div className="gd-realm is-singa">
            <div className="gr-name">🔑 インナーワールド</div>
            <div className="gr-sub">内側の側</div>
            <p>理想を歩き、ブロックをほどき、内なる子に会う。<b>ワークをする</b>ところ。地図から各ワークに入ります。</p>
          </div>
        </div>
        <p className="gd-txt gd-hint">
          ※ アプリを開くと、まず<b>インナーワールド</b>が出ます。朝の流れ（今の気分 → 今日の動けそう度 →
          未来からの手紙）もここから始まります。<br />
          予定やタスクを見たいときは、上のタブで<b>リアルバース</b>に切り替えてください。
        </p>
      </section>

      {/* ② 最初にやる設定 */}
      <section className="gd-sec">
        <h2><span className="gd-num">2</span>最初にやる設定は3つだけ</h2>
        <p className="gd-txt">
          設定はぜんぶ <Link href="/settings" className="gd-link">⚙️ 設定ページ</Link> にあります。
          （リアルバースの右上にある歯車からも行けます）
        </p>
        <div className="gd-list">
          <div className="gl-row"><span className="gl-n">①</span>
            <div><b>呼ばれたい名前</b><br />「🎭 秘書のカスタマイズ」の中。秘書がこの名前で呼びます。</div></div>
          <div className="gl-row"><span className="gl-n">②</span>
            <div><b>Gemini API キー（必須）</b><br />
              これが無いとAIが動きません。設定ページに取得手順（3分）が載っています。無料です。</div></div>
          <div className="gl-row"><span className="gl-n">③</span>
            <div><b>通知をONにする</b><br />
              下の <a href="#push" className="gd-link">3. 通知の設定</a> を、自分の端末で読んでください。</div></div>
        </div>
        <p className="gd-txt gd-hint">
          ※ 生年月日・お名前を入れておくと（「✦ あなたの星」）、手紙や取扱説明書がぐっと自分ごとになります。任意です。
        </p>
      </section>

      {/* ③ 通知の設定（端末別） */}
      <section className="gd-sec" id="push">
        <h2><span className="gd-num">3</span>通知の設定</h2>
        <p className="gd-txt">
          1日3回、<b>朝6:30・昼12:00・夜20:00</b>に秘書から声がかかります。<br />
          <b>別のアプリを入れる必要はありません。</b>ブラウザの通知をONにするだけです。
        </p>

        <div className="gd-warn">
          ⚠️ 通知は<b>端末ごとに1回ずつ</b>ONにします。スマホとパソコンの両方で受け取りたいなら、両方でONにしてください。
        </div>

        <div className="gd-devtabs">
          {DEVICES.map((d) => (
            <button key={d.key} className={`gd-devtab ${device === d.key ? "on" : ""}`} onClick={() => setDevice(d.key)}>
              <b>{d.label}</b><em>{d.sub}</em>
            </button>
          ))}
        </div>

        {device === "android" && (
          <div className="gd-steps">
            <Step n={1} title="Chrome で設定ページを開く">
              <p className="gs-p">下のボタンか、リアルバース右上の歯車から。</p>
              <Link href="/settings" className="gd-btn">⚙️ 設定ページを開く</Link>
            </Step>
            <Step n={2} title="いちばん下の「その他の設定」を押して開く">
              <SettingsMock state="closed" />
            </Step>
            <Step n={3} title="「🔔 通知をONにする」を押す">
              <SettingsMock state="off" />
            </Step>
            <Step n={4} title="「許可」を選ぶ">
              <PermMock />
            </Step>
            <Step n={5} title="「通知ON ✓」になったら、テストで確かめる">
              <SettingsMock state="on" />
              <p className="gs-p">「テスト通知を送る」を押して、数秒で届けば完了です。</p>
            </Step>
          </div>
        )}

        {device === "iphone" && (
          <div className="gd-steps">
            <div className="gd-warn is-strong">
              📱 iPhone だけ<b>先にホーム画面へ追加</b>する必要があります。Safariの仕様で、
              追加しないと通知のボタンが押せません。
            </div>
            <Step n={1} title="Safari でこのアプリを開く">
              <p className="gs-p">Chromeアプリではなく、必ず <b>Safari</b> で開いてください。</p>
              <code className="gd-url">singaworld.rinq-systeme.jp</code>
            </Step>
            <Step n={2} title="下の「共有」ボタン（□に↑）を押す" />
            <Step n={3} title="「ホーム画面に追加」を選んで「追加」" >
              <p className="gs-p">ホーム画面にアイコンができます。</p>
            </Step>
            <Step n={4} title="ホーム画面の「そのアイコン」から開き直す">
              <p className="gs-p"><b>ここが大事です。</b>Safariのタブではなく、追加したアイコンから開いてください。</p>
            </Step>
            <Step n={5} title="⚙️ 設定 →「その他の設定」を開く">
              <SettingsMock state="closed" />
            </Step>
            <Step n={6} title="「🔔 通知をONにする」→「許可」">
              <SettingsMock state="off" />
              <PermMock />
            </Step>
            <Step n={7} title="「通知ON ✓」になったら、テストで確かめる">
              <SettingsMock state="on" />
            </Step>
          </div>
        )}

        {device === "pc" && (
          <div className="gd-steps">
            <Step n={1} title="Chrome か Edge で設定ページを開く">
              <Link href="/settings" className="gd-btn">⚙️ 設定ページを開く</Link>
              <p className="gs-p">※ Safari（Mac）でも動きますが、Chrome / Edge のほうが確実です。</p>
            </Step>
            <Step n={2} title="いちばん下の「その他の設定」を押して開く">
              <SettingsMock state="closed" />
            </Step>
            <Step n={3} title="「🔔 通知をONにする」を押す">
              <SettingsMock state="off" />
            </Step>
            <Step n={4} title="画面の左上に出る許可ダイアログで「許可」">
              <PermMock />
              <p className="gs-p">※ ブラウザによっては<b>アドレスバーの左の🔒</b>から「通知：許可」に変える必要があります。</p>
            </Step>
            <Step n={5} title="テスト通知で確かめる">
              <SettingsMock state="on" />
              <p className="gs-p">パソコンの通知は、画面の隅に出ます。OS側の通知設定がオフだと出ないので注意。</p>
            </Step>
          </div>
        )}
      </section>

      {/* ④ 届かないとき */}
      <section className="gd-sec">
        <h2><span className="gd-num">4</span>通知が届かないとき</h2>
        <div className="gd-check">
          <div className={`gc-row ${health ? (health.configured ? "ok" : "ng") : ""}`}>
            <span className="gc-mark">{health ? (health.configured ? "✓" : "✕") : "…"}</span>
            <div>
              <b>サーバ側の準備</b><br />
              {health
                ? (health.configured
                  ? "問題ありません。あとは端末でONにするだけです。"
                  : "サーバ側がまだです。運営に連絡してください。")
                : "確認中…"}
              <br /><a href="/api/push/health" target="_blank" rel="noreferrer" className="gd-link">詳しい状態を見る</a>
            </div>
          </div>
          <div className="gc-row"><span className="gc-mark">?</span>
            <div><b>設定画面に「通知ON ✓」と出ていますか</b><br />
              出ていなければ、まだこの端末でONになっていません。上の手順をやり直してください。</div></div>
          <div className="gc-row"><span className="gc-mark">?</span>
            <div><b>ブラウザの通知をブロックしていませんか</b><br />
              一度「ブロック」を選ぶと、次からボタンを押しても何も起きません。
              アドレスバーの🔒（スマホは︙→サイト設定）から「通知」を<b>許可</b>に戻してください。</div></div>
          <div className="gc-row"><span className="gc-mark">?</span>
            <div><b>端末の「集中モード」「サイレント」になっていませんか</b><br />
              OS側でブラウザの通知が切られていると、アプリからは何もできません。</div></div>
          <div className="gc-row"><span className="gc-mark">?</span>
            <div><b>iPhoneで、Safariのタブから開いていませんか</b><br />
              ホーム画面に追加したアイコンから開かないと、iPhoneでは通知を受け取れません。</div></div>
        </div>
      </section>

      {/* ⑤ 何ができるか */}
      <section className="gd-sec">
        <h2><span className="gd-num">5</span>できること（ざっと）</h2>
        <div className="gd-feat">
          <div className="gf"><b>🧭 リアルバース</b><span>予定とタスク。今日の時間割を組む。話しかけるだけで登録できる。</span></div>
          <div className="gf"><b>✨ ピークステート</b><span>理想が叶っている状態に<b>先になる</b>。呼吸で整えるところから。</span></div>
          <div className="gf"><b>🚶 パラレルウォーク</b><span>理想の世界を歩いて言葉にする。話すほど景色が開けていく。</span></div>
          <div className="gf"><b>🗝 ウォールブレイク</b><span>「どうせ無理」をほどく。壁が解けるほど扉が開く。</span></div>
          <div className="gf"><b>🜂 内なる子の神殿</b><span>守り手の奥にいる子に会い、癒して取り込む。守り手は才能になる。</span></div>
          <div className="gf"><b>🚀 パラレルトラベル</b><span>「それがあるとどうなる？」で視野を上げる。宇宙まで引いていく。</span></div>
          <div className="gf"><b>📖 自分の取扱説明書</b><span>生年月日×16問。強み・つまずき・向かう方向を長文で。</span></div>
          <div className="gf"><b>📣 発信スタジオ</b><span>ワークの体験を、フォロワーに役立つカルーセル投稿に変換する。</span></div>
        </div>
      </section>

      {/* 免責 */}
      <section className="gd-sec">
        <h2><span className="gd-num">6</span>大切なおことわり</h2>
        <div className="gd-warn">
          このアプリのワークや秘書の言葉は、自己理解のための道具であり、
          <b>医療・心理カウンセリングの代わりにはなれません</b>。<br />
          心や身体のつらさが続くときは、医療機関や専門の相談窓口につながってください。<br />
          ・よりそいホットライン 0120-279-338（24時間・無料）<br />
          ・いのちの電話 0570-783-556
        </div>
        <p className="gd-txt gd-hint" style={{ marginTop: 12 }}>
          音声合成：VOICEVOX:白上虎太郎（無料で使える日本語の音声合成エンジンです）
        </p>
      </section>

      {/* 名前・生年月日・APIキーを入れ直したい人の行き先。
          いま入っている内容がそのまま出るので、消えることはない。 */}
      <section className="gd-sec">
        <h2 className="gd-h2">はじめの設定を、入れ直したいとき</h2>
        <p className="gd-txt">
          呼ばれたい名前・生年月日・APIキーは、あとからいつでも入れ直せます。<br />
          <b>いま入っている内容がそのまま出てくる</b>ので、変えたいところだけ書き換えてください。
        </p>
        <Link href="/onboarding?again=1" className="gd-btn">✏️ はじめの設定をやり直す</Link>
      </section>

      <footer className="gd-foot">
        <Link href="/settings" className="gd-btn">⚙️ 設定ページへ</Link>
        <Link href="/shinga" className="gd-btn is-ghost">🔑 インナーワールドへ</Link>
        <Link href="/realverse" className="gd-btn is-ghost">🧭 リアルバースへ</Link>
      </footer>
    </main>
  );
}
