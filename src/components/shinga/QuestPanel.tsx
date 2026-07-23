"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { VoiceInput } from "./VoiceInput";
import type { TaskCandidate, TimeKey } from "@/lib/questToTasks";

type Quest = {
  id: string;
  title: string;
  body: string;
  status: string;
  source_conversation_id: number | null;
};

const TIME_LABEL: Record<TimeKey, string> = {
  quick: "すぐ",
  mid: "30分〜1時間",
  long: "1〜3時間",
};

/**
 * 可能性の空（クエスト）と、心の宝（振り返り）で開く道具。
 * 会話でここへ来たときに開くので、入口ボタンは持たない。
 */
export function QuestPanel({ bump, reflectMode, embedded }: { bump?: number; reflectMode?: boolean; embedded?: boolean }) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [taskCounts, setCounts] = useState<Record<string, number>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/quests");
      const d = await r.json();
      if (!r.ok) { setMsg(d?.error ?? "読み込めませんでした"); return; }
      setQuests(d.quests ?? []);
      setCounts(d.taskCounts ?? {});
      setMsg(null);
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    }
  }, []);

  // 会話の中でクエストが置かれたら、その場で反映する
  useEffect(() => { load(); }, [load, bump]);

  async function addQuest() {
    const t = title.trim();
    if (!t) return;
    await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title: t }),
    });
    setTitle("");
    load();
  }

  return (
    <div className={embedded ? "" : "singa-panel"}>
      {!embedded && (
        <div className="singa-panel-title">
          {reflectMode ? "やってみたこと" : "置いてあるもの"}
        </div>
      )}

      {msg && <div className="text-[11px] opacity-80 mb-2">{msg}</div>}

      {quests.length === 0 ? (
        <p className="text-xs leading-relaxed opacity-75">
          {reflectMode
            ? "まだ振り返るものがありません。"
            : "まだ何も置かれていません。やってみたいことを話すと、ここに置かれます。"}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {quests.map((q) => (
            <li key={q.id}>
              <button
                onClick={() => setOpenId(openId === q.id ? null : q.id)}
                className="singa-quest"
              >
                <span className="t">{q.title}</span>
                {(taskCounts[q.id] ?? 0) > 0 && (
                  <span className="n">{taskCounts[q.id]}</span>
                )}
              </button>
              {openId === q.id && (
                <QuestDetail
                  quest={q}
                  reflectMode={reflectMode}
                  onChanged={load}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!reflectMode && (
        <div className="flex items-center gap-1.5 mt-3">
          <VoiceInput mode="quest" compact onText={(t) => setTitle((p) => (p ? p + " " + t : t))} />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) addQuest(); }}
            placeholder="自分で書く"
            className="flex-1 singa-textarea"
          />
        </div>
      )}
    </div>
  );
}

function QuestDetail({
  quest, reflectMode, onChanged,
}: {
  quest: Quest;
  reflectMode?: boolean;
  onChanged: () => void;
}) {
  const [candidates, setCandidates] = useState<(TaskCandidate & { on: boolean; key: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);

  async function suggest() {
    setLoading(true);
    try {
      const r = await fetch("/api/quests/suggest-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId: quest.id }),
      });
      const d = await r.json();
      setCandidates((d.candidates ?? []).map((c: TaskCandidate, i: number) => ({
        ...c, on: true, key: `c${i}`,
      })));
    } finally {
      setLoading(false);
    }
  }

  async function push() {
    const picked = candidates.filter((c) => c.on && c.title.trim());
    if (picked.length === 0) return;
    for (const c of picked) {
      await fetch("/api/tasks", {
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
          sourceType: "quest",
          sourceQuestId: quest.id,
          sourceConversationId: quest.source_conversation_id ?? null,
        }),
      });
    }
    setAdded(picked.length);
    setCandidates([]);
    onChanged();
  }

  async function saveReflection() {
    const body = reflection.trim();
    if (!body) return;
    await fetch("/api/quests/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId: quest.id, body }),
    });
    setReflection("");
    setSaved(true);
  }

  if (reflectMode) {
    return (
      <div className="singa-quest-detail">
        {quest.body && <p className="text-[11px] opacity-75 mb-1.5">{quest.body}</p>}
        {saved ? (
          <p className="text-[11px] opacity-80">残しました。</p>
        ) : (
          <>
            <div className="flex items-start gap-1.5">
              <VoiceInput mode="reflect" compact onText={(t) => setReflection((p) => (p ? p + " " + t : t))} />
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={3}
                placeholder="やってみて、どうだった？"
                className="flex-1 singa-textarea"
              />
            </div>
            <button onClick={saveReflection} disabled={!reflection.trim()} className="singa-panel-btn">
              残す
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="singa-quest-detail">
      {quest.body && <p className="text-[11px] opacity-75 mb-1.5">{quest.body}</p>}

      {added !== null ? (
        <p className="text-[11px]">
          {added}件をリアルバースに渡しました。
          <Link href="/" className="underline font-bold ml-1">見に行く</Link>
        </p>
      ) : candidates.length === 0 ? (
        <button onClick={suggest} disabled={loading} className="singa-panel-btn is-cross">
          {loading ? "考えています…" : "リアルバースに落とし込む"}
        </button>
      ) : (
        <>
          {candidates.map((c) => (
            <div key={c.key} className={`singa-cand ${c.on ? "" : "is-off"}`}>
              <input
                type="checkbox"
                checked={c.on}
                onChange={(e) =>
                  setCandidates((cs) => cs.map((x) => (x.key === c.key ? { ...x, on: e.target.checked } : x)))
                }
              />
              <div className="flex-1 min-w-0">
                <input
                  value={c.title}
                  onChange={(e) =>
                    setCandidates((cs) => cs.map((x) => (x.key === c.key ? { ...x, title: e.target.value } : x)))
                  }
                  className="w-full singa-textarea"
                />
                <div className="flex gap-1.5 mt-1 text-[10px] items-center">
                  <input
                    type="date"
                    value={c.due}
                    onChange={(e) =>
                      setCandidates((cs) => cs.map((x) => (x.key === c.key ? { ...x, due: e.target.value } : x)))
                    }
                    className="singa-textarea"
                  />
                  <span className="opacity-60">{TIME_LABEL[c.time]}</span>
                </div>
              </div>
            </div>
          ))}
          <button onClick={push} className="singa-panel-btn is-cross">
            リアルバースに渡す
          </button>
        </>
      )}
    </div>
  );
}
