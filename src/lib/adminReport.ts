/**
 * 管理者向け・ユーザー個別の週次レポート（実データのみ・推測しない）。
 * service_role で対象ユーザーのその週の記録を集め、共通Claudeキーで"運用者向けの要約"を作る。
 * 目的：淳くんが各ユーザーの状態を、事実ベースで週1把握するため。
 */
import { supabaseAdmin } from "./supabase";
import { getClaude, CLAUDE_MODEL } from "./claude";
import { jstDateStr } from "./google";

export type WeekStats = {
  days: number;
  moodAvg: number | null;      // 1=穏やか〜10=しんどい
  energyAvg: number | null;    // 1=動けない〜10=バリバリ動ける
  moodSeries: number[];        // 古→新
  energySeries: number[];
  checkins: number;            // 状態チェック回数
  walks: number;               // パラレルウォーク数
  quests: number;              // クエスト（理想を今日に）件数
  questsDone: number;
  talks: number;               // 秘書チャットの発言数
  shinga: number;              // インナーワールドの発言数
  lastActive: string | null;
};

function avg(ns: number[]): number | null {
  return ns.length ? Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10 : null;
}

export async function collectWeek(userId: string, days = 7): Promise<{ stats: WeekStats; material: string }> {
  const supa = supabaseAdmin();
  const since = jstDateStr(new Date(Date.now() - (days - 1) * 86400000));

  const [emo, walks, quests, shinga, talks] = await Promise.all([
    supa.from("emotion_logs").select("date, level, energy, note, created_at").eq("user_id", userId).gte("date", since).order("created_at", { ascending: true }),
    supa.from("walk_logs").select("date, summary").eq("user_id", userId).gte("date", since).order("date", { ascending: true }),
    supa.from("higher_quest").select("date, items").eq("user_id", userId).gte("date", since),
    supa.from("shinga_conversations").select("date, role, content").eq("user_id", userId).eq("role", "user").gte("date", since),
    supa.from("conversations").select("date, role, content").eq("user_id", userId).eq("role", "user").gte("date", since),
  ]);

  const emoRows = (emo.data ?? []) as any[];
  const moodSeries = emoRows.map((e) => Number(e.level)).filter((n) => Number.isFinite(n));
  const energySeries = emoRows.map((e) => (e.energy == null ? null : Number(e.energy))).filter((n): n is number => Number.isFinite(n as number));

  let questCount = 0, questDone = 0;
  for (const q of (quests.data ?? []) as any[]) {
    const items = Array.isArray(q.items) ? q.items : [];
    questCount += items.length;
    if (items.some((it: any) => it?.done)) questDone += items.filter((it: any) => it?.done).length;
  }

  const walkRows = (walks.data ?? []) as any[];
  const shingaRows = (shinga.data ?? []) as any[];
  const talkRows = (talks.data ?? []) as any[];

  const allDates = [
    ...emoRows.map((e) => e.date), ...walkRows.map((w) => w.date),
    ...shingaRows.map((s) => s.date), ...talkRows.map((t) => t.date),
  ].filter(Boolean).sort();
  const lastActive = allDates.length ? allDates[allDates.length - 1] : null;

  const stats: WeekStats = {
    days,
    moodAvg: avg(moodSeries),
    energyAvg: avg(energySeries),
    moodSeries,
    energySeries,
    checkins: emoRows.length,
    walks: walkRows.length,
    quests: questCount,
    questsDone: questDone,
    talks: talkRows.length,
    shinga: shingaRows.length,
    lastActive,
  };

  // AIに渡す実データ素材（推測させない。数字と本文の抜粋だけ）
  const material = [
    `# 対象ユーザーの直近${days}日の記録（実データ）`,
    `## 状態チェック（${emoRows.length}回）`,
    emoRows.length
      ? emoRows.map((e) => `- ${e.date}: 気分${e.level}/10（1=穏やか〜10=しんどい）${e.energy != null ? ` ・動けそう度${e.energy}/10` : ""}${e.note ? ` 「${String(e.note).slice(0, 60)}」` : ""}`).join("\n")
      : "- 記録なし",
    `## パラレルウォークで語った理想（${walkRows.length}件・本文抜粋）`,
    walkRows.length
      ? walkRows.map((w) => `- ${w.date}: ${String(w.summary ?? "").slice(0, 300)}`).join("\n")
      : "- なし",
    `## クエスト（理想を今日に）：登録${questCount}件・達成${questDone}件`,
    `## 発言量：秘書チャット${talkRows.length}回／インナーワールド${shingaRows.length}回`,
    shingaRows.length
      ? `## インナーワールドでの発言（抜粋・最大8件）\n${shingaRows.slice(-8).map((s) => `- ${s.date}: ${String(s.content ?? "").slice(0, 140)}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n\n");

  return { stats, material };
}

/** 運用者（淳くん）向けの、事実ベースの週次個別レポートを生成する。 */
export async function buildUserWeekReport(userId: string, days = 7): Promise<{ stats: WeekStats; report: string; hasData: boolean }> {
  const { stats, material } = await collectWeek(userId, days);
  const hasData = stats.checkins + stats.walks + stats.talks + stats.shinga + stats.quests > 0;
  if (!hasData) {
    return { stats, report: "この期間の記録はありません（未利用）。", hasData: false };
  }

  const trend = (() => {
    const s = stats.moodSeries;
    if (s.length < 4) return "";
    const half = Math.floor(s.length / 2);
    const recent = s.slice(half).reduce((a, b) => a + b, 0) / (s.length - half);
    const past = s.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const d = recent - past;
    return d <= -1 ? "気分は前半より落ち着いてきている" : d >= 1 ? "気分は前半よりしんどさが増している" : "気分は大きな変化なし";
  })();

  const prompt = `あなたはSaaS運用者の分析アシスタント。下の"実データ"だけを根拠に、このユーザーの直近${days}日の状態を、運用者（管理者）向けに簡潔にまとめて。

# 厳守
- データにある事実だけを書く。推測・創作・励ましは禁止。数字は具体的に引用する。
- わからないことは「データなし」と書く。盛らない。
- 出力は日本語で、次の4項目・各1〜3文：
  【状態】気分/動けそう度の平均と傾向（${trend || "傾向はデータ不足"}）
  【取り組み】パラレルウォークで語った理想・クエストの中身（実際の言葉を1つ引用）
  【関与度】利用頻度・発言量から見た活発さ（事実のみ）
  【気になる点】要フォローの兆候があれば（なければ「特になし」）
- 全体で8行以内。見出し【】は残す。

# 集計サマリ
- 状態チェック${stats.checkins}回／気分平均${stats.moodAvg ?? "—"}・動けそう度平均${stats.energyAvg ?? "—（未記録）"}
- パラレルウォーク${stats.walks}件／クエスト登録${stats.quests}・達成${stats.questsDone}
- 発言：秘書${stats.talks}・インナー${stats.shinga}／最終${stats.lastActive ?? "—"}

${material}`;

  const client = getClaude();
  const r = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 900,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });
  const report = r.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
  return { stats, report: report || "（生成に失敗しました）", hasData: true };
}
