// 全ページの右下に小さなタイマーバッジを表示する content script。
// ポモドーロ状態を 1秒おきに background から取得して描画する。

(() => {
  // iframe 内では出さない（埋め込み広告等で重複しないように）
  if (window.top !== window.self) return;

  let badge = null;
  let pipWindow = null;
  let tickerId = null;
  let dragOffset = null;
  const POS_KEY = "kiyose_timer_pos";

  function fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function createBadge() {
    if (badge) return;
    badge = document.createElement("div");
    badge.id = "kiyose-timer-badge";
    badge.innerHTML = `
      <img class="ktb-avatar" alt="" />
      <div class="ktb-body">
        <div class="ktb-state">--</div>
        <div class="ktb-time">--:--</div>
      </div>
      <div class="ktb-actions">
        <button class="ktb-pip" title="別ウィンドウで表示">📺</button>
        <button class="ktb-min" title="最小化">_</button>
        <button class="ktb-close" title="非表示">×</button>
      </div>
    `;
    badge.querySelector(".ktb-avatar").src = chrome.runtime.getURL("icons/icon128.png");
    document.documentElement.appendChild(badge);

    // 保存位置を復元
    try {
      const pos = JSON.parse(localStorage.getItem(POS_KEY) || "null");
      if (pos && typeof pos.top === "number" && typeof pos.left === "number") {
        badge.style.top = `${pos.top}px`;
        badge.style.left = `${pos.left}px`;
        badge.style.right = "auto";
        badge.style.bottom = "auto";
      }
    } catch { /* ignore */ }

    // ドラッグ移動
    badge.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      const rect = badge.getBoundingClientRect();
      dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      badge.classList.add("dragging");
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragOffset) return;
      const left = Math.max(0, Math.min(window.innerWidth - 50, e.clientX - dragOffset.x));
      const top = Math.max(0, Math.min(window.innerHeight - 30, e.clientY - dragOffset.y));
      badge.style.left = `${left}px`;
      badge.style.top = `${top}px`;
      badge.style.right = "auto";
      badge.style.bottom = "auto";
    });
    document.addEventListener("mouseup", () => {
      if (!dragOffset) return;
      dragOffset = null;
      badge.classList.remove("dragging");
      // 位置を保存
      const rect = badge.getBoundingClientRect();
      try {
        localStorage.setItem(POS_KEY, JSON.stringify({ top: rect.top, left: rect.left }));
      } catch { /* ignore */ }
    });

    // ボタン
    badge.querySelector(".ktb-pip").addEventListener("click", openPip);
    badge.querySelector(".ktb-min").addEventListener("click", () => {
      badge.classList.toggle("minimized");
    });
    badge.querySelector(".ktb-close").addEventListener("click", () => {
      badge.style.display = "none";
      // 次のティックで状態が work/break ならまた表示
    });
  }

  function removeBadge() {
    if (badge) { badge.remove(); badge = null; }
  }

  async function openPip() {
    if (!("documentPictureInPicture" in window)) {
      alert("お使いの Chrome は Picture-in-Picture API 未対応です（Chrome 116+ が必要）");
      return;
    }
    try {
      pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 240,
        height: 140,
      });
      // PiP 用のスタイルを差し込み
      const link = pipWindow.document.createElement("link");
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("content.css");
      pipWindow.document.head.appendChild(link);

      const root = pipWindow.document.createElement("div");
      root.className = "kiyose-pip-root";
      root.innerHTML = `
        <div class="kiyose-pip-state">--</div>
        <div class="kiyose-pip-time">--:--</div>
        <div class="kiyose-pip-hint">ドラッグで移動・×で閉じる</div>
      `;
      pipWindow.document.body.style.margin = "0";
      pipWindow.document.body.appendChild(root);

      pipWindow.addEventListener("pagehide", () => { pipWindow = null; });
    } catch (e) {
      console.error("openPip failed", e);
    }
  }

  async function tick() {
    try {
      const s = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "getState" }, (res) => {
          if (chrome.runtime.lastError) { resolve(null); return; }
          resolve(res);
        });
      });
      if (!s) return;
      const running = s.pomoState === "work" || s.pomoState === "break";
      if (!running) {
        removeBadge();
        if (pipWindow) {
          try { pipWindow.close(); } catch {}
          pipWindow = null;
        }
        return;
      }
      createBadge();
      const left = Math.max(0, Math.ceil((s.pomoEndAt - Date.now()) / 1000));
      const stateLabel = s.pomoState === "work" ? "🍅 集中中" : "☕ 休憩中";
      const timeText = fmt(left);

      // 閉じてた人がもし表示できるよう、display を解除
      if (badge.style.display === "none" && document.visibilityState === "visible") {
        // ユーザーが × で閉じた場合は次の状態切替まで再表示しない方が良いかも
        // → ただ淳くんは「常に小さく見える」と言っていたので、display none は新状態で復活させる
      }

      badge.classList.toggle("work", s.pomoState === "work");
      badge.classList.toggle("break", s.pomoState === "break");
      badge.querySelector(".ktb-state").textContent = stateLabel;
      badge.querySelector(".ktb-time").textContent = timeText;

      // PiP も更新
      if (pipWindow && !pipWindow.closed) {
        const root = pipWindow.document.querySelector(".kiyose-pip-root");
        if (root) {
          root.classList.toggle("break", s.pomoState === "break");
          root.querySelector(".kiyose-pip-state").textContent = stateLabel;
          root.querySelector(".kiyose-pip-time").textContent = timeText;
        }
      }
    } catch (e) {
      // service worker が眠っていることがある → 次のティックで復帰
    }
  }

  // 1秒ごとに更新
  tickerId = setInterval(tick, 1000);
  tick();
})();
