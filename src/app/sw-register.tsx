"use client";
import { useEffect } from "react";

/**
 * 既存の Service Worker を強制退場させる client hook。
 *
 * 経緯:
 * 昔のバージョンで登録された SW が /_next/static/ 等をキャッシュしていて、
 * デプロイのたびに「This page couldn't load」が頻発する事象があった。
 * /public/sw.js は削除済みなので、新規登録は行わない。
 *
 * ここでやってること:
 * 1. 登録済みの SW を全て unregister
 * 2. すべての Cache Storage を削除
 * 3. もし SW が居たら一度だけリロード (次回からは SW なしで動く)
 */
export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    (async () => {
      let hadSw = false;
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          // プッシュ通知用の SW (push-sw.js) は残す。昔の問題SW(sw.js等)だけ退場させる。
          const url = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || "";
          if (url.endsWith("/push-sw.js")) continue;
          hadSw = true;
          try { await r.unregister(); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }

      try {
        if ("caches" in window) {
          // 自前のキャッシュ(音声TTS)は消さない。昔の _next キャッシュだけ掃除。
          const KEEP = new Set(["iw-tts-v1"]);
          const keys = await caches.keys();
          await Promise.all(keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k)));
        }
      } catch { /* ignore */ }

      // SW があった場合のみ、フラグを立てて一度リロード
      // (既に SW なしで動いてるユーザーは不要にリロードしない)
      if (hadSw) {
        const KEY = "kiyose_sw_purge_reloaded_v1";
        if (!sessionStorage.getItem(KEY)) {
          sessionStorage.setItem(KEY, "1");
          location.reload();
        }
      }
    })();
  }, []);
  return null;
}
