/**
 * 話し言葉の「誤字脱字直し」だけをする。
 *
 * 中身は src/lib/polish.ts（音声入力と共通）。整えは Claude(Haiku) を指名する。
 * 失敗しても必ず原文を返すので、話した内容が消えることはない。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { polishSpeech } from "@/lib/polish";
import { logError } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let raw = "";
  try {
    const b = await req.json();
    raw = String(b.text ?? "").trim();
    if (!raw) return NextResponse.json({ error: "text が空です" }, { status: 400 });

    const { text, edited } = await polishSpeech(userId, raw);
    return NextResponse.json({ text: text || raw, edited });
  } catch (e: any) {
    await logError(userId, "/api/polish", e);
    // 整形に失敗しても、話した内容が消えては困るので原文をそのまま返す
    return NextResponse.json({ text: raw, error: String(e?.message ?? e) });
  }
}
