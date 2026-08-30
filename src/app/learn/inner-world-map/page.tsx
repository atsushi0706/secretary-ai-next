import { auth } from "@/auth";
import { InnerWorldMapPlayer } from "@/components/learn/InnerWorldMapPlayer";
import { getUserSettings } from "@/lib/supabase";

export const metadata = {
  title: "インナーワールドマップ — SINGA WORLD",
  description: "清瀬淳とリンクの掛け合いで、顕在意識・潜在意識・文化的催眠・深層自己を順番に学ぶ6講のインタラクティブ教材",
};

export default async function InnerWorldMapPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  let userName = session?.user?.name?.trim() || "あなた";
  if (userId) {
    try {
      const settings = await getUserSettings(userId);
      userName = settings?.user_call_name?.trim() || userName;
    } catch {
      // ログイン名で継続する。
    }
  }

  return <InnerWorldMapPlayer userName={userName} />;
}
