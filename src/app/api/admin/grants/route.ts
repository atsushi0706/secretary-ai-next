/**
 * ひとりずつ開ける機能の管理（親アカウントだけ）。
 * GET  … いまの開放状況
 * POST … { feature, userId, on } で1人ぶん開け閉め
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getFeatureGrants, setFeatureGrant, setFeatureAll, GRANTABLE, isFeatureKey } from "@/lib/app-config";

export const dynamic = "force-dynamic";

async function guard() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  if (!isAdmin(userId)) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { error: null as any };
}

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;
  return NextResponse.json({ grants: await getFeatureGrants(), grantable: GRANTABLE });
}

export async function POST(req: Request) {
  const g = await guard();
  if (g.error) return g.error;
  try {
    const b = await req.json();
    if (!isFeatureKey(b.feature)) return NextResponse.json({ error: "unknown feature" }, { status: 400 });
    // 一括：全員まとめて開ける／閉じる（例外はまっさらになる）
    if (b.scope === "all") {
      const grants = await setFeatureAll(b.feature, !!b.on);
      return NextResponse.json({ ok: true, grants });
    }
    // 個別：既定と違う扱いにする
    const target = String(b.userId ?? "").trim();
    if (!target) return NextResponse.json({ error: "userId が要ります" }, { status: 400 });
    const grants = await setFeatureGrant(b.feature, target, !!b.on);
    return NextResponse.json({ ok: true, grants });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
