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
  // ポモドーロ: idle → work(30分) → prep(30秒「休む準備」) → break(5分) → work ...
  pomoState: "idle",
  pomoEndAt: 0,
  pomoWorkMin: 30,          // 集中(分)
  pomoPrepSec: 30,          // 休む準備(秒)
  pomoBreakMin: 5,          // 休憩(分)
  // 累積記録
  todayFocusSec: 0,
  todayDate: "",
  // 今日の時間割テキスト("HH:MM-HH:MM タスク名"を1行1スロットで)
  scheduleText: "",
  scheduleDate: "",  // 時間割を保存した日付(YYYY-MM-DD) — 前日のを使ってないか判定に使う
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

// ---- ポモドーロ: work(30分) → prep(30秒) → break(5分) → work ループ ----
async function startPomo() {
  await ensureTodayKey();
  const s = await getState();
  const endAt = Date.now() + s.pomoWorkMin * 60 * 1000;
  await setState({ pomoState: "work", pomoEndAt: endAt });
  chrome.alarms.create("pomo", { when: endAt });
  notify("🍅 集中スタート", `${s.pomoWorkMin}分の集中タイム。手を動かそう。`);
}

async function stopPomo() {
  chrome.alarms.clear("pomo");
  await setState({ pomoState: "idle", pomoEndAt: 0 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "pomo") return;
  const s = await getState();
  if (s.pomoState === "work") {
    // 集中完了 → 集中時間を累積、「休む準備」に入る(短い・音は軽く)
    await ensureTodayKey();
    const cur = await getState();
    await setState({
      todayFocusSec: cur.todayFocusSec + cur.pomoWorkMin * 60,
    });
    const endAt = Date.now() + s.pomoPrepSec * 1000;
    await setState({ pomoState: "prep", pomoEndAt: endAt });
    chrome.alarms.create("pomo", { when: endAt });
    notify("✋ お疲れさま", `${s.pomoPrepSec}秒で休憩に入るよ。区切りつけて。`);
  } else if (s.pomoState === "prep") {
    // 準備完了 → 休憩開始
    const endAt = Date.now() + s.pomoBreakMin * 60 * 1000;
    await setState({ pomoState: "break", pomoEndAt: endAt });
    chrome.alarms.create("pomo", { when: endAt });
    notify("☕ 休憩タイム", `${s.pomoBreakMin}分。深呼吸・伸び・水分。`);
  } else if (s.pomoState === "break") {
    // 休憩完了 → 自動で次の集中へ（focusOn のときのみループ。OFFなら停止）
    if (s.focusOn) {
      const endAt = Date.now() + s.pomoWorkMin * 60 * 1000;
      await setState({ pomoState: "work", pomoEndAt: endAt });
      chrome.alarms.create("pomo", { when: endAt });
      notify("🍅 次の集中", `${s.pomoWorkMin}分。再開しよう。`);
    } else {
      await setState({ pomoState: "idle", pomoEndAt: 0 });
      notify("✅ ポモドーロ終了", "集中モードがOFFなので停止しました。");
    }
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
      const cur = await getState();
      if (msg.value) {
        await enforceTabLimit();
        notify("🎯 集中モードON", "余計なサイトはブロック。ポモドーロも開始します。");
        // 集中モードONで自動的にポモドーロも開始(まだ走ってなければ)
        if (cur.pomoState === "idle") {
          await startPomo();
        }
      } else {
        notify("集中モードOFF", "お疲れさま。ポモドーロも停止します。");
        // 集中モードOFFでポモドーロも停止
        await stopPomo();
      }
      sendResponse(await getState());
    } else if (msg.type === "updateSettings") {
      const patch = msg.patch || {};
      // scheduleText を変更したら、保存日付も今日にする
      if (Object.prototype.hasOwnProperty.call(patch, "scheduleText")) {
        patch.scheduleDate = todayStr();
      }
      await setState(patch);
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
chrome.runtime.onInstalled.addListener(async () => {
  ensureTodayKey();
  // 拡張アイコンクリックでサイドパネルが開くように設定
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
  // 既存タブにも新しい content.js / content.css を強制注入
  // Chrome の仕様で「拡張リロード前から開いていたタブ」には新版が入らないので
  // 自動でやってあげる
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      if (!/^https?:|^file:/.test(tab.url)) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["content.css"],
        });
      } catch (e) { /* タブが閉じた等は無視 */ }
    }
    console.log("[kiyose-bg] re-injected content scripts into existing tabs");
  } catch (e) {
    console.error("[kiyose-bg] re-injection failed:", e);
  }
});

// 注: sidePanel.open() は popup.js 側でユーザー操作起点に直接呼ぶ。
// background から呼ぶと "may only be called in response to a user gesture" エラーになる。
