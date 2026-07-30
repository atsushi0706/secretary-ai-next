/**
 * アカシックの深層記録。レベル(%)に応じて章が解放される。
 * GET            : { level, chapters:[{key,title,need,hint,unlocked,body}] }
 * POST {key}     : その章を生成して保存（解放済みのみ）→ { body }
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeLevel } from "@/lib/inner";
import { DEEP_CHAPTERS, readDeepChapter } from "@/lib/deepRead";
import { getUserSettings, supabaseAdmin, logError } from "@/lib/supabase";

export const maxDuration = 45;

async function readSaved(userId: string): Promise<Record<string, string>> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("deep_reads").select("chapter, body").eq("user_id", userId);
    const m: Record<string, string> = {};
    for (const r of (data ?? []) as any[]) if (r.chapter) m[r.chapter] = r.body ?? "";
    return m;
  } catch { return {}; }
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const [lv, saved, s] = await Promise.all([
      computeLevel(userId).catch(() => ({ level: 50 } as any)),
      readSaved(userId),
      getUserSettings(userId).catch(() => null) as any,
    ]);
    const hasBirth = !!s?.birth_date;
    const chapters = DEEP_CHAPTERS.map((c) => ({
      ...c,
      unlocked: lv.level >= c.need,
      body: saved[c.key] ?? "",
    }));
    return NextResponse.json({ level: lv.level, hasBirth, chapters });
  } catch (e: any) {
    await logError(userId, "/api/deep-read", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const { key } = await req.json();
    const ch = DEEP_CHAPTERS.find((c) => c.key === key);
    if (!ch) return NextResponse.json({ error: "unknown chapter" }, { status: 400 });

    const lv = await computeLevel(userId).catch(() => ({ level: 50 } as any));
    if (lv.level < ch.need) {
      return NextResponse.json({ error: `レベル${ch.need}%で開くよ（いま${lv.level}%）` }, { status: 403 });
    }
    const s: any = await getUserSettings(userId).catch(() => null);
    if (!s?.birth_date) return NextResponse.json({ error: "設定で生年月日を登録すると読めるようになるよ" }, { status: 400 });

    // すでに読んだ章はそのまま返す（毎回変わらない＝“記録”として扱う）
    const saved = await readSaved(userId);
    if (saved[key]) return NextResponse.json({ body: saved[key] });

    const body = await readDeepChapter(key, s.birth_date, s.user_call_name || "");
    if (!body) return NextResponse.json({ error: "うまく読み取れなかった。少し待ってもう一度。" }, { status: 502 });

    try {
      const supa = supabaseAdmin();
      await supa.from("deep_reads").upsert(
        { user_id: userId, chapter: key, body, created_at: new Date().toISOString() },
        { onConflict: "user_id,chapter" },
      );
    } catch { /* 保存できなくても本文は返す */ }
    return NextResponse.json({ body });
  } catch (e: any) {
    await logError(userId, "/api/deep-read", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
