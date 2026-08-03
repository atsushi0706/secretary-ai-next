// 清瀬リンク 集中モード — Background Service Worker (Manifest V3)
//
// 機能:
//  - 集中モード ON 中: タブ上限超過 → 新規タブを即閉じる + 通知
//  - 集中モード ON 中: ブロックリストの URL → blocked.html にリダイレクト
//  - タイマーは2つのモードから選ぶ:
//      force … 強制モード。集中モードONで自動的にポモドーロが回り続ける
//      quest … 自分で時間を決めて、モンスターを1体だけ退治する（勝手には始まらない）
//  - 集中時間累積を chrome.storage.local に保存
//
// カレンダーとは連携しない。「いま何をする時間か」は自分で一言書く（nowLabel）。

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
  // タイマーのモード: "force"（強制ポモドーロ）/ "quest"（自分で決めてモンスター退治）
  timerMode: "quest",
  // ポモドーロ: idle → work(30分) → prep(30秒「休む準備」) → break(5分) → work ...
  // クエスト:   idle → quest(自分で決めた分数) → idle（ループしない）
  pomoState: "idle",
  pomoEndAt: 0,
  pomoWorkMin: 30,          // 集中(分)
  pomoPrepSec: 30,          // 休む準備(秒)
  pomoBreakMin: 5,          // 休憩(分)
  // 累積記録
  todayFocusSec: 0,
  todayDate: "",
  // 「いま何をする時間か」の一言。自分で書く。カードにそのまま出る
  nowLabel: "",
  // いま退治中のモンスター（クエストモード）
  questName: "",
  questMin: 30,
  // 退治したモンスターの数（今日）
  todayDefeated: 0,
  // よく退治するモンスター（最近使った順・最大8件）。ボタンで選べるようにする
  monsters: ["メールの返信", "原稿を書く", "動画をつくる", "資料の整理"],
  // 今日の時間割テキスト("HH:MM-HH:MM タスク名"を1行1スロットで)。任意。
  scheduleText: "",
  scheduleDate: "",  // 時間割を保存した日付(YYYY-MM-DD) — 前日のを使ってないか判定に使う
  // 秘書アプリと同期するカスタマイズ(content.js が /api/settings から取得して保存)
  secretaryName: "",        // 空ならデフォルト「清瀬リンク」
  secretaryAvatarUrl: "",   // 空ならデフォルト /icons/icon128.png
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
    await setState({ todayDate: t, todayFocusSec: 0, todayDefeated: 0 });
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
  await injectAllTabs("pomo-start");
}

async function stopPomo() {
  chrome.alarms.clear("pomo");
  await setState({ pomoState: "idle", pomoEndAt: 0, questName: "" });
}

/**
 * モンスター退治を始める（クエストモード）。
 * 時間は自分で決める。終わったら止まる——勝手に次が始まらないのが、強制モードとの違い。
 */
async function startQuest(name, minutes) {
  await ensureTodayKey();
  const s = await getState();
  const min = Math.max(1, Math.min(180, Number(minutes) || s.questMin || 30));
  const label = String(name || "").trim() || "名もなきモンスター";
  const endAt = Date.now() + min * 60 * 1000;

  // 選んだモンスターを覚えておく（次から1タップで選べる）
  const monsters = [label, ...(s.monsters || []).filter((m) => m !== label)].slice(0, 8);

  await setState({
    pomoState: "quest", pomoEndAt: endAt,
    questName: label, questMin: min, monsters,
    nowLabel: label,            // カードの「いま」も、退治中のモンスターに合わせる
  });
  chrome.alarms.create("pomo", { when: endAt });
  notify("⚔ 退治スタート", `${min}分で「${label}」を倒す。`);
  await injectAllTabs("quest-start");   // 開いている全タブにカードを出す
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "pomo") return;
  const s = await getState();
  if (s.pomoState === "quest") {
    // 1体だけ倒して終わり。ループしない
    await ensureTodayKey();
    const cur = await getState();
    await setState({
      todayFocusSec: cur.todayFocusSec + cur.questMin * 60,
      todayDefeated: (cur.todayDefeated || 0) + 1,
      pomoState: "idle", pomoEndAt: 0, questName: "",
    });
    notify("🎉 退治した！", `「${s.questName}」を倒した。今日 ${(cur.todayDefeated || 0) + 1}体目。`);
    return;
  }
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
        // 勝手にタイマーが始まるのは「強制モード」のときだけ。
        // クエストモードでは、始めるかどうかは自分で決める。
        if (cur.timerMode === "force") {
          notify("🎯 集中モードON（強制）", "余計なサイトはブロック。ポモドーロも自動で回します。");
          if (cur.pomoState === "idle") await startPomo();
        } else {
          notify("🎯 集中モードON", "余計なサイトはブロック。タイマーは自分で始めてね。");
        }
      } else {
        notify("集中モードOFF", "お疲れさま。");
        // 強制モードのループだけ止める。自分で始めた退治は途中で消さない
        if (cur.pomoState === "work" || cur.pomoState === "prep" || cur.pomoState === "break") {
          await stopPomo();
        }
      }
      sendResponse(await getState());
    } else if (msg.type === "updateSettings") {
      const patch = msg.patch || {};
      // scheduleText を変更したら、保存日付も今日にする
      if (Object.prototype.hasOwnProperty.call(patch, "scheduleText")) {
        patch.scheduleDate = todayStr();
      }
      await setState(patch);
      // 「いまの一言」を書いたら、その場で全タブにカードを出す
      if (Object.prototype.hasOwnProperty.call(patch, "nowLabel")) {
        await injectAllTabs("nowLabel");
      }
      sendResponse(await getState());
    } else if (msg.type === "startQuest") {
      await startQuest(msg.name, msg.minutes);
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

/**
 * いま開いている全部のタブにカードを配る。
 *
 * Chrome は「拡張を入れる前から開いていたタブ」には content script を入れてくれない。
 * これまで onInstalled のときしか配っていなかったので、
 *  ・ブラウザを再起動して復元されたタブ
 *  ・拡張を入れる前から開いていたタブ
 * にはカードが出ず、「タブをまたぐと新しく作られない」ように見えていた。
 * 起動時と、タイマーを始めた瞬間にも配る。
 *
 * ※ chrome:// のページ・新しいタブページ・Chromeウェブストア・PDFビューアには
 *   Chrome の決まりでどんな拡張も入れない。そこだけはカードが出ない（📺で別窓に出せる）。
 */
async function injectAllTabs(reason = "") {
  try {
    const tabs = await chrome.tabs.query({});
    let n = 0;
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      if (!/^https?:|^file:/.test(tab.url)) continue;   // chrome:// 等は入れられない
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content.css"] });
        n++;
      } catch (e) { /* タブが閉じた・権限外などは無視 */ }
    }
    console.log(`[kiyose-bg] injected into ${n} tabs (${reason})`);
  } catch (e) {
    console.error("[kiyose-bg] inject failed:", e);
  }
}

chrome.runtime.onStartup.addListener(async () => {
  await ensureTodayKey();
  await injectAllTabs("startup");   // 再起動で復元されたタブにも配る
});
chrome.runtime.onInstalled.addListener(async () => {
  await ensureTodayKey();
  await injectAllTabs("installed");
});
