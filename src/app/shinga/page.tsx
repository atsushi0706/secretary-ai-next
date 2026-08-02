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
 */
export default async function ShingaPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string; open?: string }>;
}) {
  const { place, open } = await searchParams;
  const initialPlace: PlaceKey | undefined = isPlaceKey(place) ? place : undefined;
  const openMode: ModeKey | undefined = isModeKey(open) ? open : undefined;

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

  return <ShingaWorld guideName={guideName} avatarUrl={avatarUrl} initialPlace={initialPlace} openMode={openMode} />;
}
