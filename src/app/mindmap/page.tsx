/**
 * マインドマップ・スケジューラー。淳くん専用。
 *
 * 話した内容を構造（マップ）にして、30分以内の粒まで割って、
 * フェーズ（第1週…）のロードマップに組む道具。
 * リアルバースの「🧠 マインドマップ」ボタンからここへ来る。
 */
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { hasFeature } from "@/lib/app-config";
import { MindMapTool } from "@/components/MindMapTool";

export const dynamic = "force-dynamic";

export default async function MindMapPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) redirect("/login");
  // 管理者か、管理画面で開けてもらった人（お試しスイッチ）
  if (!isAdmin(userId) && !(await hasFeature(userId, "mindmap"))) redirect("/");

  return (
    <main className="min-h-screen">
      <div className="realverse-bg" />
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-block text-xs text-purple-700 bg-white/80 border border-purple-200 rounded-full px-3 py-1.5">
            ← リアルバースにもどる
          </Link>
          <span className="text-xs font-bold text-purple-700">🧠 マインドマップ・スケジューラー</span>
        </div>
        <MindMapTool />
      </div>
    </main>
  );
}
