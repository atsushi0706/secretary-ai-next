/**
 * ワールドリプレイ。
 * POST { said } → 今日の進み（事実）＋受けの一言＋意味＋明日の3つ
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildReplay, todaysProgress } from "@/lib/replay";
import { logError } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  // 話す前でも「今日これだけ進んだ」は出せる（事実だから）
  return NextResponse.json({ progress: await todaysProgress(userId) });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const b = await req.json().catch(() => ({}));
    return NextResponse.json({ replay: await buildReplay(userId, String(b.said ?? "")) });
  } catch (e: any) {
    await logError(userId, "/api/replay", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
