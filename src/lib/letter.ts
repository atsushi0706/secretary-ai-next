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
  // 途中で切れて保存されたキャッシュ（末尾が文の終わりでない）は作り直す
  const cachedBody = String((data as any)?.body ?? "");
  const looksComplete = /[。！？…」』）\)]\s*$/.test(cachedBody.trim());
  if (data && cachedBody.trim().length >= 20 && looksComplete) {
    return { date, body: cachedBody, emotion: (data as any).source ?? "", hasIdeal: true };
  }

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

  // 10年後のステージ（大運）。誕生日＋性別があれば取れる。ここが手紙の"質"を決める
  const birth = settings?.birth_date ?? null;
  const gender = settings?.birth_gender === "male" || settings?.birth_gender === "female" ? settings.birth_gender : null;
  let stageBlock = "（誕生日と性別が未設定なので、人生ステージは使わず、ただ10年後の自分として書く）";
  const life = computeLife(birth, gender, jstNow());
  if (life) {
    const cur = life.periods[life.currentIndex];
    const next = life.periods[life.currentIndex + 1] ?? cur;
    stageBlock = `# 人生のステージ（この手紙の"質"を決める最重要情報）
今のきみは「${cur.label}」というステージにいる（${cur.meaning}）。
10年後の私は、その先の「${next.label}」というステージを生きている（${next.meaning}）。
だから私が感じている世界の"質"は、この「${next.label}」のステージならではのもの。
その質感を、感情としてありありと伝えること。今のきみのステージとは、明らかに違う色にする。`;
  }

  const prompt = `あなたは、${who} の「10年後の自分」。${who} が増やしたい世界「${ideal}」を、もう当たり前に生きている。
その未来の私から、今日の ${who} へ手紙を書く。

${stageBlock}

# 手紙のルール（厳守）
- 一人称「私」。10年後の私から、今日のきみへ。やわらかく、友達のような距離。タメ口寄り。
- 【最重要】具体的な場面を描写しない。カフェ・仕事・場所・登場人物・出来事など"何をしているか"は一切書かない。
  代わりにこう伝える：「どんな毎日かは、まだ言えないんだ。ごめんね。だって、それを決めるのは“今日のきみ”だから。
  きみが今日それを願って決めないと、この世界の私は存在しないんだよ」
- 伝えていいのは"感情"だけ。上のステージの"質"を反映した、この世界に満ちている感情を、ありありと。
- 最後に、今日のきみへの願いをひとつ：「だから今日、その感情を先に感じてみて。それだけでいい」。
- 4〜7行で、必ず最後まで言い切る（途中で切らない）。説教しない。前置き・署名・見出しは書かない。
- 本文の最後に、この世界の中心にある感情を"一語"だけ、必ずこの形式で書く： <感情>◯◯</感情>`;

  let raw = "";
  try { raw = String(await complete({ userId, prompt, maxTokens: 3000, temperature: 0.9 }) ?? "").trim(); } catch { /* fallback below */ }

  // 感情を取り出して本文から除く（複数の書き方に耐える）
  let emotion = "";
  const clean = (s: string) => s.trim().replace(/^[「『]/, "").replace(/[」』。.\s]+$/, "").trim();
  let mm = raw.match(/<\s*感情\s*>\s*([^<]+?)\s*<\s*\/\s*感情\s*>/);
  if (mm) { emotion = clean(mm[1]); raw = raw.replace(mm[0], "").trim(); }
  if (!emotion) { mm = raw.match(/感情\s*[=＝:：]\s*(.+)\s*$/m); if (mm) { emotion = clean(mm[1]); raw = raw.replace(mm[0], "").trim(); } }
  if (!emotion) {
    // 末尾の"短い一語"（句読点なし・8文字以内）を感情とみなして本文から外す
    const lines = raw.split(/\n+/);
    const last = (lines[lines.length - 1] ?? "").trim();
    if (last && last.length <= 8 && !/[。！？、,.]/.test(last)) { emotion = clean(last); lines.pop(); raw = lines.join("\n").trim(); }
  }

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
