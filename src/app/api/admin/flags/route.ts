/**
 * お試しスイッチの管理（親アカウントだけ）。
 * GET  … いまの状態
 * POST … { key, state } で 淳くんだけ／全員／切る を切り替える
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getFlags, setFlag, FLAGS, isFlagKey, isFlagState } from "@/lib/flags";

export const dynamic = "force-dynamic";

async function guard() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

export async function GET() {
  const ng = await guard();
  if (ng) return ng;
  return NextResponse.json({ flags: await getFlags(), defs: FLAGS });
}

export async function POST(req: Request) {
  const ng = await guard();
  if (ng) return ng;
  try {
    const b = await req.json().catch(() => ({}));
    if (!isFlagKey(b.key)) return NextResponse.json({ error: "unknown key" }, { status: 400 });
    if (!isFlagState(b.state)) return NextResponse.json({ error: "unknown state" }, { status: 400 });
    return NextResponse.json({ ok: true, flags: await setFlag(b.key, b.state) });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
