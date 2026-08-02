/**
 * 呼吸ガイドで喋る言葉。ここが唯一の正（画面も焼き込みもここを見る）。
 *
 * 【お金の話・重要】
 * このセリフは全ユーザー共通で、内容が毎回まったく同じ。
 * だから1回だけ音声を作ってファイルにしておけば、以後は何人使っても料金は0になる。
 * ユーザーごとに毎回生成すると、人が増えた瞬間にクレジットが枯れる。
 *
 * ※ 感情（未来からの「充足」など）は画面の文字で見せる。音声には入れない。
 *   入れるとユーザーごとに違う音になり、焼き込みができなくなるため。
 *
 * 【読みかたの注意】
 * 音声合成は数字を素直に読む。「1かいめ」は「いち・かいめ」になってしまう。
 * だから喋らせる文では、数字を使わず**読みをそのままかなで書く**（いっかいめ）。
 * 画面に出す文字（BreathGuide の instr）は「1回目」のままでよい。ここは耳のための文。
 */

export type BreathLine = { key: string; text: string };

export const BREATH_LINES: BreathLine[] = [
  { key: "intro", text: "じゃあ、はじめよっか。立てるなら立って、体をゆらゆらしてみてね。" },
  { key: "ex1", text: "いっかいめ。お口をすぼめて、ほそーく強く、ふーって少しずつ吐ききってね" },
  { key: "ex2", text: "にかいめ。お口をすぼめて、ほそーく強く、ふーって少しずつ吐ききってね" },
  { key: "ex3", text: "さんかいめ。お口をすぼめて、ほそーく強く、ふーって少しずつ吐ききってね" },
  { key: "hold", text: "そのまま、すこし止めてね。からっぽの真空をつくるよ" },
  { key: "inhale", text: "いっきに、つよく、すってー" },
  { key: "settle", text: "目をとじて、ゆっくり呼吸を整えてね" },
  { key: "lastex", text: "さいごに、もういっかい。お口をすぼめて、ぜんぶ吐いてー" },
  { key: "lasthold", text: "そのまま、すこし止めて、真空をつくってね" },
  { key: "lastsettle", text: "いいね。ゆっくり呼吸を整えて、目をあけてね。" },
];

/** 焼き込みにかかる文字数（＝ElevenLabsのクレジット）。1回きり */
export function totalChars(): number {
  return BREATH_LINES.reduce((a, l) => a + l.text.length, 0);
}

/** 保存先（Supabase Storage の公開バケット内） */
export const BAKE_BUCKET = "avatars";
export const bakePath = (voiceId: string, key: string) => `_voice/${voiceId}/${key}.mp3`;
