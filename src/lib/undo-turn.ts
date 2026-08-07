/**
 * 「送ったメッセージを書き直す」。
 *
 * 【なぜ要るか】
 * スマホの改行キーで途中送信されてしまう、という声があった（改行は直した）。
 * それでも、言い間違いや、書き足りないまま送ってしまうことはある。
 * 送ったあとに直せないと、その気まずさが会話に残る。
 *
 * 【やりかた】
 * 履歴を書き換えるのではなく、**最後のひと往復を取り消して入力欄に戻す**。
 * 自分の最後の発言と、そのあとのAIの返事を消して、文章だけ返す。
 * こうすると「編集して送り直す」と同じことができて、履歴も食い違わない。
 * （途中のメッセージだけ書き換えると、その後の会話と噛み合わなくなる）
 */
import { supabaseAdmin } from "./supabase";

type Filter = Record<string, string>;

export async function undoLastTurn(
  table: "conversations" | "shinga_conversations",
  userId: string,
  filter: Filter = {},
): Promise<{ text: string; removed: number } | null> {
  const supa = supabaseAdmin();

  let q = supa.from(table).select("id, role, content").eq("user_id", userId);
  for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
  const { data, error } = await q.order("id", { ascending: false }).limit(20);
  if (error) throw error;

  const rows = (data ?? []) as { id: number; role: string; content: string }[];
  // いちばん新しい「自分の発言」を探す（そのあとのAIの返事はまとめて消す）
  const mine = rows.find((r) => r.role === "user");
  if (!mine) return null;

  const removed = rows.filter((r) => r.id >= mine.id).length;

  let del = supa.from(table).delete().eq("user_id", userId).gte("id", mine.id);
  for (const [k, v] of Object.entries(filter)) del = del.eq(k, v);
  const { error: e2 } = await del;
  if (e2) throw e2;

  return { text: mine.content, removed };
}
