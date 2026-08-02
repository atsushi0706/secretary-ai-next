/**
 * 「この頃のわたし」レポートの保存。サーバ専用。
 *
 * これまでは毎回その場で生成して捨てていたので、「これまでのレポート」が存在しなかった。
 * 生成したら1日1件で残す（同じ日は上書き）。経過を振り返れるようにする。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";

export type SavedReport = { date: string; report: string; created_at: string };

export async function saveReport(userId: string, report: string): Promise<void> {
  const supa = supabaseAdmin();
  await supa.from("reports").upsert(
    { user_id: userId, date: jstDateStr(), report, updated_at: new Date().toISOString() },
    { onConflict: "user_id,date" },
  );
}

export async function listReports(userId: string, limit = 30): Promise<SavedReport[]> {
  const supa = supabaseAdmin();
  const { data } = await supa.from("reports")
    .select("date, report, created_at")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);
  return (data ?? []) as SavedReport[];
}
