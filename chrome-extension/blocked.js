// Manifest V3 ではインラインスクリプト/onclick属性が禁止のため、別ファイル化

// ランダム引用
const quotes = [
  "気がそれた瞬間に気づけたのは、半分戻ってきたのと同じ",
  "5分の脱線は20分の戻り時間に化ける。今戻ろう。",
  "やってる作業が一番のドーパミン源だったの、忘れた？",
  "見たかったやつは、終わってからにしよう。逃げない。",
  "集中の波は20分かけて作る。今切ったらまた最初から。",
];
document.getElementById("quote").textContent =
  "「" + quotes[Math.floor(Math.random() * quotes.length)] + "」";

const params = new URLSearchParams(location.search);
const from = params.get("from");
if (from) {
  document.getElementById("from").textContent = "blocked: " + decodeURIComponent(from);
}

// ボタン
document.getElementById("btn-back").addEventListener("click", () => {
  window.history.back();
});

document.getElementById("btn-disable-focus").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "setFocus", value: false }, () => {
    location.reload();
  });
});

// 秘書名・アバターを設定から反映
chrome.runtime.sendMessage({ type: "getState" }, (s) => {
  if (!s) return;
  const av = document.querySelector("img.avatar");
  if (av && s.secretaryAvatarUrl && /^https?:\/\//.test(s.secretaryAvatarUrl)) {
    av.src = s.secretaryAvatarUrl;
    av.alt = s.secretaryName || "清瀬リンク";
  }
});
