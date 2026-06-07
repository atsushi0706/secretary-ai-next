import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSettings, upsertUserSettings, loadQuickmemo, saveQuickmemo } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const s = await getUserSettings(userId);
  return NextResponse.json({
    gemini_api_key_set: !!s?.gemini_api_key,
    ntfy_topic: s?.ntfy_topic ?? "",
    work_email: s?.work_email ?? "",
    drive_root_folder_id: s?.drive_root_folder_id ?? "",
    quickmemo: await loadQuickmemo(userId),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const upd: any = {};
  if (typeof body.gemini_api_key === "string" && body.gemini_api_key) upd.gemini_api_key = body.gemini_api_key;
  if (typeof body.ntfy_topic === "string") upd.ntfy_topic = body.ntfy_topic;
  if (typeof body.work_email === "string") upd.work_email = body.work_email;
  if (typeof body.drive_root_folder_id === "string") upd.drive_root_folder_id = body.drive_root_folder_id;
  if (Object.keys(upd).length > 0) await upsertUserSettings(userId, upd);
  if (typeof body.quickmemo === "string") await saveQuickmemo(userId, body.quickmemo);
  return NextResponse.json({ ok: true });
}
