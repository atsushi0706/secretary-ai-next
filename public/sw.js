// 秘書AI Service Worker — 自己アンレジスト版
//
// 以前のバージョンが /_next/static/ を勝手にキャッシュしていたため、
// デプロイ後にユーザー側で古いHTML/JSが返されて「This page couldn't load」が出る
// 事象があった。当面 SW を切り、各クライアントの古いキャッシュを全消ししてから
// 自身を unregister する形に切り替える。
//
// Push 通知は ntfy で代替している（拡張機能側のポモドーロ通知含む）。

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      // 全キャッシュ削除
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* ignore */ }
    try {
      // 自身を unregister
      await self.registration.unregister();
    } catch (e) { /* ignore */ }
    // すべての開いているクライアントを再読み込み (新しいページに切り替わる)
    try {
      const clients = await self.clients.matchAll({ type: "window" });
      for (const c of clients) {
        try { c.navigate(c.url); } catch { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  })());
});

// fetch ハンドラなし → 何もインターセプトしない (素通り)
