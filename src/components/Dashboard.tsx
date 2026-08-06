"use client";

import { PriorityList } from "./PriorityList";
import { Fold } from "./Fold";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { TaskMatrix } from "./TaskMatrix";
import { Chat } from "./Chat";
import { MonthCalendar } from "./MonthCalendar";
import { WeekCalendarCompact } from "./WeekCalendarCompact";
import { TimerWidget } from "./TimerWidget";
import AlarmManager from "./AlarmManager";
import { RealmNav } from "./RealmNav";
import { syncTodayProgress, type TodayProgress } from "@/lib/todayProgress";

type Bootstrap = {
  setupNeeded?: boolean;
  now: string;
  today: string;
  targetDay: string;
  targetLabel: string;
  isMorning: boolean;
  /** 優先順位の分解を出すかどうか（まだ管理者だけ） */
  isAdmin?: boolean;
  events: any[];
  tasks: any[];
  schedule: any;
  messages: { role: "user" | "assistant"; content: string }[];
  quickmemo: string;
  eveningBriefing?: { body: string; created_at: string } | null;
  // ユーザーカスタマイズ
  secretaryName?: string;
  secretaryAvatarUrl?: string;
  userCallName?: string;
};

// PC開きっぱなしで情報が古くなったときの判定しきい値
const STALE_AFTER_MS = 5 * 60 * 1000; // 5分

export function Dashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"auto" | "morning" | "evening">("auto");
  const [reloadKey, setReloadKey] = useState(0);
  const [calTab, setCalTab] = useState<"week" | "month">("week");
  const [lastLoadedAt, setLastLoadedAt] = useState<number>(0);
  const lastLoadedRef = useRef<number>(0);

  const [fatalError, setFatalError] = useState<string | null>(null);

  const load = useCallback(() => {
    setRefreshing(true);
    const q = mode === "auto" ? "" : `?mode=${mode}`;
    fetch(`/api/bootstrap${q}`)
      .then(async (r) => {
        // HTTP エラー (500 等) の場合はエラー内容を取り出して fatalError にセット
        // これをやらないと Dashboard が data.messages を触った時点で undefined.length で JS クラッシュ
        // → Chrome が「This page couldn't load」を出してユーザーが救出不能になる
        if (!r.ok) {
          const errPayload = await r.json().catch(() => ({}));
          setFatalError(errPayload?.error || `サーバーエラー (${r.status})`);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return; // fatalError 側で処理済み
        // レスポンスに必須プロパティが揃ってない場合も fatalError 扱い
        if (!d.setupNeeded && (!Array.isArray(d.messages) || !Array.isArray(d.tasks) || !Array.isArray(d.events))) {
          setFatalError(d?.error || "サーバーから予期しないデータが返りました。");
          return;
        }
        setData(d);
        setFatalError(null);
        const t = Date.now();
        setLastLoadedAt(t);
        lastLoadedRef.current = t;
      })
      .catch((e) => {
        setFatalError(String(e?.message ?? e));
      })
      .finally(() => {
        setRefreshing(false);
        setInitialLoading(false);
      });
  }, [mode, reloadKey]);

  useEffect(() => { load(); }, [load]);

  // タブが visible に戻った/フォーカスが返ったとき、5分以上経ってたら自動で最新化
  useEffect(() => {
    function maybeRefresh() {
      if (document.visibilityState !== "visible") return;
      const last = lastLoadedRef.current;
      if (!last) return;
      const elapsed = Date.now() - last;
      if (elapsed > STALE_AFTER_MS) {
        setReloadKey((k) => k + 1);
      }
    }
    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, []);

  if (initialLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-8 h-8 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin" />
          秘書が準備中…
        </div>
      </main>
    );
  }

  if (fatalError) {
    // Google OAuth の refresh_token 期限切れが典型例。/reset で再認証すれば直る。
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <div className="text-4xl mb-2">🌱</div>
          <h1 className="text-xl font-bold mb-2">Google と再接続してください</h1>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Google 連携の更新が必要な時期になりました。<br />
            下のボタンから 30秒 で再接続できます。
          </p>
          <a
            href="/reset"
            className="block bg-[var(--accent)] text-white font-bold py-3 rounded-xl hover:opacity-90"
          >
            Google で再接続する
          </a>
          {/* Google が切れていてもインナーワールドは使えるので、逃げ道を残す */}
          <Link href="/shinga" className="block mt-2 text-xs text-purple-600 hover:underline">
            🌌 インナーワールドへ行く
          </Link>
          <details className="mt-4 text-left">
            <summary className="text-xs text-gray-400 cursor-pointer">詳細情報（技術情報）</summary>
            <pre className="text-xs text-gray-500 mt-2 whitespace-pre-wrap break-words bg-gray-50 p-2 rounded">
              {fatalError}
            </pre>
          </details>
        </div>
      </main>
    );
  }

  if (data?.setupNeeded) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-2">初回設定</h1>
          <p className="text-sm text-gray-600 mb-4">
            Google ログイン と AIキー（管理者設定の Anthropic キー）が必要です。
          </p>
          <Link
            href="/settings"
            className="block bg-[var(--accent)] text-white font-bold py-3 rounded-xl"
          >
            設定画面へ
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const autoGreet = data.messages.length === 0;
  // 今日進捗: 上(DailyProgress)と下(TaskMatrix today枠)で同じ値を使う
  const todayProgress: TodayProgress = syncTodayProgress(data.tasks);

  // ユーザーカスタマイズ
  const secretaryName = data.secretaryName || "清瀬リンク";
  const secretaryAvatarUrl = data.secretaryAvatarUrl || "/kiyose.png";
  const userCallName = data.userCallName || userName;

  return (
    <main className="min-h-screen">
      {/* 島々の世界を、画面の奥にうっすら敷く */}
      <div className="realverse-bg" />
      {/* 最上位の領域切り替え（リアルバース / インナーワールド） */}
      <div className="max-w-6xl mx-auto px-3 sm:px-5 pt-3 sm:pt-5">
        <RealmNav active="realverse" />
      </div>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 px-3 sm:px-5 pb-3 sm:pb-5">
        {/* ── サイドバー (モバイルでは下に表示) ── */}
        <aside className="space-y-4 order-2 lg:order-1">
          <section className="card flex flex-col items-center text-center pt-5">
            <div className="relative">
              <Image
                src={secretaryAvatarUrl}
                alt={secretaryName}
                width={140}
                height={140}
                className="w-24 h-24 lg:w-[140px] lg:h-[140px] rounded-full border-4 border-purple-200 shadow object-cover"
                priority
                unoptimized={secretaryAvatarUrl.startsWith("http")}
              />
              <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-400 border-2 border-white" />
            </div>
            <div className="mt-3 font-bold text-lg">{secretaryName}</div>
            <div className="text-xs text-green-600">● オンライン</div>
            <div className="text-xs text-gray-500 mt-1">{userCallName} 専属の秘書</div>

            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="mt-4 text-sm p-2 border rounded-lg w-full"
            >
              <option value="auto">🤖 自動（時刻判別）</option>
              <option value="morning">🌅 朝（今日の組み立て）</option>
              <option value="evening">🌙 夜（明日の準備）</option>
            </select>
            <div className="text-xs text-gray-600 mt-2">
              いま: <b>{data.isMorning ? "今日の組み立て" : "明日の準備"}</b>
            </div>

            <div className="flex gap-2 mt-3 w-full">
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                disabled={refreshing}
                className="flex-1 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-60"
              >
                {refreshing ? "更新中…" : "🔄 更新"}
              </button>
              <Link
                href="/settings"
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
                title="設定"
              >
                ⚙️
              </Link>
            </div>
            <button
              onClick={() => {
                if (confirm("ログアウトする？")) {
                  signOut({ callbackUrl: "/login" });
                }
              }}
              className="mt-2 w-full text-xs text-gray-500 hover:text-red-600 py-1.5 border border-gray-200 hover:border-red-200 rounded-lg transition"
            >
              ⤴ ログアウト
            </button>
            {lastLoadedAt > 0 && (
              <LastLoadedBadge ts={lastLoadedAt} stale={Date.now() - lastLoadedAt > STALE_AFTER_MS} />
            )}
          </section>

          {/*
            ここから下は、いつも見るものではない。**畳んでおいて、押して見に行く。**
            リアルバースを開いた瞬間に全部が縦に並んでいると、
            スマホでは延々スクロールになって「いま何を見ればいいのか」が分からなくなる。
          */}
          <Fold id="timer" title="⏱ タイマー" summary="1時間 / 30分 / 5分" accent="gray">
            <TimerWidget />
          </Fold>

          <Fold id="alarm" title="⏰ アラーム" summary="時刻を決めて1回鳴らす" accent="gray">
            <AlarmManager />
          </Fold>

          <Fold id="tools" title="🔗 マイツール" summary="よく使うWebツールへの近道" accent="gray">
            <ToolLinks />
          </Fold>

          {/*
            「スマホの誘惑をとめる」は外した。
            このアプリからは他のアプリを止められないので（Webページにはその権限が無い）、
            端末の設定のやり方を案内するだけの画面になっていた。**機能していない。**
            端末側の手順は変わるものなので、案内として持つのも無理がある。
            止める仕組みを本当に作れるようになったら、そのときに戻す。
          */}
        </aside>

        {/* ── メイン列 (モバイルでは上に表示) ── */}
        <div className="space-y-4 min-w-0 order-1 lg:order-2">
          {/*
            【リアルバースの並べ方】
            表に出しておくのは、この2つだけ：
              ① 今日のフォーカス … いまどんな状態でいたいか
              ② 優先順位         … 何が一番なのか
            ほかは全部**閉じておく**。押して、自分で見に行く。
            閉じているときも一行のあらましを出すので、開く必要があるかは分かる。
          */}

          {/* ① 今日のフォーカス */}
          <TodayFocusCard />

          {/* ② 優先順位（1・2・3が並ぶだけ。書き込みと分解は /priority へ） */}
          {data.isAdmin && <PriorityList />}

          {/*
            マインドマップ・スケジューラーへの入口（淳くんだけ）。
            わーっと話した内容を構造にして、30分の粒まで割って、ロードマップに組む道具。
            チャットの中に埋めず、ボタンで別画面へ——マップは場所を取るので。
          */}
          {data.isAdmin && (
            <Link href="/mindmap"
              className="card border-l-4 border-violet-500 flex items-center gap-3 hover:bg-violet-50/40">
              <span className="text-xl">🧠</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-violet-800">マインドマップ・スケジューラー</span>
                <span className="block text-[11px] text-gray-500 mt-0.5">
                  話すと構造になる。30分の粒まで割って、進め方まで組む
                </span>
              </span>
              <span className="text-gray-400 text-xs">→</span>
            </Link>
          )}

          {/* 昨夜決めた今日の流れ */}
          {data.isMorning && data.eveningBriefing?.body && (
            <EveningBriefingCard briefing={data.eveningBriefing} />
          )}

          {/* 今日の進捗 */}
          <Fold id="progress" title="🎯 今日の進捗"
            summary={`${todayProgress.completedCount}/${todayProgress.baselineCount} 完了 ／ ${todayProgress.pct}%`}>
            <DailyProgress progress={todayProgress} onRefresh={() => setReloadKey((k) => k + 1)} />
          </Fold>

          {/* 秘書との会話。**カレンダーをここへ寄せた** ——
              時間割を組んでもらうときに、予定を見ながら話せないと確認しながら進められない。 */}
          <Fold id="chat" title={`💬 ${secretaryName}との会話`}
            summary="時間割づくり・相談。カレンダーもここ" defaultOpen>
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-white p-2.5">
                <div className="flex items-center gap-1 mb-2">
                  <button
                    onClick={() => setCalTab("week")}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-md transition ${
                      calTab === "week" ? "bg-[var(--accent)] text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >週</button>
                  <button
                    onClick={() => setCalTab("month")}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-md transition ${
                      calTab === "month" ? "bg-[var(--accent)] text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >月</button>
                </div>
                {calTab === "week" ? <WeekCalendarCompact /> : <MonthCalendar />}
              </div>
              <Chat
                key={`${data.targetDay}-${data.isMorning}`}
                initialMessages={data.messages}
                isMorning={data.isMorning}
                autoGreet={autoGreet}
                onTasksUpdated={() => setReloadKey((k) => k + 1)}
                secretaryName={secretaryName}
                secretaryAvatarUrl={secretaryAvatarUrl}
              />
            </div>
          </Fold>

          {/* タスクボード */}
          <Fold id="tasks" title="🗂️ タスクボード"
            summary={taskSummary(data.tasks)}>
            <TaskMatrix tasks={data.tasks} todayProgress={todayProgress} onRefresh={() => setReloadKey((k) => k + 1)} />
          </Fold>
        </div>
      </div>
    </main>
  );
}

/**
 * 閉じているときに出す、タスクの一行。
 * これが無いと「開く必要があるのか」が判断できない。
 */
function taskSummary(tasks: any[]): string {
  const today = new Date();
  const p = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const t = p(today);
  const open = (tasks ?? []).filter((x) => x.status !== "completed");
  const due = (x: any) => String(x.due ?? "").slice(0, 10);
  const overdue = open.filter((x) => due(x) && due(x) < t).length;
  const todayN = open.filter((x) => due(x) === t).length;
  const parts = [`未完了 ${open.length}件`];
  if (todayN) parts.push(`今日 ${todayN}件`);
  if (overdue) parts.push(`期限すぎ ${overdue}件`);
  return parts.join(" ／ ");
}

const WALK_ROUTINE_TITLE = "ウォーキング30分";

// マイツール (外部 Webツールへのショートカット)
const MY_TOOLS: Array<{ name: string; url: string; emoji: string; note?: string }> = [
  {
    emoji: "📝",
    name: "note 自動執筆ツール",
    url: "https://note-writer.streamlit.app",
    note: "テーマから note 記事を生成",
  },
  {
    emoji: "🧵",
    name: "アフィリエイト note＋Threads 生成",
    url: "https://affi-note-threads.vercel.app",
    note: "LP全文を貼るだけ。note記事とThreads投稿を一括生成",
  },
  {
    emoji: "🌑",
    name: "きよブラック 1",
    url: "https://chatgpt.com/g/g-67efcfaf9e6481918ed2b6b3e2593819-kiyohuratuku",
    note: "前に進めたい時 / メンタルブロックと向き合いたい時",
  },
  {
    emoji: "🌑",
    name: "きよブラック 2（厳しめ）",
    url: "https://chatgpt.com/g/g-6a2cd50ba2748191aba2edcc288af66c-kiyohuratuku2",
    note: "面倒だけどやらなきゃな時 / 思考の枠を超えたい時",
  },
];

function ToolLinks() {
  return (
    <section className="card">
      <div className="font-bold text-sm mb-2 flex items-center gap-1">
        🔗 マイツール
      </div>
      <ul className="space-y-1.5">
        {MY_TOOLS.map((t) => (
          <li key={t.url}>
            <a
              href={t.url}
              target="_blank"
              rel="noreferrer"
              className="block text-xs p-2 rounded-lg bg-gray-50 hover:bg-purple-50 transition border border-gray-100 hover:border-purple-200"
            >
              <div className="font-bold text-gray-700 flex items-center gap-1.5">
                <span>{t.emoji}</span>
                <span className="truncate flex-1">{t.name}</span>
                <span className="text-gray-400">↗</span>
              </div>
              {t.note && <div className="text-[10px] text-gray-500 mt-0.5 ml-5">{t.note}</div>}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// 昨夜の briefing 表示
function EveningBriefingCard({
  briefing,
}: {
  briefing: { body: string; created_at: string };
}) {
  // 既定は閉じておく。朝いちで開くと、この長い文章が画面を埋めてしまう。
  // 読みたい人は「▼ 開く」を押せばいい。
  const [collapsed, setCollapsed] = useState(true);
  const created = new Date(briefing.created_at);
  const m = `${created.getMonth() + 1}/${created.getDate()} ${String(created.getHours()).padStart(2, "0")}:${String(created.getMinutes()).padStart(2, "0")}`;
  // 簡易: 時刻範囲行をハイライト
  const html = briefing.body
    .replace(
      /^[\s・\-\*●○◇◆|]*(\d{1,2}:\d{2})\s*[-–〜~]\s*(\d{1,2}:\d{2})\s*[:：|]*\s*(.+?)\s*$/gm,
      (_, t1, t2, lbl) =>
        `<div class="slot" style="margin:4px 0;"><span class="time">${t1}–${t2}</span><span>${lbl.replace(/^\|\s*/, "")}</span></div>`,
    )
    .replace(/^\| .+$/gm, "")
    .replace(/^\|[-:]+\|.*$/gm, "")
    .replace(/\n/g, "<br/>");
  return (
    <section className="card border-l-4 border-purple-500 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm text-purple-700">
          📋 昨夜決めた今日の流れ
          <span className="text-xs text-gray-500 ml-2 font-normal">（{m} 作成）</span>
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-xs bg-white hover:bg-purple-50 border border-purple-200 px-2 py-1 rounded"
        >
          {collapsed ? "▼ 開く" : "▲ 閉じる"}
        </button>
      </div>
      {!collapsed && (
        <div
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </section>
  );
}

// 「最終更新 HH:MM」バッジ。古ければ赤くする。30秒ごとに自分で再描画
function LastLoadedBadge({ ts, stale }: { ts: number; stale: boolean }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const elapsedMs = Date.now() - ts;
  const elapsedMin = Math.floor(elapsedMs / 60000);
  const isStaleNow = stale || elapsedMs > 5 * 60 * 1000;
  return (
    <div className={`mt-2 text-[10px] ${isStaleNow ? "text-red-500" : "text-gray-400"}`}>
      最終更新 {hh}:{mm}
      {elapsedMin > 0 && <span className="ml-1">（{elapsedMin}分前）</span>}
      {isStaleNow && <span className="ml-1">← 古いかも</span>}
    </div>
  );
}


/**
 * 「なぜその感情か」を、思い返せるだけの短さにする。
 *
 * 保存する側（ReflectClose）は短い一言だけを渡すよう直したが、
 * それ以前に保存されたぶんには**夜の会話がまるごと**入っている。
 * 過去のデータを書き換えることはしないので、出すときに締める。
 *
 * ・会話の形（「清瀬リンク：」「本人：」）が混ざっていたら、それは読ませない
 * ・長すぎるものは、最初のひと区切りだけにする（2〜3行ぶん）
 */
function shortWhy(why: string | null | undefined): string {
  const t = String(why ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  // 会話がそのまま入っているものは出さない。切り取っても意味が通らないため
  if (/(清瀬リンク|本人|きみ)\s*[:：]/.test(t)) return "";
  if (t.length <= 120) return t;
  // 長いものは、文の切れ目まで（2〜3行ぶん）
  const cut = t.slice(0, 120);
  const at = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("、"));
  return (at > 40 ? cut.slice(0, at + 1) : cut) + "…";
}

/**
 * 「決めたこと」を、読める形だけにする。
 *
 * 話し言葉を読点で切っていた時期のデータには、
 *   「明日からは」「もっと増すな自分でいるために」
 * のような、文の途中で切れた断片が入っている。
 * 助詞で終わっているものは、それだけ読んでも意味が取れないので出さない。
 */
function tidyActions(actions: string[] | null | undefined): string[] {
  return (Array.isArray(actions) ? actions : [])
    .map((a) => String(a ?? "").trim())
    .filter(Boolean)
    .filter((a) => a.length >= 4)
    .filter((a) => !/(は|が|を|と|に|で|も|へ|から|より|とか|ため|ために)$/.test(a))
    .slice(0, 3);
}

// 今日のフォーカス：インナーワールドのパラレルウォークで決めた「今日の感情」と「最優先の一歩」。
// リアルバースの一番上にピン留めして、今日の狙いを見失わないようにする。ここでも編集できる。
function TodayFocusCard() {
  const [focus, setFocus] = useState<{ emotion: string; priority: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [emotion, setEmotion] = useState("");
  const [priority, setPriority] = useState("");
  const [saving, setSaving] = useState(false);
  // 前の晩の振り返りで決めた「明日の最優先感情」。朝いちで、ここに出す
  const [lastNight, setLastNight] = useState<{ emotion: string; why: string; actions: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/daily-focus").then((r) => r.json()).then((d) => {
      if (d.focus) { setFocus(d.focus); setEmotion(d.focus.emotion ?? ""); setPriority(d.focus.priority ?? ""); }
    }).catch(() => {});
    // 昨夜「明日の夜どんな感情でいたいか」を決めていたら、それを今日の狙いとして見せる
    fetch("/api/tomorrow").then((r) => r.json()).then((d) => {
      if (d?.focus?.emotion) setLastNight(d.focus);
    }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/daily-focus", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotion, priority }),
      });
      const d = await r.json();
      if (d.focus) setFocus(d.focus);
      setEditing(false);
    } catch { /* 失敗しても表示は保つ */ }
    finally { setSaving(false); }
  }

  const empty = !focus || (!focus.emotion && !focus.priority);

  if (editing) {
    return (
      <section className="card border-l-4 border-amber-400">
        <div className="font-bold text-sm mb-2">🎯 今日のフォーカス</div>
        <label className="block text-xs text-gray-500 mb-1">今日、どんな感情でいる？</label>
        <input value={emotion} onChange={(e) => setEmotion(e.target.value)} placeholder="例：安心・ワクワク"
          className="w-full text-sm p-2 border rounded-lg mb-3" />
        <label className="block text-xs text-gray-500 mb-1">今日の最優先の一歩</label>
        <input value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="例：気になってた人に一言だけ送る"
          className="w-full text-sm p-2 border rounded-lg mb-3" />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="flex-1 text-sm bg-[var(--accent)] text-white font-bold py-2 rounded-lg disabled:opacity-60">{saving ? "保存中…" : "保存"}</button>
          <button onClick={() => setEditing(false)} className="text-sm bg-gray-100 px-4 rounded-lg">やめる</button>
        </div>
      </section>
    );
  }

  return (
    <section className="card border-l-4 border-amber-400 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm mb-1.5">🎯 今日のフォーカス</div>

        {/* 昨夜、自分で決めた「今日の夜こうなっていたい」。何をやるかより先に置く */}
        {lastNight && (
          <div className="mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <div className="text-[10px] text-amber-700 font-bold">昨夜きみが決めた・今日の最優先感情</div>
            <div className="text-base font-bold text-amber-800 leading-snug">{lastNight.emotion}</div>
            {/*
              「昨日そう言ってたね」と思い返せるだけの短さにする。
              以前は、夜の会話がまるごと入った値をそのまま出していたので、
                「清瀬リンク：おつかれさま🌙 今日を一緒に閉じよう。…本人：そうね。今日は…」
              が朝いちの画面に貼りついていた。読むところではないのに長い。
              保存する側は直したが、**もう保存されてしまったぶん**はここで締める。
            */}
            {shortWhy(lastNight.why) && (
              <div className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{shortWhy(lastNight.why)}</div>
            )}
            {(() => {
              const acts = tidyActions(lastNight.actions);
              return acts.length > 0 ? (
                <div className="text-[11px] text-gray-600 mt-1">決めたこと：{acts.join("／")}</div>
              ) : null;
            })()}
          </div>
        )}

        {empty ? (
          <p className="text-xs text-gray-500 leading-relaxed">
            {lastNight
              ? "上の感情が、今日の狙い。ほかに決めたいことがあれば右の ✎ から。"
              : <>まだ今日の狙いは決まってないみたい。<br />夜の振り返りで「明日の感情」を決めると、翌朝ここに出るよ。</>}
          </p>
        ) : (
          <div className="space-y-1.5">
            {focus!.emotion && (
              <div className="text-sm"><span className="text-xs text-amber-600 font-bold mr-1.5">感情</span>{focus!.emotion}</div>
            )}
            {focus!.priority && (
              <div className="text-sm"><span className="text-xs text-amber-600 font-bold mr-1.5">最優先</span>⭐ {focus!.priority}</div>
            )}
          </div>
        )}
      </div>
      <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-amber-600 shrink-0" title="編集">✎</button>
    </section>
  );
}

// SVG 円形プログレスリング (100%超え時はゴールド色)
function ProgressRing({
  percent, size = 120, stroke = 12, centerLabel, accentOver,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  centerLabel?: string;
  accentOver?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c * (1 - clamped / 100);
  const gradId = `pg-grad-${size}-${accentOver ? "over" : "norm"}`;
  return (
    <svg width={size} height={size} className="shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          {accentOver ? (
            <>
              <stop offset="0%" stopColor="#f6c84c" />
              <stop offset="100%" stopColor="#e69500" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-dark)" />
            </>
          )}
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece8f7" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={`url(#${gradId})`} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .5s ease" }}
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill={accentOver ? "#b87600" : "var(--accent-dark)"}
        fontSize={size * 0.26} fontWeight={800}
      >
        {centerLabel ?? `${clamped}%`}
      </text>
    </svg>
  );
}

function DailyProgress({
  progress, onRefresh,
}: {
  progress: TodayProgress;
  onRefresh: () => void;
}) {
  const { pct, pctClamped, baselineMin, completedMin, baselineCount, completedCount } = progress;
  const isOver = pct > 100;
  return (
    <section className="card flex items-center gap-4 flex-wrap">
      <ProgressRing
        percent={pctClamped}
        size={120}
        centerLabel={`${pct}%`}
        accentOver={isOver}
      />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-base">
          🎯 今日の進捗
          {isOver && <span className="ml-2 text-xs text-amber-600 font-normal">🎉 ベース超え！</span>}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {completedCount}/{baselineCount} 完了
          ／ {Math.floor(completedMin / 60)}h{completedMin % 60}m 済
          ／ ベース {Math.floor(baselineMin / 60)}h{baselineMin % 60}m
        </div>
        <div className="text-[11px] text-gray-400 mt-1">
          ※「今日終わらす」タスクと自動連動・1日マイでリセット
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onRefresh}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            🔄 反映
          </button>
        </div>
      </div>
    </section>
  );
}
