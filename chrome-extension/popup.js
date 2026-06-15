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

function parseSchedule(text) {
  if (!text) return [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const slots = [];
  for (const line of lines) {
    let m = line.match(/^(\d{1,2}):(\d{2})\s*[-–〜~]\s*(\d{1,2}):(\d{2})\s+(.+)$/);
    if (m) {
      slots.push({
        startMin: parseInt(m[1], 10) * 60 + parseInt(m[2], 10),
        endMin: parseInt(m[3], 10) * 60 + parseInt(m[4], 10),
        task: m[5].trim(),
      });
      continue;
    }
    m = line.match(/^(\d{1,2}):(\d{2})\s+(.+)$/);
    if (m) {
      slots.push({
        startMin: parseInt(m[1], 10) * 60 + parseInt(m[2], 10),
        endMin: null,
        task: m[3].trim(),
      });
    }
  }
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].endMin === null) {
      slots[i].endMin = slots[i + 1] ? slots[i + 1].startMin : 24 * 60;
    }
  }
  return slots;
}
function fmtMin(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function updateSchedulePreview(text) {
  const preview = document.getElementById("schedulePreview");
  if (!preview) return;
  const slots = parseSchedule(text);
  if (slots.length === 0) {
    preview.innerHTML = `<div class="sp-empty">時間割なし。上のエリアに書いて「時間割を保存」を押してください</div>`;
    return;
  }
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const cur = slots.find((s) => nowMin >= s.startMin && nowMin < s.endMin);
  const nxt = slots.find((s) => s.startMin > nowMin);
  let html = "";
  if (cur) {
    html += `<div class="sp-now">▶ いま: ${cur.task}<br><span style="font-size:10px;font-weight:600;">${fmtMin(cur.startMin)}〜${fmtMin(cur.endMin)}</span></div>`;
  } else if (nxt) {
    html += `<div class="sp-now">次: ${nxt.task}<br><span style="font-size:10px;font-weight:600;">${fmtMin(nxt.startMin)}〜</span></div>`;
  } else {
    html += `<div class="sp-empty">今は時間割の範囲外</div>`;
  }
  html += `<div class="sp-next">全 ${slots.length} スロット保存済み</div>`;
  preview.innerHTML = html;
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
  $("pomoPrep").value = s.pomoPrepSec;
  $("pomoBreak").value = s.pomoBreakMin;
  $("blockList").value = (s.blockList || []).join("\n");
  $("scheduleText").value = s.scheduleText || "";
  updateSchedulePreview(s.scheduleText || "");

  // ポモドーロ状態
  if (s.pomoState === "work") {
    $("pomoState").textContent = "🍅 集中タイム";
  } else if (s.pomoState === "prep") {
    $("pomoState").textContent = "✋ 休む準備";
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
    if (s.pomoState === "work") $("pomoState").textContent = "🍅 集中タイム";
    else if (s.pomoState === "prep") $("pomoState").textContent = "✋ 休む準備";
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
      pomoWorkMin: parseInt($("pomoWork").value, 10) || 30,
      pomoPrepSec: parseInt($("pomoPrep").value, 10) || 30,
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

  $("saveSchedule").addEventListener("click", async () => {
    await send("updateSettings", { patch: { scheduleText: $("scheduleText").value } });
    $("saveSchedule").textContent = "✓ 保存しました";
    setTimeout(() => ($("saveSchedule").textContent = "時間割を保存"), 1200);
    await render();
  });

  // テキストエリアの編集中もリアルタイムでプレビュー更新
  $("scheduleText").addEventListener("input", () => {
    updateSchedulePreview($("scheduleText").value);
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
