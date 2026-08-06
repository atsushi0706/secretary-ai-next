/**
 * Supabase（PostgREST）が返すエラーの読み分け。ここは何もインポートしない葉っぱ。
 *
 * 【なぜ分けたか】
 * 「列が1本足りない」のを「表そのものが無い」と読み間違えると、
 * あとから列を足した日に「表がまだ作られていません」という嘘の案内が出る。
 * 実際に出した（ミールレンズに micros を足した翌日、記録できなくなった）。
 *
 * PostgREST の返しはこの4通り。
 *   表が無い : 42P01 / PGRST205  'relation "public.x" does not exist'
 *                              "Could not find the table 'public.x' in the schema cache"
 *   列が無い : 42703 / PGRST204  'column "micros" of relation "meal_records" does not exist'
 *                              "Could not find the 'micros' column of 'meal_records' in the schema cache"
 */

/** 列が1本足りないだけ（表はある） */
export function isMissingColumn(e: any): boolean {
  const code = e?.code ?? "";
  const msg = String(e?.message ?? e ?? "");
  return code === "42703" || code === "PGRST204"
    || /column .* does not exist/i.test(msg)
    || /Could not find the '[^']+' column/i.test(msg);
}

/** 足りない列の名前（分からなければ null） */
export function missingColumnName(e: any): string | null {
  const msg = String(e?.message ?? e ?? "");
  const m = msg.match(/Could not find the '([^']+)' column/i) ?? msg.match(/column "([^"]+)"/i);
  return m ? m[1] : null;
}

/** 表そのものが無い（マイグレーション未実行） */
export function isMissingTable(e: any): boolean {
  const code = e?.code ?? "";
  const msg = String(e?.message ?? e ?? "");
  if (isMissingColumn(e)) return false;   // 列不足を表不足と言わない
  return code === "42P01" || code === "PGRST205"
    || /relation .* does not exist/i.test(msg)
    || /Could not find the table/i.test(msg);
}
