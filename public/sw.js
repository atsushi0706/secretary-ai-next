// 何もしない Service Worker (self-cleanup 専用).
//
// 経緯: 昔のバージョンで登録された SW が /_next/static/ をキャッシュしていて、
// デプロイのたびに "This page couldn't load" が発生していた。
//
// 一度 /sw.js を 404 にする方針を取ったが、既存クライアントの SW が
// 404 になった時点で「更新失敗」判定になり、古いキャッシュを持ったまま
// ゾンビ化するパターンが観測された。
//
// なので、SW を「返しはするが、fetch を全部素通り + 全キャッシュ削除 + 自己 unregister」
// する超軽量な安全版に差し替える。Chrome が /sw.js の更新を検知すると即このバージョンに
// 置き換わり、次のロードで自己消滅する。

self.addEventListener("install", (event) => {
  // 待機せず即アクティベート
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // 全キャッシュ削除
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* ignore */ }
    // クライアントを掌握 (今開いてるタブを含む)
    try { await self.clients.claim(); } catch { /* ignore */ }
    // 自分自身を unregister
    try { await self.registration.unregister(); } catch { /* ignore */ }
    // すべての開いているタブを reload (最新の HTML/JS を取り直す)
    try {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clients) {
        try { c.navigate(c.url); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  })());
});

// fetch handler 「なし」 = ブラウザは通常のネットワーク fetch を使う (SW は素通り)
