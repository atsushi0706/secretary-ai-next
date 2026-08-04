/**
 * クリスタル（壁打ちの結晶）の保管。
 *
 * GET            … 保管庫の中身
 * POST draft     … 壁打ちのやり取りから、まとめの下書きを作る（保存はしない）
 * POST save      … 名前をつけて保存する
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listCrystals, saveCrystal, buildCrystalDraft, isMissingCrystals, CRYSTAL_MIGRATION,
} from "@/lib/crystal";
import { getUserSettings } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ crystals: await listCrystals(userId) });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const b = await req.json().catch(() => ({}));

    if (b.action === "draft") {
      const s: any = await getUserSettings(userId).catch(() => null);
      const lines = (Array.isArray(b.lines) ? b.lines : [])
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-60);
      const draft = await buildCrystalDraft(userId, s?.user_call_name || "きみ", lines);
      return NextResponse.json({ ok: true, draft });
    }

    if (b.action === "save") {
      const name = String(b.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "名前をつけてね" }, { status: 400 });
      const c = await saveCrystal(userId, {
        name,
        headline: String(b.headline ?? ""),
        summary: String(b.summary ?? ""),
        points: (Array.isArray(b.points) ? b.points : []).map(String),
        next_steps: (Array.isArray(b.next_steps) ? b.next_steps : []).map(String),
      });
      return NextResponse.json({ ok: true, crystal: c });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    if (isMissingCrystals(e)) {
      return NextResponse.json(
        { error: "保管庫の置き場所がまだ用意できていません（下のSQLを1回だけ流してください）", sql: CRYSTAL_MIGRATION },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
