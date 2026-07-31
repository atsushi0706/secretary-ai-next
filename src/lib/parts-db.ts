/**
 * 内なる子の神殿：DB 側（サーバ専用）。
 * 画面から直接 import しないこと（parts.ts はデータだけなのでクライアントでも読める）。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";
import { isPartColor, type PartColor } from "./parts";

/** 解放されたガーディアンの記録 */
export type GuardianRow = {
  color: PartColor;
  date: string;
  /** そのとき本人が言った「本当はどうしたい」 */
  wish?: string | null;
};

/** 図鑑：解放済みのガーディアン一覧 */
export async function listGuardians(userId: string): Promise<GuardianRow[]> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("guardians").select("color, date, wish")
      .eq("user_id", userId).order("date", { ascending: true });
    return ((data ?? []) as GuardianRow[]).filter((g) => isPartColor(g.color));
  } catch { return []; }
}

/** ガーディアンを解放する（同じ色は1体。あとから解放し直しても上書きしない） */
export async function releaseGuardian(
  userId: string, color: PartColor, wish?: string,
): Promise<{ first: boolean; total: number }> {
  const before = await listGuardians(userId);
  const already = before.some((g) => g.color === color);
  if (!already) {
    try {
      const supa = supabaseAdmin();
      await supa.from("guardians").upsert(
        { user_id: userId, color, wish: wish?.slice(0, 300) ?? null, date: jstDateStr(), created_at: new Date().toISOString() },
        { onConflict: "user_id,color" },
      );
    } catch { /* テーブル未作成でも本体は止めない */ }
  }
  const total = already ? before.length : before.length + 1;
  return { first: !already, total };
}
