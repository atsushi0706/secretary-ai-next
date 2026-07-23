// 姓名判断コアロジック
// 氏名の画数から五格（天格・人格・地格・外格・総格）を算出

import { getCharStrokes } from '@/data/kanji-strokes';

export interface SeimeiResult {
  familyNameStrokes: number[];  // 姓の各文字の画数
  givenNameStrokes: number[];   // 名の各文字の画数
  tenkaku: number;   // 天格（姓の総画数）
  jinkaku: number;   // 人格（姓の最後 + 名の最初）
  chikaku: number;   // 地格（名の総画数）
  gaikaku: number;   // 外格（総格 - 人格）
  soukaku: number;   // 総格（全文字の総画数）
  unknownChars: string[]; // 画数不明の文字
  tenkakuMeaning: string;
  jinkakuMeaning: string;
  chikakuMeaning: string;
  soukakuMeaning: string;
}

/**
 * 画数から吉凶の意味を返す（簡易版）
 */
function getStrokeMeaning(strokes: number): string {
  // 姓名判断の代表的な画数の意味（1〜30を網羅）
  const meanings: Record<number, string> = {
    1: '【大吉】リーダーシップ・開拓の運。新しい道を切り拓く力があります。',
    2: '【凶】分離・不安定の暗示。周囲のサポートが大切です。',
    3: '【吉】才能・明るさの運。知性と社交性に恵まれます。',
    4: '【凶】苦難・不安定の暗示。忍耐が必要な時期があるかもしれません。',
    5: '【大吉】調和・健康の運。バランスの取れた素晴らしい運勢です。',
    6: '【吉】安定・信頼の運。周囲から頼りにされる存在です。',
    7: '【吉】独立・意志の運。強い意志で道を進みます。',
    8: '【吉】努力・忍耐の運。コツコツ積み上げて大成します。',
    9: '【凶】波乱の暗示。知性は高いですが浮き沈みがあります。',
    10: '【凶】空虚の暗示。目標を持つことで運気が安定します。',
    11: '【大吉】幸運・繁栄の運。温和で人望があります。',
    12: '【凶】挫折の暗示。諦めない心が大切です。',
    13: '【大吉】知恵・人気の運。才能と人脈に恵まれます。',
    14: '【凶】不満・破綻の暗示。感謝の心を持つことが開運の鍵です。',
    15: '【大吉】幸福・慈愛の運。家庭運が非常に良いです。',
    16: '【大吉】大成・統率の運。リーダーとして活躍します。',
    17: '【吉】積極・勇気の運。強い意志で前進します。',
    18: '【吉】発展・活力の運。行動力があり成功します。',
    19: '【凶】苦労の暗示。知恵はありますが障害が多い傾向です。',
    20: '【凶】空虚の暗示。精神面を大切にすることが重要です。',
    21: '【大吉】自立・成功の運。独立心が強く頭角を現します。',
    22: '【凶】挫折の暗示。中途半端にならない注意が必要です。',
    23: '【大吉】成功・名声の運。大きな成果を上げるでしょう。',
    24: '【大吉】財運・出世の運。お金に縁があります。',
    25: '【吉】聡明・個性の運。学問や芸術に才能を発揮します。',
    26: '【凶】波乱の暗示。変化の多い人生ですが学びも多いです。',
    27: '【凶】自我が強い暗示。協調性を意識すると運気アップ。',
    28: '【凶】遭難の暗示。慎重な判断が大切です。',
    29: '【大吉】成功・知力の運。才能と幸運に恵まれます。',
    30: '【吉凶混合】浮き沈みの運。好不調の波があります。',
    31: '【大吉】統率・円満の運。人望厚く幸福な人生です。',
    32: '【大吉】幸運・チャンスの運。思いがけない幸運が訪れます。',
    33: '【大吉】昇天の運。大きく飛躍するパワーがあります。',
    35: '【吉】学問・芸術の運。温和で知性溢れる人生です。',
    37: '【吉】誠実・人望の運。信頼を得て発展します。',
    39: '【大吉】成功・長寿の運。バランスの良い豊かな人生です。',
    41: '【大吉】実力・徳望の運。人格と実力を兼ね備えます。',
    45: '【大吉】大成・開運の運。晩年ほど運気が上昇します。',
    47: '【大吉】開花の運。努力が実を結ぶ素晴らしい運勢です。',
    48: '【大吉】知恵・徳望の運。周囲から尊敬される存在です。',
  };

  if (meanings[strokes]) return meanings[strokes];

  // 未登録の画数は一般的なルールで判定
  if (strokes % 2 === 1 && strokes <= 50) {
    return '【吉】安定した運勢です。着実な努力が実を結びます。';
  }
  return '【平】平凡ながら安定した運勢です。バランスが大切です。';
}

/**
 * 姓名判断を実行
 * @param familyName 姓（漢字・ひらがな・カタカナ）
 * @param givenName 名（漢字・ひらがな・カタカナ）
 */
export function diagnoseSeimei(familyName: string, givenName: string): SeimeiResult {
  const unknownChars: string[] = [];

  // 各文字の画数を計算
  const familyNameStrokes = [...familyName].map(char => {
    const strokes = getCharStrokes(char);
    if (strokes === null) unknownChars.push(char);
    return strokes ?? 0;
  });

  const givenNameStrokes = [...givenName].map(char => {
    const strokes = getCharStrokes(char);
    if (strokes === null) unknownChars.push(char);
    return strokes ?? 0;
  });

  const familyTotal = familyNameStrokes.reduce((a, b) => a + b, 0);
  const givenTotal = givenNameStrokes.reduce((a, b) => a + b, 0);

  // 五格の計算
  const tenkaku = familyTotal; // 天格 = 姓の総画数
  const chikaku = givenTotal;  // 地格 = 名の総画数

  // 人格 = 姓の最後の文字 + 名の最初の文字
  const jinkaku = (familyNameStrokes[familyNameStrokes.length - 1] ?? 0)
    + (givenNameStrokes[0] ?? 0);

  const soukaku = familyTotal + givenTotal; // 総格 = 全画数

  // 外格 = 総格 - 人格（ただし最低1）
  const gaikaku = Math.max(soukaku - jinkaku, 1);

  return {
    familyNameStrokes,
    givenNameStrokes,
    tenkaku,
    jinkaku,
    chikaku,
    gaikaku,
    soukaku,
    unknownChars,
    tenkakuMeaning: getStrokeMeaning(tenkaku),
    jinkakuMeaning: getStrokeMeaning(jinkaku),
    chikakuMeaning: getStrokeMeaning(chikaku),
    soukakuMeaning: getStrokeMeaning(soukaku),
  };
}
