/**
 * ピークステート（呼吸）で流れる言葉と音声。ここが唯一の正（画面もここを見る）。
 *
 * 【声は淳くん本人】
 * 2026-08-07 から、呼吸の誘導は**淳くんが録った声**を使う（`public/breath/*.mp3`）。
 * デスクトップの「音声改.mp4」（48秒）を、音の切れ目を測って11個に切り分けたもの。
 * 切ったあと1つずつ書き起こし直して、言葉が途切れていないことを確かめてある。
 *   → 合成音声の料金は0。誰が何回使っても増えない。
 *
 * `text` は、音が鳴らなかったときの読み上げ用（最後の砦）。
 * `screen` は画面に出す文。**改行はそのまま出す**（淳くんが渡したテロップの形）。
 *
 * 【流れが変わった】
 * 前は「口をすぼめてろうそくを消すように吐ききる」の1段階だった。
 * いまは **口を閉じて口の中に圧をかけ → 唇を少しだけ開いて細く吐く →
 * 苦しくなったら勢いよく吐き切る** の2段階。
 * そして「圧をかける〜馴染ませる」までを**丸ごと3回**繰り返す。
 */

export type BreathLine = {
  key: string;
  /** 音が出せないときの読み上げ用 */
  text: string;
  /** 画面に出す文（改行はそのまま出す） */
  screen: string;
};

export const BREATH_LINES: BreathLine[] = [
  {
    key: "intro",
    text: "まず目を閉じて、体を左右にゆらゆら揺らそう。",
    // 立てない人・歩いている人もいる。音声は録り直せないので画面の文字で添える
    screen: "まず目を閉じて、\n体を左右にゆらゆら揺らそう。\n（歩いている人は、歩きながらゆったりでいいよ）",
  },
  {
    key: "closemouth",
    text: "口を閉じます。",
    screen: "まず、口を閉じます。",
  },
  {
    key: "press",
    text: "そのまま口の中にやさしく空気の圧をかけてね。",
    screen: "そのまま、\n口の中にやさしく空気の圧をかけてください。",
  },
  {
    key: "exhale",
    text: "口の中に圧がかかったら、唇をほんの少しだけ開き、ゆっくり息を吐いていきます。",
    screen: "口の中に少し圧がかかったら、\n唇を、ストローのようにほんの少しだけ開き\n息を吐きだしていきます。",
  },
  {
    key: "burst",
    text: "苦しくなってきたら、勢いよく全部吐き出して。",
    screen: "苦しくなってきたら\n勢いよく全部吐き切ってください。",
  },
  {
    key: "hold",
    text: "吐き切ったら、一度そこでキープして。",
    screen: "吐き切ったら、\nそのまま一度キープ。",
  },
  {
    key: "inhale",
    text: "一気に吸い込んで。",
    screen: "一気に、吸い込んで。",
  },
  {
    key: "settle",
    text: "そのまま目を閉じながらゆったり呼吸して、今の体の感覚を体に馴染ませて。",
    screen: "そのまま目を閉じながら、\nゆったり呼吸して\nいまの体の感覚を、体に馴染ませて。",
  },
  // 何回目かの掛け声。その回の頭で、次の言葉の前に続けて鳴る
  { key: "r1", text: "1回目。", screen: "1回目" },
  { key: "r2", text: "2回目。", screen: "2回目" },
  { key: "r3", text: "3回目。", screen: "3回目" },
];

export const lineOf = (key: string) => BREATH_LINES.find((l) => l.key === key);

/** 淳くんの声のファイル。public に置いてあるので、料金も通信の心配もない */
export const voiceFile = (key: string) => `/breath/${key}.mp3`;

/**
 * セリフごとの版（URLの後ろに付ける）。
 *
 * 焼いた音声は1年キャッシュにしてある（料金と速さのため）。
 * だからセリフを直して焼き直しても、**すでに聞いた人の端末には古い音が残る**。
 * 文が変わればURLも変わるようにして、それを避ける。
 */
export function lineVersion(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** 焼き込みにかかる文字数（＝ElevenLabsのクレジット）。1回きり */
export function totalChars(): number {
  return BREATH_LINES.reduce((a, l) => a + l.text.length, 0);
}

/** 保存先（Supabase Storage の公開バケット内） */
export const BAKE_BUCKET = "avatars";
export const bakePath = (voiceId: string, key: string) => `_voice/${voiceId}/${key}.mp3`;
