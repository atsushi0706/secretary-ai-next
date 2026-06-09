// 清瀬リンク 集中モード — Popup

const $ = (id) => document.getElementById(id);

let timerInterval = null;

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function send(type, extra = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...extra }, (res) => resolve(res));
  });
}

async function render() {
  const s = await send("getState");
  if (!s) return;

  // 集中モードトグル
  $("focusToggle").checked = s.focusOn;
  $("focusStatus").textContent = s.focusOn ? "🎯 集中モード ON" : "OFF";
  $("focusStatus").classList.toggle("on", s.focusOn);

  // 設定
  $("tabLimit").value = s.tabLimit;
  $("pomoWork").value = s.pomoWorkMin;
  $("pomoBreak").value = s.pomoBreakMin;
  $("blockList").value = (s.blockList || []).join("\n");

  // ポモドーロ状態
  if (s.pomoState === "work") {
    $("pomoState").textContent = "🍅 集中タイム";
  } else if (s.pomoState === "break") {
    $("pomoState").textContent = "☕ 休憩タイム";
  } else {
    $("pomoState").textContent = "待機中";
  }
  updatePomoTimer(s);

  // 累積
  const min = Math.floor((s.todayFocusSec || 0) / 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  $("todayFocus").textContent = h > 0 ? `${h}h ${m}分` : `${m}分`;
}

function updatePomoTimer(s) {
  if (s.pomoState === "idle" || !s.pomoEndAt) {
    $("pomoTimer").textContent = "--:--";
    return;
  }
  const left = Math.max(0, Math.ceil((s.pomoEndAt - Date.now()) / 1000));
  $("pomoTimer").textContent = fmtTime(left);
}

// 1秒ごとにポモドーロ表示更新（popup 開いている時のみ）
function startTicker() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(async () => {
    const s = await send("getState");
    if (!s) return;
    updatePomoTimer(s);
    // 状態変化(work->break など) も popup で拾うため都度反映
    if (s.pomoState === "work") $("pomoState").textContent = "🍅 集中タイム";
    else if (s.pomoState === "break") $("pomoState").textContent = "☕ 休憩タイム";
    else $("pomoState").textContent = "待機中";
  }, 1000);
}

// イベント
document.addEventListener("DOMContentLoaded", async () => {
  await render();
  startTicker();

  $("focusToggle").addEventListener("change", async (e) => {
    await send("setFocus", { value: e.target.checked });
    await render();
  });

  $("saveSettings").addEventListener("click", async () => {
    const patch = {
      tabLimit: parseInt($("tabLimit").value, 10) || 4,
      pomoWorkMin: parseInt($("pomoWork").value, 10) || 25,
      pomoBreakMin: parseInt($("pomoBreak").value, 10) || 5,
    };
    await send("updateSettings", { patch });
    $("saveSettings").textContent = "✓ 保存しました";
    setTimeout(() => ($("saveSettings").textContent = "設定を保存"), 1200);
    await render();
  });

  $("saveBlock").addEventListener("click", async () => {
    const list = $("blockList").value
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    await send("updateSettings", { patch: { blockList: list } });
    $("saveBlock").textContent = "✓ 保存しました";
    setTimeout(() => ($("saveBlock").textContent = "リストを保存"), 1200);
    await render();
  });

  $("startPomo").addEventListener("click", async () => {
    await send("startPomo");
    await render();
  });

  $("stopPomo").addEventListener("click", async () => {
    await send("stopPomo");
    await render();
  });

  $("openSidePanel").addEventListener("click", async () => {
    // sidePanel.open() はユーザー操作起点でしか呼べないので popup 側で直接実行
    try {
      const win = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: win.id });
      window.close();
    } catch (e) {
      alert("サイドパネルを開けませんでした: " + (e?.message ?? String(e)) + "\n(Chrome 114 以降が必要)");
    }
  });
});
