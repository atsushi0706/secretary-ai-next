/* プッシュ通知専用の Service Worker。
   注意: fetch は一切ハンドルしない（過去に _next キャッシュで事故ったため、通知だけに徹する）。
   /sw.js（自己消滅版）とは別ファイル。SWRegister はこの push-sw.js だけ残す。 */

self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "清瀬リンク";
  const options = {
    body: data.body || "",
    icon: data.icon || "/kiyose.png",
    badge: data.badge || "/kiyose.png",
    data: { url: data.url || "/" },
    tag: data.tag || undefined,
    renotify: !!data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) { try { client.navigate(target); } catch (e) {} return client.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
