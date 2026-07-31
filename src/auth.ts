import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertUserSettings } from "@/lib/supabase";

// 実際に使うのは Calendar と Tasks だけ（google.ts の呼び出しはこの2つのみ）。
// Gmail / Drive（制限付きスコープ）は未使用 → 外す。これで一般公開の審査が
// CASA セキュリティ監査なしのセンシティブ審査だけで済む。
// ※将来 Gmail 要約等を実装するなら、そのときに戻す（CASA が必要になる点に注意）。
const SCOPES = [
  "openid",
  "email",
  "profile",
  // calendar 書き込みも入れる（清瀬リンクが予定を勝手に入れられるように）
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
].join(" ");

// 環境変数に古いドメイン（vercel.app）が残っていると、新ドメインからログインしても
// そちらへ飛ばされ、同意画面のアプリ名も旧ドメイン名で表示されてしまう。
// アクセスされたホストを常に信頼するため、古い固定URLは無効化しておく。
if (process.env.NEXTAUTH_URL?.includes("vercel.app")) delete process.env.NEXTAUTH_URL;
if (process.env.AUTH_URL?.includes("vercel.app")) delete process.env.AUTH_URL;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  debug: false,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // 初回ログイン時にトークンを Supabase に保存
      if (account && profile) {
        const userId = (profile.sub as string) || token.sub || "";
        token.userId = userId;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        if (account.refresh_token) {
          try {
            await upsertUserSettings(userId, {
              google_refresh_token: account.refresh_token,
              google_scopes: SCOPES,
            });
          } catch (e) {
            console.error("Failed to persist refresh token:", e);
          }
        }
        // 管理画面で「誰が」を出すため、メール・表示名を保存（列が無くても本体を壊さないよう別枠）。
        try {
          const email = (profile.email as string) || "";
          const name = (profile.name as string) || "";
          if (email || name) {
            await upsertUserSettings(userId, {
              ...(email ? { email } : {}),
              ...(name ? { display_name: name } : {}),
            });
          }
        } catch { /* email/display_name 列が未追加でも無視 */ }
      }
      return token;
    },
    async session({ session, token }) {
      // クライアント側に userId を出す
      if (token?.userId) {
        (session.user as any).id = token.userId as string;
      }
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
