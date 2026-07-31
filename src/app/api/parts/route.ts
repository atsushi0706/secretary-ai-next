/**
 * 内なる子の神殿：図鑑（解放したガーディアン）の取得と、解放の記録。
 * GET  … 解放済み一覧＋コンプリート判定
 * POST … { color, wish? } を解放（画面から直接呼ぶ保険。通常は会話のタグで解放される）
 */
import { auth } from "@/auth";
import { listGuardians, releaseGuardian } from "@/lib/parts-db";
import { isPartColor, PART_COLORS } from "@/lib/parts";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return json({ error: "unauthenticated" }, 401);

  const guardians = await listGuardians(userId);
  return json({
    guardians,
    complete: PART_COLORS.every((c) => guardians.some((g) => g.color === c)),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return json({ error: "unauthenticated" }, 401);

  try {
    const body = await req.json();
    const color = body?.color;
    if (!isPartColor(color)) return json({ error: "bad_color" }, 400);
    const r = await releaseGuardian(userId, color, typeof body?.wish === "string" ? body.wish : undefined);
    const guardians = await listGuardians(userId);
    return json({
      ...r,
      guardians,
      complete: PART_COLORS.every((c) => guardians.some((g) => g.color === c)),
    });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e).slice(0, 200) }, 500);
  }
}
