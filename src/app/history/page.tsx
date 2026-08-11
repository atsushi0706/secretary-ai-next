/**
 * チャットの記録。全員が使える（自分のぶんしか出ない）。
 * 入口はワールドメモリーの棚（💬 チャットの記録）。
 */
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChatHistory } from "@/components/ChatHistory";

export const dynamic = "force-dynamic";
export const metadata = { title: "チャットの記録 — SINGA WORLD" };

export default async function HistoryPage() {
  const session = await auth();
  if (!(session?.user as any)?.id) redirect("/login");

  return (
    <main className="min-h-screen">
      <div className="realverse-bg" />
      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-block text-xs text-purple-700 bg-white/80 border border-purple-200 rounded-full px-3 py-1.5">
            ← もどる
          </Link>
          <span className="text-xs font-bold text-purple-700">💬 チャットの記録</span>
        </div>
        <ChatHistory />
      </div>
    </main>
  );
}
