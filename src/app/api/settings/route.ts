import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSettings, upsertUserSettings, loadQuickmemo, saveQuickmemo, logError } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const s: any = await getUserSettings(userId);
    return NextResponse.json({
      gemini_api_key_set: !!s?.gemini_api_key,
      ntfy_topic: s?.ntfy_topic ?? "",
      secretary_name: s?.secretary_name ?? "",
      secretary_avatar_url: s?.secretary_avatar_url ?? "",
      user_call_name: s?.user_call_name ?? "",
      weekly_schedule: s?.weekly_schedule ?? null,
      quickmemo: await loadQuickmemo(userId),
    });
  } catch (e: any) {
    await logError(userId, "/api/settings:GET", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const body = await req.json();
    const upd: any = {};
    if (typeof body.gemini_api_key === "string" && body.gemini_api_key) upd.gemini_api_key = body.gemini_api_key;
    if (typeof body.anthropic_api_key === "string" && body.anthropic_api_key) upd.anthropic_api_key = body.anthropic_api_key;
    if (typeof body.ntfy_topic === "string") upd.ntfy_topic = body.ntfy_topic;
    if (typeof body.work_email === "string") upd.work_email = body.work_email;
    if (typeof body.drive_root_folder_id === "string") upd.drive_root_folder_id = body.drive_root_folder_id;
    if (typeof body.secretary_name === "string") upd.secretary_name = body.secretary_name;
    if (typeof body.secretary_avatar_url === "string") upd.secretary_avatar_url = body.secretary_avatar_url;
    if (typeof body.user_call_name === "string") upd.user_call_name = body.user_call_name;
    // weekly_schedule: null か、または {mon: "HH:MM-HH:MM"|null, ...} 形式
    if (body.weekly_schedule === null || (body.weekly_schedule && typeof body.weekly_schedule === "object")) {
      upd.weekly_schedule = body.weekly_schedule;
    }
    if (Object.keys(upd).length > 0) await upsertUserSettings(userId, upd);
    if (typeof body.quickmemo === "string") await saveQuickmemo(userId, body.quickmemo);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await logError(userId, "/api/settings:POST", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
