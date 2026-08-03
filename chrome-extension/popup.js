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

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateSchedulePreview(text) {
  const preview = document.getElementById("schedulePreview");
  if (!preview) return;
  const slots = parseSchedule(text);
  if (slots.length === 0) {
    preview.innerHTML = `<div class="sp-empty">パースできた行が0件。形式: <code>HH:MM-HH:MM タスク名</code></div>`;
    return;
  }
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const cur = slots.find((s) => nowMin >= s.startMin && nowMin < s.endMin);
  const nxt = slots.find((s) => s.startMin > nowMin);
  let html = "";
  if (cur) {
    html += `<div class="sp-now">▶ いま: ${escHtml(cur.task)}<br><span style="font-size:10px;font-weight:600;">${fmtMin(cur.startMin)}〜${fmtMin(cur.endMin)}</span></div>`;
  } else if (nxt) {
    html += `<div class="sp-now">次: ${escHtml(nxt.task)}<br><span style="font-size:10px;font-weight:600;">${fmtMin(nxt.startMin)}〜</span></div>`;
  } else {
    html += `<div class="sp-empty">いま ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")} は時間割の範囲外</div>`;
  }
  html += `<div class="sp-next">全 ${slots.length} スロット解析OK</div>`;
  preview.innerHTML = html;
}

const SAMPLE_SCHEDULE = `10:00-12:00 動画作業
13:00-15:00 LP原稿
15:30-17:00 撮影準備`;

function avatarSrcFromState(s) {
  if (s?.secretaryAvatarUrl && /^https?:\/\//.test(s.secretaryAvatarUrl)) {
    return s.secretaryAvatarUrl;
  }
  return "icons/icon128.png";
}

/** モードの見た目を切り替える（勝手にタイマーが始まるのは force のときだけ） */
function renderMode(mode) {
  document.querySelectorAll(".mode-tab").forEach((b) => {
    b.classList.toggle("on", b.dataset.mode === mode);
  });
  // CSS で .pane { display:none } にしてあるので、"" に戻すと消えたままになる。必ず block を入れる
  $("questPane").style.display = mode === "quest" ? "block" : "none";
  $("forcePane").style.display = mode === "force" ? "block" : "none";
}

/** 前に退治したモンスターを、1タップで選べるように並べる */
function renderMonsters(list) {
  const box = $("monsterList");
  if (!box) return;
  box.innerHTML = "";
  for (const name of list) {
    const b = document.createElement("button");
    b.className = "monster";
    b.textContent = name;
    b.title = "これを退治する";
    b.addEventListener("click", () => { $("questName").value = name; });
    box.appendChild(b);
  }
}

async function render() {
  const s = await send("getState");
  if (!s) return;
  // ヘッダの秘書名 & アバター
  const titleEl = document.querySelector(".header .title");
  if (titleEl) titleEl.textContent = s.secretaryName || "清瀬リンク";
  const avEl = document.querySelector(".header .avatar");
  if (avEl) avEl.src = avatarSrcFromState(s);

  // 集中モードトグル
  $("focusToggle").checked = s.focusOn;
  $("focusStatus").textContent = s.focusOn ? "🎯 集中モード ON" : "OFF";
  $("focusStatus").classList.toggle("on", s.focusOn);

  // いまの一言（自分で書く。カードに出る）
  if (document.activeElement !== $("nowLabel")) $("nowLabel").value = s.nowLabel || "";

  // タイマーのモード
  renderMode(s.timerMode || "quest");
  $("questMin").value = s.questMin || 30;
  renderMonsters(s.monsters || []);

  // 設定
  $("tabLimit").value = s.tabLimit;
  $("pomoWork").value = s.pomoWorkMin;
  $("pomoPrep").value = s.pomoPrepSec;
  $("pomoBreak").value = s.pomoBreakMin;
  $("blockList").value = (s.blockList || []).join("\n");
  // scheduleText が空ならサンプルを表示。本物の入力なのでそのまま保存できる
  const effectiveSchedule = s.scheduleText && s.scheduleText.trim() ? s.scheduleText : SAMPLE_SCHEDULE;
  $("scheduleText").value = effectiveSchedule;
  updateSchedulePreview(effectiveSchedule);

  // 時間割の保存日付を表示。今日でなければ赤く警告
  const info = document.getElementById("scheduleDateInfo");
  if (info) {
    if (s.scheduleText && s.scheduleDate) {
      const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })();
      const isStale = s.scheduleDate !== todayStr;
      info.textContent = isStale
        ? `⚠ ${s.scheduleDate} に保存されたまま (今日ではない)`
        : `${s.scheduleDate} に保存`;
      info.classList.toggle("stale", isStale);
    } else {
      info.textContent = "";
      info.classList.remove("stale");
    }
  }

  // 倒した数
  $("todayDefeated").textContent = String(s.todayDefeated || 0);

  // ポモドーロ状態
  if (s.pomoState === "quest") {
    $("pomoState").textContent = `⚔ ${s.questName || "退治"}中`;
  } else if (s.pomoState === "work") {
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
    if (s.pomoState === "quest") $("pomoState").textContent = `⚔ ${s.questName || "退治"}中`;
    else if (s.pomoState === "work") $("pomoState").textContent = "🍅 集中タイム";
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
    const val = $("scheduleText").value;
    console.log("[kiyose] saveSchedule. length=" + val.length, val.slice(0, 80));
    await send("updateSettings", { patch: { scheduleText: val } });
    $("saveSchedule").textContent = "✓ 保存しました (" + val.length + "文字)";
    setTimeout(() => ($("saveSchedule").textContent = "時間割を保存"), 2000);
    await render();
  });

  // テキストエリアの編集中もリアルタイムでプレビュー更新
  $("scheduleText").addEventListener("input", () => {
    updateSchedulePreview($("scheduleText").value);
  });

  // 時間割をクリア
  $("clearSchedule").addEventListener("click", async () => {
    if (!confirm("時間割をクリアする？")) return;
    await send("updateSettings", { patch: { scheduleText: "" } });
    await render();
  });

  // いまの一言（書いたら全タブのカードに出る）
  let nowTimer = null;
  $("nowLabel").addEventListener("input", () => {
    if (nowTimer) clearTimeout(nowTimer);
    nowTimer = setTimeout(async () => {
      await send("updateSettings", { patch: { nowLabel: $("nowLabel").value } });
    }, 500);
  });
  $("clearNow").addEventListener("click", async () => {
    $("nowLabel").value = "";
    await send("updateSettings", { patch: { nowLabel: "" } });
    await render();
  });

  // モードの切り替え
  document.querySelectorAll(".mode-tab").forEach((b) => {
    b.addEventListener("click", async () => {
      const mode = b.dataset.mode;
      renderMode(mode);
      await send("updateSettings", { patch: { timerMode: mode } });
    });
  });

  // 時間のボタン
  document.querySelectorAll(".min-btn").forEach((b) => {
    b.addEventListener("click", () => { $("questMin").value = b.dataset.min; });
  });

  // モンスター退治を始める
  $("startQuest").addEventListener("click", async () => {
    const name = $("questName").value.trim();
    if (!name) { $("questName").focus(); return; }
    await send("startQuest", { name, minutes: parseInt($("questMin").value, 10) || 30 });
    $("questName").value = "";
    await render();
  });
  $("questName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("startQuest").click();
  });

  $("startPomo").addEventListener("click", async () => {
    await send("startPomo");
    await render();
  });

  $("stopPomo").addEventListener("click", async () => {
    await send("stopPomo");
    await render();
  });

});
