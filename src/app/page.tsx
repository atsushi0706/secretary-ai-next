import { redirect } from "next/navigation";

/**
 * アプリの入口。
 *
 * このアプリの本体はインナーワールド（Singa World）なので、開いたらそこへ入る。
 * 朝の流れ（気分チェック → 今日の動けそう度 → 未来からの手紙 → 世界）も全部そちら側にあり、
 * 通知から開いたときにその流れへ直行できるようにするため。
 * 現実側（予定・タスク）は /realverse。上のタブでいつでも行き来できる。
 */
export default async function HomePage() {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user) {
      // 未ログインは紹介ページへ。ログイン画面に直行させると、
      // Google の確認要件「ホームページがログインページだけであってはならない」を満たせない
      redirect("/welcome");
    }
    const userId = (session.user as any).id as string;

    // 初期設定が終わるまでは、中に入れない。
    // 名前・生年月日・APIキーのどれかが欠けていると、取扱説明書やアカシックが
    // そもそも動かず、「壊れている」ように見えてしまうため。
    try {
      const { getUserSettings } = await import("@/lib/supabase");
      const s: any = await getUserSettings(userId);
      const needsSetup =
        !s?.user_call_name ||
        !s?.birth_date ||
        !(s?.gemini_api_key || s?.anthropic_api_key);
      if (needsSetup) {
        redirect("/onboarding");
      }
    } catch (e: any) {
      if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
      // 設定が読めなくても、世界には入れる
      console.error("[HomePage] getUserSettings failed:", e);
    }
  } catch (e: any) {
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    console.error("[HomePage] auth failed:", e);
    redirect("/reset");
  }

  redirect("/shinga");
}
