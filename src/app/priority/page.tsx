/**
 * 優先順位を書き込む・分解する画面。
 *
 * リアルバースの本体は「今日どう動くか」を見るところなので、
 * **書き込みと分解はここに分ける**。あちらには1・2・3が並ぶだけにして、
 * 押したらこの画面に来る。
 */
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { PriorityGoals } from "@/components/PriorityGoals";

export const dynamic = "force-dynamic";

export default async function PriorityPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) redirect("/login");
  // まだ淳くんの画面だけ（試してから全員へ）
  if (!isAdmin(userId)) redirect("/");

  return (
    <main className="min-h-screen">
      <div className="realverse-bg" />
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 space-y-3">
        <Link href="/" className="inline-block text-xs text-purple-700 bg-white/80 border border-purple-200 rounded-full px-3 py-1.5">
          ← リアルバースにもどる
        </Link>
        <PriorityGoals />
      </div>
    </main>
  );
}
