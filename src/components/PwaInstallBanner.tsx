"use client";

import { useEffect, useState } from "react";

/**
 * 「ホーム画面に追加」の案内バナー。
 * - Android/PC Chrome：beforeinstallprompt を捕まえてワンタップ・インストール
 * - iOS Safari：ネイティブ導線が無いので「共有 → ホーム画面に追加」を絵で案内
 * - すでにインストール済み（standalone）や、閉じたあと（7日）は出さない
 */
const DISMISS_KEY = "pwa-install-dismissed-v1";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(navigator as any).standalone;
}

export function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);

  useEffect(() => {
    if (isStandalone()) return;              // もうアプリとして開いてる
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || "0");
      if (until && Date.now() < until) return; // 閉じてから7日は出さない
    } catch { /* ignore */ }

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", onBIP);

    if (isIOS()) { setIos(true); setShow(true); }

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 86400000)); } catch { /* ignore */ }
  }
  async function install() {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null); setShow(false);
  }

  if (!show) return null;

  return (
    <div className="pwa-banner" role="dialog" aria-label="アプリを追加">
      <img className="pwa-ico" src="/icon-192.png" alt="" />
      <div className="pwa-tx">
        <b>アプリとして追加</b>
        {ios
          ? <small>下の <span className="pwa-share">⬆️</span> 共有ボタン →「ホーム画面に追加」でアプリになるよ</small>
          : <small>ホーム画面に追加すると、通知も届いてサッと開けるよ</small>}
      </div>
      {!ios && deferred && <button className="pwa-add" onClick={install}>追加</button>}
      <button className="pwa-x" onClick={dismiss} aria-label="閉じる">×</button>
    </div>
  );
}
