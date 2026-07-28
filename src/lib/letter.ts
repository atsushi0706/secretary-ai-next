/**
 * 未来からの手紙。アプリを開いた最初に"開いた状態"で迎える、1日1通・二度と同じものは来ない手紙。
 *
 * 仕掛け（淳くんの設計）：
 *  - 差出人は「本来の姿」＝その人が"持って生まれた星の性質"のまま幼少期からまっすぐ生きてこられたら、
 *    今から10年ほど先にたどり着いている自分。命式（星）＋姓名判断＋大運から人物像を作る。
 *  - 理想はもう叶っている前提。ただし書いた理想が本来の性質とズレる場合は、感情・空気をサブリミナルに本来へ寄せる。
 *  - 具体（何をしているか）は言えない。「決めるのは今日のきみだから。願わないとこの世界の私は存在しない」。
 *  - 伝えるのは"感情"だけ。その感情を、ピークステートで吸ってインストールする。
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { getHero } from "./hero";
import { getUserSettings } from "./supabase";
import { computeLife } from "./sanmei";
import { buildStarPrompt } from "./star";
import { diagnoseSeimei } from "./seimei";
import { jstDateStr, jstNow } from "./google";

/** 名前（姓名判断）から、本来の性質を内部情報にする（用語は出さない） */
function innateFromName(birthName: string, who: string): string {
  const name = (birthName ?? "").trim();
  if (!name) return "";
  const parts = name.split(/[\s　]+/).filter(Boolean);
  const family = parts.length >= 2 ? parts[0] : "";
  const given = parts.length >= 2 ? parts.slice(1).join("") : parts[0] ?? "";
  if (!given) return "";
  let r;
  try { r = diagnoseSeimei(family, given); } catch { return ""; }
  if (r.soukaku <= 0) return "";
  const clean = (t: string) => t.replace(/【[^】]*】/g, "").trim();
  return `## ${who} の名前が示す本来の性質（内部情報・用語は絶対に出さない）
- 芯にある性質：${clean(r.jinkakuMeaning)}
- 生まれ持った才能：${clean(r.chikakuMeaning)}
- 人生全体の傾向：${clean(r.soukakuMeaning)}`;
}

export type FutureLetter = { date: string; body: string; emotion: string; hasIdeal: boolean; needsSetup?: boolean };

export async function getTodayLetter(userId: string): Promise<FutureLetter> {
  const date = jstDateStr();
  const supa = supabaseAdmin();

  const settings: any = await getUserSettings(userId).catch(() => null);
  const who = settings?.user_call_name?.trim() || "きみ";

  // ── 初期設定ゲート：名前・生年月日・性別・呼んでほしい名前 が揃うまでは手紙を出さず、設定へ誘導 ──
  // （性別と生年月日は、10年後のステージ＝算命学の大運に必須）
  const hasName = !!settings?.birth_name?.trim();
  const hasBirth = !!settings?.birth_date?.trim();
  const hasGender = settings?.birth_gender === "male" || settings?.birth_gender === "female";
  const hasCallName = !!settings?.user_call_name?.trim();
  if (!hasName || !hasBirth || !hasGender || !hasCallName) {
    return {
      date, hasIdeal: false, needsSetup: true, emotion: "",
      body: `手紙を届けたいんだけど、まだ準備が要るんだ。\nきみの「名前」「生年月日」「性別」「呼んでほしい名前」を教えてくれる？\nそれが揃ったら——きみが叶えた世界から、ちゃんと手紙が届くよ。`,
    };
  }

  // 設定が揃ってから、今日ぶんのキャッシュを見る（途中で切れて保存されたものは作り直す）
  const { data } = await supa
    .from("link_letter").select("date, body, source").eq("user_id", userId).eq("date", date).maybeSingle();
  const cachedBody = String((data as any)?.body ?? "");
  const looksComplete = /[。！？…」』）\)]\s*$/.test(cachedBody.trim());
  if (data && cachedBody.trim().length >= 20 && looksComplete) {
    return { date, body: cachedBody, emotion: (data as any).source ?? "", hasIdeal: true };
  }

  const hero = await getHero(userId).catch(() => null);
  const ideal = (hero?.desired_world?.trim() || hero?.hero_statement?.trim() || "");

  // 理想がまだ無ければ、手紙は書けない（＝先に理想を書いてもらう案内を返す）
  if (!ideal) {
    return {
      date, hasIdeal: false, emotion: "",
      body: `きみの“増やしたい世界”を、まだ聞いてないんだ。\nそれを教えてくれたら——それが叶った世界から、ちゃんと手紙が届くよ。`,
    };
  }

  // 本来の性質（命式・星）＋名前（姓名判断）＝この人が"星のまま生きた本来の姿"の材料
  const birth = settings?.birth_date ?? null;
  const gender = settings?.birth_gender === "male" || settings?.birth_gender === "female" ? settings.birth_gender : null;
  const starBlock = buildStarPrompt(birth, who);          // 持って生まれた性質・時期（用語は出さない）
  const nameBlock = innateFromName(settings?.birth_name ?? "", who);

  // 10年後のステージ（大運）。性別が揃っているので必ず取れる
  let stageBlock = "";
  const life = computeLife(birth, gender, jstNow());
  if (life) {
    const cur = life.periods[life.currentIndex];
    const next = life.periods[life.currentIndex + 1] ?? cur;
    stageBlock = `## 10年後のステージ（星の流れ・大運）
今の ${who} は「${cur.label}」というステージ（${cur.meaning}）。
本来の姿の私は、その先の「${next.label}」というステージにいる（${next.meaning}）。
だから私が感じている世界の"質"は、この「${next.label}」ならではの色。今の ${who} とは明らかに違う色にする。`;
  }

  const prompt = `これは「未来からの手紙」。差出人は ${who} 自身だが、ただの10年後ではない。
差出人像：${who} が"持って生まれた星の性質"のまま、幼少期からまっすぐ生きてこられた場合に、
今から10年ほど先にたどり着いている「本来の姿」。空想の他人ではなく、${who} の芯が最も自然に花ひらいた姿。
その本来の姿から、今日の ${who} へ手紙を書く。相手は「${who}」と呼ぶ。

${starBlock}

${nameBlock}

${stageBlock}

# 理想の扱い（サブリミナル・最重要）
${who} は「${ideal}」という理想を書いている。ただ、書いた理想が本来の星の性質と少しズレていることもある。
その場合でも「あなたの理想は違う」とは絶対に言わない。代わりに、手紙全体の"感情と空気"を、
本来の性質に沿った"叶い方"へ、そっと寄せる（サブリミナルに戻す）。星の性質にかなった満ち方の手触りを感じさせる。
理想と本来の性質が合っているなら、そのまま満ち足りた実感として書く。

# 手紙のルール（厳守）
- 一人称は「私」。ただし「未来の私」「本来の私」などの自称ラベルや署名は書かない。本文だけ。
- 用語（算命学・命式・星の名前・大運・姓名判断・画数 など）は絶対に出さない。
- 【前提】理想はもう叶っている。願望ではなく、叶った側からの"実感"。満ち足りた事実として。
- 【最重要】具体的な場面は描写しない（カフェ・仕事・場所・人・出来事など"何をしているか"は書かない）。
  代わりに：「どんな毎日かは、まだ言えないんだ。ごめんね。だって、それを決めるのは“今日の${who}”だから。
  ${who} が今日それを願って決めないと、この世界の私は存在しないんだよ」
- 伝えていいのは"感情"だけ。本来の性質と10年後ステージの質を反映した、叶ったこの世界に満ちる感情を、ありありと。
- 最後に、今日の ${who} への願いをひとつ：「だから今日、その感情を先に感じてみて。それだけでいい」。
- 4〜7行で必ず最後まで言い切る。説教しない。前置き・署名・見出しは書かない。
- 本文の最後に、この叶った世界の中心の感情を"一語"だけ、必ずこの形式で： <感情>◯◯</感情>`;

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
    raw = `やあ、${who}。\nここがどんな場所かは、まだ言えないんだ。ごめんね。だって、それを決めるのは今日の ${who} だから。\n${who} が今日それを願わないと、この叶った世界は生まれないんだよ。\nだから今日、ひとつだけ。この胸にある“満たされた感じ”を、先に感じてみて。それだけでいい。`;
    emotion = emotion || "満たされている";
  }

  await supa.from("link_letter").upsert(
    { user_id: userId, date, kind: "future", body: raw, source: emotion, created_at: new Date().toISOString() },
    { onConflict: "user_id,date" },
  );
  return { date, body: raw, emotion, hasIdeal: true };
}
