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
  const [authLost, setAuthLost] = useState(false);
  const [netErr, setNetErr] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    fetch("/api/push/subscribe").then(async (r) => {
      // 401（ログインが切れている）を「サーバ未設定」と取り違えないよう分けて扱う。
      // ドメイン移行でセッションが切れていたとき、鍵はあるのに「準備中」と誤表示されていた。
      if (r.status === 401) { setAuthLost(true); setConfigured(false); return; }
      const d = await r.json();
      setConfigured(!!d.configured);
      setPublicKey(d.publicKey ?? null);
      setSubscribed(!!d.subscribed);
      if (d.has) {
        const miss: string[] = [];
        if (!d.has.pub) miss.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
        if (!d.has.priv) miss.push("VAPID_PRIVATE_KEY");
        setMissing(miss);
      }
    }).catch(() => { setNetErr(true); setConfigured(false); });
  }, []);

  async function enable() {
    setBusy(true); setMsg("");
    try {
      if (!publicKey) throw new Error("公開鍵が取得できませんでした");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setMsg("通知が許可されませんでした。ブラウザ設定から許可してね。"); return; }
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      // 古い鍵で作られた購読が残っていると、ブラウザは新しい鍵で作り直せずに失敗する
      //（403 "credentials do not correspond"）。だから先に必ず捨てる。
      try {
        const old = await reg.pushManager.getSubscription();
        if (old) {
          await fetch("/api/push/subscribe", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: old.endpoint }),
          }).catch(() => {});
          await old.unsubscribe();
        }
      } catch { /* 消せなくても、この下で作り直しを試す */ }
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
      if (d.sent > 0) { setMsg("送ったよ！数秒で届くはず。"); return; }
      // 送れなかった理由を隠さない（以前は全部「購読が見つからなかった」と出していた）
      if (!d.found) setMsg("この端末の登録が見つからない。一度OFF→ONし直してみて。");
      else setMsg(`登録は${d.found}件あるのに送れなかった。理由：${(d.errors ?? []).join(" / ") || "不明"}`);
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
  if (authLost) {
    return (
      <p className="text-xs text-red-600">
        ログインが切れているみたい。一度ログインし直すと、ここに通知のONボタンが出るよ。
      </p>
    );
  }
  if (netErr) {
    return <p className="text-xs text-red-600">通知の状態を確認できなかった。ページを再読み込みしてみて。</p>;
  }
  if (!configured) {
    return (
      <div className="text-xs text-gray-600 leading-relaxed space-y-1">
        <p className="text-red-600 font-bold">通知の鍵がサーバから見えていません。</p>
        {missing.length > 0 && (
          <p>
            足りないもの：<br />
            {missing.map((m) => <span key={m} className="font-mono text-[10px] break-all block">・{m}</span>)}
          </p>
        )}
        <p className="text-gray-500">
          Vercel の Environment Variables に、上の名前で登録されているか／
          <b>Production</b> にチェックが入っているかを確認してね。
          追加・変更したあとは <b>Redeploy</b> が必要です。
        </p>
      </div>
    );
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
