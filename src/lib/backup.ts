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

/**
 * 書き出す対象。**アプリが使っている表は全部入れる。**
 *
 * 以前は14個しか並べておらず、あとから足した記録
 * （クリスタル・週次レポート・主人公・取扱説明書・カード…）が
 * ひとつも控えに入っていなかった。
 * 表を足したら、ここにも足すこと。
 * ※ 無い表はそのまま飛ばすので、並べておいても壊れない。
 */
const TABLES = [
  // 人そのもの
  "user_settings",
  "hero",
  // 会話・ワークで話したこと
  "shinga_conversations",
  "conversations",
  "walk_logs",
  "deep_reads",
  "step_logs",
  "work_sessions",
  // 記録
  "emotion_logs",
  "day_marks",
  "real_actions",
  "weight_logs",
  "daily_focus",
  "tomorrow_focus",
  // 手に入れたもの
  "crystals",
  "skill_cards",
  "guardians",
  "shadow_encounters",
  "quest_cards",
  "higher_quest",
  // クエストとタスク
  "quests",
  "task_links",
  "quest_reflections",
  "extracted_tasks",
  "goals",
  // 読みもの
  "manuals",
  "manual_answers",
  "manual_labels",
  "today_manuals",
  "link_letter",
  "reports",
  "weekly_reports",
  "meal_records",
  "priority_goals",
  "goal_steps",
  "mind_maps",
  "briefings",
  // 自分で作ったもの
  "custom_works",
  "methods",
  "broadcast_posts",
  // 設定（鍵・お試しスイッチなど。戻すときに要る）
  "app_config",
  // その他
  "quickmemo",
  "notifications",
  "user_memories",
  "classify_cache",
] as const;

/** 容量の見積もりでも同じ一覧を使う（片方だけ増えるのを防ぐ） */
export const BACKUP_TABLES = TABLES;

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
      /**
       * 1000件で切れていた。
       * PostgREST は範囲を指定しないと 1000 行までしか返さない。
       * そのため会話の記録が途中までしか控えられていなかった。
       * 端まで取り切るまで、区切って読み続ける。
       */
      const all: any[] = [];
      const STEP = 1000;
      for (let from = 0; ; from += STEP) {
        let q = supa.from(t).select("*").range(from, from + STEP - 1);
        if (userId) q = q.eq("user_id", userId);
        const { data, error } = await q;
        if (error) throw error;
        const got = data ?? [];
        all.push(...got);
        if (got.length < STEP) break;
        if (all.length > 200000) break;   // 際限なく回らないための止め
      }
      const rows = t === "user_settings" ? stripSecrets(all) : all;
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
