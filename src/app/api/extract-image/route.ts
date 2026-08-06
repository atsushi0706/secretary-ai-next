/**
 * 画像をアップロード→Claude Vision で読み取って「候補」を返す。
 *
 * 【なぜ作らずに返すのか】
 * 前はここで読み取った結果を**そのままGoogleタスクに追加**していた。
 * 使ってくれている方から「何も入力していないのにタスクが増えている」と連絡があり、
 * 原因はここだった。受信箱のスクリーンショットを渡すと、
 *   「VALUE DOMAIN ドメイン登録完了のお知らせ (wildwych.com)」
 * のようなメールの件名が、そのままタスクとして3件作られていた。
 *
 * 指示文には「挨拶/宣伝/通知系はタスク化しない」と書いてあったが、
 * **AIが守らなかったときに歯止めが無い**のが本当の問題。
 * 指示で防ぐのではなく、**本人が見て選ぶまで作らない**ようにする。
 *
 * だからこのAPIは、もう何も作らない。候補を返すだけ。
 * 実際に作るのは、画面で選ばれたぶんだけ（/api/tasks の action:"add"）。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractJson } from "@/lib/claude";
import { vision, AIRateLimitError, formatRateLimitForUser } from "@/lib/ai";
import { jstDateStr } from "@/lib/google";
import { logError, getUserSettings } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const hint = (form.get("hint") as string | null) ?? "";
    const isMorning = (form.get("isMorning") as string | null) === "true";
    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

    const today = jstDateStr();
    const targetDay = isMorning ? today : jstDateStr(new Date(Date.now() + 86400000));
    const targetLabel = isMorning ? "今日" : "明日";

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = (file.type || "image/png") as "image/png" | "image/jpeg" | "image/gif" | "image/webp";

    const prompt = `あなたは秘書AI。下の画像はメール/メッセージ/連絡のスクリーンショット。
本人が対応すべき「やるべきこと」を抽出して、JSON配列のみ返す。
${hint ? "【補足ヒント】" + hint + "\n" : ""}
ルール:
- 1タスク1行の**具体的なアクション**にする。**メールの件名をそのまま書くな**
  （悪い例：「VALUE DOMAIN ドメイン登録完了のお知らせ」／良い例：「取得したドメインをサーバーに紐づける」）
- 本人が手を動かす必要がないものは、絶対に出さない
- ${targetLabel}(${targetDay})までに着手すべきなら due="${targetDay}"
- 挨拶/宣伝/通知系はタスク化しない
- 該当なしは []

JSONのみ:
[{"title":"...","notes":"差出人や出所","category":"work|personal","urgency":"high|low","importance":"high|low","time":"quick|mid|long","due":"${targetDay}|"}]
※ time: quick=すぐ終わる(〜30分) / mid=30分〜1時間 / long=1〜3時間`;

    const raw = await vision({
      userId,
      prompt,
      imageBase64: base64,
      mediaType,
      maxTokens: 2048,
    });
    const cands = extractJson<any[]>(raw) ?? [];

    /**
     * 通知メールらしい件名は、候補からも外す。
     *
     * AIには「通知系はタスク化しない」と伝えてあるが、守らないことがある。
     * 実際に「〜登録完了のお知らせ」が3件通ってしまった。
     * 本人が選ぶ仕組みにしたので事故にはならないが、
     * 選ぶ手間まで押しつける理由もないので、ここでも落とす。
     */
    const looksLikeNotice = (t: string) =>
      /(のお知らせ|お知らせ)$|完了しました|受付(ました|完了)|自動(送信|配信)|ニュースレター|配信停止|no-?reply/i.test(t)
      || /^(【[^】]*】)?\s*(【?PR】?|広告|キャンペーン)/.test(t);

    const candidates = cands.flatMap((c) => {
      const title = String(c.title ?? "").trim().slice(0, 120);
      if (!title) return [];
      if (looksLikeNotice(title)) return [];
      return [{
        title,
        notes: String(c.notes ?? "").slice(0, 300),
        due: c.due || null,
        category: ["work", "personal"].includes(c.category) ? c.category : "work",
        urgency: ["high", "low"].includes(c.urgency) ? c.urgency : "low",
        importance: ["high", "low"].includes(c.importance) ? c.importance : "high",
        time: ["quick", "mid", "long"].includes(c.time) ? c.time : "mid",
      }];
    }).slice(0, 12);

    // **ここでは何も作らない。** 作るのは、画面で選ばれたぶんだけ。
    return NextResponse.json({ ok: true, candidates });
  } catch (e: any) {
    await logError(userId, "/api/extract-image", e);
    if (e instanceof AIRateLimitError) {
      const settings: any = await getUserSettings(userId).catch(() => null);
      const secretaryName = settings?.secretary_name || "清瀬リンク";
      const friendly = formatRateLimitForUser(e, secretaryName);
      // Chat 側で "画像読み取りでエラー: {error}" として表示されるので、エラー文字列に friendly を入れる
      return NextResponse.json({ ok: false, error: friendly, rateLimited: true }, { status: 200 });
    }
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
