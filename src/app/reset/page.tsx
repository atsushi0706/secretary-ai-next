import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * セッション自己修復ページ。
 *
 * 「シークレットで再ログインしないと使えない」現象が起きた時、
 * ユーザーがこの URL にアクセスするだけで自分で治せるようにする。
 *
 * やること:
 * - NextAuth 系の全 cookie を削除
 * - /login にリダイレクト → Google 再認証で refresh_token が更新される
 *
 * URL: https://secretary-ai-next.vercel.app/reset
 */
export const dynamic = "force-dynamic";

export default async function ResetPage() {
  const store = await cookies();
  // NextAuth の cookie 名は環境で変わる (secure prefix つき/なし)。前方一致で全部消す。
  const targets = [
    "next-auth.session-token",
    "next-auth.csrf-token",
    "next-auth.callback-url",
    "next-auth.pkce.code_verifier",
    "next-auth.state",
    "__Secure-next-auth.session-token",
    "__Secure-next-auth.callback-url",
    "__Host-next-auth.csrf-token",
    "__Secure-next-auth.pkce.code_verifier",
    "authjs.session-token",
    "authjs.csrf-token",
    "authjs.callback-url",
    "__Secure-authjs.session-token",
    "__Secure-authjs.callback-url",
    "__Host-authjs.csrf-token",
  ];
  for (const name of targets) {
    try {
      store.delete(name);
      store.set(name, "", { maxAge: 0, path: "/" });
    } catch { /* ignore */ }
  }
  // 現在のドメインの全 cookie を走査して authjs/next-auth 系を追加で消す
  for (const c of store.getAll()) {
    if (/^(__(Secure|Host)-)?(authjs|next-auth)\./i.test(c.name)) {
      try {
        store.delete(c.name);
        store.set(c.name, "", { maxAge: 0, path: "/" });
      } catch { /* ignore */ }
    }
  }
  redirect("/login");
}
