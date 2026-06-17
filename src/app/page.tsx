import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { getUserSettings } from "@/lib/supabase";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id;

  // 初回ログインで「呼ばれたい名前」も「Gemini キー」も未設定なら、オンボーディングへ
  // 管理者(環境変数の Anthropic キーで動くユーザー = 淳くん)は除外
  try {
    const s: any = await getUserSettings(userId);
    const noCallName = !s?.user_call_name;
    const noGemini = !s?.gemini_api_key;
    const noAnthropic = !s?.anthropic_api_key;
    if (noCallName && noGemini && noAnthropic) {
      redirect("/onboarding");
    }
  } catch {
    // 設定取得失敗時はそのまま Dashboard を表示
  }

  return <Dashboard userName={session.user.name ?? "あなた"} />;
}
