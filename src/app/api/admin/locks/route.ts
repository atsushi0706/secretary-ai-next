/**
 * ワークの鍵（管理者専用）。
 * GET  : いま鍵がかかっているワークの一覧
 * POST : { locked: string[] } → 鍵を掛け替える（親アカウントには効かない）
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getLockedWorks, setLockedWorks } from "@/lib/app-config";
import { MODE_KEYS } from "@/lib/modes";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!isAdmin(userId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ locked: await getLockedWorks(), all: MODE_KEYS });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!isAdmin(userId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const b = await req.json().catch(() => ({}));
    const locked = Array.isArray(b.locked)
      ? b.locked.map(String).filter((k: string) => (MODE_KEYS as string[]).includes(k))
      : [];
    await setLockedWorks(locked);
    return NextResponse.json({ ok: true, locked });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (/app_config/.test(msg) || /relation .* does not exist/i.test(msg)) {
      return NextResponse.json({ error: "保存先（app_config）がまだ作られていません。SQLを流してください。", needsMigration: true }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
