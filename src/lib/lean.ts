/**
 * 対話の中身から「いまどちらに偏っているか」を読む。
 *
 * 行動の回数（ウォーク何日／✓何日）だけでは、その人の"状態"は分からない。
 * 淳くんの定義：
 *  - 空想寄り＝まだ起きていないことに怯えている／理想を描くだけで一歩も動いていない
 *  - 現実寄り＝理想を見ずに、ただ漫然と作業をこなしている／現実に締めつけられて苦しい
 *
 * 会話の実際の言葉から、この2つの癖を見つけて、真ん中（ゾーン）へ戻す一言を返す。
 */
import { supabaseAdmin } from "./supabase";
import { getClaude, CLAUDE_MODEL } from "./claude";
import { jstDateStr } from "./google";

export type LeanRead = {
  lean: "image" | "real" | "zone";  // 空想寄り / 現実寄り / 整っている
  strength: number;                  // 0-100 どれくらい寄っているか
  pattern: string;                   // 見つけた癖（例：まだ起きていないことを先に痛がる）
  message: string;                   // 本人に渡す一言
};

/** 直近の会話を集める（インナー＋秘書チャット） */
async function recentTalk(userId: string, days = 7): Promise<string> {
  const supa = supabaseAdmin();
  const since = jstDateStr(new Date(Date.now() - days * 86400000));
  const [inner, real] = await Promise.all([
    supa.from("shinga_conversations").select("date, role, content")
      .eq("user_id", userId).eq("role", "user").gte("date", since)
      .order("created_at", { ascending: false }).limit(40)
      .then((r) => r.data ?? [], () => []),
    supa.from("conversations").select("date, role, content")
      .eq("user_id", userId).eq("role", "user").gte("date", since)
      .order("id", { ascending: false }).limit(30)
      .then((r) => r.data ?? [], () => []),
  ]);
  const lines = [
    ...(inner as any[]).map((r) => `[内側 ${r.date}] ${String(r.content ?? "").slice(0, 160)}`),
    ...(real as any[]).map((r) => `[現実 ${r.date}] ${String(r.content ?? "").slice(0, 160)}`),
  ];
  return lines.slice(0, 50).join("\n");
}

/**
 * 対話から偏りを読む。会話が少なければ null（数値だけで判断させる）。
 */
export async function readLean(userId: string): Promise<LeanRead | null> {
  const talk = await recentTalk(userId).catch(() => "");
  if (talk.split("\n").filter(Boolean).length < 4) return null; // 材料が少なすぎる

  const prompt = `下は、ある人の直近の発言（本人が話した言葉だけ）。
この人がいま「空想」と「現実」のどちらに偏っているかを読んで。

# 判断基準（厳密に）
- **空想に寄っている**＝次のどちらか
  ・まだ起きていないことを先に痛がっている（不安・最悪の想像・「〜だったらどうしよう」）
  ・理想や願望を語るばかりで、今日の具体的な一歩に落ちていない
- **現実に寄っている**＝次のどちらか
  ・理想や望みの話が出てこず、目の前の作業・義務・締切の話だけをしている
  ・「やらなきゃ」「時間がない」で締めつけられて、何のためかを見失っている
- **整っている（zone）**＝理想の話と、今日の具体的な行動の話が、両方その人の言葉で出てきている

# 出力（JSONだけ）
{
 "lean": "image" | "real" | "zone",
 "strength": 0-100の数値（どれくらい強く偏っているか。zoneなら0-20）,
 "pattern": "見つけた癖を、その人の発言に即して20〜35字で（例：起きていないことを先に痛がる癖）",
 "message": "本人へ渡す一言。40〜70字。友達の距離・タメ口・責めない。偏りを指摘し、戻る方向を1つだけ示す"
}

# ルール
- 発言に無いことを推測で断定しない。材料が薄ければ zone にする。
- 「あなたはこういう人だ」と決めつけない。「〜な癖が出てるかも」と余白を残す。

# 直近の発言
${talk}`;

  try {
    const client = getClaude();
    const r = await client.messages.create({
      model: CLAUDE_MODEL, max_tokens: 500, temperature: 0.6,
      messages: [{ role: "user", content: prompt }],
    });
    const text = r.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const p = JSON.parse(m[0]);
    const lean = p.lean === "image" || p.lean === "real" ? p.lean : "zone";
    return {
      lean,
      strength: Math.max(0, Math.min(100, Number(p.strength) || 0)),
      pattern: String(p.pattern ?? "").slice(0, 60),
      message: String(p.message ?? "").slice(0, 160),
    };
  } catch {
    return null;
  }
}
