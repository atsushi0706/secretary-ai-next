// 全ページの右下に小さなタイマーバッジ + 「いま何をやる」スロット表示する content script
// + 状態遷移時の「ピピッ」音再生

(() => {
  if (window.top !== window.self) return;

  /*
   * 二重注入ガード。
   *
   * 【やらかしたこと】
   * content.js はページを開いたとき(manifest)に1回入るが、クエスト開始時にも
   * background が injectAllTabs で全タブに配り直す。開きっぱなしのタブには
   * **同じスクリプトが2つ**動くことになり、2つのインスタンスが毎秒
   * お互いのカードを消して作り直す（createBadge が古いカードを片付ける仕様のため）。
   * カードが0.5〜1秒ごとに別のDOM要素にすり替わるので、ボタンを押しても
   * 次の瞬間に無かったことになり、「クリックが効かない・動かせない」ように見える
   * （淳くん報告：ChatGPTの画面でボタンも押せないしカードも動かせない）。
   * 2回目以降の注入はここで何もせず帰る。
   */
  if (window.__kiyoseTimerActive) return;
  window.__kiyoseTimerActive = true;

  // 診断: F12 Console で "kiyose-timer" 検索すれば動いているか確認できる
  const DEBUG_TAG = "[kiyose-timer]";
  console.log(`${DEBUG_TAG} loaded on ${location.href}`);

  let badge = null;
  let pipWindow = null;
  let dragOffset = null;
  let lastPomoState = null;
  let lastCurrentSlotTask = null;
  let lastDefeated = null;
  const POS_KEY = "kiyose_timer_pos";
  const BEEP_LOCK_KEY = "kiyose_beep_lock";

  function fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // ─── 音 (Web Audio API でピピッ) ───
  //
  // Chrome は「そのページを一度も触っていない」うちは音を出させない決まりがある。
  // 前は鳴らすたびに音の器を作り直していたので、止められた状態のまま音を流し込んで、
  // 何も聞こえないまま終わっていた。器は1つを使い回して、止められていたら起こしてから鳴らす。
  let audioCtx = null;

  function getCtx() {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      if (!audioCtx || audioCtx.state === "closed") audioCtx = new Ctor();
      return audioCtx;
    } catch { return null; }
  }

  /** ページを触った瞬間に音の器を起こしておく。ここを通っておかないと後で鳴らない */
  function unlockAudio() {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  }
  ["pointerdown", "keydown"].forEach((ev) => {
    window.addEventListener(ev, unlockAudio, { capture: true, passive: true });
  });

  /** delaySec 秒後に1音鳴らす */
  function beep(freq, duration, gainVal = 0.25, delaySec = 0) {
    const ctx = getCtx();
    if (!ctx) return;
    const fire = () => {
      try {
        const at = ctx.currentTime + delaySec;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(gainVal, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, at + duration / 1000);
        o.start(at);
        o.stop(at + duration / 1000 + 0.02);
      } catch (e) { console.warn(`${DEBUG_TAG} beep failed:`, e); }
    };
    // 止められていたら起こしてから鳴らす。起こす前に流すと無音のまま終わる
    if (ctx.state === "suspended") {
      ctx.resume().then(fire).catch((e) => {
        console.warn(`${DEBUG_TAG} 音が止められています。このページを一度クリックすると鳴るようになります`, e);
      });
    } else {
      fire();
    }
  }

  /** 複数タブで一斉に鳴るのを防ぐ。鳴らしていいなら true */
  function takeBeepLock() {
    try {
      const last = parseInt(localStorage.getItem(BEEP_LOCK_KEY) || "0", 10);
      if (Date.now() - last < 1500) return false;
      localStorage.setItem(BEEP_LOCK_KEY, String(Date.now()));
    } catch { /* ignore */ }
    // タブが見えてないなら鳴らさない (アクティブタブだけ)
    return document.visibilityState === "visible";
  }

  /** 区切りの合図。ピピッ */
  function pipi(force = false) {
    if (!force && !takeBeepLock()) return;
    beep(880, 150);
    beep(1320, 220, 0.25, 0.2);
  }

  /** モンスターを倒したときのファンファーレ。区切り音とは別物にする */
  function victory(force = false) {
    if (!force && !takeBeepLock()) return;
    [[784, 0], [988, 0.12], [1175, 0.24], [1568, 0.38]].forEach(([f, d]) => {
      beep(f, d === 0.38 ? 420 : 160, 0.28, d);
    });
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

  /**
   * いまの区切りの「まるまる何秒か」。HPゲージの満タンにあたる。
   * 裏側は残り時間(pomoEndAt)しか持っていないので、状態ごとの設定値から割り出す。
   */
  function totalSec(s) {
    if (s.pomoState === "quest") return Math.max(1, (s.questMin || 30) * 60);
    if (s.pomoState === "work") return Math.max(1, (s.pomoWorkMin || 30) * 60);
    if (s.pomoState === "prep") return Math.max(1, s.pomoPrepSec || 30);
    if (s.pomoState === "break") return Math.max(1, (s.pomoBreakMin || 5) * 60);
    return 0;
  }

  /**
   * HPゲージを塗る。残り時間 = モンスターの残りHP。
   * 減るほど緑→黄→赤。赤はもうすぐ倒せる合図なので、点滅させて煽る。
   */
  function paintHp(fillEl, left, total) {
    if (!fillEl) return;
    const ratio = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
    fillEl.style.width = `${(ratio * 100).toFixed(2)}%`;
    fillEl.classList.toggle("mid", ratio <= 0.5 && ratio > 0.2);
    fillEl.classList.toggle("low", ratio <= 0.2);
  }

  function avatarSrc(state) {
    if (state?.secretaryAvatarUrl && /^https?:\/\//.test(state.secretaryAvatarUrl)) {
      return state.secretaryAvatarUrl;
    }
    return chrome.runtime.getURL("icons/icon128.png");
  }

  function createBadge() {
    if (badge && badge.isConnected) return;
    // 拡張を更新すると、前に入れたぶんが死んだまま画面に残る。
    // そこへ新しいのを足すとカードが2枚重なるので、先に古いのを片付ける
    document.querySelectorAll("#kiyose-timer-badge").forEach((el) => el.remove());
    badge = document.createElement("div");
    badge.id = "kiyose-timer-badge";
    badge.innerHTML = `
      <img class="ktb-avatar" alt="" />
      <div class="ktb-body">
        <div class="ktb-now"></div>
        <div class="ktb-state">--</div>
        <div class="ktb-time">--:--</div>
        <div class="ktb-hp"><div class="ktb-hp-fill"></div></div>
      </div>
      <div class="ktb-actions">
        <button class="ktb-sound" title="音をためす">🔊</button>
        <button class="ktb-pip" title="別ウィンドウで表示">📺</button>
        <button class="ktb-min" title="最小化">_</button>
        <button class="ktb-close" title="非表示">×</button>
      </div>
    `;
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

    // 音の確認。ここを押すこと自体が「ページを触った」ことになるので、
    // これ以降は終了時の音も鳴るようになる
    badge.querySelector(".ktb-sound").addEventListener("click", () => {
      unlockAudio();
      victory(true);   // タブ間ロックを無視して必ず鳴らす
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

  /**
   * 別ウィンドウ(📺)の中身を組み立てる。
   *
   * HTMLを文字列で流し込む(innerHTML)のをやめて、部品を1つずつ作る。
   * サイトによっては、文字列からのHTML生成と style="" の直書きを
   * セキュリティ設定で禁止していて、そこで止まることがあるため。
   */
  function buildPipRoot(doc) {
    const mk = (cls, text) => {
      const el = doc.createElement("div");
      el.className = cls;
      if (text != null) el.textContent = text;
      return el;
    };
    const root = mk("kiyose-pip-root");
    root.appendChild(mk("kiyose-pip-now"));
    root.appendChild(mk("kiyose-pip-state", "--"));
    root.appendChild(mk("kiyose-pip-time", "--:--"));
    const hp = mk("kiyose-pip-hp");
    hp.appendChild(mk("ktb-hp-fill"));
    root.appendChild(hp);
    root.appendChild(mk("kiyose-pip-hint", "右下バッジと同期"));
    return root;
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

      const root = buildPipRoot(pipWindow.document);
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
      // 拡張を更新すると、前から開いていたタブのこのスクリプトは裏方と話せなくなる。
      // 凍ったカード（時間が進まない・押しても何も起きない）を残さないよう、店じまいする。
      // 新しいスクリプトが配り直されれば、そちらが新しいカードを出す。
      if (String(e?.message ?? e).includes("Extension context invalidated")) {
        console.warn(`${DEBUG_TAG} 拡張が更新されたので、このタブの古いカードを片付けます`);
        clearInterval(tickTimer);
        removeBadge();
        window.__kiyoseTimerActive = false;
        return;
      }
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

    // 倒した瞬間のファンファーレ。
    // 退治(quest)は状態が quest→idle に落ちるだけで、これは「途中でやめた」ときも同じ。
    // 倒した数が増えたかどうかで見分ける（やめただけなら増えない）。
    const defeated = s.todayDefeated || 0;
    if (lastDefeated !== null && defeated > lastDefeated) victory();
    lastDefeated = defeated;

    const questRunning = s.pomoState === "quest";
    const pomoRunning = questRunning || s.pomoState === "work" || s.pomoState === "prep" || s.pomoState === "break";
    const slots = parseSchedule(s.scheduleText);
    const cur = currentSlot(slots);
    const nxt = nextSlot(slots);
    const hasSchedule = !!(s.scheduleText && s.scheduleText.trim());
    const nowLabel = (s.nowLabel || "").trim();

    // タイマーも、いまの一言も、時間割も無い → 完全に消す
    if (!pomoRunning && !hasSchedule && !nowLabel) {
      removeBadge();
      if (pipWindow) { try { pipWindow.close(); } catch {} pipWindow = null; }
      return;
    }

    createBadge();

    // 秘書アバターを毎ティック反映(設定変更に追従)
    const avEl = badge.querySelector(".ktb-avatar");
    const wantSrc = avatarSrc(s);
    if (avEl && avEl.src !== wantSrc) avEl.src = wantSrc;

    // ─ いま欄: 時間割があれば常に何か表示 ─
    const nowEl = badge.querySelector(".ktb-now");
    if (nowLabel) {
      // 自分で書いた「いま何をする時間か」。これがいちばん強い
      nowEl.innerHTML = `<span class="ktb-now-label">いま</span> ${escapeHtml(nowLabel)}`;
      nowEl.style.display = "";
    } else if (cur) {
      nowEl.innerHTML = `<span class="ktb-now-label">いま</span> ${escapeHtml(cur.task)} <span class="ktb-now-time">〜${fmtMinHHMM(cur.endMin)}</span>`;
      nowEl.style.display = "";
    } else if (nxt) {
      nowEl.innerHTML = `<span class="ktb-now-label">次</span> ${escapeHtml(nxt.task)} <span class="ktb-now-time">${fmtMinHHMM(nxt.startMin)}〜</span>`;
      nowEl.style.display = "";
    } else if (hasSchedule) {
      nowEl.innerHTML = `<span class="ktb-now-label">!</span> 時間割の範囲外`;
      nowEl.style.display = "";
    } else if (pomoRunning) {
      // ポモドーロは動いてるが時間割未設定 → 軽く告知
      nowEl.innerHTML = `<span class="ktb-now-label">✎</span> いま何をする時間か、拡張から一言書ける`;
      nowEl.style.display = "";
    } else {
      nowEl.style.display = "none";
    }

    // ─ ポモドーロ欄 ─
    const stateEl = badge.querySelector(".ktb-state");
    const timeEl = badge.querySelector(".ktb-time");
    const hpEl = badge.querySelector(".ktb-hp");
    if (pomoRunning) {
      const left = Math.max(0, Math.ceil((s.pomoEndAt - Date.now()) / 1000));
      const stateLabel =
        s.pomoState === "quest" ? `⚔ ${s.questName || "退治"}中` :
        s.pomoState === "work" ? "🍅 集中中" :
        s.pomoState === "prep" ? "✋ 休む準備" :
        "☕ 休憩中";
      stateEl.textContent = stateLabel;
      stateEl.style.display = "";
      timeEl.textContent = fmt(left);
      timeEl.style.display = "";
      if (hpEl) {
        hpEl.style.display = "";
        paintHp(hpEl.querySelector(".ktb-hp-fill"), left, totalSec(s));
      }
      badge.classList.toggle("quest", s.pomoState === "quest");
      badge.classList.toggle("work", s.pomoState === "work");
      badge.classList.toggle("prep", s.pomoState === "prep");
      badge.classList.toggle("break", s.pomoState === "break");
    } else {
      stateEl.style.display = "none";
      timeEl.style.display = "none";
      if (hpEl) hpEl.style.display = "none";
      badge.classList.remove("quest", "work", "prep", "break");
    }

    // ─ PiP も更新 ─
    if (pipWindow && !pipWindow.closed) {
      const root = pipWindow.document.querySelector(".kiyose-pip-root");
      if (root) {
        root.classList.toggle("break", s.pomoState === "break");
        const pipNow = root.querySelector(".kiyose-pip-now");
        const pipState = root.querySelector(".kiyose-pip-state");
        const pipTime = root.querySelector(".kiyose-pip-time");
        const pipHp = root.querySelector(".kiyose-pip-hp");
        if (nowLabel) pipNow.textContent = `いま: ${nowLabel}`;
        else if (cur) pipNow.textContent = `いま: ${cur.task}（〜${fmtMinHHMM(cur.endMin)}）`;
        else if (nxt) pipNow.textContent = `次: ${nxt.task}（${fmtMinHHMM(nxt.startMin)}〜）`;
        else pipNow.textContent = "";
        if (pomoRunning) {
          const left = Math.max(0, Math.ceil((s.pomoEndAt - Date.now()) / 1000));
          pipState.textContent =
            s.pomoState === "quest" ? `⚔ ${s.questName || "退治"}中` :
            s.pomoState === "work" ? "🍅 集中中" :
            s.pomoState === "prep" ? "✋ 休む準備" :
            "☕ 休憩中";
          pipTime.textContent = fmt(left);
          if (pipHp) {
            pipHp.style.display = "";
            paintHp(pipHp.querySelector(".ktb-hp-fill"), left, totalSec(s));
          }
        } else {
          pipState.textContent = "";
          pipTime.textContent = "";
          if (pipHp) pipHp.style.display = "none";
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

  // ─── 秘書アプリにいる時は /api/settings を fetch して名前・アバターを同期 ───
  const SECRETARY_ORIGIN = "https://secretary-ai-next.vercel.app";
  if (location.origin === SECRETARY_ORIGIN) {
    (async () => {
      try {
        const r = await fetch("/api/settings", { credentials: "include" });
        if (!r.ok) return;
        const s = await r.json();
        const patch = {
          secretaryName: s.secretary_name || "",
          secretaryAvatarUrl: s.secretary_avatar_url || "",
        };
        chrome.runtime.sendMessage(
          { type: "updateSettings", patch },
          () => { /* ignore */ },
        );
        console.log(`${DEBUG_TAG} synced secretary profile:`, patch);
      } catch (e) {
        console.warn(`${DEBUG_TAG} settings sync failed:`, e);
      }
    })();
  }

  // ─── 秘書アプリからの postMessage を受けて拡張ストレージに送る ───
  // 秘書アプリ(同タブ内 or どのタブからでも)が
  // window.postMessage({ type: "kiyose:setSchedule", scheduleText: "..." }, "*")
  // を投げると拡張機能に届く
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "kiyose:setSchedule" && typeof data.scheduleText === "string") {
      console.log(`${DEBUG_TAG} received setSchedule (${data.scheduleText.length} chars)`);
      try {
        chrome.runtime.sendMessage(
          { type: "updateSettings", patch: { scheduleText: data.scheduleText } },
          (res) => {
            // 結果を呼び出し側にも通知（秘書アプリで「✓ 送信完了」を出すため）
            window.postMessage(
              {
                type: "kiyose:setScheduleResult",
                ok: !!res,
                length: data.scheduleText.length,
              },
              "*",
            );
          },
        );
      } catch (e) {
        console.error(`${DEBUG_TAG} setSchedule send failed:`, e);
        window.postMessage(
          { type: "kiyose:setScheduleResult", ok: false, error: String(e) },
          "*",
        );
      }
    }
    if (data.type === "kiyose:ping") {
      // 秘書アプリが「拡張入ってる？」を確認するための ping
      window.postMessage({ type: "kiyose:pong", version: "1.0.0" }, "*");
    }
  });

  const tickTimer = setInterval(tick, 1000);
  tick();
})();
