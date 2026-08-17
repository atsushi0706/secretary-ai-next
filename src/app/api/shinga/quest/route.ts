/**
 * クエストを置く（本人が「置く」を選んだときだけ呼ばれる）。
 *
 * 以前は対話の途中でサーバが勝手に作っていた。
 * 頼んでいないのに「✓ クエストに置いたよ」とだけ出て、しかも会話に埋もれていた。
 * 置くかどうかは本人が決める。ここはその「決めた」を受ける口。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createQuest, isMissingTable, MIGRATION_HINT } from "@/lib/shinga";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const b = await req.json().catch(() => ({}));
    const title = String(b?.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "中身がありません" }, { status: 400 });
    const q = await createQuest(userId, {
      title: title.slice(0, 60),
      // 期限（あれば）は本文の頭に置く。quests に期限の列は無いので、ここで見えるようにする
      body: [b?.due ? `期限 ${String(b.due).slice(0, 10)}` : "", String(b?.body ?? "")].filter(Boolean).join("　").slice(0, 300),
      category: "life",
    });
    return NextResponse.json({ ok: true, quest: { id: q.id, title: q.title } });
  } catch (e: any) {
    if (isMissingTable(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
