import { notFound } from "next/navigation";
import { getEpisode } from "@/lib/learn";
import { LearnPlayer } from "@/components/learn/LearnPlayer";

export default async function LearnEpisodePage({ params }: { params: Promise<{ ep: string }> }) {
  const { ep } = await params;
  const episode = getEpisode(ep);
  if (!episode) notFound();
  return <LearnPlayer episode={episode} />;
}
