"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type EmotionLog = {
  id: number;
  date: string;
  level: number;
  note: string;
  quest_id: string | null;
  created_at: string;
};

type Reflection = {
  id: number;
  quest_id: string;
  body: string;
  emotion_before: number | null;
  emotion_after: number | null;
  gap: string | null;
  next_step: string | null;
  created_at: string;
};

/** 1(重い) 〜 10(軽い) の色。低い方を青、高い方を暖色に。 */
function levelColor(n: number): string {
  if (n <= 3) return "#5b7fc2";
  if (n <= 5) return "#7a6dd6";
  if (n <= 7) return "#e0a82e";
  return "#e2574c";
}

const LEVEL_HINT: Record<number, string> = {
  1: "動けない",
  3: "重い",
  5: "ふつう",
  7: "軽い",
  10: "満ちている",
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RecordBoard() {
  const [emotions, setEmotions] = useState<EmotionLog[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [level, setLevel] = useState(5);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [re, rr] = await Promise.all([
        fetch("/api/emotions"),
        fetch("/api/quests/reflections"),
      ]);
      const de = await re.json();
      const dr = await rr.json().catch(() => ({}));
      if (!re.ok) { setErr(de?.error ?? `エラー (${re.status})`); }
      else { setEmotions(de.emotions ?? []); setErr(null); }
      if (rr.ok) setReflections(dr.reflections ?? []);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/emotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayStr(), level, note }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? `エラー (${r.status})`); return; }
      setNote("");
      load();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  // 直近の推移（古い順に左から）
  const recent = [...emotions].slice(0, 30).reverse();

  return (
    <div className="space-y-3">
      <Link href="/shinga" className="inline-block text-xs text-[rgba(107,85,53,.8)] hover:text-[var(--singa-gold)]">
        ← 地図に戻る
      </Link>
      <section className="card">
        <div className="singa-sub">The River of Emotion</div>
        <h1 className="singa-heading font-bold text-lg mt-0.5">≈ 記録｜感情の川</h1>
        <p className="text-xs text-gray-500 mt-1">
          感じる。流れる。動かされる。<br />
          いまの感情を10段階で。ここに溜まったものが、自分の変化になります。
        </p>
      </section>

      <section className="card">
        <div className="font-bold text-sm mb-3">いまの感情</div>
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setLevel(n)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition border ${
                level === n ? "text-white border-transparent shadow" : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
              }`}
              style={level === n ? { background: levelColor(n) } : undefined}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
          <span>1 {LEVEL_HINT[1]}</span>
          <span>5 {LEVEL_HINT[5]}</span>
          <span>10 {LEVEL_HINT[10]}</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="何があった？（書かなくてもOK）"
          className="w-full p-2 border rounded-lg text-sm mt-3 leading-relaxed"
        />
        {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-indigo-600 text-white text-sm font-bold py-2.5 rounded-xl mt-2 disabled:opacity-50"
        >
          {saving ? "記録中…" : "記録する"}
        </button>
      </section>

      <section className="card">
        <div className="font-bold text-sm mb-2">📈 感情の推移</div>
        {loading ? (
          <div className="text-xs text-gray-400">読み込み中…</div>
        ) : recent.length === 0 ? (
          <div className="text-xs text-gray-400 py-4 text-center">まだ記録がありません</div>
        ) : (
          <>
            <div className="flex items-end gap-1 h-24">
              {recent.map((e) => (
                <div
                  key={e.id}
                  className="flex-1 rounded-t min-w-[4px]"
                  style={{ height: `${e.level * 10}%`, background: levelColor(e.level) }}
                  title={`${e.date} : ${e.level}${e.note ? ` / ${e.note}` : ""}`}
                />
              ))}
            </div>
            <ul className="mt-3 space-y-1.5">
              {emotions.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-start gap-2 text-xs">
                  <span
                    className="shrink-0 w-6 h-6 rounded-full text-white font-bold flex items-center justify-center text-[11px]"
                    style={{ background: levelColor(e.level) }}
                  >
                    {e.level}
                  </span>
                  <span className="text-gray-400 shrink-0">{e.date.slice(5)}</span>
                  <span className="flex-1 min-w-0 text-gray-600 break-words">{e.note}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <div className="font-bold text-sm mb-2">🌌 これまでの振り返り</div>
        {reflections.length === 0 ? (
          <div className="text-xs text-gray-400 py-4 text-center">
            まだありません。<br />
            <Link href="/shinga/quests" className="text-[var(--accent)] font-bold hover:underline">
              クエスト
            </Link>
            {" "}を実行したあとに残せます。
          </div>
        ) : (
          <ul className="space-y-2">
            {reflections.map((r) => (
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
                <Link
                  href={`/shinga/quests?quest=${r.quest_id}`}
                  className="inline-block mt-1.5 text-[10px] text-[var(--accent)] font-bold hover:underline"
                >
                  このクエストを開く →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
