"use client";

import { useEffect, useMemo, useState } from "react";
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
  { key: "crystal", label: "クリスタルルーム" },
  { key: "money", label: "マネーオーダー" },
  { key: "reflect", label: "ワールドリプレイ（夜の振り返り）" },
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
  const [grants, setGrants] = useState<Record<string, { all: boolean; except: string[] }>>({});
  const [grantBusy, setGrantBusy] = useState("");
  /**
   * 呼吸ガイドの音声の焼き直し。
   * 焼いた音声は全員に配られるので、読みや声を変えたら**ここで焼き直さないと**古いまま鳴る。
   */
  const [bake, setBake] = useState<{ baked: number; total: number } | null>(null);
  const [bakeBusy, setBakeBusy] = useState(false);
  const [bakeMsg, setBakeMsg] = useState("");
  /**
   * お試しスイッチ。新しいものは「淳くんだけ」から始めて、
   * 確かめてから全員に配る。
   */
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [flagDefs, setFlagDefs] = useState<{ key: string; label: string; note: string }[]>([]);
  const [flagBusy, setFlagBusy] = useState("");
  /**
   * データの控え。
   * 自動では取られないので、月に1回ここから落として保管しておく。
   * （以前は設定ページに置いていたが、運用の話なので管理画面にまとめた）
   */
  const [dlBusy, setDlBusy] = useState("");
  const [dlMsg, setDlMsg] = useState("");
  /** いまどれくらい貯まっているか（無料枠で続けられるかを、数字で見る） */
  const [usage, setUsage] = useState<{
    tables: { table: string; rows: number; bytes: number; week: number }[];
    totalBytes: number; weekRows: number; yearBytes: number; limitMB: number; monthsLeft: number | null;
  } | null>(null);
  const [usageOpen, setUsageOpen] = useState(false);
  const [grantMsg, setGrantMsg] = useState("");

  // 週刊レポートの承認待ち（OKを出すまで、本人には絶対に見えない）
  const [drafts, setDrafts] = useState<{ id: string; name: string; week_start: string; period?: string; body: string }[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [wkMsg, setWkMsg] = useState("");
  const [wkBusy, setWkBusy] = useState(false);
  /** 作り直し中の1通（ボタンを連打させない） */
  const [rebuilding, setRebuilding] = useState<string | null>(null);
  /** 「材料を見る」で開いた、その週の記録（手紙と見比べる用） */
  const [materials, setMaterials] = useState<Record<string, string>>({});
  /**
   * 承認待ちを**週ごと**に分ける。
   * 前は全部が一つの列に並び、送り忘れた先週ぶんと今週ぶんが混ざっていて、
   * 「先週は送らない」をやるのに1つずつチェックを外すしかなかった。
   * いちばん新しい週だけを最初からチェックし、古い週は外しておく。
   */
  const draftWeeks = useMemo(() => {
    const m = new Map<string, typeof drafts>();
    for (const d of drafts) m.set(d.week_start, [...(m.get(d.week_start) ?? []), d]);
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]))
      .map(([week_start, list]) => ({ week_start, period: list[0]?.period ?? week_start, list }));
  }, [drafts]);
  /**
   * 全員ぶんの週次レポートを、週ごとにまとめて読む場所。
   * 承認の欄は「まだ送っていないもの」しか出ないので、
   * 先週みんなに何を送ったのかを後から追えなかった。
   */
  const [allWeeks, setAllWeeks] = useState<{
    week_start: string;
    /** 人に見せる期間「8/22（土）〜8/28（金）」 */
    period?: string;
    reports: { id: string; name: string; body: string; status: string; facets?: any }[];
  }[]>([]);
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  // 速学力プレゼント企画の上位（数えるのに時間がかかるので、押したときだけ）
  const [rank, setRank] = useState<{ userId: string; name: string; total: number; days: number }[] | null>(null);
  const [rankBusy, setRankBusy] = useState(false);
  /** 速学力の贈り物（本の配布）。まず自分に送って確かめてから、上位10名へ */
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftMsg, setGiftMsg] = useState("");
  async function sendGift(test: boolean) {
    if (!test && !confirm("8月の上位10名に『速学力』の通知を送ります。よろしいですか？")) return;
    setGiftBusy(true); setGiftMsg("");
    try {
      const r = await fetch("/api/admin/gift", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const d = await r.json();
      if (!r.ok) { setGiftMsg(d.error || `HTTP ${r.status}`); return; }
      if (d.test) {
        setGiftMsg(d.sent > 0
          ? "自分に送りました。通知を開いて、ページとダウンロードを確かめてください"
          : "送れませんでした。この端末で通知を許可しているか確かめてください（found=" + d.found + "）");
      } else {
        const lines = (d.results ?? []).map((x: any) => `${x.rank}位 ${x.name}：通知${x.sent > 0 ? "送信" : "届かず（未許可）"}`);
        setGiftMsg(lines.join("　／　"));
      }
    } catch (e: any) { setGiftMsg(String(e?.message ?? e)); }
    finally { setGiftBusy(false); }
  }

  async function loadDrafts() {
    try {
      const r = await fetch("/api/admin/weekly");
      const d = await r.json();
      if (Array.isArray(d.drafts)) {
        setDrafts(d.drafts);
        // 既定は「いちばん新しい週」だけチェック。古い週（送り忘れ）は外しておく
        const newest = d.drafts.map((x: any) => String(x.week_start)).sort().pop();
        setPicked(Object.fromEntries(d.drafts.map((x: any) => [x.id, x.week_start === newest])));
      }
      if (Array.isArray(d.all)) {
        setAllWeeks(d.all);
        if (d.all.length) setOpenWeek((w) => w ?? d.all[0].week_start);   // いちばん新しい週は開けておく
      }
    } catch { /* 出せなくても他は動く */ }
  }

  /** その週の、チェックした人にだけ送る */
  async function approve(weekStart: string) {
    const ids = drafts.filter((d) => d.week_start === weekStart && picked[d.id]).map((d) => d.id);
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

  /** その週をまるごと、送らずに片づける（本人には何も届かない） */
  async function skipWeek(weekStart: string, label: string) {
    const ids = drafts.filter((d) => d.week_start === weekStart).map((d) => d.id);
    if (ids.length === 0) return;
    if (!confirm(`${label} の週（${ids.length}人ぶん）を、送らずに片づけます。本人には何も届きません。よろしいですか？`)) return;
    setWkBusy(true); setWkMsg("");
    try {
      const r = await fetch("/api/admin/weekly", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip", ids }),
      });
      const d = await r.json();
      if (!r.ok) { setWkMsg(d.error || `HTTP ${r.status}`); return; }
      setWkMsg(`${d.skipped}人ぶんを片づけました（送っていません）`);
      await loadDrafts();
    } catch (e: any) { setWkMsg(String(e?.message ?? e)); }
    finally { setWkBusy(false); }
  }

  /** 1通だけ、その週の記録で書き直す（短すぎたとき用） */
  async function rebuild(id: string) {
    if (rebuilding) return;
    setRebuilding(id); setWkMsg("");
    try {
      const r = await fetch("/api/admin/weekly", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rebuild", id }),
      });
      const d = await r.json();
      if (!r.ok) { setWkMsg(d.error || `HTTP ${r.status}`); return; }
      setDrafts((list) => list.map((x) => (x.id === id ? { ...x, body: d.body } : x)));
      setAllWeeks((weeks) => weeks.map((w) => ({ ...w, reports: w.reports.map((x) => (x.id === id ? { ...x, body: d.body, facets: d.facets } : x)) })));
      setWkMsg(d.status === "draft" ? "書き直しました。読んでから送ってください" : "書き直しました（送信ずみのものは、中身だけ差し替わりました）");
    } catch (e: any) { setWkMsg(String(e?.message ?? e)); }
    finally { setRebuilding(null); }
  }

  /** その1通の材料（その週の記録）を出す／しまう。手紙が記録に無いことを書いていないかを確かめる */
  async function showMaterial(id: string) {
    if (materials[id] !== undefined) { setMaterials((m) => { const n = { ...m }; delete n[id]; return n; }); return; }
    try {
      const r = await fetch("/api/admin/weekly", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "material", id }),
      });
      const d = await r.json();
      if (!r.ok) { setWkMsg(d.error || `HTTP ${r.status}`); return; }
      setMaterials((m) => ({ ...m, [id]: `【${d.period.from} 〜 ${d.period.to} の記録】\n${d.material}` }));
    } catch (e: any) { setWkMsg(String(e?.message ?? e)); }
  }

  function pickWeek(weekStart: string, on: boolean) {
    setPicked((p) => {
      const next = { ...p };
      for (const d of drafts) if (d.week_start === weekStart) next[d.id] = on;
      return next;
    });
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
    fetch("/api/admin/usage").then((r) => r.json()).then((d) => {
      if (Array.isArray(d?.tables)) setUsage(d);
    }).catch(() => {});
    fetch("/api/admin/flags").then((r) => r.json()).then((d) => {
      if (d?.flags) setFlags(d.flags);
      if (Array.isArray(d?.defs)) setFlagDefs(d.defs);
    }).catch(() => {});
    fetch("/api/tts/bake").then((r) => r.json()).then((d) => {
      setBake({ baked: Object.keys(d?.baked ?? {}).length, total: Number(d?.total ?? 0) });
    }).catch(() => {});
    fetch("/api/admin/grants").then((r) => r.json()).then((d) => {
      if (d?.grants) setGrants(d.grants);
    }).catch(() => {});
    loadDrafts();
  }, []);

  /** 控えを1つ落とす */
  async function download(scope: "mine" | "all", readable: boolean) {
    const tag = scope + (readable ? "-read" : "");
    setDlBusy(tag); setDlMsg(readable ? "並べ直しています…（少し時間がかかります）" : "");
    try {
      const q = [scope === "mine" ? "mine=1" : "", readable ? "read=1" : ""].filter(Boolean).join("&");
      const r = await fetch(`/api/admin/export${q ? `?${q}` : ""}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setDlMsg(d?.error ?? `取り出せませんでした（${r.status}）`);
        return;
      }
      const blob = await r.blob();
      const cd = r.headers.get("Content-Disposition") ?? "";
      // 日本語のファイル名（filename*=UTF-8''…）にも対応する
      const star = /filename\*=UTF-8''([^;]+)/.exec(cd)?.[1];
      const name = star
        ? decodeURIComponent(star)
        : (/filename="([^"]+)"/.exec(cd)?.[1] ?? (readable ? "記録.txt" : "backup.json"));
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url; a2.download = name; a2.click();
      URL.revokeObjectURL(url);
      setDlMsg(`${name}（${(blob.size / 1024 / 1024).toFixed(2)} MB）を保存しました`);
    } catch (e: any) { setDlMsg(String(e?.message ?? e)); }
    finally { setDlBusy(""); }
  }

  /** お試しスイッチを切り替える */
  async function setFlagState(key: string, state: string) {
    setFlagBusy(key);
    try {
      const r = await fetch("/api/admin/flags", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, state }),
      });
      const j = await r.json();
      if (r.ok && j?.flags) setFlags(j.flags);
    } catch { /* 失敗したら、いまの表示のまま */ }
    finally { setFlagBusy(""); }
  }

  /** 最近のエラー（お客様がつまずいた理由を、こちらで読めるように） */
  const [errs, setErrs] = useState<{
    rows: { id: number; at: string; route: string; who: string; message: string; meta: any }[];
    byRoute: Record<string, number>;
  } | null>(null);
  const [errRoute, setErrRoute] = useState("/api/stt");
  const [errBusy, setErrBusy] = useState(false);
  async function loadErrors(route: string) {
    setErrBusy(true);
    try {
      const r = await fetch(`/api/admin/errors?limit=50${route ? `&route=${encodeURIComponent(route)}` : ""}`);
      const d = await r.json();
      setErrs(r.ok ? d : { rows: [], byRoute: {} });
    } catch { setErrs({ rows: [], byRoute: {} }); }
    finally { setErrBusy(false); }
  }

  /** 呼吸ガイドの音声を焼き直す */
  async function rebake() {
    if (!confirm("呼吸ガイドの音声を、いまの読み・いまの声で焼き直します。1分ほどかかります。よろしいですか？")) return;
    setBakeBusy(true); setBakeMsg("焼いています…（1分ほどかかります）");
    try {
      const r = await fetch("/api/tts/bake", { method: "POST" });
      const d = await r.json();
      if (!r.ok) { setBakeMsg(d?.error ?? "焼けませんでした"); return; }
      setBake({ baked: Number(d.baked ?? 0), total: Number(d.total ?? 0) });
      setBakeMsg(d.ok
        ? `✅ ${d.baked}/${d.total} 本を焼き直しました。次に開いた人から、新しい音声で鳴ります。`
        : `${d.baked}/${d.total} 本まで焼けました。うまくいかなかったもの：${(d.failed ?? []).join(" / ")}`);
    } catch (e: any) { setBakeMsg(String(e?.message ?? e)); }
    finally { setBakeBusy(false); }
  }

  /** 全員まとめて開ける／閉じる（何百人でも1回で済む） */
  async function toggleAll(feature: string, on: boolean) {
    if (!confirm(on
      ? "発信スタジオを、**全員に開けます**。個別の例外はいったん消えます。よろしいですか？"
      : "発信スタジオを、**全員に鍵をかけます**。個別の例外はいったん消えます。よろしいですか？")) return;
    setGrantBusy("all" + feature); setGrantMsg("");
    try {
      const r = await fetch("/api/admin/grants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, scope: "all", on }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? "変更できませんでした");
      setGrants(j.grants ?? {});
      setGrantMsg(on ? "全員に開けました" : "全員に鍵をかけました");
    } catch (e: any) { setGrantMsg(String(e?.message ?? e)); }
    finally { setGrantBusy(""); }
  }

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
            週ごとに分けてあります。送り忘れた週は「送らずに片づける」でしまえます。
          </p>
          <div className="space-y-4">
            {draftWeeks.map((w, wi) => {
              const n = w.list.filter((d) => picked[d.id]).length;
              return (
                <div key={w.week_start} className={`rounded-lg border ${wi === 0 ? "border-purple-300 bg-white" : "border-gray-200 bg-gray-50"} p-3`}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <b className="text-sm">{w.period} の週</b>
                    <span className="text-xs text-gray-500">{w.list.length}人ぶん</span>
                    {wi === 0 && <span className="text-[10px] bg-purple-600 text-white rounded-full px-2 py-0.5">いちばん新しい</span>}
                    <span className="flex-1" />
                    <button type="button" className="text-xs underline text-gray-600" onClick={() => pickWeek(w.week_start, true)}>全部チェック</button>
                    <button type="button" className="text-xs underline text-gray-600" onClick={() => pickWeek(w.week_start, false)}>全部外す</button>
                  </div>
                  <div className="space-y-2 max-h-[360px] overflow-y-auto">
                    {w.list.map((d) => (
                      <div key={d.id} className="bg-white border rounded-lg p-3">
                        <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!picked[d.id]}
                            onChange={(e) => setPicked((p) => ({ ...p, [d.id]: e.target.checked }))} />
                          <b className="text-sm">{d.name}</b>
                          <span className="text-xs text-gray-400">{d.body.length}字</span>
                          <span className="flex-1" />
                          <button type="button" onClick={(e) => { e.preventDefault(); void showMaterial(d.id); }}
                            className="text-xs border border-gray-300 text-gray-600 rounded px-2 py-1">
                            {materials[d.id] !== undefined ? "材料をしまう" : "材料を見る"}
                          </button>
                          <button type="button" disabled={!!rebuilding || wkBusy}
                            onClick={(e) => { e.preventDefault(); void rebuild(d.id); }}
                            className="text-xs border border-purple-300 text-purple-700 rounded px-2 py-1 disabled:opacity-40">
                            {rebuilding === d.id ? "書き直し中…" : "↻ 作り直す"}
                          </button>
                        </label>
                        {materials[d.id] !== undefined && (
                          <pre className="text-[11px] bg-gray-50 border rounded p-2 mb-2 whitespace-pre-wrap overflow-x-auto">{materials[d.id]}</pre>
                        )}
                        <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{d.body}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => void approve(w.week_start)} disabled={wkBusy || n === 0}
                      className="flex-1 bg-purple-600 text-white font-bold text-sm py-2.5 rounded-lg disabled:opacity-50">
                      {wkBusy ? "送っています…" : `✓ この週の チェックした人に送る（${n}人）`}
                    </button>
                    <button onClick={() => void skipWeek(w.week_start, w.period)} disabled={wkBusy}
                      className="bg-white border border-gray-300 text-gray-700 text-xs font-bold px-3 rounded-lg disabled:opacity-50">
                      送らずに片づける
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 速学力プレゼント企画の上位 */}
      <div className="border rounded-xl bg-white p-4 mb-4">
        <div className="text-sm font-bold mb-1">✦ 速学力プレゼント企画の上位</div>
        <p className="text-xs text-gray-500 mb-3">
          ポイントは記録から数え直しています（貯めていません）。
          全員ぶん数えるので、少し時間がかかります。
        </p>
        <button
          className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded font-bold disabled:opacity-40"
          disabled={rankBusy}
          onClick={async () => {
            setRankBusy(true);
            try {
              const r = await fetch("/api/points?all=1");
              const j = await r.json();
              setRank(j.ranking ?? []);
            } catch { setRank([]); }
            finally { setRankBusy(false); }
          }}
        >
          {rankBusy ? "数えてる…" : rank ? "数え直す" : "上位を出す"}
        </button>
        {/* 本の配布。企画が終わったら、まず自分で確かめて、それから上位10名へ */}
        <div className="mt-3 border-t pt-3">
          <div className="text-xs font-bold mb-1">📕 『速学力』を配る（8月の上位10名）</div>
          <p className="text-[11px] text-gray-500 mb-2">
            通知を開くと贈り物ページ（1〜3位には順位入り）→ その場でダウンロードできます。
            ページ側でも上位10名かを数え直すので、他の人には見えません。
          </p>
          <div className="flex gap-2">
            <button className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded font-bold disabled:opacity-40"
              disabled={giftBusy} onClick={() => void sendGift(true)}>
              {giftBusy ? "送信中…" : "① まず自分に送って確かめる"}
            </button>
            <button className="text-xs bg-white border border-purple-400 text-purple-700 px-3 py-1.5 rounded font-bold disabled:opacity-40"
              disabled={giftBusy} onClick={() => void sendGift(false)}>
              ② 上位10名に送る
            </button>
          </div>
          {giftMsg && <p className="text-[11px] text-gray-700 mt-2 whitespace-pre-wrap">{giftMsg}</p>}
        </div>
        {rank && (
          <div className="mt-3 space-y-1">
            {rank.length === 0 && <p className="text-xs text-gray-500">まだポイントのある人がいません。</p>}
            {rank.map((r, i) => (
              <div key={r.userId}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                  i < 3 ? "bg-amber-50 border border-amber-300" : "bg-gray-50 border border-gray-200"}`}>
                <span className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold ${
                  i < 3 ? "bg-amber-500 text-white" : "bg-gray-300 text-gray-700"}`}>{i + 1}</span>
                <span className="flex-1 min-w-0 truncate">{r.name}</span>
                <span className="shrink-0 text-xs text-gray-500">{r.days}日</span>
                <span className="shrink-0 font-bold text-amber-700">{r.total}pt</span>
              </div>
            ))}
            {rank.length >= 3 && (
              <p className="text-[11px] text-gray-500 mt-2">
                上の3人が、いまの上位。景品は「非売品の電子書籍『速学力』」。
              </p>
            )}
          </div>
        )}
      </div>

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
                  <span>{w.period ?? w.week_start} の週　<span className="font-normal text-gray-500">{w.reports.length}人ぶん</span></span>
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
                          <span className="text-xs text-gray-400">{r.body.length}字</span>
                          <button type="button" onClick={() => void showMaterial(r.id)}
                            className="text-xs border border-gray-300 text-gray-600 rounded px-2 py-1">
                            {materials[r.id] !== undefined ? "材料をしまう" : "材料を見る"}
                          </button>
                          <button type="button" disabled={!!rebuilding || wkBusy}
                            onClick={() => void rebuild(r.id)}
                            className="text-xs border border-purple-300 text-purple-700 rounded px-2 py-1 disabled:opacity-40">
                            {rebuilding === r.id ? "書き直し中…" : "↻ 作り直す"}
                          </button>
                          <span className={`badge ${r.status === "draft"
                            ? "bg-amber-100 text-amber-700"
                            : r.status === "skipped" ? "bg-gray-200 text-gray-600"
                            : r.status === "approved" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                            {r.status === "draft" ? "未送信" : r.status === "skipped" ? "送らなかった" : r.status === "approved" ? "送信ずみ・未読" : "読んだ"}
                          </span>
                        </div>
                        {materials[r.id] !== undefined && (
                          <pre className="text-[11px] bg-gray-50 border rounded p-2 mb-2 whitespace-pre-wrap overflow-x-auto">{materials[r.id]}</pre>
                        )}
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

      {/* いまどれくらい貯まっているか */}
      {usage && (() => {
        const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
        const pct = Math.min(100, (usage.totalBytes / (usage.limitMB * 1024 * 1024)) * 100);
        const tight = usage.monthsLeft != null && usage.monthsLeft < 12;
        return (
          <div className="border rounded-xl p-4 bg-white mb-4">
            <div className="text-sm font-bold">📦 いま貯まっている量</div>
            <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full ${tight ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(1, pct)}%` }} />
            </div>
            <div className="text-xs text-gray-700 mt-2">
              約 <b>{mb(usage.totalBytes)} MB</b> / 無料枠 {usage.limitMB} MB（{pct.toFixed(1)}%）
            </div>
            <div className="text-xs text-gray-500 mt-1 leading-relaxed">
              直近1週間で <b>{usage.weekRows.toLocaleString()}</b> 件増えました。
              このペースなら1年で <b>約 {mb(usage.yearBytes)} MB</b> 増えます。
              {usage.monthsLeft != null && (
                <> 無料枠に届くのは <b>約 {usage.monthsLeft} か月後</b>の見込みです。</>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              ※ 1行の大きさは実物から測った平均なので、おおよその数字です。
            </p>
            <button className="text-xs text-purple-700 underline mt-2" onClick={() => setUsageOpen((v) => !v)}>
              {usageOpen ? "内訳を閉じる" : "内訳を見る"}
            </button>
            {usageOpen && (
              <div className="mt-2 space-y-1">
                {usage.tables.slice(0, 12).map((t) => (
                  <div key={t.table} className="flex items-center justify-between text-[11px] text-gray-600">
                    <span className="font-mono">{t.table}</span>
                    <span>{t.rows.toLocaleString()}件 ／ 約{mb(t.bytes)}MB{t.week > 0 && <span className="text-emerald-700">（+{t.week}）</span>}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* データの控え。運用の話なので、ここにだけ置く */}
      <div className="border rounded-xl p-4 bg-white mb-4">
        <div className="text-sm font-bold">🗄 データの控え</div>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          月に1回、落としてパソコンかクラウドに置いておくと安心です。<br />
          APIキーとGoogleの連携情報は、安全のためファイルに入れていません。<br />
          <b className="text-gray-700">話した内容がそのまま入ります。扱いにご注意ください。</b>
        </p>
        <div className="mt-3">
          <div className="text-xs font-bold text-gray-700 mb-1.5">読める形（名前・日付・部屋・やり取りが並びます）</div>
          <div className="flex gap-2">
            <button
              disabled={dlBusy !== ""}
              onClick={() => void download("mine", true)}
              className="flex-1 text-sm font-bold py-2.5 rounded-lg border border-purple-300 bg-white text-purple-700 disabled:opacity-40"
            >{dlBusy === "mine-read" ? "作成中…" : "📄 自分の記録"}</button>
            <button
              disabled={dlBusy !== ""}
              onClick={() => void download("all", true)}
              className="flex-1 text-sm font-bold py-2.5 rounded-lg bg-purple-600 text-white disabled:opacity-40"
            >{dlBusy === "all-read" ? "作成中…" : "📄 みんなの記録"}</button>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs font-bold text-gray-700 mb-1.5">
            まるごと（戻すとき用。開いても読みづらい形です）
          </div>
          <div className="flex gap-2">
            <button
              disabled={dlBusy !== ""}
              onClick={() => void download("mine", false)}
              className="flex-1 text-xs font-bold py-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-40"
            >⬇ 自分の分</button>
            <button
              disabled={dlBusy !== ""}
              onClick={() => void download("all", false)}
              className="flex-1 text-xs font-bold py-2 rounded-lg border border-gray-400 bg-gray-50 text-gray-700 disabled:opacity-40"
            >⬇ 全員分</button>
          </div>
        </div>
        {dlMsg && <div className="text-xs text-gray-700 mt-2 leading-relaxed">{dlMsg}</div>}
      </div>

      {/* お試しスイッチ：新しいものは、まず自分の画面だけで確かめる */}
      {flagDefs.length > 0 && (
        <div className="border rounded-xl p-4 bg-white mb-4">
          <div className="text-sm font-bold">🧪 お試しスイッチ</div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            新しく作ったものは、まず<b>あなたの画面だけ</b>に出ます。<br />
            触ってみてよければ「全員へ」を押すと、その場で全員に配られます。
          </p>
          <div className="mt-3 space-y-2">
            {flagDefs.map((f) => {
              const st = flags[f.key] ?? "admin";
              return (
                <div key={f.key} className="border rounded-lg p-3">
                  <div className="text-sm font-bold">{f.label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{f.note}</div>
                  <div className="flex gap-1.5 mt-2">
                    {([
                      ["admin", "自分だけ"],
                      ["all", "全員へ"],
                      ["off", "止める"],
                    ] as const).map(([v, label]) => (
                      <button key={v}
                        disabled={flagBusy === f.key}
                        onClick={() => void setFlagState(f.key, v)}
                        className={`flex-1 text-xs font-bold py-1.5 rounded-md border disabled:opacity-40 ${
                          st === v
                            ? v === "all" ? "bg-emerald-600 text-white border-emerald-600"
                              : v === "off" ? "bg-gray-700 text-white border-gray-700"
                              : "bg-amber-500 text-white border-amber-500"
                            : "bg-white text-gray-600 border-gray-300"}`}
                      >{label}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 呼吸ガイドの音声。読みや声を変えたら、ここで焼き直す */}
      <div className="border rounded-xl p-4 bg-white mb-4">
        <div className="text-sm font-bold">🎧 呼吸ガイドの音声</div>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          焼いた音声は<b>全員に同じものが配られます</b>（1回焼けば、あとは無料で鳴ります）。<br />
          読み方や声を変えたときは、ここで<b>焼き直さないと古いまま</b>鳴り続けます。
        </p>
        {bake && (
          <div className="text-xs text-gray-700 mt-2">
            いま焼けているもの：<b>{bake.baked}</b> / {bake.total} 本
            {bake.baked === 0 && <span className="text-amber-700">（まだ1本も焼けていません）</span>}
          </div>
        )}
        <button
          disabled={bakeBusy}
          onClick={() => void rebake()}
          className="mt-3 w-full bg-sky-600 text-white font-bold text-sm py-2.5 rounded-lg disabled:opacity-50"
        >
          {bakeBusy ? "焼いています…" : "🎧 音声を焼き直す"}
        </button>
        {bakeMsg && <div className="text-xs text-gray-700 mt-2 leading-relaxed">{bakeMsg}</div>}
      </div>

      {/*
        最近のエラー。
        「文字におこすところで失敗する」と言われても、読む画面が無くて確かめられなかった。
        音声の中身は残していない。何が起きたかと、そのときの条件だけ。
      */}
      <div className="border rounded-xl p-4 bg-white mb-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">🚨 最近のエラー</div>
          <button
            onClick={() => void loadErrors(errRoute)}
            disabled={errBusy}
            className="text-xs bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            {errBusy ? "読んでいます…" : "読み込む"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          お客様がつまずいたとき、ここに理由が残る。音声や会話の中身は残していない。
        </p>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {[["", "ぜんぶ"], ["/api/stt", "音声→文字"], ["/api/shinga/chat", "会話"], ["/api/meal", "食事"]].map(([r, label]) => (
            <button
              key={r}
              onClick={() => { setErrRoute(r); void loadErrors(r); }}
              className={`text-xs rounded-full px-3 py-1 border ${errRoute === r ? "bg-sky-600 text-white border-sky-600" : "bg-white text-gray-700 border-gray-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {errs && (
          <div className="mt-3">
            {Object.keys(errs.byRoute).length > 0 && (
              <div className="text-xs text-gray-600 mb-2">
                {Object.entries(errs.byRoute).map(([r, n]) => (
                  <span key={r} className="inline-block mr-3">{r}：<b>{n as number}</b>件</span>
                ))}
              </div>
            )}
            {errs.rows.length === 0 ? (
              <div className="text-xs text-gray-500">この範囲では、まだ出ていない。</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {errs.rows.map((e) => (
                  <div key={e.id} className="border border-gray-200 rounded-lg p-2.5">
                    <div className="flex justify-between text-[11px] text-gray-500">
                      <span>{e.route}　{e.who}</span>
                      <span>{new Date(e.at).toLocaleString("ja-JP")}</span>
                    </div>
                    <div className="text-xs text-gray-900 mt-1 leading-relaxed">{e.message}</div>
                    {e.meta && (
                      <pre className="text-[10px] text-gray-600 mt-1 whitespace-pre-wrap break-all">
                        {JSON.stringify(e.meta, null, 1)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 発信スタジオ：まず全員まとめて、必要なら個別に */}
      {(() => {
        const rule = grants.broadcast ?? { all: false, except: [] };
        return (
          <div className="border rounded-xl p-4 bg-white mb-4">
            <div className="text-sm font-bold">📣 発信スタジオ</div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              まず<b>全員まとめて</b>決めて、そこから外したい人だけ個別に変えます。<br />
              人数が増えても、ここを1回押すだけで済みます。親アカウントは常に使えます。
            </p>

            <div className="flex gap-2 mt-3">
              <button
                disabled={grantBusy === "allbroadcast"}
                onClick={() => void toggleAll("broadcast", true)}
                className={`flex-1 text-sm font-bold py-2.5 rounded-lg border disabled:opacity-40 ${
                  rule.all ? "bg-emerald-600 text-white border-emerald-600"
                           : "bg-white text-emerald-700 border-emerald-300"}`}
              >📣 全員に開ける</button>
              <button
                disabled={grantBusy === "allbroadcast"}
                onClick={() => void toggleAll("broadcast", false)}
                className={`flex-1 text-sm font-bold py-2.5 rounded-lg border disabled:opacity-40 ${
                  !rule.all ? "bg-gray-800 text-white border-gray-800"
                            : "bg-white text-gray-600 border-gray-300"}`}
              >🔒 全員に鍵</button>
            </div>

            <div className="text-xs text-gray-700 mt-3">
              いまの既定：<b>{rule.all ? "全員に開いている" : "全員に鍵"}</b>
              {rule.except.length > 0 && (
                <>
                  {" ／ "}
                  例外 <b>{rule.except.length}</b>人（
                  {rule.except
                    .map((id) => data?.users.find((u) => u.userId === id)?.name ?? id.slice(0, 8) + "…")
                    .join("、")}
                  ）は{rule.all ? "鍵" : "開いている"}
                </>
              )}
            </div>
            {grantMsg && <div className="text-xs text-emerald-700 mt-2">{grantMsg}</div>}
          </div>
        );
      })()}

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
                const rule = grants.broadcast ?? { all: false, except: [] };
                const isExcept = rule.except.includes(u.userId);
                const on = rule.all !== isExcept;   // 既定と例外の組み合わせ
                const busyNow = grantBusy === u.userId + "broadcast";
                return (
                  <button
                    disabled={busyNow}
                    onClick={() => toggleGrant("broadcast", u, !on)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-bold disabled:opacity-40 ${
                      on ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                         : "bg-gray-50 border-gray-300 text-gray-500"}`}
                  >
                    {busyNow ? "…"
                      : on ? `📣 発信スタジオ：開いている${isExcept ? "（この人だけ）" : ""}`
                           : `🔒 発信スタジオ：鍵${isExcept ? "（この人だけ）" : ""}`}
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
