/**
 * 全データの書き出し。
 *
 * 無料プランの Supabase は自動バックアップを1つも取ってくれない
 * （保持0日）。消えたら戻せないので、手元に控えを作れるようにする。
 *
 * ■ 鍵類は書き出さない
 *   APIキーと Google の再接続用トークンは、書き出しに含めない。
 *   これらは万一ファイルが漏れたときの被害が大きく、
 *   しかも失っても「もう一度ログインする」だけで取り戻せるため。
 *   本当に失って困るのは、会話・クエスト・記録の中身の方。
 */
import { supabaseAdmin } from "./supabase";

/** 書き出す対象。順番は復元しやすい順（親→子） */
const TABLES = [
  "user_settings",
  "conversations",
  "shinga_conversations",
  "walk_logs",
  "quests",
  "task_links",
  "quest_reflections",
  "emotion_logs",
  "extracted_tasks",
  "manual_labels",
  "briefings",
  "quickmemo",
  "notifications",
  "classify_cache",
] as const;

/** 書き出しから外す列（鍵・トークンの類） */
const SECRET_COLUMNS = [
  "gemini_api_key",
  "anthropic_api_key",
  "google_refresh_token",
];

function stripSecrets(rows: any[]): any[] {
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const out: any = { ...row };
    for (const key of SECRET_COLUMNS) {
      if (key in out) out[key] = out[key] ? "***(書き出しから除外)***" : null;
    }
    return out;
  });
}

export type BackupResult = {
  takenAt: string;
  tables: Record<string, any[]>;
  counts: Record<string, number>;
  skipped: string[];
  totalRows: number;
};

/**
 * 全テーブルを読み出す。
 * @param userId 指定するとそのユーザーの分だけ。省略時は全員分（管理者用）。
 */
export async function exportAll(userId?: string): Promise<BackupResult> {
  const supa = supabaseAdmin();
  const tables: Record<string, any[]> = {};
  const counts: Record<string, number> = {};
  const skipped: string[] = [];
  let totalRows = 0;

  for (const t of TABLES) {
    try {
      let q = supa.from(t).select("*");
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = t === "user_settings" ? stripSecrets(data ?? []) : (data ?? []);
      tables[t] = rows;
      counts[t] = rows.length;
      totalRows += rows.length;
    } catch (e: any) {
      // まだ作っていないテーブルがあっても、書き出し全体は止めない
      skipped.push(`${t}: ${String(e?.message ?? e)}`);
    }
  }

  return {
    takenAt: new Date().toISOString(),
    tables,
    counts,
    skipped,
    totalRows,
  };
}

/** Supabase を眠らせないための軽い問い合わせ（7日アクセスなしで一時停止するため） */
export async function touchDatabase(): Promise<{ ok: boolean; detail: string }> {
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from("user_settings").select("user_id").limit(1);
    if (error) throw error;
    return { ok: true, detail: "起きています" };
  } catch (e: any) {
    return { ok: false, detail: String(e?.message ?? e) };
  }
}
