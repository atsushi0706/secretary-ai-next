import { QuestBoard } from "@/components/shinga/QuestBoard";

/**
 * クエスト一覧 / 詳細。
 * 詳細は動的ルートではなく ?quest=<id> + クライアント内の表示切替で扱う。
 * (Next 16 では params/searchParams が Promise。ここでは await して渡すだけ)
 */
export default async function QuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ quest?: string }>;
}) {
  const { quest } = await searchParams;
  return <QuestBoard initialQuestId={quest} />;
}
