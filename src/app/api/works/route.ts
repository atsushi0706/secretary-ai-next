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
import { getLockedWorks, getFeatureGrants, ruleAllows, GRANTABLE, type FeatureKey } from "@/lib/app-config";
import { countUnreadWeekly } from "@/lib/weekly";
import { getFlags, resolveFlags } from "@/lib/flags";
import { giftStatus } from "@/lib/points";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const admin = isAdmin(userId);
  // 未読の週次レポート数。通知を許可していない人にも「届いてるよ」と分かるように、
  // 地図の宝箱へ印を出すために使う
  const [grants, unreadWeekly, flagStates, gift] = await Promise.all([
    getFeatureGrants(), countUnreadWeekly(userId), getFlags(), giftStatus(userId),
  ]);
  /*
   * 速学力の贈り物の帯。通知を押しても開かない端末があった（淳くん報告）ので、
   * シンガワールドを開いた瞬間に地図へ出す。
   * 淳くんは表が保存されていれば見える（テスト用）。ほかの人は②で配ってから。
   */
  const giftBand = admin ? (gift.stored ? { rank: gift.rank } : null)
    : (gift.published && gift.rank ? { rank: gift.rank } : null);
  // お試しスイッチ。新しいものは、まず淳くんの画面にだけ出る
  const flags = resolveFlags(flagStates, admin);
  const features = Object.fromEntries(
    GRANTABLE.map((g) => [g.key, admin || ruleAllows(grants[g.key as FeatureKey], userId)]),
  );

  if (admin) return NextResponse.json({ locked: [], isAdmin: true, features, unreadWeekly, flags, gift: giftBand });
  return NextResponse.json({ locked: await getLockedWorks(), isAdmin: false, features, unreadWeekly, flags, gift: giftBand });
}
