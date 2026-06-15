// 全ページの右下に小さなタイマーバッジ + 「いま何をやる」スロット表示する content script
// + 状態遷移時の「ピピッ」音再生

(() => {
  if (window.top !== window.self) return;

  // 診断: F12 Console で "kiyose-timer" 検索すれば動いているか確認できる
  const DEBUG_TAG = "[kiyose-timer]";
  console.log(`${DEBUG_TAG} loaded on ${location.href}`);

  let badge = null;
  let pipWindow = null;
  let dragOffset = null;
  let lastPomoState = null;
  let lastCurrentSlotTask = null;
  const POS_KEY = "kiyose_timer_pos";
  const BEEP_LOCK_KEY = "kiyose_beep_lock";

  function fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // ─── 音 (Web Audio API でピピッ) ───
  function beep(freq, duration, gainVal = 0.25) {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(gainVal, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
      o.start();
      o.stop(ctx.currentTime + duration / 1000 + 0.02);
      setTimeout(() => ctx.close(), duration + 200);
    } catch (e) { /* ignore */ }
  }

  function pipi() {
    // 複数タブで一斉に鳴るのを防ぐためのロック (1秒以内の重複は無視)
    try {
      const last = parseInt(localStorage.getItem(BEEP_LOCK_KEY) || "0", 10);
      if (Date.now() - last < 1500) return;
      localStorage.setItem(BEEP_LOCK_KEY, String(Date.now()));
    } catch { /* ignore */ }
    // タブが見えてないなら鳴らさない (アクティブタブだけ)
    if (document.visibilityState !== "visible") return;
    beep(880, 150);
    setTimeout(() => beep(1320, 220), 200);
  }

  // ─── 時間割パース ───
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
    // endMin 無いものは次のslotの startMin で埋める
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].endMin === null) {
        slots[i].endMin = slots[i + 1] ? slots[i + 1].startMin : 24 * 60;
      }
    }
    return slots;
  }

  function currentSlot(slots) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (const s of slots) {
      if (nowMin >= s.startMin && nowMin < s.endMin) return s;
    }
    return null;
  }
  function nextSlot(slots) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return slots.find((s) => s.startMin > nowMin) ?? null;
  }
  function fmtMinHHMM(m) {
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }

  function createBadge() {
    if (badge) return;
    badge = document.createElement("div");
    badge.id = "kiyose-timer-badge";
    badge.innerHTML = `
      <img class="ktb-avatar" alt="" />
      <div class="ktb-body">
        <div class="ktb-now"></div>
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

    try {
      const pos = JSON.parse(localStorage.getItem(POS_KEY) || "null");
      if (pos && typeof pos.top === "number" && typeof pos.left === "number") {
        badge.style.top = `${pos.top}px`;
        badge.style.left = `${pos.left}px`;
        badge.style.right = "auto";
        badge.style.bottom = "auto";
      }
    } catch { /* ignore */ }

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
      const rect = badge.getBoundingClientRect();
      try {
        localStorage.setItem(POS_KEY, JSON.stringify({ top: rect.top, left: rect.left }));
      } catch { /* ignore */ }
    });

    badge.querySelector(".ktb-pip").addEventListener("click", openPip);
    badge.querySelector(".ktb-min").addEventListener("click", () => {
      badge.classList.toggle("minimized");
    });
    badge.querySelector(".ktb-close").addEventListener("click", () => {
      badge.style.display = "none";
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
        width: 280, height: 180,
      });
      const link = pipWindow.document.createElement("link");
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("content.css");
      pipWindow.document.head.appendChild(link);

      const root = pipWindow.document.createElement("div");
      root.className = "kiyose-pip-root";
      root.innerHTML = `
        <div class="kiyose-pip-now" style="font-size:13px;opacity:.95;margin-bottom:4px;"></div>
        <div class="kiyose-pip-state">--</div>
        <div class="kiyose-pip-time">--:--</div>
        <div class="kiyose-pip-hint">右下バッジと同期</div>
      `;
      pipWindow.document.body.style.margin = "0";
      pipWindow.document.body.appendChild(root);

      pipWindow.addEventListener("pagehide", () => { pipWindow = null; });
    } catch (e) {
      console.error("openPip failed", e);
    }
  }

  let firstTickReported = false;
  async function tick() {
    let s = null;
    try {
      s = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "getState" }, (res) => {
          if (chrome.runtime.lastError) {
            console.warn(`${DEBUG_TAG} sendMessage failed:`, chrome.runtime.lastError.message);
            resolve(null);
            return;
          }
          resolve(res);
        });
      });
    } catch (e) {
      console.warn(`${DEBUG_TAG} tick error:`, e);
    }
    if (!s) return;
    if (!firstTickReported) {
      firstTickReported = true;
      console.log(`${DEBUG_TAG} first state:`, {
        pomoState: s.pomoState,
        scheduleLen: (s.scheduleText || "").length,
        focusOn: s.focusOn,
      });
    }

    // 状態遷移検知 → 音
    if (lastPomoState !== null && s.pomoState !== lastPomoState) {
      // work→prep / prep→break / break→work は全部「ピピッ」鳴らす
      const transitionFromActive =
        (lastPomoState === "work" && s.pomoState === "prep") ||
        (lastPomoState === "prep" && s.pomoState === "break") ||
        (lastPomoState === "break" && s.pomoState === "work");
      if (transitionFromActive) pipi();
    }
    lastPomoState = s.pomoState;

    const pomoRunning = s.pomoState === "work" || s.pomoState === "prep" || s.pomoState === "break";
    const slots = parseSchedule(s.scheduleText);
    const cur = currentSlot(slots);
    const nxt = nextSlot(slots);

    // どっちもなしならバッジを消す
    if (!pomoRunning && !cur && !nxt) {
      removeBadge();
      if (pipWindow) { try { pipWindow.close(); } catch {} pipWindow = null; }
      return;
    }

    createBadge();

    // ─ いま欄の中身 ─
    const nowEl = badge.querySelector(".ktb-now");
    if (cur) {
      nowEl.innerHTML = `<span class="ktb-now-label">いま</span> ${escapeHtml(cur.task)} <span class="ktb-now-time">〜${fmtMinHHMM(cur.endMin)}</span>`;
      nowEl.style.display = "";
    } else if (nxt) {
      nowEl.innerHTML = `<span class="ktb-now-label">次</span> ${escapeHtml(nxt.task)} <span class="ktb-now-time">${fmtMinHHMM(nxt.startMin)}〜</span>`;
      nowEl.style.display = "";
    } else {
      nowEl.style.display = "none";
    }

    // ─ ポモドーロ欄 ─
    const stateEl = badge.querySelector(".ktb-state");
    const timeEl = badge.querySelector(".ktb-time");
    if (pomoRunning) {
      const left = Math.max(0, Math.ceil((s.pomoEndAt - Date.now()) / 1000));
      const stateLabel =
        s.pomoState === "work" ? "🍅 集中中" :
        s.pomoState === "prep" ? "✋ 休む準備" :
        "☕ 休憩中";
      stateEl.textContent = stateLabel;
      stateEl.style.display = "";
      timeEl.textContent = fmt(left);
      timeEl.style.display = "";
      badge.classList.toggle("work", s.pomoState === "work");
      badge.classList.toggle("prep", s.pomoState === "prep");
      badge.classList.toggle("break", s.pomoState === "break");
    } else {
      stateEl.style.display = "none";
      timeEl.style.display = "none";
      badge.classList.remove("work", "prep", "break");
    }

    // ─ PiP も更新 ─
    if (pipWindow && !pipWindow.closed) {
      const root = pipWindow.document.querySelector(".kiyose-pip-root");
      if (root) {
        root.classList.toggle("break", s.pomoState === "break");
        const pipNow = root.querySelector(".kiyose-pip-now");
        const pipState = root.querySelector(".kiyose-pip-state");
        const pipTime = root.querySelector(".kiyose-pip-time");
        if (cur) pipNow.textContent = `いま: ${cur.task}（〜${fmtMinHHMM(cur.endMin)}）`;
        else if (nxt) pipNow.textContent = `次: ${nxt.task}（${fmtMinHHMM(nxt.startMin)}〜）`;
        else pipNow.textContent = "";
        if (pomoRunning) {
          const left = Math.max(0, Math.ceil((s.pomoEndAt - Date.now()) / 1000));
          pipState.textContent =
            s.pomoState === "work" ? "🍅 集中中" :
            s.pomoState === "prep" ? "✋ 休む準備" :
            "☕ 休憩中";
          pipTime.textContent = fmt(left);
        } else {
          pipState.textContent = "";
          pipTime.textContent = "";
        }
      }
    }

    // 現在slotが変わったら「ピピッ」も鳴らす(タスク切り替えのメリハリ)
    const curKey = cur ? cur.task + cur.startMin : "";
    if (lastCurrentSlotTask !== null && lastCurrentSlotTask !== curKey && curKey) {
      pipi();
    }
    lastCurrentSlotTask = curKey;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  setInterval(tick, 1000);
  tick();
})();
