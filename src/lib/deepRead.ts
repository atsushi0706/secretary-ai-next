/**
 * アカシックレコーダーの「深層記録」。
 *
 * 設計：レベル（%）が上がるほど、自分についての記録が段階的に開いていく。
 * 「隠されたものを知りたい」に応えるが、当たる当たらないの占いにはしない。
 * 素材は算命学（star.ts の内部プロファイル）だが、体系名・用語は一切出さない。
 */
import { readStar } from "./star";
import { getClaude, CLAUDE_MODEL } from "./claude";

export type DeepChapter = {
  key: string;
  title: string;
  need: number;      // 解放に必要なレベル(%)
  hint: string;      // ロック中に見せる一文（欲を引き出す）
};

/** 解放の段階。レベルが上がるほど深くなる */
export const DEEP_CHAPTERS: DeepChapter[] = [
  { key: "nature",   title: "生まれ持った性質",     need: 60, hint: "きみが何でできているか、その芯のかたち" },
  { key: "strength", title: "強み — 本当の武器",     need: 70, hint: "自分では当たり前すぎて、気づいていない力" },
  { key: "shadow",   title: "弱点 — つまずきの癖",   need: 80, hint: "同じ場所で転ぶ理由。責めるためではなく、越えるために" },
  { key: "mission",  title: "この人生で果たすもの", need: 90, hint: "きみが世界に置いていくもの" },
  { key: "hidden",   title: "隠された記録",         need: 100, hint: "ここから先は、たどり着いた人にだけ" },
];

const PROMPTS: Record<string, string> = {
  nature: `この人の「生まれ持った性質」を書いて。何を自然にやれてしまう人か、どんなときに生気を失うか。断定しすぎず、でも輪郭ははっきりと。`,
  strength: `この人の「強み」を書いて。本人が当たり前すぎて武器と気づいていないもの。どんな場面で他人より深く届くのか、具体的に。`,
  shadow: `この人の「弱点・つまずきの癖」を書いて。責めない。「その癖は、こういう良さの裏側」という形で、越え方まで書く。`,
  mission: `この人が「この人生で果たすもの」を書いて。大げさな使命ではなく、その人が居るだけで周りに起きる変化として。`,
  hidden: `この人の「隠された記録」を書いて。ここまでたどり着いた人にだけ渡す、いちばん深いところ。本人がずっと言われたかった言葉を含めて。`,
};

export async function readDeepChapter(
  key: string,
  birth: string,
  callName: string,
): Promise<string> {
  const ch = DEEP_CHAPTERS.find((c) => c.key === key);
  const star = readStar(birth);
  if (!ch || !star) return "";
  const who = callName || "きみ";

  const prompt = `あなたは「清瀬リンク」。${who}の相棒。
下は ${who} についての内部資料（本人には見せない）。これを踏まえて「${ch.title}」を本人に渡す。

## 内部資料
- 持って生まれた性質: ${star.profile.nature}
- 心を開く聞き方: ${star.profile.howToTalk}
- 言ってはいけないこと: ${star.profile.avoid}
- 動けなくなったときの動かし方: ${star.profile.whenStuck}
- 今の時期: ${star.season.label}／${star.season.meaning}

## 書くこと
${PROMPTS[key]}

## ルール（厳守）
- 算命学・占い・星・命式などの体系名や用語は絶対に出さない。「記録にはこう残っている」という言い方で。
- 分類して決めつけない。「〜な傾向がある」「〜なときが多い」と余白を残す。
- 友達の距離。タメ口。あたたかく、でも媚びない。絵文字は多くて1つ。
- 二人称は「きみ」。相手の名前が分かればその名前で呼ぶ。**「お前」「てめえ」など見下す言い方は絶対に使わない。**
- 4〜6行。最後は必ず前を向く一行で終える。見出しや箇条書きは使わない。`;

  const client = getClaude();
  const r = await client.messages.create({
    model: CLAUDE_MODEL, max_tokens: 700, temperature: 0.85,
    messages: [{ role: "user", content: prompt }],
  });
  return r.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
}
