// 清瀬リンク Side Panel — iframe 操作
// (Manifest V3 ではインラインスクリプト禁止のため別ファイル化)

const frame = document.getElementById("frame");

// 拡張ストレージから秘書名・アバターを取得してヘッダを差し替え
chrome.runtime.sendMessage({ type: "getState" }, (s) => {
  if (!s) return;
  const titleEl = document.querySelector(".header .name");
  if (titleEl) titleEl.textContent = s.secretaryName || "清瀬リンク";
  const av = document.querySelector(".header img");
  if (av && s.secretaryAvatarUrl && /^https?:\/\//.test(s.secretaryAvatarUrl)) {
    av.src = s.secretaryAvatarUrl;
  }
});

document.getElementById("btn-reload").addEventListener("click", () => {
  try {
    frame.contentWindow.location.reload();
  } catch {
    // クロスオリジンで contentWindow にアクセスできなければ src 再設定
    frame.src = frame.src;
  }
});

document.getElementById("btn-open").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://secretary-ai-next.vercel.app/" });
});

// iframe 読込失敗時のヒント
let loaded = false;
frame.addEventListener("load", () => { loaded = true; });
setTimeout(() => {
  if (!loaded) document.getElementById("hint").classList.add("show");
}, 8000);
