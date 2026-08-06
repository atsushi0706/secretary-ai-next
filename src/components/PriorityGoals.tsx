"use client";

/**
 * 優先順位（1・2・3）と、そこに至る道のりの分解。リアルバースのいちばん上。
 *
 * 【使い方の設計】
 * 中身は経営の逆算そのものだが、**画面には一度に1段しか出さない**。
 * 「次へ」を押すか、話しかけるだけで進む。7段あることは進み具合の帯で分かるが、
 * 全部を一度に見せない——見せると、それだけで手が止まる。
 *
 * 【段】
 *   1 誰が止まっているか … 3つの問い（自分／人 を切り替えられる）
 *   2 お金か、状態か     … 混ざっていたら分けることを勧める
 *   3 数字にする
 *   4 分解の筋を選ぶ     … 2〜3通りから本人が選ぶ
 *   5 月・週の到達点
 *   6 抜けを疑う
 *   7 30分の粒に割る     … 見て選んでから置く（勝手に置かない）
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useDictation } from "@/components/useDictation";

type Plan = {
  stage: number;
  stuck?: { who: string; cause: string; smallest: string; why: string };
  split?: { kind: string; reason: string; money?: string; state?: string };
  shape?: { metric: string; value: number | null; unit: string; due: string; current: number | null; unknowns: string[] };
  routes?: { key: string; name: string; formula: string; note: string; risk: string }[];
  chosen?: string;
  milestones?: { by: string; target: string; why: string }[];
  gaps?: { point: string; question: string }[];
  assumptions?: string[];
};
type Goal = {
  id: string; rank: number; title: string; subject: string; kind: string;
  metric: string; target_value: number | null; unit: string; due: string | null;
  status: string; plan: Plan | null;
};
type Step = {
  id: string; goal_id: string; milestone: string; title: string;
  minutes: number; due: string | null; done: boolean; task_id: string | null;
};
type Draft = { milestone: string; title: string; minutes: number; due: string | null };

const KIND_JA: Record<string, string> = { money: "お金", state: "状態", mixed: "混ざってる" };
const md = (d: string | null) => (d ? d.slice(5).replace("-", "/") : "");

export function PriorityGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [steps, setSteps] = useState<Record<string, Step[]>>({});
  const [stages, setStages] = useState<Record<string, string>>({});
  const [lastStage, setLastStage] = useState(7);
  const [err, setErr] = useState("");
  const [sql, setSql] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  // 新しく置くとき
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newSubject, setNewSubject] = useState<"me" | "others">("me");
  /**
   * 置いている途中かどうか。
   * これが無いと、2回タップで2つ増える（画面が戻る前にもう一度押せてしまう）。
   * ボタンを止めるだけでなく、関数の頭でも弾く——連打は onClick が2回走るのが先なので。
   */
  const [savingGoal, setSavingGoal] = useState(false);

  // 段を進めるとき
  const [busy, setBusy] = useState(false);
  const [say, setSay] = useState("");
  const [said, setSaid] = useState("");
  const [draft, setDraft] = useState<Draft[] | null>(null);
  const [pick, setPick] = useState<Record<number, boolean>>({});
  const d = useDictation();
  const taRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/priority");
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "読み込めなかった"); setSql(j.sql || ""); return; }
      setErr(""); setSql("");
      setGoals(j.goals ?? []); setSteps(j.steps ?? {});
      setStages(j.stages ?? {}); setLastStage(j.lastStage ?? 7);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function post(body: Record<string, unknown>) {
    const r = await fetch("/api/priority", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || "うまくいかなかった"); setSql(j.sql || ""); return null; }
    setErr("");
    return j;
  }

  async function addGoal() {
    if (savingGoal) return;                 // 連打の2度目は、ここで止まる
    if (!newTitle.trim()) return;
    setSavingGoal(true);
    try {
      // 順位は、いまあるものの次。同じ順位が2つできないようにする
      const rank = Math.min(3, Math.max(0, ...goals.map((g) => g.rank)) + 1);
      const j = await post({ action: "save", rank, title: newTitle.trim(), due: newDue || null, subject: newSubject });
      if (j) {
        setNewTitle(""); setNewDue(""); setAdding(false);
        await load();
        setOpen(j.goal?.id ?? null);
      }
    } finally { setSavingGoal(false); }
  }

  /** 段を1つ進める */
  async function nextStage(g: Goal, stage: number) {
    if (busy) return;
    setBusy(true); setSay(""); setDraft(null); setPick({});
    try {
      const j = await post({ action: "stage", id: g.id, stage, said });
      if (!j) return;
      setSay(j.say ?? "");
      setSaid("");
      if (j.draftSteps) {
        setDraft(j.draftSteps);
        // こちらからは全部にチェックを入れる（ここは本人が組んだ計画なので）。
        // ——ただし「これで置く」を押すまでは、1件も保存しない
        setPick(Object.fromEntries((j.draftSteps as Draft[]).map((_, i) => [i, true])));
      }
      await load();
    } finally { setBusy(false); }
  }

  async function mic() {
    if (d.phase === "recording") {
      const t = await d.stop("目標の分解についての発言");
      if (t) setSaid((p) => (p ? `${p} ${t}` : t));
    } else if (d.phase === "idle") { await d.start(); }
  }

  const g = goals.find((x) => x.id === open) ?? null;
  const plan = g?.plan ?? null;
  const stage = plan?.stage ?? 0;
  const next = Math.min(lastStage, stage + 1);
  const mySteps = g ? (steps[g.id] ?? []) : [];
  const doneCount = mySteps.filter((s) => s.done).length;

  return (
    <section className="card border-l-4 border-rose-500">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm text-rose-700">🎯 優先順位</div>
        {goals.length < 3 && !adding && (
          <button className="text-xs bg-rose-600 text-white px-2.5 py-1 rounded font-bold"
            onClick={() => setAdding(true)}>＋ 置く</button>
        )}
      </div>

      {err && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-2 leading-relaxed">
          {err}
          {sql && (
            <details className="mt-1">
              <summary className="cursor-pointer">先にSupabaseで表を作る必要があります（押すとSQL）</summary>
              <pre className="text-[10px] whitespace-pre-wrap mt-1 max-h-48 overflow-auto">{sql}</pre>
            </details>
          )}
        </div>
      )}

      {/* 新しく置く */}
      {adding && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 mb-2 space-y-2">
          <input className="w-full text-sm rounded border border-rose-200 px-2 py-1.5"
            placeholder="何を目指す？（例：月に100万円作る）"
            value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600">いつまでに</span>
            <input type="date" className="rounded border border-rose-200 px-2 py-1"
              value={newDue} onChange={(e) => setNewDue(e.target.value)} />
          </div>
          {/* 自分のことか、人のことか。1段目の問いの立て方が変わる */}
          <div className="flex gap-1.5">
            {([["me", "自分のこと"], ["others", "人のこと"]] as const).map(([k, l]) => (
              <button key={k}
                className={`flex-1 text-xs py-1.5 rounded border ${newSubject === k
                  ? "bg-rose-600 text-white border-rose-600 font-bold" : "bg-white border-rose-200 text-gray-600"}`}
                onClick={() => setNewSubject(k)}>{l}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="flex-1 text-xs bg-rose-600 text-white py-1.5 rounded font-bold disabled:opacity-40"
              disabled={savingGoal || !newTitle.trim()} onClick={() => void addGoal()}>
              {savingGoal ? "置いてる…" : "置く"}
            </button>
            <button className="text-xs border border-gray-300 px-3 py-1.5 rounded text-gray-600"
              onClick={() => { setAdding(false); setNewTitle(""); }}>やめる</button>
          </div>
        </div>
      )}

      {/* 3つ並べる */}
      {goals.length === 0 && !adding && (
        <p className="text-xs text-gray-500 leading-relaxed">
          いま何を優先するのか、1つ置いてみて。<br />
          置いたら、そこに至る道のりを一緒に分解するよ。
        </p>
      )}
      <div className="space-y-1.5">
        {goals.map((x) => {
          const st = steps[x.id] ?? [];
          const dn = st.filter((s) => s.done).length;
          const isOpen = open === x.id;
          return (
            <div key={x.id}
              className={`rounded-lg border px-2.5 py-2 ${isOpen ? "border-rose-400 bg-rose-50" : "border-gray-200 bg-white"}`}>
              <button className="w-full flex items-start gap-2 text-left"
                onClick={() => { setOpen(isOpen ? null : x.id); setSay(""); setDraft(null); setSaid(""); }}>
                <span className="shrink-0 w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold grid place-items-center mt-0.5">
                  {x.rank}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold leading-snug">{x.title}</span>
                  <span className="block text-[10px] text-gray-500 mt-0.5">
                    {x.due && <>〆{md(x.due)}　</>}
                    {x.kind && <>{KIND_JA[x.kind] ?? x.kind}　</>}
                    {x.subject === "others" ? "人のこと　" : ""}
                    {st.length > 0
                      ? `30分の粒 ${st.length}個 / ${dn}個おわった`
                      : x.plan ? `${stages[String(x.plan.stage)] ?? ""} まで` : "まだ分解していない"}
                  </span>
                </span>
                <span className="shrink-0 text-gray-400 text-xs mt-0.5">{isOpen ? "▲" : "▼"}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 開いた目標の中身 */}
      {g && (
        <div className="mt-3 rounded-xl border-2 border-rose-300 bg-white p-3 space-y-3">
          {/* 進み具合。7段あることは分かるが、中身は一度に出さない */}
          <div className="flex items-center gap-1">
            {Array.from({ length: lastStage }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < stage ? "bg-rose-500" : "bg-gray-200"}`} />
            ))}
          </div>
          <div className="text-[11px] text-gray-500">
            {stage === 0 ? "まだ何もしていない" : `${stage}/${lastStage}　${stages[String(stage)] ?? ""}`}
            {stage >= lastStage && "　——ここまで来たら、粒を置いて進めよう"}
          </div>

          {/* 相棒からの一言 */}
          {say && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm leading-relaxed">
              {say}
            </div>
          )}

          {/* ここまでで見えたこと（段ごとに増えていく） */}
          {plan?.stuck && (
            <Box title="いま、いちばん止まっているところ">
              <Row k="誰が" v={plan.stuck.who} />
              <Row k="一番の原因" v={plan.stuck.cause} />
              <Row k="今日の一手" v={plan.stuck.smallest} strong />
              {plan.stuck.why && <Row k="なぜ効くか" v={plan.stuck.why} />}
            </Box>
          )}

          {plan?.split && (
            <Box title={`追っているもの：${KIND_JA[plan.split.kind] ?? plan.split.kind}`}>
              <Row k="そう見た理由" v={plan.split.reason} />
              {plan.split.kind === "mixed" && (
                <>
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-1 leading-relaxed">
                    <b>お金と状態が混ざってる。</b>一緒に追うと、どちらも中途半端になるよ。
                    どちらか1つに絞るか、2つの目標に分けよう。
                  </div>
                  {plan.split.money && <Row k="お金として" v={plan.split.money} />}
                  {plan.split.state && <Row k="状態として" v={plan.split.state} />}
                  <div className="flex gap-1.5 mt-1.5">
                    {([["money", "お金で追う"], ["state", "状態で追う"]] as const).map(([k, l]) => (
                      <button key={k} className="flex-1 text-[11px] border border-rose-300 rounded py-1.5 text-rose-700 font-bold"
                        onClick={async () => {
                          await post({ action: "save", id: g.id, rank: g.rank, title: g.title, kind: k, subject: g.subject });
                          await load();
                        }}>{l}に絞る</button>
                    ))}
                  </div>
                </>
              )}
            </Box>
          )}

          {plan?.shape && (
            <Box title="数字にすると">
              <Row k="測るもの" v={plan.shape.metric} />
              <Row k="目指す値" v={`${plan.shape.value ?? "—"}${plan.shape.unit}`} strong />
              {plan.shape.current != null && <Row k="いま" v={`${plan.shape.current}${plan.shape.unit}`} />}
              {plan.shape.due && <Row k="期限" v={plan.shape.due} />}
              {plan.shape.unknowns.length > 0 && (
                <div className="text-[11px] text-amber-700 mt-1">
                  聞きたいこと：{plan.shape.unknowns.join(" / ")}
                </div>
              )}
            </Box>
          )}

          {plan?.routes && plan.routes.length > 0 && (
            <Box title="どの筋で行く？">
              <div className="space-y-1.5">
                {plan.routes.map((r) => (
                  <button key={r.key}
                    className={`w-full text-left rounded-lg border px-2.5 py-2 ${plan.chosen === r.key
                      ? "border-rose-500 bg-rose-50" : "border-gray-200 bg-white"}`}
                    onClick={async () => { await post({ action: "chooseRoute", id: g.id, key: r.key }); await load(); }}>
                    <div className="text-sm font-bold">{r.name}</div>
                    <div className="text-[11px] text-rose-700 font-mono mt-0.5">{r.formula}</div>
                    <div className="text-[11px] text-gray-600 mt-1 leading-relaxed">{r.note}</div>
                    <div className="text-[11px] text-amber-700 mt-0.5">⚠ {r.risk}</div>
                  </button>
                ))}
              </div>
              {plan.assumptions && plan.assumptions.length > 0 && (
                <div className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                  置いた前提：{plan.assumptions.join(" / ")}
                </div>
              )}
            </Box>
          )}

          {plan?.milestones && plan.milestones.length > 0 && (
            <Box title="ここまで来ていればいい">
              <div className="space-y-1">
                {plan.milestones.map((m, i) => (
                  <div key={i} className="flex gap-2 text-[11px]">
                    <span className="shrink-0 text-rose-700 font-bold w-12">{md(m.by)}</span>
                    <span className="flex-1">
                      <b className="text-sm">{m.target}</b>
                      {m.why && <span className="block text-gray-500 mt-0.5">{m.why}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </Box>
          )}

          {plan?.gaps && plan.gaps.length > 0 && (
            <Box title="見落としていないか">
              <div className="space-y-1.5">
                {plan.gaps.map((x, i) => (
                  <div key={i} className="text-[11px] leading-relaxed">
                    <b className="text-amber-800">{x.point}</b>
                    <span className="block text-gray-600 mt-0.5">→ {x.question}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-gray-500 mt-1.5">
                答えを話してから「次へ」を押すと、計画に反映するよ。
              </div>
            </Box>
          )}

          {/* 話す or 打つ → 次へ */}
          <div className="rounded-lg border border-gray-200 p-2 space-y-1.5">
            <textarea ref={taRef} rows={2}
              className="w-full text-sm rounded border border-gray-200 px-2 py-1.5"
              placeholder="🎙 話すか、打つ。何も無ければそのまま「次へ」でいい"
              value={said} onChange={(e) => setSaid(e.target.value)} />
            <div className="flex items-center gap-2">
              <button className={`w-9 h-9 rounded-full text-sm shrink-0 border ${d.phase === "recording"
                ? "bg-red-500 text-white border-red-500" : "bg-gray-50 border-gray-300"}`}
                disabled={d.phase === "transcribing"}
                onClick={() => void mic()}>
                {d.phase === "recording" ? "■" : d.phase === "transcribing" ? "…" : "🎙"}
              </button>
              <button className="flex-1 rounded-lg bg-rose-600 text-white text-sm font-bold py-2 disabled:opacity-40"
                disabled={busy || d.phase !== "idle"}
                onClick={() => void nextStage(g, next)}>
                {busy ? "考えてる…" : stage === 0
                  ? "分解をはじめる（誰が止まっているか）"
                  : stage >= lastStage
                    ? "もう一度、粒に割り直す"
                    : `次へ：${stages[String(next)] ?? ""}`}
              </button>
            </div>
            {d.phase === "recording" && (
              <div className="text-[10px] text-red-600">
                聞いてる {Math.floor(d.seconds / 60)}:{String(d.seconds % 60).padStart(2, "0")} — もう一度押して確定
              </div>
            )}
            {d.error && <div className="text-[10px] text-red-600">{d.error}</div>}
          </div>

          {/* 下書きの粒。**選んでから置く** */}
          {draft && draft.length > 0 && (
            <div className="rounded-xl border-2 border-rose-400 bg-rose-50 p-2.5">
              <div className="text-xs font-bold text-rose-800 mb-1.5">
                📋 30分の粒に割った（{draft.length}個）— 置くものを選んで
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {draft.map((s, i) => (
                  <label key={i} className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 text-xs cursor-pointer ${
                    pick[i] ? "border-rose-400 bg-white" : "border-rose-200 bg-white/60"}`}>
                    <input type="checkbox" className="mt-0.5 w-4 h-4 shrink-0"
                      checked={!!pick[i]} onChange={(e) => setPick({ ...pick, [i]: e.target.checked })} />
                    <span className="flex-1 leading-snug">
                      {s.title}
                      <span className="block text-[10px] text-gray-500 mt-0.5">
                        {s.due && <>{md(s.due)}　</>}{s.minutes}分　{s.milestone}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button className="flex-1 rounded-lg bg-rose-600 text-white text-xs font-bold py-2 disabled:opacity-40"
                  disabled={!Object.values(pick).some(Boolean)}
                  onClick={async () => {
                    const chosen = draft.filter((_, i) => pick[i]);
                    const j = await post({ action: "applySteps", id: g.id, steps: chosen });
                    if (j) { setDraft(null); setPick({}); await load(); }
                  }}>これで置く</button>
                <button className="rounded-lg border border-gray-300 bg-white text-xs text-gray-600 px-3 py-2"
                  onClick={() => { setDraft(null); setPick({}); }}>やめる</button>
              </div>
            </div>
          )}

          {/* 置いた粒 */}
          {mySteps.length > 0 && (
            <Box title={`道のり（${mySteps.length}個 / ${doneCount}個おわった）`}>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {mySteps.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 text-xs">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 shrink-0" checked={s.done}
                      onChange={async (e) => {
                        await post({ action: "toggleStep", stepId: s.id, done: e.target.checked });
                        await load();
                      }} />
                    <span className={`flex-1 leading-snug ${s.done ? "line-through text-gray-400" : ""}`}>
                      {s.title}
                      <span className="block text-[10px] text-gray-500 mt-0.5">
                        {s.due && <>{md(s.due)}　</>}{s.minutes}分　{s.milestone}
                      </span>
                    </span>
                    {!s.done && (s.task_id
                      ? <span className="shrink-0 text-[10px] text-gray-400 mt-0.5">タスクに置いた</span>
                      : <button className="shrink-0 text-[10px] text-rose-700 underline mt-0.5"
                          onClick={async () => { await post({ action: "push", id: g.id, stepId: s.id }); await load(); }}>
                          タスクへ
                        </button>)}
                  </div>
                ))}
              </div>
            </Box>
          )}

          <button className="text-[10px] text-gray-400 underline"
            onClick={async () => {
              if (!confirm(`「${g.title}」を消す？　道のりも一緒に消えるよ`)) return;
              await post({ action: "delete", id: g.id });
              setOpen(null); await load();
            }}>この優先順位を消す</button>
        </div>
      )}
    </section>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-2.5">
      <div className="text-[11px] font-bold text-gray-600 mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  if (!v) return null;
  return (
    <div className="flex gap-2 text-[11px] leading-relaxed">
      <span className="shrink-0 text-gray-500 w-16">{k}</span>
      <span className={`flex-1 ${strong ? "font-bold text-sm text-rose-800" : ""}`}>{v}</span>
    </div>
  );
}
