/**
 * セッション自己修復ページ。
 * NextAuth の signOut を使ってセッションを完全クリアし、Google 再認証に強制的に飛ばす。
 *
 * URL: https://secretary-ai-next.vercel.app/reset
 */
import { signOut, signIn } from "@/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// クリア対象の cookie 名パターン (secure prefix つき/なし、authjs/next-auth 両対応)
const AUTH_COOKIE_REGEX = /^(__(Secure|Host)-)?(authjs|next-auth)\./i;

async function handleReset() {
  "use server";
  try {
    // NextAuth のセッションを正式に破棄 (JWT の場合は cookie 削除)
    await signOut({ redirect: false });
  } catch {
    /* ignore */
  }
  // 念のため手動で残ってる auth 系 cookie も全部消す
  try {
    const store = await cookies();
    for (const c of store.getAll()) {
      if (AUTH_COOKIE_REGEX.test(c.name)) {
        try {
          store.delete(c.name);
          store.set(c.name, "", { maxAge: 0, path: "/" });
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  // すぐに Google OAuth に飛ばす (prompt=consent で強制的に権限画面 → refresh_token を再発行)
  await signIn("google", { redirectTo: "/" });
}

export default async function ResetPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#f5f3fb] to-white">
      <div className="card max-w-md w-full text-center">
        <div className="text-5xl mb-3">🌱</div>
        <h1 className="text-xl font-bold mb-2">Google と再接続</h1>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          セキュリティのため、Google 連携の更新が必要になりました。
          <br />
          下のボタンひとつで完了します。
        </p>
        <form action={handleReset}>
          <button
            type="submit"
            className="w-full bg-[var(--accent)] text-white font-bold py-3 rounded-xl hover:opacity-90"
          >
            Google で再接続する
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          Google の画面で「続行」または「許可」を押してください。<br />
          もし「このアプリは Google で確認されていません」と出たら、<br />
          「詳細」→「（アプリ名）に移動」で進めます。
        </p>
      </div>
    </main>
  );
}
