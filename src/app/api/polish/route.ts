/**
 * 話し言葉の「誤字脱字直し」だけをする。
 *
 * やるのは：音声認識の変換ミスを文脈から直す／口ぐせを消す／句読点を足す。だけ。
 * やらないのは：要約・言い換え・箇条書き・解説・敬語化・内容の増減。ぜんぶ禁止。
 * ChatGPT のように「前後の文脈で正しい字を汲む」けど、勝手にまとめない。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { complete } from "@/lib/ai";
import { logError } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let raw = "";
  try {
    const b = await req.json();
    raw = String(b.text ?? "").trim();
    if (!raw) return NextResponse.json({ error: "text が空です" }, { status: 400 });
    // 短すぎるものは、そのまま返す（AIを呼ぶだけ無駄）
    if (raw.length < 8) return NextResponse.json({ text: raw, skipped: true });

    const prompt = `次の文は、人が話した声を機械が文字起こししたもの。
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
${raw}`;

    const text = await complete({
      userId,
      prompt,
      maxTokens: Math.min(2000, Math.ceil(raw.length * 2) + 200),
      temperature: 0,
    });

    let cleaned = String(text ?? "").trim().replace(/^[「『]/, "").replace(/[」』]$/, "");
    // 万一まとめ・注記が返ってきたら（先頭が箇条書き等）、原文を優先して事故を防ぐ
    if (/^[-・*]/.test(cleaned) || cleaned.includes("誤変換") || cleaned.length > raw.length * 2.2) {
      cleaned = raw;
    }
    return NextResponse.json({ text: cleaned || raw });
  } catch (e: any) {
    await logError(userId, "/api/polish", e);
    // 整形に失敗しても、話した内容が消えては困るので原文をそのまま返す
    return NextResponse.json({ text: raw, error: String(e?.message ?? e) });
  }
}
