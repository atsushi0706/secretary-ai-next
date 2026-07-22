import { ShingaWorld } from "@/components/shinga/ShingaWorld";
import { isPlaceKey, type PlaceKey } from "@/lib/places";

/**
 * シンガワールド。
 * 入口を並べるのではなく、地図の真ん中に案内役がいて、話すと場所が動く。
 *
 * ?place=... を付けて開くと、その場所から始まる
 * （リアルバースのタスクから「振り返る」で来たときなど）。
 */
export default async function ShingaPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string }>;
}) {
  const { place } = await searchParams;
  const initialPlace: PlaceKey | undefined = isPlaceKey(place) ? place : undefined;

  let guideName = "清瀬リンク";
  try {
    const { auth } = await import("@/auth");
    const { getUserSettings } = await import("@/lib/supabase");
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (userId) {
      const s: any = await getUserSettings(userId);
      if (s?.secretary_name) guideName = s.secretary_name;
    }
  } catch {
    // 名前が取れなくても世界には入れる
  }

  return <ShingaWorld guideName={guideName} initialPlace={initialPlace} />;
}
