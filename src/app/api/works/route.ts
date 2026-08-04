/**
 * いまのユーザーが使えるワークと機能。
 * 親アカウント（管理者）は常に全部。それ以外は app_config の鍵に従う。
 *
 * ワークの鍵（locked）は全員に効く一括の鍵。
 * それとは別に、まだ配りたくないもの（発信スタジオ）は
 * **既定で全員に鍵**をかけ、管理画面で開けた人だけに出す。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { getLockedWorks, getFeatureGrants, GRANTABLE, type FeatureKey } from "@/lib/app-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const admin = isAdmin(userId);
  const grants = await getFeatureGrants();
  const features = Object.fromEntries(
    GRANTABLE.map((g) => [g.key, admin || (grants[g.key as FeatureKey] ?? []).includes(userId)]),
  );

  if (admin) return NextResponse.json({ locked: [], isAdmin: true, features });
  return NextResponse.json({ locked: await getLockedWorks(), isAdmin: false, features });
}
