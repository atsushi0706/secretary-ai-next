"use client";
import { useEffect } from "react";

// 既存の Service Worker が古いHTML/JSをキャッシュして表示できなくなる事象が
// あったため、SW を全アンレジスト + 全キャッシュ削除する処理に切り替えた。
// 新規 SW は register しない (素のサイトとして動かす)。
export function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    (async () => {
      try {
        // 既存登録を全アンレジスト
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          try { await r.unregister(); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      try {
        // 念のためキャッシュも全削除
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch { /* ignore */ }
    })();
  }, []);
  return null;
}
