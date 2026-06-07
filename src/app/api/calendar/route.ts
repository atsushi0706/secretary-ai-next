import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCalendarEvents } from "@/lib/google";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const daysAhead = Number(url.searchParams.get("daysAhead") ?? "42");
  try {
    const events = await getCalendarEvents(userId, daysAhead);
    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
