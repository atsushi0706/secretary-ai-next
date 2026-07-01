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
        <div className="text-5xl mb-3">🔄</div>
        <h1 className="text-xl font-bold mb-2">セッションをリセット</h1>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          NextAuth セッションを完全に破棄して、Google の認可画面に直接飛びます。
          <br />
          そこで「許可」を押すと refresh_token が再発行されて復旧します。
        </p>
        <form action={handleReset}>
          <button
            type="submit"
            className="w-full bg-[var(--accent)] text-white font-bold py-3 rounded-xl hover:opacity-90"
          >
            🔓 セッションを破棄して Google 認可に進む
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4">
          「アプリはテスト中」の警告が出ても「詳細 → 続行 (安全ではないページに移動)」で OK
        </p>
      </div>
    </main>
  );
}
