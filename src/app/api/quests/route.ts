/**
 * クエストの一覧 / 作成 / 更新 / 削除。
 * すべて auth() の userId で分離する。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listQuests, createQuest, updateQuest, deleteQuest, countTasksByQuest,
  isMissingTable, MIGRATION_HINT,
} from "@/lib/shinga";
import { logError } from "@/lib/supabase";

function fail(e: any) {
  if (isMissingTable(e)) {
    return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
  }
  return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const [quests, taskCounts] = await Promise.all([
      listQuests(userId),
      countTasksByQuest(userId),
    ]);
    return NextResponse.json({ quests, taskCounts });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/quests", e);
    return fail(e);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const action = body.action ?? "create";

    if (action === "create") {
      const title = String(body.title ?? "").trim();
      if (!title) return NextResponse.json({ error: "title が空です" }, { status: 400 });
      const quest = await createQuest(userId, {
        title,
        body: String(body.body ?? ""),
        category: body.category,
        status: body.status,
        source_conversation_id: body.sourceConversationId ?? null,
      });
      return NextResponse.json({ ok: true, quest });
    }

    if (action === "update") {
      if (!body.id) return NextResponse.json({ error: "id が必要です" }, { status: 400 });
      const fields: any = {};
      if (typeof body.title === "string") fields.title = body.title.trim();
      if (typeof body.body === "string") fields.body = body.body;
      if (typeof body.category === "string") fields.category = body.category;
      if (typeof body.status === "string") fields.status = body.status;
      const quest = await updateQuest(userId, body.id, fields);
      if (!quest) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
      return NextResponse.json({ ok: true, quest });
    }

    if (action === "delete") {
      if (!body.id) return NextResponse.json({ error: "id が必要です" }, { status: 400 });
      await deleteQuest(userId, body.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    if (!isMissingTable(e)) await logError(userId, "/api/quests", e);
    return fail(e);
  }
}
