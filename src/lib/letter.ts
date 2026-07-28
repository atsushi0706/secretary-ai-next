/**
 * 「リンクからの便り」＝理想が"向こうから会いに来る"装置。
 *
 * 反転の核（玉樹式レビュー）：理想を人間に保持させない。清瀬リンクが覚えていて、
 * 毎日ひとつ、向こうから届ける。ユーザーは忘れていい。読むだけ。
 *
 *  - future：ユーザーの理想を「もう叶っている未来の自分の日記の1ページ」に書き直したもの。
 *  - recall：2週間以上前にユーザー自身が書いた言葉を「きみ、こう書いてたよ」と持ってくる（忘却を報酬に）。
 *
 * 1日1通。生成したらキャッシュ（link_letter）。
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { getHero } from "./hero";
import { listWalkLogs, listQuests } from "./shinga";
import { getUserSettings } from "./supabase";
import { jstDateStr } from "./google";

export type LinkLetter = { date: string; kind: "future" | "recall" | "none"; body: string; source: string };

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export async function getTodayLetter(userId: string): Promise<LinkLetter> {
  const date = jstDateStr();
  const supa = supabaseAdmin();

  const { data } = await supa
    .from("link_letter").select("date, kind, body, source").eq("user_id", userId).eq("date", date).maybeSingle();
  if (data) return data as LinkLetter;

  const settings: any = await getUserSettings(userId).catch(() => null);
  const who = settings?.user_call_name || "きみ";
  const name = settings?.secretary_name || "清瀬リンク";

  const hero = await getHero(userId).catch(() => null);
  const ideal = (hero?.desired_world?.trim() || hero?.hero_statement?.trim() || "");

  const [walks, quests] = await Promise.all([
    listWalkLogs(userId, 30).catch(() => []),
    listQuests(userId).catch(() => []),
  ]);
  const oldWalk = walks.find((w) => { const d = daysAgo(w.created_at); return d >= 14 && d <= 120; });
  const oldQuest = (quests as any[]).find((q) => { const d = daysAgo(q.created_at ?? ""); return d >= 14 && d <= 120; });
  const oldItem = oldWalk
    ? { text: oldWalk.summary.slice(0, 300), at: oldWalk.date, days: daysAgo(oldWalk.created_at) }
    : oldQuest
      ? { text: String(oldQuest.title).slice(0, 200), at: String(oldQuest.created_at ?? "").slice(0, 10), days: daysAgo(oldQuest.created_at) }
      : null;

  // 土台が何も無ければ、便りはまだ出さない
  if (!ideal && !oldItem) {
    return { date, kind: "none", body: "", source: "" };
  }

  // 置き忘れがあれば偶数日は recall、それ以外は future（理想が無ければ強制 recall）
  const useRecall = !!oldItem && (Number(date.slice(-1)) % 2 === 0 || !ideal);
  const kind: "future" | "recall" = useRecall ? "recall" : "future";

  let prompt = "";
  let source = "";
  if (kind === "recall" && oldItem) {
    source = oldItem.at;
    prompt = `あなたは「${name}」。${who} の相棒（友達・タメ口）。
${oldItem.days}日前（${oldItem.at}）に ${who} 自身が書いた言葉がある：
「${oldItem.text}」
これを「${who}、この前こう書いてたよ」と、そっと持ってくる短い便りを書いて。
- 3〜5行。懐かしさと「あれ、ちょっと近づいてない？」という小さな気づきを添える。
- 決めつけない。責めない。押し付けない。絵文字は少しだけ。
- 本人の言葉はそのまま引用していい。前置き・見出しは要らない。`;
  } else {
    prompt = `あなたは「${name}」。${who} の理想は「${ideal}」。
この理想が"もう叶っている前提"で、未来の ${who} 自身が書いた日記の1ページを書いて。
- 6〜9行。架空の未来の日付と、その日の天気から始める。
- もう叶っている世界の、ごく普通の1日の描写。特別な事件はいらない。
- 一人称「私」で。しがみつく必要がない、読むだけで「あ、こっちに行きたい」と体が思い出す感じ。
- 説教・励まし・宣言はしない。ただの日記。前置き・見出しは要らない。`;
  }

  let body = "";
  try { body = String(await complete({ userId, prompt, maxTokens: 1000, temperature: 0.9 }) ?? "").trim(); } catch { /* fallback below */ }
  if (body.length < 8) {
    body = kind === "recall" && oldItem
      ? `${who}、${oldItem.days}日前にこう書いてたよ。\n「${oldItem.text}」\n……ちょっとずつ、近づいてる気がするんだよね。`
      : `理想の未来、まだ言葉にしたてだね。もう少し歩いたら、ここに"未来のきみの日記"を届けるよ。`;
  }

  await supa.from("link_letter").upsert(
    { user_id: userId, date, kind, body, source, created_at: new Date().toISOString() },
    { onConflict: "user_id,date" },
  );
  return { date, kind, body, source };
}
