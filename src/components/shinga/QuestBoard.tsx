"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { TaskCandidate, TimeKey } from "@/lib/questToTasks";

type QuestStatus = "idea" | "active" | "paused" | "done";

type Quest = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: QuestStatus;
  source_conversation_id: number | null;
  created_at: string;
  updated_at: string;
};

type Reflection = {
  id: number;
  quest_id: string;
  google_task_id: string | null;
  body: string;
  emotion_before: number | null;
  emotion_after: number | null;
  gap: string | null;
  next_step: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<QuestStatus, string> = {
  idea: "💭 芽",
  active: "🔥 進行中",
  paused: "⏸ 保留",
  done: "🏁 体験した",
};

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "life", label: "🌱 人生" },
  { key: "family", label: "👨‍👩‍👧 家族" },
  { key: "play", label: "🎈 遊び" },
  { key: "expression", label: "🎨 自己表現" },
  { key: "work", label: "💼 仕事" },
  { key: "habit", label: "🔁 習慣" },
];

function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? "🌱 人生";
}

const TIME_LABEL: Record<TimeKey, string> = {
  quick: "⚡すぐ",
  mid: "📅30分〜1時間",
  long: "🗓1〜3時間",
};

/** 提案されたタスク候補 + ユーザーの選択状態 */
type EditableCandidate = TaskCandidate & { selected: boolean; key: string };

let candidateSeq = 0;
function toEditable(c: TaskCandidate): EditableCandidate {
  return { ...c, selected: true, key: `c${candidateSeq++}` };
}

function emptyCandidate(todayStr: string): EditableCandidate {
  return toEditable({
    title: "",
    due: todayStr,
    time: "mid",
    urgency: "low",
    importance: "high",
  });
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function QuestBoard({ initialQuestId }: { initialQuestId?: string }) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(initialQuestId ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/quests");
      const d = await r.json();
      if (!r.ok) {
        setError(d?.error ?? `エラー (${r.status})`);
        setQuests([]);
        return;
      }
      setQuests(d.quests ?? []);
      setTaskCounts(d.taskCounts ?? {});
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = quests.find((q) => q.id === selectedId) ?? null;

  if (loading) {
    return <div className="card text-sm text-gray-500">クエストを読み込み中…</div>;
  }

  if (error) {
    return (
      <div className="card border-l-4 border-amber-400">
        <div className="font-bold text-sm text-amber-700">まだ準備ができていません</div>
        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{error}</p>
        <button onClick={load} className="mt-3 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">
          🔄 もう一度
        </button>
      </div>
    );
  }

  if (selected) {
    return (
      <QuestDetail
        quest={selected}
        taskCount={taskCounts[selected.id] ?? 0}
        onBack={() => setSelectedId(null)}
        onChanged={load}
        onDeleted={() => { setSelectedId(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Link href="/shinga" className="inline-block text-xs text-[rgba(107,85,53,.8)] hover:text-[var(--singa-gold)]">
        ← 地図に戻る
      </Link>
      <section className="card">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="singa-sub">The Sky of Possibilities</div>
            <h1 className="singa-heading font-bold text-lg mt-0.5">✦ クエスト｜可能性の空</h1>
            <p className="text-xs text-gray-500 mt-1">
              人生で体験したいこと・挑戦したいこと。仕事だけじゃなく、遊びも家族との時間も。
            </p>
          </div>
          <button
            onClick={() => setCreating((v) => !v)}
            className="shrink-0 bg-[var(--accent)] text-white text-sm font-bold px-3 py-2 rounded-xl hover:opacity-90"
          >
            {creating ? "×" : "＋ 新しいクエスト"}
          </button>
        </div>
        {creating && (
          <QuestForm
            onCancel={() => setCreating(false)}
            onSaved={(q) => { setCreating(false); load(); setSelectedId(q.id); }}
          />
        )}
      </section>

      {quests.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-3xl mb-2">🌱</div>
          <div className="text-sm text-gray-500">
            まだクエストがありません。<br />
            「本当はこれをやってみたい」と思っていることを、1つ置いてみてください。
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quests.map((q) => (
            <li key={q.id}>
              <button
                onClick={() => setSelectedId(q.id)}
                className="card w-full text-left hover:shadow-md hover:border-purple-200 transition"
              >
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                    {categoryLabel(q.category)}
                  </span>
                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {STATUS_LABEL[q.status]}
                  </span>
                  {(taskCounts[q.id] ?? 0) > 0 && (
                    <span className="ml-auto bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                      🌍 {taskCounts[q.id]}
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm mt-2 leading-snug">{q.title}</div>
                {q.body && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{q.body}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── クエストの作成 / 編集フォーム ────────────────────────────

function QuestForm({
  quest, onSaved, onCancel,
}: {
  quest?: Quest;
  onSaved: (q: Quest) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(quest?.title ?? "");
  const [body, setBody] = useState(quest?.body ?? "");
  const [category, setCategory] = useState(quest?.category ?? "life");
  const [status, setStatus] = useState<QuestStatus>(quest?.status ?? "active");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: quest ? "update" : "create",
          id: quest?.id,
          title, body, category, status,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? `エラー (${r.status})`); return; }
      onSaved(d.quest);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="例: 家族と自然の中で豊かな時間を過ごす"
        className="w-full p-2 border rounded-lg text-sm"
        autoFocus
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="なぜやりたい？ どんな状態になっていたい？（あとから書き足してOK）"
        rows={3}
        className="w-full p-2 border rounded-lg text-sm leading-relaxed"
      />
      <div className="flex gap-2 flex-wrap text-xs">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="p-1.5 border rounded">
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as QuestStatus)} className="p-1.5 border rounded">
          {(Object.keys(STATUS_LABEL) as QuestStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!title.trim() || saving}
          className="flex-1 bg-[var(--accent)] text-white text-sm font-bold py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? "保存中…" : quest ? "保存する" : "クエストを作る"}
        </button>
        <button onClick={onCancel} className="px-4 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
          やめる
        </button>
      </div>
    </div>
  );
}

// ── クエスト詳細 ────────────────────────────────────────────

function QuestDetail({
  quest, taskCount, onBack, onChanged, onDeleted,
}: {
  quest: Quest;
  taskCount: number;
  onBack: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);

  async function remove() {
    if (!confirm(`クエスト「${quest.title}」を削除する？\n（リアルバースのタスクは消えません）`)) return;
    await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: quest.id }),
    });
    onDeleted();
  }

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-xs text-gray-500 hover:text-purple-700">
        ← クエスト一覧へ
      </button>

      <section className="card">
        {editing ? (
          <QuestForm
            quest={quest}
            onCancel={() => setEditing(false)}
            onSaved={() => { setEditing(false); onChanged(); }}
          />
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                {categoryLabel(quest.category)}
              </span>
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {STATUS_LABEL[quest.status]}
              </span>
              {taskCount > 0 && (
                <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                  🌍 リアルバースに {taskCount} 件
                </span>
              )}
            </div>
            <h1 className="font-bold text-lg mt-2 leading-snug">{quest.title}</h1>
            {quest.body && (
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">{quest.body}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditing(true)}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
              >
                ✏️ 編集
              </button>
              <button
                onClick={remove}
                className="text-xs text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg"
              >
                🗑 削除
              </button>
            </div>
          </>
        )}
      </section>

      <DropToRealverse quest={quest} onAdded={onChanged} />

      <ReflectionSection quest={quest} />
    </div>
  );
}

// ── リアルバースに落とし込む ────────────────────────────────

function DropToRealverse({ quest, onAdded }: { quest: Quest; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<EditableCandidate[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function openAndSuggest() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setAdded(null);
    if (candidates.length > 0) return;
    setLoading(true);
    setErr(null);
    try {
      // ここが AI 差し替えポイント。レスポンス形が同じなら UI は変更不要。
      const r = await fetch("/api/quests/suggest-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId: quest.id }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? `エラー (${r.status})`); return; }
      setCandidates((d.candidates as TaskCandidate[]).map(toEditable));
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  function patch(key: string, fields: Partial<EditableCandidate>) {
    setCandidates((cs) => cs.map((c) => (c.key === key ? { ...c, ...fields } : c)));
  }

  async function addToRealverse() {
    const picked = candidates.filter((c) => c.selected && c.title.trim());
    if (picked.length === 0) return;
    setSaving(true);
    setErr(null);
    try {
      for (const c of picked) {
        const r = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add",
            title: c.title.trim(),
            due: c.due,
            category: "work",
            urgency: c.urgency,
            importance: c.importance,
            time: c.time,
            // ← タスクとクエストの紐づけ
            sourceType: "quest",
            sourceQuestId: quest.id,
            sourceConversationId: quest.source_conversation_id ?? null,
          }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d?.error ?? `タスク追加に失敗 (${r.status})`);
        }
      }
      setAdded(picked.length);
      setCandidates([]);
      setOpen(false);
      onAdded();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  const pickedCount = candidates.filter((c) => c.selected && c.title.trim()).length;

  return (
    // 2つの世界をつなぐ場所なので、ここだけリアルバースの色（青）にしている
    <section className="card border-l-4 border-[#1f6fc0]">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="singa-sub">Cross into the Realverse</div>
          <div className="font-bold text-sm mt-0.5">🧭 リアルバースに落とし込む</div>
          <div className="text-xs text-gray-500 mt-1">
            このクエストを実現するための、具体的な行動に変える。
          </div>
        </div>
        <button
          onClick={openAndSuggest}
          className="shrink-0 text-white text-sm font-bold px-3 py-2 rounded-xl hover:opacity-90 shadow"
          style={{ background: "linear-gradient(160deg, #3d97e0 0%, #1f6fc0 55%, #17559a 100%)" }}
        >
          {open ? "閉じる" : "落とし込む"}
        </button>
      </div>

      {added !== null && (
        <div className="mt-3 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg p-2.5">
          ✅ {added} 件をリアルバースに追加しました。
          <Link href="/" className="ml-1 font-bold underline">タスクボードで見る →</Link>
        </div>
      )}

      {open && (
        <div className="mt-3 pt-3 border-t space-y-2">
          {loading && <div className="text-xs text-gray-500">タスク候補を考え中…</div>}
          {err && <div className="text-xs text-red-600">{err}</div>}

          {!loading && candidates.length > 0 && (
            <>
              <div className="text-xs text-gray-500">
                使うものにチェック。タイトルも日付も自由に直せます。
              </div>
              <ul className="space-y-2">
                {candidates.map((c) => (
                  <li
                    key={c.key}
                    className={`rounded-xl border p-2.5 transition ${
                      c.selected ? "bg-purple-50/50 border-purple-200" : "bg-gray-50 border-gray-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={c.selected}
                        onChange={(e) => patch(c.key, { selected: e.target.checked })}
                        className="mt-2 shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input
                          value={c.title}
                          onChange={(e) => patch(c.key, { title: e.target.value })}
                          placeholder="やること"
                          className="w-full p-1.5 border rounded-lg text-sm bg-white"
                        />
                        <div className="flex gap-1.5 flex-wrap text-[11px] items-center">
                          <input
                            type="date"
                            value={c.due}
                            onChange={(e) => patch(c.key, { due: e.target.value })}
                            className="p-1 border rounded bg-white"
                          />
                          <select
                            value={c.time}
                            onChange={(e) => patch(c.key, { time: e.target.value as TimeKey })}
                            className="p-1 border rounded bg-white"
                          >
                            {(Object.keys(TIME_LABEL) as TimeKey[]).map((t) => (
                              <option key={t} value={t}>{TIME_LABEL[t]}</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={c.urgency === "high"}
                              onChange={(e) => patch(c.key, { urgency: e.target.checked ? "high" : "low" })}
                            />
                            緊急
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={c.importance === "high"}
                              onChange={(e) => patch(c.key, { importance: e.target.checked ? "high" : "low" })}
                            />
                            重要
                          </label>
                        </div>
                        {c.hint && <div className="text-[10px] text-gray-400">💡 {c.hint}</div>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setCandidates((cs) => [...cs, emptyCandidate(todayStr())])}
                className="w-full text-xs bg-gray-100 hover:bg-gray-200 py-2 rounded-lg"
              >
                ＋ 自分でタスクを足す
              </button>

              <button
                onClick={addToRealverse}
                disabled={pickedCount === 0 || saving}
                className="w-full text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 shadow"
                style={{ background: "linear-gradient(160deg, #3d97e0 0%, #1f6fc0 55%, #17559a 100%)" }}
              >
                {saving ? "追加中…" : `🧭 ${pickedCount} 件をリアルバースに追加`}
              </button>
            </>
          )}

          {!loading && candidates.length === 0 && !err && (
            <button
              onClick={() => setCandidates([emptyCandidate(todayStr())])}
              className="w-full text-xs bg-gray-100 hover:bg-gray-200 py-2 rounded-lg"
            >
              ＋ 自分でタスクを書く
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── 振り返り ────────────────────────────────────────────────

function ReflectionSection({ quest }: { quest: Quest }) {
  const [items, setItems] = useState<Reflection[]>([]);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [before, setBefore] = useState<number | "">("");
  const [after, setAfter] = useState<number | "">("");
  const [gap, setGap] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/quests/reflections?questId=${encodeURIComponent(quest.id)}`);
      const d = await r.json();
      if (r.ok) setItems(d.reflections ?? []);
    } catch { /* 一覧が取れなくても入力はできるようにする */ }
  }, [quest.id]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/quests/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questId: quest.id,
          body,
          emotionBefore: before === "" ? null : before,
          emotionAfter: after === "" ? null : after,
          gap: gap || null,
          nextStep: next || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? `エラー (${r.status})`); return; }
      setBody(""); setBefore(""); setAfter(""); setGap(""); setNext("");
      setOpen(false);
      load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-sm">🌌 シンガワールドで振り返る</div>
          <div className="text-xs text-gray-500 mt-1">
            動いてみてどうだったか。感情はどう変わったか。
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl"
        >
          {open ? "閉じる" : "＋ 記録する"}
        </button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="実際に行動してみて、どうだった？"
            className="w-full p-2 border rounded-lg text-sm leading-relaxed"
            autoFocus
          />
          <div className="flex gap-2 items-center text-xs flex-wrap">
            <label className="flex items-center gap-1">
              動く前
              <select
                value={before}
                onChange={(e) => setBefore(e.target.value === "" ? "" : Number(e.target.value))}
                className="p-1 border rounded"
              >
                <option value="">-</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <span className="text-gray-400">→</span>
            <label className="flex items-center gap-1">
              動いた後
              <select
                value={after}
                onChange={(e) => setAfter(e.target.value === "" ? "" : Number(e.target.value))}
                className="p-1 border rounded"
              >
                <option value="">-</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <span className="text-[10px] text-gray-400">（感情の10段階）</span>
          </div>
          <input
            value={gap}
            onChange={(e) => setGap(e.target.value)}
            placeholder="想像していた青写真と、現実の違いは？"
            className="w-full p-2 border rounded-lg text-sm"
          />
          <input
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="次はどんなクエストへ進みたい？"
            className="w-full p-2 border rounded-lg text-sm"
          />
          {err && <div className="text-xs text-red-600">{err}</div>}
          <button
            onClick={save}
            disabled={!body.trim() || saving}
            className="w-full bg-indigo-600 text-white text-sm font-bold py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? "保存中…" : "振り返りを残す"}
          </button>
        </div>
      )}

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((r) => (
            <li key={r.id} className="text-xs bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5">
              <div className="text-[10px] text-gray-400">
                {new Date(r.created_at).toLocaleString("ja-JP")}
                {r.emotion_before != null && r.emotion_after != null && (
                  <span className="ml-2 text-indigo-600 font-bold">
                    感情 {r.emotion_before} → {r.emotion_after}
                  </span>
                )}
              </div>
              <div className="mt-1 whitespace-pre-wrap leading-relaxed">{r.body}</div>
              {r.gap && <div className="mt-1 text-gray-500">青写真とのズレ: {r.gap}</div>}
              {r.next_step && <div className="mt-1 text-gray-500">次: {r.next_step}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
