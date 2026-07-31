/** 覚醒能力（六角形）と、手に入れたスキルカード。 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeAbilities, listSkillCards } from "@/lib/awaken";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const [abilities, cards] = await Promise.all([
      computeAbilities(userId).catch(() => []),
      listSkillCards(userId).catch(() => []),
    ]);
    return NextResponse.json({ abilities, cards });
  } catch (e: any) {
    return NextResponse.json({ abilities: [], cards: [], error: String(e?.message ?? e) });
  }
}
