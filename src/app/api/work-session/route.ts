/**
 * ワーク1回ぶんの記録（＝発信の素材）。
 * GET  : たまっている素材の一覧
 * POST : { mode, messages } → そのワークを要約して素材として保存
 *        （ワークを終えて地図に戻るときに、画面から自動で呼ばれる）
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listWorkSessions, saveWorkSession } from "@/lib/work-session";
import { isModeKey } from "@/lib/modes";
import { isMissingTable } from "@/lib/shinga";
import { logError } from "@/lib/supabase";

export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    return NextResponse.json({ sessions: await listWorkSessions(userId) });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ sessions: [], needsMigration: true });
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    if (!isModeKey(b?.mode)) return NextResponse.json({ error: "mode が不正" }, { status: 400 });
    const messages = Array.isArray(b?.messages)
      ? b.messages
          .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
          .slice(-60)
      : [];
    const saved = await saveWorkSession(userId, b.mode, messages);
    return NextResponse.json({ session: saved });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ session: null, needsMigration: true });
    await logError(userId, "/api/work-session", e);
    // 素材が残せなくても、ワーク自体は終わっているので画面は止めない
    return NextResponse.json({ session: null });
  }
}
