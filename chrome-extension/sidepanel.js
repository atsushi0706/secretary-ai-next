// 清瀬リンク Side Panel — iframe 操作
// (Manifest V3 ではインラインスクリプト禁止のため別ファイル化)

const frame = document.getElementById("frame");

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
