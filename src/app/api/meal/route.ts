/**
 * 食事の記録。
 *   GET    ?date=YYYY-MM-DD | all → その日の記録と合計
 *   POST   { mealType, result } → 直したものを保存
 *   DELETE ?id=... → 1件消す
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveMeal, listMeals, deleteMeal, normalize, MEAL_MIGRATION } from "@/lib/meal";
import { logError } from "@/lib/supabase";
import { isMissingTable } from "@/lib/shinga";

export const dynamic = "force-dynamic";

const TYPES = ["breakfast", "lunch", "dinner", "snack", "other"];

function needsTable() {
  return NextResponse.json({
    error: "保存先（meal_records）がまだ作られていません",
    needsMigration: true, sql: MEAL_MIGRATION,
  }, { status: 503 });
}

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "ログインしてね" }, { status: 401 });
  try {
    const date = new URL(req.url).searchParams.get("date") ?? undefined;
    const meals = await listMeals(userId, date);
    // 合計はここで足す（画面ごとに足し方が変わらないように）
    const sum = meals.reduce((a, m) => ({
      kcal: a.kcal + (m.total_kcal ?? 0),
      p: a.p + (m.protein_g ?? 0),
      f: a.f + (m.fat_g ?? 0),
      c: a.c + (m.carbs_g ?? 0),
      min: a.min + (m.estimate_min_kcal ?? 0),
      max: a.max + (m.estimate_max_kcal ?? 0),
    }), { kcal: 0, p: 0, f: 0, c: 0, min: 0, max: 0 });
    return NextResponse.json({
      meals,
      total: {
        kcal: Math.round(sum.kcal),
        protein_g: Number(sum.p.toFixed(1)),
        fat_g: Number(sum.f.toFixed(1)),
        carbs_g: Number(sum.c.toFixed(1)),
        min_kcal: Math.round(sum.min),
        max_kcal: Math.round(sum.max),
      },
    });
  } catch (e: any) {
    if (isMissingTable(e)) return needsTable();
    await logError(userId, "/api/meal", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "ログインしてね" }, { status: 401 });
  try {
    const b = await req.json().catch(() => ({}));
    // 画面で直したものが来る。ここでもう一度均す（合計は足し算で作り直される）
    const a = normalize(b.result);
    if (!a || !a.food_detected) {
      return NextResponse.json({ error: "記録する中身がないみたい" }, { status: 400 });
    }
    const mealType = TYPES.includes(String(b.mealType)) ? String(b.mealType) : "other";
    await saveMeal(userId, mealType, a);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTable(e)) return needsTable();
    await logError(userId, "/api/meal", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "ログインしてね" }, { status: 401 });
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "どれを消すか分からない" }, { status: 400 });
    await deleteMeal(userId, id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isMissingTable(e)) return needsTable();
    await logError(userId, "/api/meal", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
