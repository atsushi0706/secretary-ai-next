/**
 * マイクの調子をみる画面。
 * お客様に URL を渡して開いてもらう（誰でも見られる。ログインは要らない）。
 * ただし書き起こしの試し録りだけは、キーの持ち主が要るのでログイン後に動く。
 */
import Link from "next/link";
import { VoiceCheck } from "@/components/VoiceCheck";

export const dynamic = "force-dynamic";
export const metadata = { title: "マイクの調子をみる — SINGA WORLD" };

export default function VoiceCheckPage() {
  return (
    <main className="min-h-screen">
      <div className="realverse-bg" />
      <div className="max-w-xl mx-auto px-3 sm:px-5 py-4 space-y-3">
        <Link href="/" className="inline-block text-xs text-purple-700 bg-white/80 border border-purple-200 rounded-full px-3 py-1.5">
          ← もどる
        </Link>
        <VoiceCheck />
      </div>
    </main>
  );
}
