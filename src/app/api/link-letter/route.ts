/** 未来からの手紙（今日の1通）。1日1通・二度と同じものは来ない。 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTodayLetter } from "@/lib/letter";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";
import { logError } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    return NextResponse.json({ letter: await getTodayLetter(userId) });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
    await logError(userId, "/api/link-letter", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
