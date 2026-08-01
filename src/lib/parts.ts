/**
 * 内なる子の神殿（パーツ心理学 / インナーチャイルドワーク）。
 *
 * 構造は3段。同じ色の、同じ存在の"3つの姿"。
 *   ① 内なる子   … 本当は求めている、まだ満たされていない子
 *   ② 防衛パーツ … その子が傷つかないように、前に立って守っている姿（＝いまの「クセ」）
 *   ③ ガーディアン… 役割から解き放たれ、守る力が外へ開いた姿（＝才能）
 *
 * ワークで防衛パーツの奥にいる内なる子に出会い、癒すと、
 * 防衛パーツは「守る」をやめて「与える」へ進化する ＝ ガーディアン解放。
 *
 * 4色そろえると「四守の環」が完成する（図鑑コンプリート）。
 */

export type PartColor = "red" | "blue" | "green" | "yellow";

export type PartFace = {
  /** 「戦う人」など、姿の名前 */
  name: string;
  /** 「警戒のガーディアン」など、肩書き */
  title: string;
  /** 何をしている存在か */
  desc: string;
  /** その姿がやること（画像の箇条書きと同じ） */
  acts: string[];
  /** あなたへのメッセージ */
  message: string;
  /** カード画像（説明つきの縦長カード全体）。未配置ならフォールバックの紋章が出る */
  img: string;
  /** 顔だけを切り出した正方形（一覧・進行帯など小さく出すとき用） */
  face: string;
};

export type PartTrio = {
  color: PartColor;
  /** 色名（日本語1文字） */
  kanji: string;
  hue: string;
  /** 選ぶときの手がかり。「こういうとき、この子が前に出る」 */
  cue: string;
  child: PartFace;
  defense: PartFace;
  guardian: PartFace;
};

export const PARTS: Record<PartColor, PartTrio> = {
  red: {
    color: "red",
    kanji: "赤",
    hue: "#d8412a",
    cue: "カチンとくる。反発する。人と壁をつくる。攻撃的になる。",
    child: {
      name: "内なる子",
      title: "勇気を待つインナーチャイルド",
      desc: "本当は走り出したい子。「やってみたい」を胸に秘め、きっかけを待っている存在。",
      acts: ["ワクワクしたい", "挑戦してみたい", "見つけてほしい", "応援されたい"],
      message: "だいじょうぶ。あなたの勇気は、ここにある。",
      img: "/parts/child-red.jpg",
      face: "/parts/child-red-face.jpg",
    },
    defense: {
      name: "戦う人",
      title: "警戒のガーディアン",
      desc: "危険をいち早く察知し、怒りや反発で内なる子を守る存在。",
      acts: ["警戒する", "戦う", "境界線を守る", "近づけさせない"],
      message: "ずっと、傷つけさせないように守ってくれていた。",
      img: "/parts/def-red.jpg",
      face: "/parts/def-red-face.jpg",
    },
    guardian: {
      name: "動かす人",
      title: "冒険のガーディアン",
      desc: "火を外からつける人。人を動かし、挑戦へと背中を押す存在。",
      acts: ["挑戦させる", "背中を押す", "突破させる", "決断させる"],
      message: "あなたがいたから、動き出せた。",
      img: "/parts/guard-red.jpg",
      face: "/parts/guard-red-face.jpg",
    },
  },
  blue: {
    color: "blue",
    kanji: "青",
    hue: "#1f5fc0",
    cue: "考えすぎる。準備しすぎる。完璧じゃないと動けない。先回りして疲れる。",
    child: {
      name: "内なる子",
      title: "学びを待つインナーチャイルド",
      desc: "本当は知りたい子。わからないをそのままにせず、安心して学べる場所を求めている存在。",
      acts: ["知りたい", "質問したい", "理解したい", "考えたい", "安心して学びたい"],
      message: "ゆっくりでいい。あなたのペースでわかっていこう。",
      img: "/parts/child-blue.jpg",
      face: "/parts/child-blue-face.jpg",
    },
    defense: {
      name: "管理する人",
      title: "管理のガーディアン",
      desc: "失敗や否定を避けるため、考え、整え、完璧を目指して内なる子を守る存在。",
      acts: ["分析する", "準備する", "先回りする", "完璧を求める", "ミスを防ぐ"],
      message: "安心できるように、ずっと考えて整えてくれていた。",
      img: "/parts/def-blue.jpg",
      face: "/parts/def-blue-face.jpg",
    },
    guardian: {
      name: "教える人",
      title: "知恵のガーディアン",
      desc: "火の起こし方を教える人。知識や技術を届け、自分でできる力を育てる存在。",
      acts: ["教える", "整理する", "理解させる", "方法を渡す", "考える力を育てる"],
      message: "あなたに教わったから、自分でできるようになった。",
      img: "/parts/guard-blue.jpg",
      face: "/parts/guard-blue-face.jpg",
    },
  },
  green: {
    color: "green",
    kanji: "緑",
    hue: "#3f8b45",
    cue: "だまって引く。ひとりになる。連絡を返さない。関わるのをやめる。",
    child: {
      name: "内なる子",
      title: "愛を待つインナーチャイルド",
      desc: "本当は甘えたい子。ぬくもりと安心の中で、自分らしく育ちたがっている存在。",
      acts: ["甘えたい", "安心したい", "抱きしめてほしい", "信じてほしい", "休みたい"],
      message: "ここにいていい。あなたは大切にされていい。",
      img: "/parts/child-green.jpg",
      face: "/parts/child-green-face.jpg",
    },
    defense: {
      name: "隠れる人",
      title: "回避のガーディアン",
      desc: "傷つかないように、静かに引いて距離をとり、安全な場所へ連れていく存在。",
      acts: ["距離をとる", "ひとりになる", "回避する", "休む", "身を守る"],
      message: "もうこれ以上傷つかないように、静けさの中で守ってくれていた。",
      img: "/parts/def-green.jpg",
      face: "/parts/def-green-face.jpg",
    },
    guardian: {
      name: "育てる人",
      title: "癒しのガーディアン",
      desc: "火が灯り続ける土壌をつくる人。安心や信頼で、人の心を支え育てる存在。",
      acts: ["受け止める", "癒やす", "寄り添う", "信じる", "続けられる状態をつくる"],
      message: "あなたがいてくれたから、自分を信じられた。",
      img: "/parts/guard-green.jpg",
      face: "/parts/guard-green-face.jpg",
    },
  },
  yellow: {
    color: "yellow",
    kanji: "黄",
    hue: "#d9a218",
    cue: "笑ってごまかす。話題を変える。明るくふるまう。本音を言わない。",
    child: {
      name: "内なる子",
      title: "輝きを待つインナーチャイルド",
      desc: "本当は輝きたい子。楽しいことや表現することが大好きで、安心して光る場を待っている存在。",
      acts: ["笑いたい", "表現したい", "見てほしい", "ときめきたい", "遊びたい"],
      message: "そのままのあなたで、もう十分まぶしい。",
      img: "/parts/child-yellow.jpg",
      face: "/parts/child-yellow-face.jpg",
    },
    defense: {
      name: "そらす人",
      title: "気晴らしのガーディアン",
      desc: "つらさや痛みから目をそらすため、楽しさや軽さで場を変え、内なる子を守る存在。",
      acts: ["話題を変える", "明るくふるまう", "ごまかす", "笑わせる", "気をそらす"],
      message: "苦しくなりすぎないように、軽やかさで守ってくれていた。",
      img: "/parts/def-yellow.jpg",
      face: "/parts/def-yellow-face.jpg",
    },
    guardian: {
      name: "魅せる人",
      title: "光のガーディアン",
      desc: "火を外から輝かせる人。楽しさや感動を届け、心を動かす存在。",
      acts: ["楽しませる", "驚かせる", "感動させる", "新しい世界を見せる", "好奇心を起こす"],
      message: "あなたがいたから、世界が面白く見えた。",
      img: "/parts/guard-yellow.jpg",
      face: "/parts/guard-yellow-face.jpg",
    },
  },
};

export const PART_COLORS = Object.keys(PARTS) as PartColor[];

export function isPartColor(v: unknown): v is PartColor {
  return typeof v === "string" && v in PARTS;
}

/** ワークの段階。画面の演出（誰が前に出ているか）もこれで決まる */
export type PartsStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const STEP_LABEL: Record<PartsStep, string> = {
  1: "守り手に出会う",
  2: "何から守っているのか",
  3: "その奥へ",
  4: "内なる子に出会う",
  5: "癒す",
  6: "自分に取り込む",
  7: "守り手を解き放つ",
  8: "最初の感覚にもどる",
};

/** AI に渡す、そのパーツぶんの人物設定 */
export function partPrompt(color: PartColor): string {
  const p = PARTS[color];
  return [
    `# いま扱っているパーツ：${p.kanji}（${p.defense.name}／${p.defense.title}）`,
    `- 守り方：${p.defense.acts.join("・")}`,
    `- この守り手は「${p.defense.desc}」`,
    `- その奥にいる内なる子：${p.child.title}。${p.child.desc}`,
    `- 内なる子が求めているもの：${p.child.acts.join("・")}`,
    `- 解き放たれたときの姿：${p.guardian.name}（${p.guardian.title}）＝ ${p.guardian.acts.join("・")}`,
    "",
    "※ ただし、この設定を先に説明してはいけない。相手の言葉から出てきたものを優先する。",
    "※ 相手が語ったことが、この設定と違っても訂正しない。相手の体験のほうが正しい。",
  ].join("\n");
}

/** 4色の手がかり一覧（どれか選べないときに AI が見立てるために渡す） */
export function cuesForPrompt(): string {
  return PART_COLORS.map((c) => {
    const p = PARTS[c];
    return `- ${c}（${p.defense.name}）: ${p.cue}`;
  }).join("\n");
}
