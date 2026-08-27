import { notFound } from "next/navigation";
import { getEpisode } from "@/lib/learn";
import { LearnPlayer } from "@/components/learn/LearnPlayer";
import { auth } from "@/auth";
import { getUserSettings } from "@/lib/supabase";

export default async function LearnEpisodePage({ params }: { params: Promise<{ ep: string }> }) {
  const { ep } = await params;
  const episode = getEpisode(ep);
  if (!episode) notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  let userName = session?.user?.name?.trim() || "あなた";
  if (userId) {
    try {
      const settings = await getUserSettings(userId);
      userName = settings?.user_call_name?.trim() || userName;
    } catch { /* ログイン名で継続する */ }
  }

  return <LearnPlayer episode={episode} userName={userName} />;
}
