"use client";

import { useEffect, useState } from "react";

/**
 * ブラウザ・プッシュ通知のON/OFF。
 * - VAPID未設定なら「準備中」を出すだけ（壊れない）。
 * - ONにすると push-sw.js を登録して購読、サーバに保存。
 * - iOS はホーム画面に追加（PWA化）した後でないと通知が許可できない点に注意書きを出す。
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    fetch("/api/push/subscribe").then((r) => r.json()).then((d) => {
      setConfigured(!!d.configured);
      setPublicKey(d.publicKey ?? null);
      setSubscribed(!!d.subscribed);
    }).catch(() => setConfigured(false));
  }, []);

  async function enable() {
    setBusy(true); setMsg("");
    try {
      if (!publicKey) throw new Error("公開鍵が取得できませんでした");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setMsg("通知が許可されませんでした。ブラウザ設定から許可してね。"); return; }
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const r = await fetch("/api/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setSubscribed(true);
      setMsg("通知をONにしたよ😊");
    } catch (e: any) {
      setMsg(`ONにできなかった: ${String(e?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true); setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("通知をOFFにしたよ。");
    } catch (e: any) {
      setMsg(`OFFにできなかった: ${String(e?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/push/test", { method: "POST" });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMsg(d.sent > 0 ? "送ったよ！数秒で届くはず。" : "購読が見つからなかった。一度OFF→ONしてみて。");
    } catch (e: any) {
      setMsg(`送信できなかった: ${String(e?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (configured === null) return null; // 読み込み中
  if (!supported) {
    return <p className="text-xs text-gray-500">このブラウザはプッシュ通知に対応していません。</p>;
  }
  if (!configured) {
    return <p className="text-xs text-gray-500">プッシュ通知は準備中です（サーバ側の設定待ち）。</p>;
  }

  return (
    <div className="space-y-2">
      {!subscribed ? (
        <button
          type="button" onClick={enable} disabled={busy}
          className="bg-[var(--accent)] text-white font-bold text-sm py-2 px-4 rounded-lg disabled:opacity-50"
        >
          🔔 通知をONにする
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-green-600 text-sm font-bold">🔔 通知ON ✓</span>
          <button type="button" onClick={test} disabled={busy}
            className="text-xs border border-purple-200 text-purple-700 rounded-lg px-3 py-1.5 disabled:opacity-50">
            テスト通知を送る
          </button>
          <button type="button" onClick={disable} disabled={busy}
            className="text-xs text-gray-500 underline">
            OFFにする
          </button>
        </div>
      )}
      {msg && <div className="text-xs text-gray-600">{msg}</div>}
      <p className="text-xs text-gray-400 leading-relaxed">
        ※ iPhoneは「共有 → ホーム画面に追加」でアプリ化してから開くと通知をONにできます。
      </p>
    </div>
  );
}
