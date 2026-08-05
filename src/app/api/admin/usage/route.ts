/**
 * いま、どれくらい貯まっているか。
 *
 * 「無料のまま続けられるのか」は、憶測で答えても意味がない。
 * 実際の件数と、直近1週間で増えたぶんから、**この先どうなるかを出す**。
 *
 * ※ 正確なディスク使用量はPostgRESTからは取れないので、
 *   1行あたりの大きさは**実物を数行取って測った平均**で見積もる。
 *   おおよその数字であることは、画面にもそう書く。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { BACKUP_TABLES } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Supabase 無料枠のデータベース容量（目安・MB） */
const FREE_LIMIT_MB = 500;

type Row = { table: string; rows: number; bytes: number; week: number };

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supa = supabaseAdmin();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const sinceDay = since.slice(0, 10);

  const out: Row[] = [];
  await Promise.all(BACKUP_TABLES.map(async (table) => {
    try {
      const { count, error } = await supa.from(table).select("*", { count: "exact", head: true });
      if (error) return;                       // 無い表は飛ばす
      const rows = count ?? 0;
      if (rows === 0) { out.push({ table, rows: 0, bytes: 0, week: 0 }); return; }

      // 1行の大きさを、実物5行から測る
      const { data: sample } = await supa.from(table).select("*").limit(5);
      const per = sample && sample.length
        ? Buffer.byteLength(JSON.stringify(sample), "utf8") / sample.length
        : 0;

      // 直近1週間で増えたぶん（列があるものだけ）
      let week = 0;
      for (const col of ["created_at", "date"] as const) {
        const { count: c, error: e } = await supa.from(table)
          .select("*", { count: "exact", head: true })
          .gte(col, col === "date" ? sinceDay : since);
        if (!e) { week = c ?? 0; break; }
      }
      out.push({ table, rows, bytes: Math.round(rows * per), week });
    } catch { /* 読めない表は飛ばす */ }
  }));

  out.sort((a, b) => b.bytes - a.bytes);
  const totalBytes = out.reduce((n, r) => n + r.bytes, 0);
  const weekRows = out.reduce((n, r) => n + r.week, 0);
  // 1週間で増えたぶんから、1年の伸びを見積もる
  const perRow = out.reduce((n, r) => n + r.rows, 0) > 0
    ? totalBytes / out.reduce((n, r) => n + r.rows, 0)
    : 0;
  const yearBytes = Math.round(weekRows * perRow * 52);

  return NextResponse.json({
    tables: out.filter((r) => r.rows > 0),
    totalBytes,
    weekRows,
    yearBytes,
    limitMB: FREE_LIMIT_MB,
    // いまのペースで、無料枠に届くまであと何か月か
    monthsLeft: yearBytes > 0
      ? Math.max(0, Math.round(((FREE_LIMIT_MB * 1024 * 1024 - totalBytes) / (yearBytes / 12)) * 10) / 10)
      : null,
  });
}
