/**
 * 速学力の贈り物を配る（マスター専用）。
 *
 * POST { test: true }  → まず自分（押した本人）にだけ通知を送って、見え方を確かめる
 * POST { test: false } → 8月の上位10名に通知を送る（1〜3位は順位入りの文面）
 *
 * 贈り物ページ（/gift/sokugaku）側でも上位10名かを数え直して確かめるので、
 * ここで送り先を間違えても、本が渡ってしまうことはない。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { ranking } from "@/lib/points";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const URL_PATH = "/gift/sokugaku";
const MEDALS = ["🥇", "🥈", "🥉"];

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!isAdmin(userId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const test = b?.test !== false;

  if (test) {
    // まず清瀬だけ：自分に送って、通知→ページ→ダウンロードまでの流れを確かめる
    const r = await sendPushToUser(userId, {
      title: "📕 テスト：速学力の贈り物",
      body: "開くと、贈り物ページが見えるか確かめられるよ",
      url: URL_PATH, tag: "gift-sokugaku",
    });
    return NextResponse.json({ ok: true, test: true, sent: r.sent, found: r.found });
  }

  const top = await ranking(10);
  const results: { rank: number; name: string; sent: number; found: number }[] = [];
  for (let i = 0; i < top.length; i++) {
    const rank = i + 1;
    const title = rank <= 3 ? `${MEDALS[rank - 1]} 8月、あなたは第${rank}位！` : "📕 速学力が届いたよ";
    const body = rank <= 3
      ? "1ヶ月おつかれさま。感謝を込めて『速学力』を贈るよ。開いて受け取ってね"
      : "8月の上位10名に入ったよ。1ヶ月おつかれさま。開いて受け取ってね";
    try {
      const r = await sendPushToUser(top[i].userId, { title, body, url: URL_PATH, tag: "gift-sokugaku" });
      results.push({ rank, name: top[i].name, sent: r.sent, found: r.found });
    } catch {
      results.push({ rank, name: top[i].name, sent: 0, found: 0 });
    }
  }
  return NextResponse.json({ ok: true, test: false, results });
}
