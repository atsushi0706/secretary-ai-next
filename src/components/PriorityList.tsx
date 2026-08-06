"use client";

/**
 * 優先順位（1・2・3）の見出しだけを並べる。リアルバースの表に出るぶん。
 *
 * 書き込みと分解は /priority に分けてある。
 * リアルバースは「今日どう動くか」を見るところなので、ここでは**何が一番なのか**だけ分かればいい。
 */
import Link from "next/link";
import { useEffect, useState } from "react";

type Goal = { id: string; rank: number; title: string; due: string | null; kind: string };
type Step = { done: boolean };

const md = (d: string | null) => (d ? d.slice(5).replace("-", "/") : "");

export function PriorityList() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [steps, setSteps] = useState<Record<string, Step[]>>({});

  useEffect(() => {
    fetch("/api/priority")
      .then((r) => r.json())
      .then((j) => { setGoals(j.goals ?? []); setSteps(j.steps ?? {}); })
      .catch(() => setGoals([]));
  }, []);

  return (
    <section className="card border-l-4 border-rose-500">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm text-rose-700">🎯 優先順位</div>
        <Link href="/priority"
          className="text-xs bg-rose-600 text-white px-2.5 py-1 rounded font-bold">
          {goals && goals.length > 0 ? "ひらく" : "＋ 決める"}
        </Link>
      </div>

      {goals === null && <div className="text-xs text-gray-400">読み込んでる…</div>}

      {goals && goals.length === 0 && (
        <p className="text-xs text-gray-500 leading-relaxed">
          いま何を優先するのか、まだ決まっていない。<br />
          右の「＋ 決める」から、AIと話しながら決められるよ。
        </p>
      )}

      <div className="space-y-1.5">
        {(goals ?? []).map((g) => {
          const st = steps[g.id] ?? [];
          const dn = st.filter((s) => s.done).length;
          return (
            <Link key={g.id} href="/priority"
              className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold grid place-items-center mt-0.5">
                {g.rank}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold leading-snug">{g.title}</span>
                <span className="block text-[10px] text-gray-500 mt-0.5">
                  {g.due && <>〆{md(g.due)}　</>}
                  {st.length > 0 ? `${st.length}個の一手 / ${dn}個おわった` : "まだ分解していない"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
