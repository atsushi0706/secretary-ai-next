"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * 「ホーム画面に追加」の案内バナー。
 * - Android/PC Chrome：beforeinstallprompt を捕まえてワンタップ・インストール
 * - iOS Safari：ネイティブ導線が無いので「共有 → ホーム画面に追加」を絵で案内
 * - すでにインストール済み（standalone）や、閉じたあと（7日）は出さない
 */
const DISMISS_KEY = "pwa-install-dismissed-v1";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<unknown>;
};
type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function isDismissed(): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || "0");
    return Boolean(until && Date.now() < until);
  } catch { return false; }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as NavigatorWithStandalone).standalone === true;
}
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(navigator as NavigatorWithStandalone).standalone;
}

export function PwaInstallBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;              // もうアプリとして開いてる
    if (isDismissed()) return;                // 閉じてから7日は出さない

    const onBIP = (e: Event) => {
      e.preventDefault();
      // 待機中のイベントが、閉じた後に再度バナーを出さないよう毎回確認する。
      if (isDismissed()) return;
      setDeferred(e as InstallPromptEvent); setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const iosTimer = isIOS() ? window.setTimeout(() => { setIos(true); setShow(true); }, 0) : undefined;

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      if (iosTimer !== undefined) window.clearTimeout(iosTimer);
    };
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

  // 学習中の主要操作を覆わない。追加案内は一覧・ホーム側だけで出す。
  if (!show || pathname.startsWith("/learn") || pathname.startsWith("/dev/learn")) return null;

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
