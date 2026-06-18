/**
 * 自分の userId を確認するための隠しページ。
 * 管理者設定 (ADMIN_USER_IDS) のセットアップ時にだけ使う。
 * 通常UI(ヘッダー/フッター)からはリンクしていない = 直URLを知ってる人だけ。
 *
 * URL: /me/id
 *
 * このIDが他人に見えても害はない (Google sub 単体ではログイン手段にならない)。
 * ただ「管理者設定用」とラベルすると一般ユーザーが触りたくなるので、
 * 設定画面から削除して、知ってる人だけ来るこの隠しページに集約した。
 */
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import CopyButton from "./CopyButton";

export const metadata = {
  title: "あなたのID — Focus Secretary",
  robots: { index: false, follow: false },
};

export default async function MyIdPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id as string;

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">🔐 あなたのID</h1>
        <Link href="/" className="text-sm text-[var(--accent)] underline">← ホームへ</Link>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed mb-4">
        このページは管理者セットアップ用です。 <code>/admin</code> を有効化したい場合、
        下のIDをコピーして Vercel の環境変数 <code>ADMIN_USER_IDS</code> に登録してください。
      </p>

      <CopyButton userId={userId} />

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6 text-sm leading-relaxed">
        <div className="font-bold text-amber-700 mb-2">📝 セットアップ手順</div>
        <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
          <li>上の「コピー」ボタンでIDをコピー</li>
          <li>
            <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-purple-700 underline">
              Vercel ダッシュボード ↗
            </a>
            で <code>secretary-ai-next</code> を開く
          </li>
          <li>左メニュー <strong>Settings → Environment Variables</strong></li>
          <li>「Add New」を押す</li>
          <li>Key: <code>ADMIN_USER_IDS</code> 、Value: コピーしたIDを貼り付け</li>
          <li>「Save」</li>
          <li>左メニュー <strong>Deployments</strong> → 最新行の <strong>⋯ → Redeploy</strong></li>
          <li>1-2分待って <code>/admin</code> を開けば管理画面が見える</li>
        </ol>
      </div>

      <div className="mt-6 text-xs text-gray-400">
        ※ このページは通常UIからリンクしていません。URLを直接知っている人だけアクセスできます。
      </div>
    </main>
  );
}
