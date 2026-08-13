import { ShingaWorld } from "@/components/shinga/ShingaWorld";
import { isPlaceKey, type PlaceKey } from "@/lib/places";
import { isModeKey, type ModeKey } from "@/lib/modes";

/**
 * シンガワールド。
 * 入口を並べるのではなく、地図の真ん中に案内役がいて、話すと場所が動く。
 *
 * ?place=... を付けて開くと、その場所から始まる
 * （リアルバースのタスクから「振り返る」で来たときなど）。
 * ?open=akashic のように付けると、そのワークが直接ひらく（朝の通知の行き先）。
 * ?from=iw:日付:部屋 を足すと、その記録を持ったまま始まる（チャットの記録の「この続きから話す」）。
 */
export default async function ShingaPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string; open?: string; from?: string }>;
}) {
  const { place, open, from } = await searchParams;
  const initialPlace: PlaceKey | undefined = isPlaceKey(place) ? place : undefined;
  const openMode: ModeKey | undefined = isModeKey(open) ? open : undefined;
  // 通知から直行する画面（ワークではないもの）
  const openPanel = open === "daily" || open === "weekly" ? open : undefined;
  // 記録の鍵。形だけここで確かめる（中身は本人のものかどうかをAPIが見る）
  const fromKey = typeof from === "string" && /^iw:\d{4}-\d{2}-\d{2}:[a-z_]+$/.test(from) ? from : undefined;

  let guideName = "清瀬リンク";
  let avatarUrl = "/kiyose.png";
  try {
    const { auth } = await import("@/auth");
    const { getUserSettings } = await import("@/lib/supabase");
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (userId) {
      const s: any = await getUserSettings(userId);
      if (s?.secretary_name) guideName = s.secretary_name;
      if (s?.secretary_avatar_url) avatarUrl = s.secretary_avatar_url;
    }
  } catch {
    // 名前や姿が取れなくても世界には入れる
  }

  return <ShingaWorld guideName={guideName} avatarUrl={avatarUrl} initialPlace={initialPlace} openMode={openMode} openPanel={openPanel} fromKey={fromKey} />;
}
