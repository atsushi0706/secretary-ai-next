"use client";

import { useEffect, useState } from "react";
import { PushToggle } from "./PushToggle";

/**
 * 初回の説明書でやる「ホーム画面に追加」と「通知」。
 *
 * 【なぜ、いちばん最初にやるか】
 * この2つを後回しにすると、まず戻ってこない。
 * ・ホーム画面に無いと、次の日ここへ来る道が無い
 * ・通知が無いと、朝の手引きも夜のふりかえりも届かない
 * だから主人公を決める前に、ここで済ませてしまう。
 *
 * 【iPhone だけ順番が決まっている】
 * Safari は「ホーム画面に追加」してからでないと通知を許可できない。
 * だから iPhone では、追加が済むまで通知の入口を出さない
 * （押せないボタンを見せて「押しても何も起きない」をやらせない）。
 */

type Device = "iphone" | "android" | "pc";

function detect(): Device {
  if (typeof navigator === "undefined") return "pc";
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua)
    // iPadOS は Mac を名乗るので、タッチの有無で見分ける
    || (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
  if (iOS) return "iphone";
  if (/Android/.test(ua)) return "android";
  return "pc";
}

/** すでにホーム画面（アプリとして）から開いているか */
function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches
    || (navigator as any).standalone === true;
}

export function InstallAndNotify() {
  const [device, setDevice] = useState<Device>("pc");
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<any>(null);   // Android/PC の「インストール」ダイアログ
  const [added, setAdded] = useState(false);          // 本人が「追加した」と押した
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDevice(detect());
    setInstalled(isInstalled());
    setReady(true);
    // Android/Chrome・PC は、ブラウザ自身がインストールを出せる
    const onPrompt = (e: any) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => { setInstalled(true); setAdded(true); };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!ready) return null;

  const done = installed || added;
  // iPhone は追加してからでないと通知を許可できない
  const canNotify = device !== "iphone" || done;

  return (
    <div className="ian">
      {/* ① ホーム画面に追加 */}
      <div className={`ian-box ${done ? "is-done" : ""}`}>
        <div className="ian-t">
          <span className="ian-n">1</span>
          ホーム画面に追加する
          {done && <span className="ian-ok">できてる ✓</span>}
        </div>

        {installed ? (
          <p className="ian-p">
            <b>もうアプリとして開けています。</b>次に進んで大丈夫です。
          </p>
        ) : (
          <>
            <p className="ian-p">
              追加しておくと、<b>次からアイコンを押すだけ</b>で入れます。<br />
              ブラウザのタブを探さなくてよくなります。
              {device === "iphone" && <><br /><b>iPhoneは、追加しないと通知が受け取れません。</b></>}
            </p>

            {device === "iphone" && (
              <ol className="ian-steps">
                <li>下の <b>共有ボタン</b>（□に↑）を押す</li>
                <li>メニューを下にスクロールして <b>「ホーム画面に追加」</b></li>
                <li>右上の <b>「追加」</b> を押す</li>
                <li><b>ホーム画面のアイコンから開き直す</b>（ここが大事）</li>
              </ol>
            )}
            {device === "android" && (
              prompt ? (
                <button className="ian-go" onClick={async () => {
                  try { prompt.prompt(); const r = await prompt.userChoice;
                    if (r?.outcome === "accepted") setAdded(true); } catch { /* 閉じられただけ */ }
                  setPrompt(null);
                }}>
                  📲 ホーム画面に追加する
                </button>
              ) : (
                <ol className="ian-steps">
                  <li>右上の <b>⋮</b>（3つの点）を押す</li>
                  <li><b>「アプリをインストール」</b>か<b>「ホーム画面に追加」</b>を選ぶ</li>
                  <li><b>「インストール」</b>を押す</li>
                </ol>
              )
            )}
            {device === "pc" && (
              prompt ? (
                <button className="ian-go" onClick={async () => {
                  try { prompt.prompt(); const r = await prompt.userChoice;
                    if (r?.outcome === "accepted") setAdded(true); } catch { /* 閉じられただけ */ }
                  setPrompt(null);
                }}>
                  🖥 アプリとして入れる
                </button>
              ) : (
                <ol className="ian-steps">
                  <li>アドレスバーの右にある <b>⊞</b>（インストール）を押す</li>
                  <li>出てこないときは <b>⋮ → キャストと保存と共有 → ページをアプリとしてインストール</b></li>
                </ol>
              )
            )}

            {!done && (
              <button className="ian-did" onClick={() => setAdded(true)}>
                追加しました（次へ進む）
              </button>
            )}
            <p className="ian-skip" onClick={() => setAdded(true)}>
              あとでもいい方は、ここを押して先へ
            </p>
          </>
        )}
      </div>

      {/* ② 通知 */}
      <div className="ian-box">
        <div className="ian-t"><span className="ian-n">2</span>通知を受け取る</div>
        <p className="ian-p">
          1日3回、<b>朝6:30・昼12:00・夜20:00</b>に相棒から声がかかります。<br />
          朝の手引き、夜のふりかえり、週のお便りも、ここから届きます。<br />
          <span className="ian-sub">別のアプリを入れる必要はありません。あとから切ることもできます。</span>
        </p>

        {canNotify ? (
          <div className="ian-toggle"><PushToggle /></div>
        ) : (
          <p className="ian-lock">
            🔒 iPhoneは、<b>先にホーム画面へ追加</b>してからでないと通知を許可できません。<br />
            上の手順のあと、<b>ホーム画面のアイコンから開き直す</b>と、ここにボタンが出ます。
          </p>
        )}
      </div>
    </div>
  );
}
