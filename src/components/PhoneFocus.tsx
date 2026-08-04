"use client";

/**
 * スマホの誘惑をとめる（できる範囲で、正直に）。
 *
 * 【はっきりさせておくこと】
 * Webアプリから Instagram や YouTube を止めることは**できません**。
 * iOS も Android も、他のアプリを操作する権限をWebページに一切与えていないからです。
 * これはこのアプリの作りの問題ではなく、スマホの仕組みです。
 *
 * できるのは「OSの機能を、ここから最短で呼べるようにする」ところまで。
 * ・iOS   … ショートカットApp を URL から起動できる。集中モードのON/OFFを1タップに畳める
 * ・Android … Digital Wellbeing のフォーカスモード。クイック設定のタイルで1タップ
 *
 * だから、この画面は「代わりにやってあげる」ふりをせず、
 * **一度だけ仕込めば、あとは1タップで済む形**まで案内する。
 */
import { useEffect, useState } from "react";

type Phone = "ios" | "android" | "pc";

const BLOCK_TARGETS = ["Instagram", "YouTube", "TikTok", "X", "Facebook", "LINE", "ニュース"];

function detect(): Phone {
  if (typeof navigator === "undefined") return "pc";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "pc";
}

export function PhoneFocus() {
  const [phone, setPhone] = useState<Phone>("pc");
  const [open, setOpen] = useState(false);
  const [shortcut, setShortcut] = useState("集中モード");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPhone(detect());
    try {
      const s = localStorage.getItem("singa.iosShortcutName");
      if (s) setShortcut(s);
    } catch { /* 保存できなくても使える */ }
  }, []);

  function runShortcut() {
    const name = shortcut.trim() || "集中モード";
    try { localStorage.setItem("singa.iosShortcutName", name); } catch { /* ignore */ }
    // ショートカットAppを名前で呼ぶ。作っていなければ「見つからない」と出るだけで、害はない
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}`;
  }

  return (
    <section className="card">
      <button className="pf-head" onClick={() => setOpen((v) => !v)}>
        <span className="pf-title">📵 スマホの誘惑をとめる</span>
        <span className="pf-toggle">{open ? "▲ 閉じる" : "▼ ひらく"}</span>
      </button>

      {open && (
        <div className="pf-body">
          <p className="pf-honest">
            正直に言うと、<b>このアプリから直接アプリを止めることはできません</b>。
            スマホが、Webページに他のアプリを触らせない仕組みになっているからです。<br />
            できるのは、<b>スマホ本体の機能を1タップで呼べるようにする</b>ところまで。
            一度だけ仕込めば、あとは押すだけになります。
          </p>

          <div className="pf-targets">
            {BLOCK_TARGETS.map((t) => <span key={t}>{t}</span>)}
            <span className="pf-more">…を、まとめて止める</span>
          </div>

          {/* ── iPhone ── */}
          {phone !== "android" && (
            <div className={`pf-os ${phone === "ios" ? "is-mine" : ""}`}>
              <div className="pf-os-t">🍎 iPhone・iPad</div>
              <ol className="pf-steps">
                <li><b>設定 → スクリーンタイム → App使用時間の制限</b> で、
                  上のアプリに <b>1分</b> の制限をかける（実質いつでもブロック）</li>
                <li><b>設定 → 集中モード</b> で「仕事」などを1つ作り、
                  <b>ホーム画面</b>から誘惑アプリのあるページを外す</li>
                <li><b>ショートカットApp</b> で新規ショートカットを作り、
                  「集中モードを設定」→ さっき作った集中モードON。名前を付ける</li>
                <li>その名前を下に入れて、ボタンから呼ぶ</li>
              </ol>
              <div className="pf-run">
                <input value={shortcut} onChange={(e) => { setShortcut(e.target.value); setSaved(false); }}
                  placeholder="ショートカットの名前" maxLength={30} />
                <button onClick={() => { runShortcut(); setSaved(true); }}>▶ 呼び出す</button>
              </div>
              {saved && <div className="pf-saved">名前を覚えたよ。次からはボタンだけでいい。</div>}
              <p className="pf-note">
                ※ ショートカットを作っていないと「見つかりません」と出ます。作ってから押してください。
              </p>
            </div>
          )}

          {/* ── Android ── */}
          {phone !== "ios" && (
            <div className={`pf-os ${phone === "android" ? "is-mine" : ""}`}>
              <div className="pf-os-t">🤖 Android</div>
              <ol className="pf-steps">
                <li><b>設定 → Digital Wellbeing → フォーカスモード</b> を開く</li>
                <li>止めたいアプリ（上の一覧）に<b>チェック</b>を入れる</li>
                <li>「スケジュールの設定」で、作業する時間帯を入れておくと自動で止まる</li>
                <li><b>クイック設定</b>（画面上から下スワイプ）に
                  <b>フォーカスモード</b>のタイルを追加しておく → 以後1タップ</li>
              </ol>
              <p className="pf-note">
                ※ Galaxy なら「モードとルーチン」でも同じことができます（そちらのほうが細かく設定できます）。
              </p>
            </div>
          )}

          <p className="pf-tail">
            止めたあとは、<b>⚔ クエストに対峙する</b>で時間を決めて、1体ずつ倒していこう。
          </p>
        </div>
      )}
    </section>
  );
}
