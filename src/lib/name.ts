/**
 * 本名（フルネーム）の扱い。**画面からもサーバからも使う**ので、DBは触らない。
 *
 * 【なぜ1か所にまとめたか】
 * 姓名判断は「姓」と「名」に分けて画数を読む。分けられない書き方だと読めない。
 * これまでは、分けられなかったときに **黙って姓名判断ごと飛ばしていた**。
 * その結果「なぜか名前の読みだけ出ない」状態になり、本人にも管理側にも原因が見えない。
 *
 * だから、
 *   ・分けられたか／分けられなかったかを、はっきり返す
 *   ・分けられないときは、何がいけないのかを日本語で返す
 * ようにして、入力の時点で直してもらえるようにする。
 */

export type SplitName =
  | { ok: true; family: string; given: string }
  | { ok: false; reason: string };

/** 姓と名のあいだの区切り（半角・全角スペース、中黒） */
const SEP = /[\s　・]+/;

/**
 * フルネームを、姓と名に分ける。
 * 「山田 太郎」→ { family: "山田", given: "太郎" }
 */
export function splitFullName(input: string | null | undefined): SplitName {
  const name = String(input ?? "").trim();
  if (!name) return { ok: false, reason: "お名前が入っていません" };

  const parts = name.split(SEP).filter(Boolean);
  if (parts.length < 2) {
    return { ok: false, reason: "姓と名のあいだに、スペースを1つ入れてください（例：山田 太郎）" };
  }
  const family = parts[0];
  const given = parts.slice(1).join("");
  if (!family || !given) {
    return { ok: false, reason: "姓と名の両方を入れてください（例：山田 太郎）" };
  }
  // 記号や英数だけだと画数が読めない
  const jp = /[぀-ヿ一-鿿々〆ヶ]/;
  if (!jp.test(family) || !jp.test(given)) {
    return { ok: false, reason: "漢字・ひらがな・カタカナで入れてください" };
  }
  return { ok: true, family, given };
}

/** 入力欄の下に出す注意書き。画面ごとに書き分けない（言い回しがずれるため） */
export const FULLNAME_NOTE =
  "姓名判断を正しく読むため、**フルネーム**でお願いします。姓と名のあいだにスペースを1つ入れてください（例：山田 太郎）。";

/** 入力が使えるかどうかだけ知りたいとき */
export function isUsableFullName(input: string | null | undefined): boolean {
  return splitFullName(input).ok;
}
