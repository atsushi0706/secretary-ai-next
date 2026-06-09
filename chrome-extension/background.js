// 清瀬リンク 集中モード — Background Service Worker (Manifest V3)
//
// 機能:
//  - 集中モード ON 中: タブ上限超過 → 新規タブを即閉じる + 通知
//  - 集中モード ON 中: ブロックリストの URL → blocked.html にリダイレクト
//  - ポモドーロ: 25分作業→5分休憩を chrome.alarms で管理、通知音つき
//  - 集中時間累積を chrome.storage.local に保存

const DEFAULT_STATE = {
  focusOn: false,           // 集中モード ON/OFF
  tabLimit: 4,              // タブ上限
  blockList: [              // ブロック対象ドメイン（部分一致）
    "x.com",
    "twitter.com",
    "youtube.com",
    "youtu.be",
    "instagram.com",
    "threads.net",
    "threads.com",
    "tiktok.com",
    "facebook.com",
    "news.yahoo.co.jp",
    "yahoo.co.jp/news",
    "smartnews.com",
    "reddit.com",
    "netflix.com",
    "amazon.co.jp/gp/video",
  ],
  pomoState: "idle",        // idle | work | break
  pomoEndAt: 0,             // タイマー終了時刻(ms)
  pomoWorkMin: 25,
  pomoBreakMin: 5,
  // 累積記録
  todayFocusSec: 0,         // 今日の集中合計(秒)
  todayDate: "",            // YYYY-MM-DD
};

async function getState() {
  const r = await chrome.storage.local.get("state");
  return { ...DEFAULT_STATE, ...(r.state || {}) };
}

async function setState(patch) {
  const cur = await getState();
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ state: next });
  return next;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function ensureTodayKey() {
  const s = await getState();
  const t = todayStr();
  if (s.todayDate !== t) {
    await setState({ todayDate: t, todayFocusSec: 0 });
  }
}

// ---- タブ上限制御 ----
async function enforceTabLimit() {
  const s = await getState();
  if (!s.focusOn) return;
  const tabs = await chrome.tabs.query({ currentWindow: true });
  if (tabs.length > s.tabLimit) {
    // 一番古いタブ(新規開いたタブの直前)を閉じる
    // simpler: 新しくできた1個を閉じる
    const excess = tabs.length - s.tabLimit;
    const sorted = tabs.sort((a, b) => (b.id - a.id));
    for (let i = 0; i < excess; i++) {
      try { await chrome.tabs.remove(sorted[i].id); } catch {}
    }
    notify("📵 タブ上限超え", `上限${s.tabLimit}を超えた分は閉じました。`);
  }
}

chrome.tabs.onCreated.addListener(() => enforceTabLimit());

// ---- ブロックリスト判定 ----
async function isBlockedUrl(url) {
  if (!url) return false;
  const s = await getState();
  if (!s.focusOn) return false;
  try {
    const u = new URL(url);
    const host = u.hostname;
    const full = host + u.pathname;
    return s.blockList.some((dom) => {
      const d = String(dom || "").trim().toLowerCase();
      if (!d) return false;
      return host.endsWith(d) || full.includes(d);
    });
  } catch {
    return false;
  }
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (await isBlockedUrl(details.url)) {
    const blocked = chrome.runtime.getURL("blocked.html") + "?from=" + encodeURIComponent(details.url);
    try { await chrome.tabs.update(details.tabId, { url: blocked }); } catch {}
  }
});

// ---- ポモドーロ ----
async function startPomo() {
  await ensureTodayKey();
  const s = await getState();
  const endAt = Date.now() + s.pomoWorkMin * 60 * 1000;
  await setState({ pomoState: "work", pomoEndAt: endAt });
  chrome.alarms.create("pomo", { when: endAt });
  notify("🍅 集中スタート", `${s.pomoWorkMin}分の集中タイム。`);
}

async function stopPomo() {
  chrome.alarms.clear("pomo");
  await setState({ pomoState: "idle", pomoEndAt: 0 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "pomo") return;
  const s = await getState();
  if (s.pomoState === "work") {
    // 集中時間を累積
    await ensureTodayKey();
    const cur = await getState();
    await setState({
      todayFocusSec: cur.todayFocusSec + cur.pomoWorkMin * 60,
    });
    // 休憩開始
    const endAt = Date.now() + s.pomoBreakMin * 60 * 1000;
    await setState({ pomoState: "break", pomoEndAt: endAt });
    chrome.alarms.create("pomo", { when: endAt });
    notify("☕ 休憩タイム", `${s.pomoBreakMin}分の休憩。深呼吸。`);
  } else if (s.pomoState === "break") {
    // 次の集中を自動で始めるかは設定により分岐 — シンプルに自動で次の集中へ
    const endAt = Date.now() + s.pomoWorkMin * 60 * 1000;
    await setState({ pomoState: "work", pomoEndAt: endAt });
    chrome.alarms.create("pomo", { when: endAt });
    notify("🍅 次の集中", `${s.pomoWorkMin}分。手を動かそう。`);
  }
});

// ---- 通知 ----
function notify(title, message) {
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title,
      message,
      priority: 2,
    });
  } catch (e) { /* ignore */ }
}

// ---- popup からのメッセージ ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "getState") {
      sendResponse(await getState());
    } else if (msg.type === "setFocus") {
      await setState({ focusOn: !!msg.value });
      if (msg.value) {
        await enforceTabLimit();
        notify("🎯 集中モードON", "余計なサイトはブロックされます。");
      } else {
        notify("集中モードOFF", "お疲れさま。");
      }
      sendResponse(await getState());
    } else if (msg.type === "updateSettings") {
      await setState(msg.patch || {});
      sendResponse(await getState());
    } else if (msg.type === "startPomo") {
      await startPomo();
      sendResponse(await getState());
    } else if (msg.type === "stopPomo") {
      await stopPomo();
      sendResponse(await getState());
    }
  })();
  return true; // async response
});

// 起動時に日付ローテーション確認
chrome.runtime.onStartup.addListener(() => ensureTodayKey());
chrome.runtime.onInstalled.addListener(() => {
  ensureTodayKey();
  // 拡張アイコンクリックでサイドパネルが開くように設定
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
});

// popup から「サイドパネル開く」が来たら開く
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "openSidePanel") {
    (async () => {
      try {
        if (sender.tab && sender.tab.windowId !== undefined && chrome.sidePanel?.open) {
          await chrome.sidePanel.open({ windowId: sender.tab.windowId });
          sendResponse({ ok: true });
        } else {
          // popup から呼ばれた場合は currentWindow を取得
          const win = await chrome.windows.getCurrent();
          await chrome.sidePanel.open({ windowId: win.id });
          sendResponse({ ok: true });
        }
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message ?? e) });
      }
    })();
    return true;
  }
});
