/**
 * メソッド設定。GET: 現在のメソッド / POST: { name, tagline? } 保存。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMethod, saveMethod } from "@/lib/broadcast";
import { isMissingTable, MIGRATION_HINT } from "@/lib/shinga";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ method: await getMethod(userId) });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json();
    const name = String(b.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "メソッド名が空です" }, { status: 400 });
    await saveMethod(userId, { name, tagline: typeof b.tagline === "string" ? b.tagline.trim() : undefined });
    return NextResponse.json({ ok: true, method: await getMethod(userId) });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT, needsMigration: true }, { status: 503 });
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
