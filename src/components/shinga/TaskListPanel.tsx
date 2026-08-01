"use client";

import { useEffect, useState } from "react";

/**
 * タスクリスト。
 * リアルバースへの架け橋：2026 → 今月（＋感情目標） → 今週 → 今日 と落として、
 * 「今日の小さなタスク」はそのままリアルバース（タスク）に入る＝同期。
 */
type Scope = "year" | "month" | "week";
type Goal = { scope: Scope; period: string; vision: string; emotion: string };
type Goals = Record<Scope, Goal>;
type Labels = Record<Scope, string>;
type Task = { id: string; tasklist_id: string; title: string; due: string | null; status: string };

type Tab = Scope | "today";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TaskListPanel({ guideName, avatarUrl, onBack }: { guideName: string; avatarUrl: string; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("today");
  const [goals, setGoals] = useState<Goals | null>(null);
  const [labels, setLabels] = useState<Labels | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadGoals() {
    try {
      const r = await fetch("/api/goals"); const d = await r.json();
      if (d.error) { setErr(d.error); return; }
      setGoals(d.goals); setLabels(d.labels); setErr(null);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
  }
  async function loadTasks() {
    try {
      const r = await fetch("/api/tasks"); const d = await r.json();
      setTasks(d.tasks ?? []);
    } catch { /* タスクが読めなくても目標は使える */ }
  }
  useEffect(() => { loadGoals(); loadTasks(); }, []);

  async function saveGoal(scope: Scope, fields: { vision?: string; emotion?: string }) {
    if (!goals) return;
    setSaving(true);
    try {
      const cur = goals[scope];
      const r = await fetch("/api/goals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, vision: fields.vision ?? cur.vision, emotion: fields.emotion ?? cur.emotion }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "保存できませんでした"); return; }
      setGoals(d.goals); setErr(null);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setSaving(false); }
  }

  // 青写真から 今月/週/今日 を清瀬リンクが下書きする（保存は本人が押す）
  const [bd, setBd] = useState<{ month: string; week: string; today: string[] } | null>(null);
  const [bdBusy, setBdBusy] = useState(false);
  const [bdErr, setBdErr] = useState("");
  async function breakdown() {
    setBdBusy(true); setBdErr(""); setBd(null);
    try {
      const r = await fetch("/api/goals/breakdown", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "下書きに失敗");
      setBd(d);
    } catch (e: any) { setBdErr(String(e?.message ?? e)); }
    finally { setBdBusy(false); }
  }

  async function addTask(title: string) {
    const t = title.trim();
    if (!t) return;
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", title: t, due: todayStr(), category: "life", sourceType: "goal" }),
    });
    loadTasks();
  }
  async function completeTask(task: Task) {
    setTasks((prev) => prev.filter((x) => x.id !== task.id)); // 先に消して軽く
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", tasklistId: task.tasklist_id, taskId: task.id }),
    }).catch(() => loadTasks());
  }

  return (
    <div className="tl">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>
      <div className="tl-card">
        <div className="rep-head">
          <img className="singa-face" src={avatarUrl} alt={guideName} />
          <div><div className="rep-sub">タスクリスト</div><div className="rep-who">理想を、今日の一歩に落とす</div></div>
        </div>
        {err && <div className="rep-err">{err}</div>}

        <div className="tl-tabs">
          <button className={tab === "year" ? "on" : ""} onClick={() => setTab("year")}>2026</button>
          <button className={tab === "month" ? "on" : ""} onClick={() => setTab("month")}>{labels?.month ?? "今月"}</button>
          <button className={tab === "week" ? "on" : ""} onClick={() => setTab("week")}>今週</button>
          <button className={tab === "today" ? "on" : ""} onClick={() => setTab("today")}>今日</button>
        </div>

        {!goals ? <div className="rep-loading">読み込み中…</div> : (
          <>
            {tab === "year" && (
              <>
              <GoalEditor
                lead="2026年、どんな理想を生きる？ 青写真をそのまま書いていい。"
                vision={goals.year.vision} onSave={(v) => saveGoal("year", { vision: v })}
                saving={saving} placeholder="例：自分の可能性を信じて、届けたい人に価値を届けられている一年。"
              />
              {goals.year.vision.trim() && (
                <div className="tl-bd">
                  <button className="tl-bd-go" onClick={() => void breakdown()} disabled={bdBusy}>
                    {bdBusy ? "下ろしています…" : "✨ この青写真を、今月→今週→今日へ下ろす"}
                  </button>
                  {bdErr && <p className="tl-bd-err">{bdErr}</p>}
                  {bd && (
                    <div className="tl-bd-out">
                      <div className="bo-row">
                        <div className="bo-k">今月</div>
                        <div className="bo-v">{bd.month}</div>
                        <button onClick={() => { void saveGoal("month", { vision: bd.month }); }}>採用</button>
                      </div>
                      <div className="bo-row">
                        <div className="bo-k">今週</div>
                        <div className="bo-v">{bd.week}</div>
                        <button onClick={() => { void saveGoal("week", { vision: bd.week }); }}>採用</button>
                      </div>
                      {bd.today.map((t, i) => (
                        <div className="bo-row" key={i}>
                          <div className="bo-k">今日</div>
                          <div className="bo-v">{t}</div>
                          <button onClick={() => { void addTask(t); }}>今日に置く</button>
                        </div>
                      ))}
                      <p className="bo-note">気に入ったものだけ「採用」してね。文言は各タブで直せるよ。</p>
                    </div>
                  )}
                </div>
              )}
              </>
            )}

            {tab === "month" && (
              <>
                {goals.year.vision && <Ref label="2026の理想" text={goals.year.vision} />}
                <div className="tl-field">
                  <label>今月、どんな感情を先取りする？</label>
                  <EmotionGoal value={goals.month.emotion} onSave={(e) => saveGoal("month", { emotion: e })} saving={saving} />
                </div>
                <GoalEditor
                  lead="その感情で生きるために、今月やること。"
                  vision={goals.month.vision} onSave={(v) => saveGoal("month", { vision: v })}
                  saving={saving} placeholder="例：週1でパラレルウォークを提出し、青写真を1つ現実に落とす。"
                />
              </>
            )}

            {tab === "week" && (
              <>
                {goals.month.emotion && <Ref label="今月 先取りする感情" text={goals.month.emotion} />}
                {goals.month.vision && <Ref label="今月の目標" text={goals.month.vision} />}
                <GoalEditor
                  lead="今週は、そのために何をする？"
                  vision={goals.week.vision} onSave={(v) => saveGoal("week", { vision: v })}
                  saving={saving} placeholder="例：火・木にウォーク。週末に1つ、人に届ける。"
                />
              </>
            )}

            {tab === "today" && (
              <TodayTab
                weekVision={goals.week.vision}
                monthEmotion={goals.month.emotion}
                tasks={tasks}
                onAdd={addTask}
                onDone={completeTask}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Ref({ label, text }: { label: string; text: string }) {
  return <div className="tl-ref"><span className="k">{label}</span><p>{text}</p></div>;
}

function GoalEditor({
  lead, vision, onSave, saving, placeholder,
}: { lead: string; vision: string; onSave: (v: string) => void; saving: boolean; placeholder?: string }) {
  const [v, setV] = useState(vision);
  useEffect(() => { setV(vision); }, [vision]);
  const dirty = v.trim() !== vision.trim();
  return (
    <div className="tl-field">
      <label>{lead}</label>
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={4} placeholder={placeholder} />
      <button className="tl-save" disabled={saving || !dirty} onClick={() => onSave(v)}>{saving ? "保存中…" : dirty ? "保存する" : v.trim() ? "保存済み" : "未入力"}</button>
    </div>
  );
}

function EmotionGoal({ value, onSave, saving }: { value: string; onSave: (v: string) => void; saving: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  const dirty = v.trim() !== value.trim();
  return (
    <div className="tl-emo">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="例：安心・ワクワク・満たされてる" />
      <button className="tl-save" disabled={saving || !dirty} onClick={() => onSave(v)}>{dirty ? "保存" : "済"}</button>
    </div>
  );
}

function TodayTab({
  weekVision, monthEmotion, tasks, onAdd, onDone,
}: {
  weekVision: string; monthEmotion: string; tasks: Task[];
  onAdd: (t: string) => void; onDone: (t: Task) => void;
}) {
  const [title, setTitle] = useState("");
  return (
    <>
      {monthEmotion && <Ref label="先取りする感情" text={monthEmotion} />}
      {weekVision && <Ref label="今週やること" text={weekVision} />}
      <p className="tl-nudge">この中から、今日の“小さな一歩”を1つだけ。理想を1つでも今日に取り入れよう🌱</p>

      <div className="tl-add">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { onAdd(title); setTitle(""); } }}
          placeholder="今日の小さなタスク"
        />
        <button onClick={() => { onAdd(title); setTitle(""); }} disabled={!title.trim()}>＋</button>
      </div>

      <ul className="tl-tasks">
        {tasks.length === 0 ? (
          <li className="empty">まだ今日のタスクはないよ。上から1つ置いてみよう。</li>
        ) : tasks.map((t) => (
          <li key={t.id}>
            <button className="chk" onClick={() => onDone(t)} title="できた（リアルバースにも反映）">○</button>
            <span className="t">{t.title}</span>
          </li>
        ))}
      </ul>
      <p className="tl-sync">✓を入れると、リアルバースのタスクにも同じように反映されるよ（同じタスクだから）。</p>
    </>
  );
}
