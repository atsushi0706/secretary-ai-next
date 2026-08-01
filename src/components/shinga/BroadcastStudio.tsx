"use client";

/**
 * 発信スタジオ：ワークの体験を、フォロワーに役立つカルーセル投稿へ。
 *
 * - 「今日の素材からつくる」1ボタン。編集者AIが企画から決める（型に流し込まない）
 * - できた投稿はスライドをタップして手直しできる
 * - 画像は 1080×1350（4:5）。プレビューと書き出しは同じHTMLなので、見たまま保存される
 * - 最後に署名スライド（主人公像＋メソッド名＋紹介リンク）を自動で付ける
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type BroadcastPost, type Method, type Slide, type SlideTheme, THEMES,
} from "@/lib/broadcast-types";
import { slideHtml, type SlideMeta } from "./slide-render";

/* スライド描画は slide-render.ts（プレビューと書き出しで同一HTML） */

/* ────────────────── PNG書き出し（SVG foreignObject → canvas。ライブラリ不要） */

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url, { mode: "cors" })).blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => res(null);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function exportPng(html: string, filename: string): Promise<boolean> {
  try {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
      <foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${html}</div></foreignObject></svg>`;
    const img = new Image();
    const ok = await new Promise<boolean>((res) => {
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
    if (!ok) return false;
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = filename;
    a.click();
    return true;
  } catch { return false; }
}

/* ────────────────── 本体 */

export function BroadcastStudio({ guideName, onBack }: { guideName: string; onBack: () => void }) {
  const [posts, setPosts] = useState<BroadcastPost[]>([]);
  const [method, setMethod] = useState<Method | null>(null);
  const [meta, setMeta] = useState<SlideMeta>({ penName: "", avatar: null, heroLine: "", methodName: "", refUrl: "" });
  const [cur, setCur] = useState<BroadcastPost | null>(null);
  const [theme, setTheme] = useState<SlideTheme>("night");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [methodDraft, setMethodDraft] = useState({ name: "", tagline: "" });
  const [methodOpen, setMethodOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await (await fetch("/api/broadcast")).json();
        if (d.needsMigration) setNeedsMigration(true);
        setPosts(d.posts ?? []);
        setMethod(d.method ?? null);
        if (d.method) setMethodDraft({ name: d.method.name, tagline: d.method.tagline });
        // 主人公像（署名スライド用）
        let heroLine = "";
        try {
          const h = await (await fetch("/api/hero")).json();
          heroLine = h?.hero?.hero_statement ?? "";
        } catch { /* 無くてもよい */ }
        // アバターは書き出しで使うため dataURL 化しておく（外部URLのままだと保存できない）
        const avatar = d.avatar ? await toDataUrl(d.avatar) : null;
        setMeta({
          penName: d.penName || "", avatar, heroLine,
          methodName: d.method?.name ?? "", refUrl: d.refUrl ?? "",
        });
      } catch { /* 開けなくても画面は出す */ }
    })();
  }, []);

  // 署名スライドを末尾に足した表示用スライド列
  const slidesWithSig = useMemo<Slide[]>(() => {
    if (!cur) return [];
    const base = cur.slides.filter((s) => s.kind !== "signature");
    return [...base, { kind: "signature" as const }];
  }, [cur]);

  async function generate() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/broadcast", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "生成に失敗");
      setPosts((p) => [d.post, ...p]);
      setCur(d.post);
      setEditIdx(null);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally { setBusy(false); }
  }

  function patchSlide(i: number, patch: Partial<Slide>) {
    if (!cur) return;
    const slides = cur.slides.map((s, j) => (j === i ? { ...s, ...patch } : s));
    const next = { ...cur, slides };
    setCur(next);
    setPosts((ps) => ps.map((p) => (p.id === next.id ? next : p)));
    // 少し待ってからまとめて保存（打つたびに通信しない）
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(next), 900);
  }
  function patchCaption(v: string) {
    if (!cur) return;
    const next = { ...cur, caption: v };
    setCur(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(next), 900);
  }
  async function persist(p: BroadcastPost) {
    setSaving(true);
    try {
      await fetch("/api/broadcast", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, slides: p.slides, caption: p.caption }),
      });
    } catch { /* 次の編集で再保存される */ } finally { setSaving(false); }
  }

  async function saveImages() {
    if (!cur) return;
    setBusy(true); setErr("");
    let okAll = true;
    for (let i = 0; i < slidesWithSig.length; i++) {
      const html = slideHtml(slidesWithSig[i], theme, meta, i + 1, slidesWithSig.length);
      const ok = await exportPng(html, `singa-${cur.date}-${String(i + 1).padStart(2, "0")}.png`);
      okAll = okAll && ok;
      await new Promise((r) => setTimeout(r, 350)); // 連続ダウンロードのブロック回避
    }
    if (!okAll) setErr("一部の画像を保存できなかった。うまくいかないときはスライドをスクショしてね。");
    setBusy(false);
  }

  async function copyCaption() {
    if (!cur) return;
    const tags = (cur.hashtags ?? []).map((h) => `#${h}`).join(" ");
    try { await navigator.clipboard.writeText(`${cur.caption}\n\n${tags}`.trim()); } catch { /* ignore */ }
  }

  async function saveMethodDraft() {
    const r = await fetch("/api/broadcast/method", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(methodDraft),
    });
    const d = await r.json();
    if (r.ok) { setMethod(d.method); setMeta((m) => ({ ...m, methodName: d.method?.name ?? "" })); setMethodOpen(false); }
  }

  async function removePost(id: number) {
    await fetch("/api/broadcast", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setPosts((p) => p.filter((x) => x.id !== id));
    if (cur?.id === id) setCur(null);
  }

  /* ── 一覧画面 ── */
  if (!cur) {
    return (
      <div className="bc-screen">
        <button className="singa-back" onClick={onBack}>← 地図にもどる</button>
        <div className="bc-head">
          <h2>📣 発信スタジオ</h2>
          <p className="bc-lead">
            ワークで起きたことを、{guideName}が編集者になって<b>フォロワーの役に立つ投稿</b>に変換するよ。
            きみの体験は素材。そのまま外には出さない。
          </p>
        </div>

        {needsMigration && (
          <p className="bc-err">データベースの準備がまだ（supabase/parts-and-cards.sql を実行してね）</p>
        )}

        {/* メソッド：育てる看板 */}
        <div className="bc-method">
          {method?.name ? (
            <button className="bcm-row" onClick={() => setMethodOpen((v) => !v)}>
              <span className="bcm-name">🧭 {method.name}</span>
              <span className="bcm-count">
                資産 {Object.values(method.assets).reduce((a, b) => a + b.length, 0)}個
              </span>
            </button>
          ) : (
            <button className="bcm-row is-empty" onClick={() => setMethodOpen((v) => !v)}>
              🧭 きみのメソッドに名前を付ける（例：人生脚本を書き換える）
            </button>
          )}
          {methodOpen && (
            <div className="bcm-edit">
              <input value={methodDraft.name} onChange={(e) => setMethodDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="メソッド名（例：人生脚本を書き換える）" />
              <input value={methodDraft.tagline} onChange={(e) => setMethodDraft((d) => ({ ...d, tagline: e.target.value }))}
                placeholder="一言説明（任意）" />
              <button onClick={() => void saveMethodDraft()}>保存</button>
              {method && Object.values(method.assets).some((a) => a.length > 0) && (
                <div className="bcm-assets">
                  {method.assets.principles.slice(-3).map((p, i) => <span key={`p${i}`} className="a-chip">原理：{p}</span>)}
                  {method.assets.phrases.slice(-3).map((p, i) => <span key={`f${i}`} className="a-chip">言葉：{p}</span>)}
                  {method.assets.questions.slice(-2).map((p, i) => <span key={`q${i}`} className="a-chip">問い：{p}</span>)}
                </div>
              )}
            </div>
          )}
        </div>

        <button className="bc-generate" onClick={() => void generate()} disabled={busy}>
          {busy ? "編集会議中…（企画を選んでいます）" : "✨ 今日の素材から投稿をつくる"}
        </button>
        {err && <p className="bc-err">{err}</p>}

        {posts.length > 0 && (
          <div className="bc-list">
            {posts.map((p) => (
              <button key={p.id} className="bc-item" onClick={() => { setCur(p); setEditIdx(null); }}>
                <span className="bi-title">{p.title || p.angle}</span>
                <span className="bi-sub">{p.date}・{p.angle}・{(p.slides?.length ?? 0) + 1}枚</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── 投稿ビュー ── */
  const editing = editIdx != null && editIdx < cur.slides.length ? cur.slides[editIdx] : null;
  return (
    <div className="bc-screen">
      <button className="singa-back" onClick={() => setCur(null)}>← 投稿一覧へ</button>
      <div className="bc-post-head">
        <div className="bp-title">{cur.title || cur.angle}</div>
        <div className="bp-sub">企画：{cur.angle} ／ {cur.format}{saving ? "・保存中…" : ""}</div>
      </div>

      <div className="bc-toolbar">
        {THEMES.map((t) => (
          <button key={t.key} className={`bc-theme ${theme === t.key ? "on" : ""}`} onClick={() => setTheme(t.key)}>{t.label}</button>
        ))}
        <span className="bc-sp" />
        <button className="bc-act" onClick={() => void saveImages()} disabled={busy}>{busy ? "書き出し中…" : "🖼 画像を保存"}</button>
        <button className="bc-act" onClick={() => void copyCaption()}>📋 本文コピー</button>
        <button className="bc-act is-danger" onClick={() => void removePost(cur.id)}>削除</button>
      </div>

      {/* カルーセル：横スクロール。タップで編集 */}
      <div className="bc-slides">
        {slidesWithSig.map((s, i) => (
          <div key={i} className={`bc-slidewrap ${editIdx === i ? "is-edit" : ""}`}
            onClick={() => setEditIdx(s.kind === "signature" ? null : i)}>
            <div className="bc-slideinner"
              dangerouslySetInnerHTML={{ __html: slideHtml(s, theme, meta, i + 1, slidesWithSig.length) }} />
            {s.kind !== "signature" && <span className="bc-tapedit">タップで編集</span>}
          </div>
        ))}
      </div>

      {/* 編集パネル（選んだスライドの下に出る） */}
      {editing && editIdx != null && (
        <div className="bc-editor">
          {editing.title != null || ["cover", "body", "list", "compare", "ask", "manga"].includes(editing.kind) ? (
            <label>見出し
              <input value={editing.title ?? ""} onChange={(e) => patchSlide(editIdx, { title: e.target.value })} />
            </label>
          ) : null}
          {editing.kind !== "list" && editing.kind !== "compare" && editing.kind !== "manga" && (
            <label>本文
              <textarea rows={3} value={editing.body ?? ""} onChange={(e) => patchSlide(editIdx, { body: e.target.value })} />
            </label>
          )}
          {(editing.kind === "list" || editing.kind === "compare") && (
            <label>項目（1行1つ{editing.kind === "compare" ? "。左|右 の形" : ""}）
              <textarea rows={4} value={(editing.items ?? []).join("\n")}
                onChange={(e) => patchSlide(editIdx, { items: e.target.value.split("\n") })} />
            </label>
          )}
          {editing.kind === "manga" && (editing.panels ?? []).map((p, pi) => (
            <label key={pi}>コマ{pi + 1}のセリフ（{p.speaker}）
              <input value={p.line} onChange={(e) => {
                const panels = (editing.panels ?? []).map((x, xi) => (xi === pi ? { ...x, line: e.target.value } : x));
                patchSlide(editIdx, { panels });
              }} />
            </label>
          ))}
          <button className="bc-close-edit" onClick={() => setEditIdx(null)}>編集を閉じる</button>
        </div>
      )}

      {/* キャプション */}
      <div className="bc-caption">
        <div className="cap-head">投稿本文（キャプション）</div>
        <textarea rows={4} value={cur.caption} onChange={(e) => patchCaption(e.target.value)} />
        <div className="cap-tags">{(cur.hashtags ?? []).map((h) => `#${h}`).join(" ")}</div>
      </div>
    </div>
  );
}
