/**
 * マインドマップ・スケジューラー。
 *
 *   GET             → 自分のマップ一覧
 *   GET ?id=...     → 1枚（ツリー・ロードマップ・粗いところ）
 *   POST {action}   → talk / breakdown / applySteps / removeNode / schedule / delete
 *
 * 淳くん専用（管理者だけ）。
 * 30分ルールの判定はコードで数える（coarseLeaves）。AIには任せない。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { hasFeature } from "@/lib/app-config";
import { logError } from "@/lib/supabase";
import { isMissingTable } from "@/lib/shinga";
import {
  listMaps, getMap, saveMap, deleteMap,
  runStructure, runBreakdown, runSchedule,
  coarseLeaves, treeStats, attachSteps, removeNode,
  MINDMAP_MIGRATION,
} from "@/lib/mindmap";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function needsTable() {
  return NextResponse.json({
    error: "保存先（mind_maps）がまだ作られていません",
    needsMigration: true, sql: MINDMAP_MIGRATION,
  }, { status: 503 });
}

async function gate() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { err: NextResponse.json({ error: "ログインしてね" }, { status: 401 }) };
  // 管理者か、管理画面で開けてもらった人（お試しスイッチ）
  if (!isAdmin(userId) && !(await hasFeature(userId, "mindmap"))) {
    return { err: NextResponse.json({ error: "この道具はまだ準備中です" }, { status: 403 }) };
  }
  return { userId };
}

/** 1枚ぶんの返し方をそろえる（粗いところは毎回数え直す） */
function pack(map: any) {
  return {
    map,
    coarse: coarseLeaves(map.tree),
    stats: treeStats(map.tree),
  };
}

export async function GET(req: Request) {
  const g = await gate();
  if ("err" in g) return g.err;
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ maps: await listMaps(g.userId) });
    const map = await getMap(g.userId, id);
    if (!map) return NextResponse.json({ error: "そのマップが見つからない" }, { status: 404 });
    return NextResponse.json(pack(map));
  } catch (e: any) {
    if (isMissingTable(e)) return needsTable();
    await logError(g.userId, "/api/mindmap", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = await gate();
  if ("err" in g) return g.err;
  try {
    const b = await req.json().catch(() => ({}));

    /* 話した内容を、いまのマップへマージする（無ければ新しく作る） */
    if (b.action === "talk") {
      const said = String(b.said ?? "").trim();
      if (!said) return NextResponse.json({ error: "何か話してからにしてね" }, { status: 400 });
      const cur = b.id ? await getMap(g.userId, String(b.id)) : null;
      const r = await runStructure(g.userId, cur?.tree ?? null, said);
      if (!r.tree.nodes.length) {
        return NextResponse.json({ error: "うまく整理できなかった。もう一度話してみて" }, { status: 502 });
      }
      const map = await saveMap(g.userId, { id: cur?.id, tree: r.tree, schedule: cur?.schedule ?? null });
      return NextResponse.json({ ...pack(map), say: r.say });
    }

    /* 選んだ1つを、30分以内の手順に割る（案を返すだけ。置くのは本人） */
    if (b.action === "breakdown") {
      const map = await getMap(g.userId, String(b.id));
      if (!map) return NextResponse.json({ error: "そのマップが見つからない" }, { status: 404 });
      const r = await runBreakdown(g.userId, map.tree, String(b.nodeId));
      return NextResponse.json({ steps: r.steps, say: r.say });
    }

    /* 本人が選んだ手順を、ノードの下に置く */
    if (b.action === "applySteps") {
      const map = await getMap(g.userId, String(b.id));
      if (!map) return NextResponse.json({ error: "そのマップが見つからない" }, { status: 404 });
      const steps = (Array.isArray(b.steps) ? b.steps : [])
        .map((s: any) => ({ label: String(s.label ?? ""), minutes: Number(s.minutes) || 30 }))
        .filter((s: any) => s.label.trim());
      if (!steps.length) return NextResponse.json({ error: "置くものが選ばれていない" }, { status: 400 });
      const tree = attachSteps(map.tree, String(b.nodeId), steps);
      const saved = await saveMap(g.userId, { id: map.id, tree, schedule: map.schedule });
      return NextResponse.json(pack(saved));
    }

    /* ノードを消す */
    if (b.action === "removeNode") {
      const map = await getMap(g.userId, String(b.id));
      if (!map) return NextResponse.json({ error: "そのマップが見つからない" }, { status: 404 });
      const tree = removeNode(map.tree, String(b.nodeId));
      const saved = await saveMap(g.userId, { id: map.id, tree, schedule: map.schedule });
      return NextResponse.json(pack(saved));
    }

    /* ロードマップを組む（日付は振らない。フェーズと依存関係） */
    if (b.action === "schedule") {
      const map = await getMap(g.userId, String(b.id));
      if (!map) return NextResponse.json({ error: "そのマップが見つからない" }, { status: 404 });
      const r = await runSchedule(g.userId, map.tree);
      if (!r.sched) return NextResponse.json({ error: "うまく組めなかった。もう少しマップを育ててから試して" }, { status: 502 });
      const saved = await saveMap(g.userId, { id: map.id, tree: map.tree, schedule: r.sched });
      return NextResponse.json({ ...pack(saved), say: r.say });
    }

    if (b.action === "delete") {
      await deleteMap(g.userId, String(b.id));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "何をするのか分からなかった" }, { status: 400 });
  } catch (e: any) {
    if (isMissingTable(e)) return needsTable();
    await logError(g.userId, "/api/mindmap", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
