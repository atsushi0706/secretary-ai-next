/**
 * 話した声を文字にしたあとの「整え」だけを担当する。
 *
 * ここは Claude(Haiku) を指名する。理由：
 *   Gemini の軽量モデルは、指示を実行せずに「指示文そのもの」を返してくることがあり、
 *   それがそのまま入力欄に貼りつく事故が起きた。Haiku は指示を守るのでこれが起きにくい。
 *   ※ 音声そのものを聞く工程は Haiku にはできない（音声非対応）ので、そちらは Gemini のまま。
 *
 * 万一おかしなものが返っても、必ず元の文（逐語）に戻す。話した内容は絶対に失わない。
 */
import { complete } from "./ai";

/**
 * 指示文のオウム返しを見つける。
 * 書き起こしのはずが、AIへの指示が返ってくることがあるため、必ずここで止める。
 */
const ECHO_MARKERS = [
  "polished", "逐語書き起こし", "JSONだけ", "フィラー", "この音声はアプリの音声入力",
  "出力形式", "整形版", "誤字脱字直し", "絶対にやらないこと", "口ぐせ・つなぎ言葉",
];
export function looksLikePromptEcho(s: string): boolean {
  if (!s) return false;
  if (ECHO_MARKERS.filter((m) => s.includes(m)).length >= 2) return true;
  return s.replace(/\s/g, "").includes("この音声はアプリの音声入力");
}

const POLISH_PROMPT = `次の文は、人が話した声を機械が文字起こししたもの。
きみの仕事は「誤字脱字直し」だけ。意味の編集は一切しない。

# やること（これだけ）
- 明らかな変換ミスを、前後の文脈から正しい字に直す（同音異義の誤変換など）
- 「えー」「あの」「なんか」「まあ」「その」等の口ぐせ・つなぎ言葉を消す
- 同じことの言い直し・重複を1つにする
- 句読点を足して、読みやすくする

# 絶対にやらないこと（重要）
- 要約しない。まとめない。箇条書き（- や・）にしない
- 言い換えない。きれいな言葉・敬語に直さない。話し言葉のまま
- 内容を足さない・減らさない。順番を変えない
- 解説・注記を付けない（「〜の誤変換」「つまり〜」などのコメントは一切禁止）
- 迷ったら、直さずにそのまま残す

# 出力
直した本文だけを、話したときのまま1つの文章で返す。前置き・記号・かぎかっこは付けない。

# 例
入力：えーっと なんか 今日はさ この資料 塗装と思ってて
出力：今日はさ、この資料通そうと思ってて

入力：あの 家族と どっか 自然のとこ 行きたいなって なんか 思っててさ
出力：家族と、どっか自然のとこ行きたいなって思っててさ

---
`;

/** 数字が勝手に増減していないか（＝内容が作られていないか）を見る */
function digitsOf(s: string): string[] {
  return (s.match(/\d+/g) ?? []).map((d) => d.replace(/^0+(?=\d)/, ""));
}

/** 整形結果が「元の話」から離れていないか。離れていたら使わない */
export function isFaithful(raw: string, polished: string): boolean {
  if (!polished.trim()) return false;
  // 大きく削られていたら要約されている（短い発話は 8文字未満で除外ずみなので 20 で足りる）
  if (polished.length < raw.length * 0.35 && raw.length > 20) return false;
  if (polished.length > raw.length * 2.2) return false;      // 盛られている
  if (/^[-・*]/.test(polished.trim())) return false;          // 箇条書きにされた
  if (polished.includes("誤変換")) return false;              // 注記が付いた
  if (looksLikePromptEcho(polished)) return false;            // 指示文のオウム返し
  const rawD = new Set(digitsOf(raw));
  for (const d of digitsOf(polished)) if (!rawD.has(d)) return false; // 数字が増えた
  return true;
}

/**
 * 逐語を整える。失敗しても必ず元の文を返す（話した内容は消さない）。
 * @returns { text, edited } text=入力欄に入れる文 / edited=整形が実際に効いたか
 */
export async function polishSpeech(userId: string, raw: string): Promise<{ text: string; edited: boolean }> {
  const src = raw.trim();
  if (!src) return { text: "", edited: false };
  if (src.length < 8) return { text: src, edited: false };  // 短すぎ＝AIを呼ぶだけ無駄

  try {
    const out = await complete({
      userId,
      prompt: POLISH_PROMPT + src,
      maxTokens: Math.min(2000, Math.ceil(src.length * 2) + 200),
      temperature: 0,
      prefer: "claude",   // ← 指示を守る Haiku を指名（無ければ通常のエンジンに戻る）
    });
    const cleaned = String(out ?? "").trim().replace(/^[「『]/, "").replace(/[」』]$/, "");
    if (!isFaithful(src, cleaned)) return { text: src, edited: false };
    return { text: cleaned, edited: cleaned !== src };
  } catch {
    return { text: src, edited: false };   // 整えられなくても、話した内容は必ず渡す
  }
}
