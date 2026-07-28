/**
 * 未来からの手紙。アプリを開いた最初に"開いた状態"で迎える、1日1通・二度と同じものは来ない手紙。
 *
 * 仕掛け（淳くんの設計）：
 *  - 差出人は「10年後の自分」。算命学の大運で、今とは別のステージにいる自分。
 *  - 具体的なこと（何をしているか）は言えない。理由は「それを決めるのは"今日のきみ"だから」。
 *    今日きみが願って決めないと、その世界の私は存在しない——だから今日、願ってほしい。
 *  - 伝えられるのは"感情"だけ。その理想の感情を、ピークステートで吸ってインストールする。
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { getHero } from "./hero";
import { getUserSettings } from "./supabase";
import { computeLife } from "./sanmei";
import { jstDateStr, jstNow } from "./google";

export type FutureLetter = { date: string; body: string; emotion: string; hasIdeal: boolean };

export async function getTodayLetter(userId: string): Promise<FutureLetter> {
  const date = jstDateStr();
  const supa = supabaseAdmin();

  const { data } = await supa
    .from("link_letter").select("date, body, source").eq("user_id", userId).eq("date", date).maybeSingle();
  if (data) return { date, body: (data as any).body ?? "", emotion: (data as any).source ?? "", hasIdeal: true };

  const settings: any = await getUserSettings(userId).catch(() => null);
  const who = settings?.user_call_name || "きみ";
  const hero = await getHero(userId).catch(() => null);
  const ideal = (hero?.desired_world?.trim() || hero?.hero_statement?.trim() || "");

  // 理想がまだ無ければ、手紙は書けない（＝先に理想を書いてもらう案内を返す）
  if (!ideal) {
    return {
      date, hasIdeal: false, emotion: "",
      body: `やあ、10年後のわたしだよ。\nでも今はまだ、きみの“増やしたい世界”を聞いてないから、わたしの姿もぼんやりしてるんだ。\nよかったら、まずどんな世界を生きたいか、教えて。そしたら——その世界からちゃんと手紙を書くね。`,
    };
  }

  // 10年後のステージ（大運）。性別があれば取れる
  const birth = settings?.birth_date ?? null;
  const gender = settings?.birth_gender === "male" || settings?.birth_gender === "female" ? settings.birth_gender : null;
  let stageLine = "";
  const life = computeLife(birth, gender, jstNow());
  if (life) {
    const next = life.periods[life.currentIndex + 1] ?? life.periods[life.currentIndex];
    if (next) stageLine = `\n私は今、きみとは違う人生のステージにいる（${next.ageStart}〜${next.ageEnd}歳ごろ：${next.meaning}）。だから見えている景色も、感じ方も、今のきみとは少し違う。`;
  }

  const prompt = `あなたは、${who} の「10年後の自分」。${who} が増やしたい世界「${ideal}」を、もう当たり前に生きている。${stageLine}
その未来の私から、今日の ${who} へ手紙を書く。

# 手紙のルール（厳守）
- 一人称「私」。10年後の私から、今日のきみへ。やわらかく、友達のような距離。タメ口寄り。
- 具体的なこと（何の仕事か・誰といるか等）は"言えない"。こう理由を添える：
  「ごめんね、それはまだ言えないんだ。だって、それを決めるのは“今日のきみ”だから。
   きみが今日それを願って決めないと、この世界の私は存在しないんだよ」
- だから伝えられるのは"感じ"だけ。この世界がどんな感情で満ちているかを、ありありと。
- 最後に、今日のきみへの願いをひとつ：「だから今日、その感情を先に感じてみて。それだけでいい」。
- 5〜8行。説教しない。詩的すぎない。あくまで手紙。前置き・署名・見出しは書かない。
- 最後の行だけ、この世界の中心にある感情を"一語"で： 感情=◯◯`;

  let raw = "";
  try { raw = String(await complete({ userId, prompt, maxTokens: 1200, temperature: 0.95 }) ?? "").trim(); } catch { /* fallback below */ }

  // 感情=◯◯ を取り出して本文から除く
  let emotion = "";
  const m = raw.match(/感情\s*[=＝:：]\s*(.+)\s*$/m);
  if (m) { emotion = m[1].trim().replace(/[。.\s]+$/, ""); raw = raw.replace(m[0], "").trim(); }

  if (raw.length < 8) {
    raw = `やあ、10年後のわたしだよ。\nここがどんな場所かは、まだ言えないんだ。ごめんね。だって、それを決めるのは今日のきみだから。\nきみが今日それを願わないと、この世界のわたしは生まれないんだよ。\nだから今日、ひとつだけ。この胸にある“満たされた感じ”を、先に感じてみて。それだけでいい。`;
    emotion = emotion || "満たされている";
  }

  await supa.from("link_letter").upsert(
    { user_id: userId, date, kind: "future", body: raw, source: emotion, created_at: new Date().toISOString() },
    { onConflict: "user_id,date" },
  );
  return { date, body: raw, emotion, hasIdeal: true };
}
