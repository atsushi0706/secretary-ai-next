/**
 * おぼえていること（記憶）。全員が使える（自分のぶんだけ）。
 * 入口はワールドメモリーの棚（🧠 おぼえていること）。
 */
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MemoryVault } from "@/components/MemoryVault";

export const dynamic = "force-dynamic";
export const metadata = { title: "おぼえていること — SINGA WORLD" };

export default async function MemoryPage() {
  const session = await auth();
  if (!(session?.user as any)?.id) redirect("/login");

  return (
    <main className="min-h-screen">
      <div className="realverse-bg" />
      <div className="max-w-xl mx-auto px-3 sm:px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-block text-xs text-purple-700 bg-white/80 border border-purple-200 rounded-full px-3 py-1.5">
            ← もどる
          </Link>
          <span className="text-xs font-bold text-purple-700">🧠 おぼえていること</span>
        </div>
        <MemoryVault />
      </div>
    </main>
  );
}
