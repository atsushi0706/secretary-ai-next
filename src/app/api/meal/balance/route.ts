/**
 * 摂取と消費のつり合い。
 *
 *   GET  → 体の情報・1日の目標・PFC・ビタミンの目安 と、今日／昨日の実際
 *   POST → 身長・動く量・1か月に落としたい量 を保存
 *
 * 体重は「からだの記録」から、年齢と性別は誕生日の設定から取る。
 * だから本人に聞くのは **身長・動く量・落としたい量** の3つだけ。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSettings, upsertUserSettings, logError } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/shinga";
import { jstDateStr } from "@/lib/google";
import { listMeals, MEAL_MIGRATION, type MealRecord } from "@/lib/meal";
import {
  balance, ageFrom, isActivityKey, NUTRIENTS, type Sex, type ActivityKey,
} from "@/lib/nutrition";

export const dynamic = "force-dynamic";

/** その日の合計（カロリー・PFC・ビタミン） */
function sumOf(meals: MealRecord[]) {
  const micros: Record<string, number> = {};
  for (const n of NUTRIENTS) micros[n.key] = 0;
  let kcal = 0, p = 0, f = 0, c = 0, lo = 0, hi = 0;
  for (const m of meals) {
    kcal += m.total_kcal ?? 0;
    p += m.protein_g ?? 0; f += m.fat_g ?? 0; c += m.carbs_g ?? 0;
    lo += m.estimate_min_kcal ?? 0; hi += m.estimate_max_kcal ?? 0;
    for (const n of NUTRIENTS) {
      const v = Number((m.micros as any)?.[n.key]);
      if (Number.isFinite(v) && v > 0) micros[n.key] += v;
    }
  }
  const r1 = (v: number) => Math.round(v * 10) / 10;
  for (const k of Object.keys(micros)) micros[k] = r1(micros[k]);
  return {
    kcal: Math.round(kcal), protein_g: r1(p), fat_g: r1(f), carbs_g: r1(c),
    min_kcal: Math.round(lo), max_kcal: Math.round(hi),
    meals: meals.length, micros,
  };
}

/** 昨日の日付（JST） */
function yesterdayStr(): string {
  const d = new Date(Date.now() - 86400000);
  return jstDateStr(d);
}

/** いちばん新しい体重（からだの記録から） */
async function latestWeight(userId: string): Promise<number | null> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("weight_logs")
      .select("weight, date").eq("user_id", userId).not("weight", "is", null)
      .order("date", { ascending: false }).limit(1);
    const w = Number((data ?? [])[0]?.weight);
    return Number.isFinite(w) && w > 0 ? w : null;
  } catch { return null; }
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "ログインしてね" }, { status: 401 });

  try {
    const s: any = await getUserSettings(userId).catch(() => null);
    const today = jstDateStr();

    const weight = await latestWeight(userId);
    const height = Number(s?.height_cm) > 0 ? Number(s.height_cm) : null;
    const age = ageFrom(s?.birth_date, today);
    const sex: Sex | null = s?.birth_gender === "male" ? "male" : s?.birth_gender === "female" ? "female" : null;
    const activity: ActivityKey = isActivityKey(s?.activity_level) ? s.activity_level : "mid";
    const goal = Number(s?.goal_kg_per_month);
    const wantedKg = Number.isFinite(goal) && goal > 0 ? goal : 0;

    // 何が足りないのかを、名前で返す（画面で「これを入れて」と言えるように）
    const missing: string[] = [];
    if (!weight) missing.push("体重（からだの記録に1回入れてね）");
    if (!height) missing.push("身長");
    if (age == null) missing.push("生年月日（初期設定）");
    if (!sex) missing.push("性別（初期設定）");

    let bal = null;
    if (weight && height && age != null && sex) {
      bal = balance({ weight, height, age, sex, activity }, wantedKg);
    }

    let eaten = null, yesterday = null;
    try {
      eaten = sumOf(await listMeals(userId, today));
      yesterday = sumOf(await listMeals(userId, yesterdayStr()));
    } catch (e: any) {
      if (isMissingTable(e)) {
        return NextResponse.json({
          error: "保存先（meal_records）がまだ作られていません",
          needsMigration: true, sql: MEAL_MIGRATION,
        }, { status: 503 });
      }
      throw e;
    }

    return NextResponse.json({
      missing,
      // 入力されているぶんはそのまま返す（画面の初期値に使う）
      input: { weight, height, age, sex, activity, wantedKg },
      balance: bal,
      today: eaten,
      yesterday,
      nutrients: NUTRIENTS.map((n) => ({
        key: n.key, label: n.label, unit: n.unit, kind: n.kind, from: n.from,
      })),
    });
  } catch (e: any) {
    await logError(userId, "/api/meal/balance", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "ログインしてね" }, { status: 401 });
  try {
    const b = await req.json().catch(() => ({}));
    const fields: any = {};

    if (b.height !== undefined) {
      const h = Number(b.height);
      if (!Number.isFinite(h) || h < 100 || h > 250) {
        return NextResponse.json({ error: "身長は100〜250cmで入れてね" }, { status: 400 });
      }
      fields.height_cm = Math.round(h * 10) / 10;
    }
    if (b.activity !== undefined) {
      if (!isActivityKey(b.activity)) {
        return NextResponse.json({ error: "動く量の選び方が分からなかった" }, { status: 400 });
      }
      fields.activity_level = b.activity;
    }
    if (b.wantedKg !== undefined) {
      const g = Number(b.wantedKg);
      if (!Number.isFinite(g) || g < 0 || g > 10) {
        return NextResponse.json({ error: "1か月に落としたい量は0〜10kgで入れてね" }, { status: 400 });
      }
      fields.goal_kg_per_month = Math.round(g * 100) / 100;
    }
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "変えるものが無かった" }, { status: 400 });
    }
    await upsertUserSettings(userId, fields);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await logError(userId, "/api/meal/balance", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
