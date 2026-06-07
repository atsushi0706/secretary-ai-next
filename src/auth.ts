import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertUserSettings } from "@/lib/supabase";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

export const { handlers, signIn, signOut, auth } = NextAuth({
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
