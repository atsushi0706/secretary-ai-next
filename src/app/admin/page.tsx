"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminUser = {
  userId: string; name: string; email: string | null; callName: string | null; birthName: string | null;
  hasGoogle: boolean; hasGemini: boolean; hasAnthropic: boolean; authExpired: boolean; ntfy: boolean; push: boolean;
  createdAt: string | null; lastActive: string | null;
  counts: { shinga: number; walks: number; emotions: number; quests: number; talks: number; notifs: number };
};
type Overview = { totalUsers: number; users: AdminUser[]; generatedAt: string; missingColumns?: string[] };

// ワークの鍵に出す一覧（key は ModeKey と同じ）
const LOCKABLE: { key: string; label: string }[] = [
  { key: "peak", label: "ピークステート" },
  { key: "walk", label: "パラレルウォーク" },
  { key: "akashic", label: "アカシックレコーダー" },
  { key: "higher", label: "ハイヤークエスト" },
  { key: "deep", label: "ディープアイデンティティ" },
  { key: "travel", label: "パラレルトラベル" },
  { key: "breakthrough", label: "ウォールブレイク" },
  { key: "parts", label: "内なる子の神殿" },
  { key: "shadow", label: "ミラーオブワールド" },
  { key: "balance", label: "真ん中に戻す" },
];

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return s.length > 10 ? s.slice(0, 10) : s;
}

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [status, setStatus] = useState<"loading" | "unauth" | "forbidden" | "error" | "ok">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [reports, setReports] = useState<Record<string, { loading?: boolean; text?: string; err?: string }>>({});
  // ワークの鍵（全ユーザー共通。親アカウント＝管理者には効かない）
  const [locked, setLocked] = useState<string[]>([]);
  const [lockMsg, setLockMsg] = useState("");
  const [lockBusy, setLockBusy] = useState(false);
  /**
   * ひとりずつ開ける機能（発信スタジオ）。
   * 既定は全員に鍵。ここで「開ける」を押した人だけが使える。
   * grants = { broadcast: [userId, ...] }
   */
  const [grants, setGrants] = useState<Record<string, string[]>>({});
  const [grantBusy, setGrantBusy] = useState("");
  const [grantMsg, setGrantMsg] = useState("");

  // 週刊レポートの承認待ち（OKを出すまで、本人には絶対に見えない）
  const [drafts, setDrafts] = useState<{ id: string; name: string; week_start: string; body: string }[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [wkMsg, setWkMsg] = useState("");
  const [wkBusy, setWkBusy] = useState(false);
  /**
   * 全員ぶんの週次レポートを、週ごとにまとめて読む場所。
   * 承認の欄は「まだ送っていないもの」しか出ないので、
   * 先週みんなに何を送ったのかを後から追えなかった。
   */
  const [allWeeks, setAllWeeks] = useState<{
    week_start: string;
    reports: { id: string; name: string; body: string; status: string; facets?: any }[];
  }[]>([]);
  const [openWeek, setOpenWeek] = useState<string | null>(null);

  async function loadDrafts() {
    try {
      const r = await fetch("/api/admin/weekly");
      const d = await r.json();
      if (Array.isArray(d.drafts)) {
        setDrafts(d.drafts);
        setPicked(Object.fromEntries(d.drafts.map((x: any) => [x.id, true])));  // 既定は全部チェック
      }
      if (Array.isArray(d.all)) {
        setAllWeeks(d.all);
        if (d.all.length) setOpenWeek((w) => w ?? d.all[0].week_start);   // いちばん新しい週は開けておく
      }
    } catch { /* 出せなくても他は動く */ }
  }

  async function approve() {
    const ids = Object.entries(picked).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) { setWkMsg("送るものが選ばれていません"); return; }
    if (!confirm(`${ids.length}人にレポートを送ります。よろしいですか？`)) return;
    setWkBusy(true); setWkMsg("");
    try {
      const r = await fetch("/api/admin/weekly", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const d = await r.json();
      if (!r.ok) { setWkMsg(d.error || `HTTP ${r.status}`); return; }
      setWkMsg(`${d.approved}人に送信しました（通知${d.notified}件）`);
      await loadDrafts();
    } catch (e: any) { setWkMsg(String(e?.message ?? e)); }
    finally { setWkBusy(false); }
  }

  async function toggleLock(key: string) {
    if (lockBusy) return;
    const next = locked.includes(key) ? locked.filter((k) => k !== key) : [...locked, key];
    setLocked(next); setLockBusy(true); setLockMsg("");
    try {
      const r = await fetch("/api/admin/locks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: next }),
      });
      const d = await r.json();
      if (!r.ok) { setLockMsg(d.error || `HTTP ${r.status}`); return; }
      setLockMsg("保存した");
      setTimeout(() => setLockMsg(""), 1800);
    } catch (e: any) { setLockMsg(String(e?.message ?? e)); }
    finally { setLockBusy(false); }
  }

  async function genReport(u: AdminUser) {
    setReports((p) => ({ ...p, [u.userId]: { loading: true } }));
    try {
      const r = await fetch(`/api/admin/report?userId=${encodeURIComponent(u.userId)}&days=7`);
      const d = await r.json();
      if (!r.ok) { setReports((p) => ({ ...p, [u.userId]: { err: d.error || `HTTP ${r.status}` } })); return; }
      setReports((p) => ({ ...p, [u.userId]: { text: d.report } }));
    } catch (e: any) {
      setReports((p) => ({ ...p, [u.userId]: { err: String(e?.message ?? e) } }));
    }
  }

  async function load() {
    setStatus("loading");
    try {
      const r = await fetch("/api/admin/overview");
      if (r.status === 401) { setStatus("unauth"); return; }
      if (r.status === 403) { setStatus("forbidden"); return; }
      const text = await r.text();
      let d: any = null;
      try { d = text ? JSON.parse(text) : null; } catch { /* 非JSON応答（タイムアウト等） */ }
      if (!r.ok || !d) {
        setErrMsg(d?.error || (r.status >= 500 ? `サーバーが混み合っています（${r.status}）。少し待って「更新」を押してみて。` : `HTTP ${r.status}`));
        setStatus("error"); return;
      }
      setData(d); setStatus("ok");
    } catch (e: any) {
      setErrMsg(String(e?.message ?? e)); setStatus("error");
    }
  }
  useEffect(() => {
    load();
    fetch("/api/admin/locks").then((r) => r.json()).then((d) => {
      if (Array.isArray(d?.locked)) setLocked(d.locked.map(String));
    }).catch(() => {});
    fetch("/api/admin/grants").then((r) => r.json()).then((d) => {
      if (d?.grants) setGrants(d.grants);
    }).catch(() => {});
    loadDrafts();
  }, []);

  /** 発信スタジオを、この人に開ける／閉める */
  async function toggleGrant(feature: string, u: AdminUser, on: boolean) {
    setGrantBusy(u.userId + feature); setGrantMsg("");
    try {
      const r = await fetch("/api/admin/grants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, userId: u.userId, on }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? "変更できませんでした");
      setGrants(j.grants ?? {});
      setGrantMsg(`${u.name} の発信スタジオを${on ? "開けました" : "閉じました"}`);
    } catch (e: any) {
      setGrantMsg(String(e?.message ?? e));
    } finally { setGrantBusy(""); }
  }

  async function act(action: "disable-notify" | "delete", u: AdminUser) {
    if (action === "delete") {
      if (!confirm(`「${u.name}」を完全に削除します。会話・記録・設定すべてが消え、取り消せません。本当に削除しますか？`)) return;
    } else {
      if (!confirm(`「${u.name}」の通知（プッシュ／ntfy）を解除します。よろしいですか？`)) return;
    }
    setBusy(u.userId + action);
    try {
      const r = await fetch("/api/admin/user", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: u.userId }),
      });
      const d = await r.json();
      if (!r.ok) { alert(`失敗: ${d.error || r.status}`); return; }
      await load();
    } catch (e: any) {
      alert(`失敗: ${String(e?.message ?? e)}`);
    } finally {
      setBusy("");
    }
  }

  if (status === "loading") return <main className="p-6 text-sm">読み込み中…</main>;
  if (status === "unauth") {
    return (
      <main className="p-6 max-w-xl mx-auto">
        <h1 className="text-xl font-bold mb-2">ログインが必要です</h1>
        <p className="text-sm text-gray-600 mb-4">管理画面を見るには、Googleでログインしてください。</p>
        <Link href="/login" className="inline-block bg-[var(--accent)] text-white font-bold text-sm py-2 px-5 rounded-lg">ログインへ →</Link>
      </main>
    );
  }
  if (status === "forbidden") {
    return (
      <main className="p-6 max-w-xl mx-auto">
        <h1 className="text-xl font-bold mb-2">🔒 管理者専用</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          このページは管理者だけが開けます。あなたのアカウントは <code>ADMIN_USER_IDS</code> に登録されていません。
          自分のIDは <Link href="/me/id" className="text-purple-700 underline">/me/id</Link> で確認できます。
        </p>
        <Link href="/" className="text-sm text-purple-700 underline mt-4 inline-block">← ホームに戻る</Link>
      </main>
    );
  }
  if (status === "error") return <main className="p-6 text-sm text-red-600">エラー: {errMsg}</main>;

  const users = data?.users ?? [];
  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🛠 管理画面</h1>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-xs border rounded-lg px-3 py-1.5">↻ 更新</button>
          <Link href="/" className="text-xs text-purple-700 underline">← ホーム</Link>
        </div>
      </div>

      {/* 週刊レポートの承認。OKを出すまで、本人には絶対に届かない */}
      {drafts.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold">📋 週刊レポートの確認（{drafts.length}人ぶん）</div>
            <span className="text-xs text-gray-500">{wkMsg}</span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            読んでOKを出すと、その人に届きます。<b>OKを出すまでは誰にも見えません。</b>
            送りたくないものはチェックを外してください。
          </p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {drafts.map((d) => (
              <label key={d.id} className="block bg-white border rounded-lg p-3 cursor-pointer">
                <div className="flex items-center gap-2 mb-1.5">
                  <input type="checkbox" checked={!!picked[d.id]}
                    onChange={(e) => setPicked((p) => ({ ...p, [d.id]: e.target.checked }))} />
                  <b className="text-sm">{d.name}</b>
                  <span className="text-xs text-gray-400">{d.week_start} の週</span>
                </div>
                <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{d.body}</div>
              </label>
            ))}
          </div>
          <button onClick={() => void approve()} disabled={wkBusy}
            className="mt-3 w-full bg-purple-600 text-white font-bold text-sm py-2.5 rounded-lg disabled:opacity-50">
            {wkBusy ? "送っています…" : `✓ チェックした人に送る（${Object.values(picked).filter(Boolean).length}人）`}
          </button>
        </div>
      )}

      {/* 全員ぶんを、週ごとにまとめて読む（送りおえたものも含む） */}
      {allWeeks.length > 0 && (
        <div className="border rounded-xl bg-white p-4 mb-4">
          <div className="text-sm font-bold mb-1">📚 みんなの週次レポート（全員・週ごと）</div>
          <p className="text-xs text-gray-500 mb-3">
            送りおえたものも含めて、ここに全部並びます。週を押すと開きます。
          </p>
          {allWeeks.map((w) => {
            const open = openWeek === w.week_start;
            const yet = w.reports.filter((r) => r.status === "draft").length;
            return (
              <div key={w.week_start} className="border rounded-lg mb-2 overflow-hidden">
                <button
                  onClick={() => setOpenWeek(open ? null : w.week_start)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 text-sm font-bold"
                >
                  <span>{w.week_start} の週　<span className="font-normal text-gray-500">{w.reports.length}人ぶん</span></span>
                  <span className="flex items-center gap-2">
                    {yet > 0 && <span className="badge bg-amber-100 text-amber-700">未送信 {yet}</span>}
                    <span className="text-gray-400">{open ? "▲" : "▼"}</span>
                  </span>
                </button>
                {open && (
                  <div className="divide-y">
                    {w.reports.map((r) => (
                      <div key={r.id} className="p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <b className="text-sm">{r.name}</b>
                          <span className={`badge ${r.status === "draft"
                            ? "bg-amber-100 text-amber-700"
                            : r.status === "approved" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                            {r.status === "draft" ? "未送信" : r.status === "approved" ? "送信ずみ・未読" : "読んだ"}
                          </span>
                        </div>
                        {r.facets?.progressed?.length > 0 && (
                          <div className="text-[11px] text-gray-600 mb-1.5">
                            進んだこと：{r.facets.progressed.join(" / ")}
                          </div>
                        )}
                        <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{r.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 名前が出ない原因を、画面ではっきり出す（黙って握りつぶさない） */}
      {(data?.missingColumns?.length ?? 0) > 0 && (
        <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 mb-4">
          <div className="text-sm font-bold text-amber-800">⚠ 名前とメールが出ません</div>
          <p className="text-xs text-amber-900 mt-1 leading-relaxed">
            ログインのときに Google から名前とメールを受け取っていますが、
            保存先の列（<b>{data!.missingColumns!.join("・")}</b>）が
            user_settings にありません。そのため保存できず、ここに出せていません。<br />
            下のSQLを Supabase で1回実行すると、<b>次にその人がログインした時点から</b>名前が出ます。
          </p>
          <pre className="text-[11px] bg-white border rounded-lg p-2 mt-2 overflow-x-auto">{`alter table public.user_settings
  add column if not exists email text,
  add column if not exists display_name text;`}</pre>
        </div>
      )}

      {/* 発信スタジオの開放状況（既定は全員に鍵） */}
      <div className="border rounded-xl p-4 bg-white mb-4">
        <div className="text-sm font-bold">📣 発信スタジオ（ひとりずつ開ける）</div>
        <p className="text-xs text-gray-500 mt-1">
          既定は<b>全員に鍵</b>。下の一覧で「開ける」を押した人だけに出ます。親アカウントは常に使えます。
        </p>
        <div className="text-xs text-gray-700 mt-2">
          いま開いている人：<b>{(grants.broadcast ?? []).length}</b>人
          {(grants.broadcast ?? []).length > 0 && (
            <span className="text-gray-500">
              {" "}（{(grants.broadcast ?? [])
                .map((id) => data?.users.find((u) => u.userId === id)?.name ?? id.slice(0, 8) + "…")
                .join("、")}）
            </span>
          )}
        </div>
        {grantMsg && <div className="text-xs text-emerald-700 mt-2">{grantMsg}</div>}
      </div>

      {/* ワークの鍵：チェックを付けたワークは、管理者以外は開けなくなる */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold">🔑 ワークの鍵（親アカウント以外に効く）</div>
          <span className="text-xs text-gray-500">{lockMsg || (locked.length ? `${locked.length}個に施錠中` : "全部ひらいている")}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {LOCKABLE.map((w) => {
            const on = locked.includes(w.key);
            return (
              <button key={w.key} onClick={() => void toggleLock(w.key)} disabled={lockBusy}
                className={`text-xs rounded-full px-3 py-1.5 border ${on ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300"}`}>
                {on ? "🔒" : "🔓"} {w.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">🔒にしたワークは、ほかのユーザーの地図で鍵つきになり開けません。あなた（管理者）はいつでも全部使えます。</p>
      </div>

      <div className="flex gap-3 mb-4 text-sm">
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
          <div className="text-xs text-gray-500">登録ユーザー</div>
          <div className="font-bold text-lg text-purple-700">{data?.totalUsers ?? 0}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <div className="text-xs text-gray-500">通知ON</div>
          <div className="font-bold text-lg text-green-700">{users.filter((u) => u.push || u.ntfy).length}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="text-xs text-gray-500">Google連携</div>
          <div className="font-bold text-lg text-blue-700">{users.filter((u) => u.hasGoogle).length}</div>
        </div>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.userId} className="border rounded-xl p-4 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">
                  {u.name}
                  {u.callName && u.callName !== u.name && (
                    <span className="ml-2 font-normal text-xs text-gray-500">（{u.callName}）</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {u.email ?? (u.authExpired ? "（連携切れ・本人の再ログインで表示）" : "（メール未取得）")}
                </div>
                <div className="text-[10px] text-gray-400 font-mono truncate">{u.userId}</div>
              </div>
              <div className="flex flex-wrap gap-1 justify-end shrink-0">
                {u.hasGoogle && <span className={`badge ${u.authExpired ? "bg-gray-200 text-gray-500" : "bg-blue-100 text-blue-700"}`}>{u.authExpired ? "G✕連携切れ" : "G"}</span>}
                {u.hasGemini && <span className="badge bg-amber-100 text-amber-700">Gemini</span>}
                {u.hasAnthropic && <span className="badge bg-orange-100 text-orange-700">Claude</span>}
                {u.push && <span className="badge bg-green-100 text-green-700">🔔Push</span>}
                {u.ntfy && <span className="badge bg-green-50 text-green-600">ntfy</span>}
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 text-center">
              {([
                ["発言", u.counts.shinga], ["ウォーク", u.counts.walks], ["気分", u.counts.emotions],
                ["クエスト", u.counts.quests], ["会話", u.counts.talks], ["通知", u.counts.notifs],
              ] as const).map(([label, n]) => (
                <div key={label} className="bg-gray-50 rounded-lg py-1.5">
                  <div className="font-bold text-sm">{n}</div>
                  <div className="text-[10px] text-gray-500">{label}</div>
                </div>
              ))}
            </div>

            {/* ひとりずつ開ける機能。既定は鍵なので、押すまでこの人には出ない */}
            <div className="flex items-center gap-2 mt-3">
              {(() => {
                const on = (grants.broadcast ?? []).includes(u.userId);
                const busyNow = grantBusy === u.userId + "broadcast";
                return (
                  <button
                    disabled={busyNow}
                    onClick={() => toggleGrant("broadcast", u, !on)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-bold disabled:opacity-40 ${
                      on ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                         : "bg-gray-50 border-gray-300 text-gray-500"}`}
                  >
                    {busyNow ? "…" : on ? "📣 発信スタジオ：開いている（押すと閉じる）" : "🔒 発信スタジオ：鍵（押すと開ける）"}
                  </button>
                );
              })()}
            </div>

            <div className="flex items-center justify-between mt-3 text-[11px] text-gray-500">
              <span>登録: {fmtDate(u.createdAt)} ／ 最終: {fmtDate(u.lastActive)}</span>
              <div className="flex gap-2">
                <button
                  disabled={!!reports[u.userId]?.loading}
                  onClick={() => genReport(u)}
                  className="text-green-700 underline disabled:opacity-40"
                >{reports[u.userId]?.loading ? "作成中…" : "週次レポート"}</button>
                <button
                  disabled={busy !== ""}
                  onClick={() => act("disable-notify", u)}
                  className="text-purple-700 underline disabled:opacity-40"
                >通知解除</button>
                <button
                  disabled={busy !== ""}
                  onClick={() => act("delete", u)}
                  className="text-red-600 underline disabled:opacity-40"
                >削除</button>
              </div>
            </div>

            {reports[u.userId] && !reports[u.userId].loading && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                {reports[u.userId].err
                  ? <div className="text-xs text-red-600">レポート失敗: {reports[u.userId].err}</div>
                  : <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{reports[u.userId].text}</div>}
                <div className="text-[10px] text-gray-400 mt-2">※ 直近7日の実データから生成（推測なし）</div>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-gray-500">まだユーザーがいません。</p>}
      </div>

      <p className="text-[11px] text-gray-400 mt-6 leading-relaxed">
        ※ このデータは service_role（サーバー権限）で全ユーザーぶんを横断表示しています。
        「削除」は取り消せません（会話・記録・設定・画像すべて）。
      </p>

      <style jsx>{`
        .badge { font-size: 10px; padding: 2px 6px; border-radius: 999px; font-weight: 700; white-space: nowrap; }
      `}</style>
    </main>
  );
}
