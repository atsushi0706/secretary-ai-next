/**
 * 「いまは何月何日の何時か」を、AIに渡す一行。
 *
 * 【なぜ要るか】
 * 淳くん：「シンガワールド内のすべてのAIチャットボットに、時間軸を持たせたい。
 *   何月何日、今は何時なのか。それは国内だけでいいです」
 *
 * 時間が分かっていないと、
 *   ・朝なのに「今日はおつかれさま」と言う
 *   ・「さっき」「昨日」がずれる
 *   ・夜中に「そろそろ昼だね」と言う
 * といったことが起きる。
 *
 * **日本時間で固定**する（国内だけでいい、という指定なので、時差の扱いは持たない）。
 */
import { jstNow } from "./google";

const WD = ["日", "月", "火", "水", "木", "金", "土"];
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 朝・昼・夜のどこか（日本時間） */
export function slotOf(hour: number): "morning" | "noon" | "night" {
  if (hour >= 4 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "noon";
  return "night";
}

export function nowLine(at: Date = jstNow()): string {
  const j = new Date(at.getTime() + JST_OFFSET_MS);
  const m = j.getUTCMonth() + 1;
  const d = j.getUTCDate();
  const w = WD[j.getUTCDay()];
  const hh = j.getUTCHours();
  const mm = String(j.getUTCMinutes()).padStart(2, "0");
  const slot = slotOf(hh);
  const slotJa = slot === "morning" ? "朝" : slot === "noon" ? "昼" : "夜";
  return [
    `# いま（日本時間）`,
    `${j.getUTCFullYear()}年${m}月${d}日（${w}）${hh}時${mm}分。いまは**${slotJa}**。`,
    `この時間に合う話し方をする（朝に「おつかれさま」と言わない、夜に「いってらっしゃい」と言わない）。`,
    `時間の話をわざわざ持ち出す必要はない。**知っているだけでいい。**`,
  ].join(String.fromCharCode(10));
}
