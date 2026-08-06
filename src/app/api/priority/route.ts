/**
 * 優先順位（1・2・3）と、その道のり。
 *
 *   GET             → 目標3つと、それぞれの粒
 *   POST {action}   → save / delete / chooseRoute / stage / applySteps / toggleStep / push
 *
 * ※ 既存の /api/goals（年→月→週の青写真）とは別物。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logError } from "@/lib/supabase";
import { isMissingTable } from "@/lib/shinga";
import {
  listPGoals, getPGoal, savePGoal, deletePGoal,
  listSteps, replaceSteps, updateStep,
  isSubject, isGoalKind, PRIORITY_MIGRATION,
} from "@/lib/priority-goals";
import { runStage, LAST_STAGE, STAGE_LABEL } from "@/lib/goals-chain";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function needsTable() {
  return NextResponse.json({
    error: "保存先（priority_goals / goal_steps）がまだ作られていません",
    needsMigration: true, sql: PRIORITY_MIGRATION,
  }, { status: 503 });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "ログインしてね" }, { status: 401 });
  try {
    const goals = await listPGoals(userId);
    const steps: Record<string, unknown[]> = {};
    for (const g of goals) steps[g.id] = await listSteps(userId, g.id);
    return NextResponse.json({ goals, steps, stages: STAGE_LABEL, lastStage: LAST_STAGE });
  } catch (e: any) {
    if (isMissingTable(e)) return needsTable();
    await logError(userId, "/api/priority", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "ログインしてね" }, { status: 401 });

  try {
    const b = await req.json().catch(() => ({}));

    if (b.action === "save") {
      if (!String(b.title ?? "").trim()) {
        return NextResponse.json({ error: "何を目指すのか、ひとこと入れてね" }, { status: 400 });
      }
      const goal = await savePGoal(userId, {
        id: b.id, rank: Number(b.rank) || 1, title: String(b.title),
        subject: isSubject(b.subject) ? b.subject : "me",
        kind: isGoalKind(b.kind) ? b.kind : "",
        due: b.due ?? undefined,
      });
      return NextResponse.json({ ok: true, goal });
    }

    if (b.action === "delete") {
      await deletePGoal(userId, String(b.id));
      return NextResponse.json({ ok: true });
    }

    /** 進む筋を選ぶ（決めるのは本人） */
    if (b.action === "chooseRoute") {
      const g = await getPGoal(userId, String(b.id));
      if (!g) return NextResponse.json({ error: "その目標が見つからない" }, { status: 404 });
      const goal = await savePGoal(userId, {
        id: g.id, rank: g.rank, title: g.title,
        plan: { ...(g.plan ?? { stage: 4 }), chosen: String(b.key ?? "").slice(0, 8) },
      });
      return NextResponse.json({ ok: true, goal });
    }

    /** 段を1つ進める。話したことがあれば材料にする */
    if (b.action === "stage") {
      const g = await getPGoal(userId, String(b.id));
      if (!g) return NextResponse.json({ error: "その目標が見つからない" }, { status: 404 });
      const stage = Math.max(1, Math.min(LAST_STAGE, Number(b.stage) || 1));
      const said = String(b.said ?? "").slice(0, 2000);
      const r = await runStage(userId, g, stage, said);

      // 数字にした段では、目標そのものにも反映しておく（画面のあちこちで使うため）
      const patch: any = { id: g.id, rank: g.rank, title: g.title, plan: r.plan };
      if (stage === 3 && r.plan.shape) {
        patch.metric = r.plan.shape.metric;
        patch.target_value = r.plan.shape.value;
        patch.unit = r.plan.shape.unit;
        if (r.plan.shape.due) patch.due = r.plan.shape.due;
      }
      // お金か状態かを見分けた段では、それも覚える
      if (stage === 2 && r.plan.split) patch.kind = r.plan.split.kind;

      const goal = await savePGoal(userId, patch);
      // 粒はまだ保存しない。**本人が見て「これで置く」と言うまで**下書きのまま返す
      return NextResponse.json({ ok: true, goal, draftSteps: r.steps ?? null, say: r.say });
    }

    /** 下書きの粒を、本当に置く */
    if (b.action === "applySteps") {
      const g = await getPGoal(userId, String(b.id));
      if (!g) return NextResponse.json({ error: "その目標が見つからない" }, { status: 404 });
      const draft = (Array.isArray(b.steps) ? b.steps : []).map((s: any) => ({
        milestone: String(s.milestone ?? ""), title: String(s.title ?? ""),
        minutes: Number(s.minutes) || 30, due: s.due || null,
      })).filter((s: any) => s.title);
      const steps = await replaceSteps(userId, g.id, draft);
      return NextResponse.json({ ok: true, steps });
    }

    if (b.action === "toggleStep") {
      await updateStep(userId, String(b.stepId), { done: !!b.done });
      return NextResponse.json({ ok: true });
    }

    /** 1つの粒を、今日のタスクとしてGoogleに置く */
    if (b.action === "push") {
      const { addTask } = await import("@/lib/google");
      const steps = await listSteps(userId, String(b.id));
      const s = steps.find((x) => x.id === String(b.stepId));
      if (!s) return NextResponse.json({ error: "その一手が見つからない" }, { status: 404 });
      if (s.task_id) return NextResponse.json({ ok: true, already: true });
      const created = await addTask(userId, s.title, {
        notes: `🎯 ${s.milestone}（${s.minutes}分）`,
        due: s.due ? `${s.due}T00:00:00.000Z` : null,
      });
      if (created.id) await updateStep(userId, s.id, { task_id: created.id });
      return NextResponse.json({ ok: true, taskId: created.id ?? null });
    }

    return NextResponse.json({ error: "何をするのか分からなかった" }, { status: 400 });
  } catch (e: any) {
    if (isMissingTable(e)) return needsTable();
    await logError(userId, "/api/priority", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
