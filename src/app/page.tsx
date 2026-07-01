import { redirect } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";

/**
 * ルートページ。auth() や getUserSettings() で例外が発生しても
 * 絶対にレスポンスがコケないように try/catch でガード。
 * サーバー側で throw すると Chrome 側で「This page couldn't load」になるため。
 */
export default async function HomePage() {
  let userId: string | null = null;
  let userName = "あなた";
  let setupNeeded = false;

  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user) {
      redirect("/login");
    }
    userId = (session.user as any).id as string;
    userName = session.user.name ?? "あなた";
  } catch (e: any) {
    // redirect() は内部的に throw するので、Next.js のリダイレクトはそのまま伝搬させる
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    // それ以外の例外 (JWT decode 失敗など) は /reset に逃がして自己修復
    console.error("[HomePage] auth failed:", e);
    redirect("/reset");
  }

  // 初回ログインで「呼ばれたい名前」も「Gemini キー」も未設定なら、オンボーディングへ
  try {
    const { getUserSettings } = await import("@/lib/supabase");
    const s: any = await getUserSettings(userId!);
    const noCallName = !s?.user_call_name;
    const noGemini = !s?.gemini_api_key;
    const noAnthropic = !s?.anthropic_api_key;
    if (noCallName && noGemini && noAnthropic) {
      redirect("/onboarding");
    }
    setupNeeded = false;
  } catch (e: any) {
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    // Supabase 側で問題があっても、ダッシュボードは表示する (client 側で bootstrap がエラーを扱う)
    console.error("[HomePage] getUserSettings failed:", e);
  }

  void setupNeeded;
  return <Dashboard userName={userName} />;
}
