/**
 * 話し言葉を、そのまま使える文章に整える。
 *
 * ブラウザの音声認識が拾った生のテキストは
 *   「えーっと あの なんか 家族と どっか 自然のとこ 行きたいなって思ってて」
 * のようになる。これを
 *   「家族と自然のあるところへ行きたいと思っている」
 * に直してから入力欄に戻す。
 *
 * 大事なルール: 内容を足さない。言っていないことを書かない。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { complete } from "@/lib/ai";
import { logError } from "@/lib/supabase";

/** 整え方の種類 */
type Mode = "speech" | "quest" | "reflect";

const INSTRUCTION: Record<Mode, string> = {
  speech:
    "話し言葉として自然なまま、読みやすく整えてください。丁寧語に変えたり、かしこまらせたりしないこと。",
  quest:
    "「やってみたいこと」の一文として整えてください。1〜2文の短さに収め、本人の言葉づかいを残すこと。",
  reflect:
    "やってみた結果の振り返りとして整えてください。感じたことの温度は落とさず、読みやすくすること。",
};

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

    const mode: Mode = b.mode === "quest" || b.mode === "reflect" ? b.mode : "speech";

    const prompt = `以下は、人が声で話した内容を機械が文字にしたものです。
読める文章に整えてください。

# 守ること
- 「えーっと」「あの」「なんか」「まあ」などの口ぐせを取り除く
- 言い直し・重複を1つにまとめる
- 音声認識の変換ミスが明らかな箇所は、文脈から正しい語に直す
- 句読点と改行を入れて読みやすくする

# 絶対にやってはいけないこと
- 内容を足さない。本人が言っていないことを書かない
- 要約しない。短くまとめようとしない
- 本人の言葉づかいを、きれいな言葉に置き換えない

# 整え方
${INSTRUCTION[mode]}

# 出力
整えた本文だけを返してください。前置きも説明も、かぎかっこも不要です。

---
${raw}`;

    const text = await complete({
      userId,
      prompt,
      maxTokens: 1500,
      temperature: 0.2,
    });

    const cleaned = String(text ?? "").trim().replace(/^[「『]|[」』]$/g, "");
    return NextResponse.json({ text: cleaned || raw });
  } catch (e: any) {
    await logError(userId, "/api/polish", e);
    // 整形に失敗しても、話した内容が消えては困るので原文をそのまま返す
    return NextResponse.json({ text: raw, error: String(e?.message ?? e) });
  }
}
