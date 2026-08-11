/**
 * おぼえていること（記憶）。
 *
 *   GET                        → いま覚えていること一覧
 *   POST { action: "refresh" } → いま整理する（覚える・上書き・忘れる を1回まわす）
 *   DELETE ?id=…               → これを忘れる（本人がいつでも消せる）
 *
 * 全員が使える。自分のぶんだけ。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logError } from "@/lib/supabase";
import { isMissingTable } from "@/lib/pg-errors";
import { listMemories, forgetMemory, extractMemories, MEMORY_MIGRATION } from "@/lib/memory";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function needsTable() {
  return NextResponse.json({
    error: "保存先（user_memories）がまだ作られていません",
    needsMigration: true, sql: MEMORY_MIGRATION,
  }, { status: 503 });
}

async function gate() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { err: NextResponse.json({ error: "ログインしてね" }, { status: 401 }) };
  return { userId };
}

export async function GET() {
  const g = await gate();
  if ("err" in g) return g.err;
  try {
    return NextResponse.json({ memories: await listMemories(g.userId) });
  } catch (e: any) {
    if (isMissingTable(e)) return needsTable();
    await logError(g.userId, "/api/memory", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = await gate();
  if ("err" in g) return g.err;
  try {
    const b = await req.json().catch(() => ({}));
    if (b.action === "refresh") {
      const r = await extractMemories(g.userId, true);
      return NextResponse.json({ ...r, memories: await listMemories(g.userId) });
    }
    return NextResponse.json({ error: "何をするのか分からなかった" }, { status: 400 });
  } catch (e: any) {
    if (isMissingTable(e)) return needsTable();
    await logError(g.userId, "/api/memory", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const g = await gate();
  if ("err" in g) return g.err;
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "どれを忘れるか分からない" }, { status: 400 });
    await forgetMemory(g.userId, id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTable(e)) return needsTable();
    await logError(g.userId, "/api/memory", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
