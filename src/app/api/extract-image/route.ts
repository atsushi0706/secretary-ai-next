/**
 * 画像をアップロード→Claude Vision で読み取ってタスク化→Googleタスクに追加。
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractJson } from "@/lib/claude";
import { vision } from "@/lib/ai";
import { addTask, jstNow, jstDateStr } from "@/lib/google";
import { setManualLabel, logError } from "@/lib/supabase";

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
- 1タスク1行の具体的アクション
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

    const added: string[] = [];
    for (const c of cands) {
      const title = String(c.title ?? "").trim();
      if (!title) continue;
      try {
        const created = await addTask(userId, title, {
          notes: c.notes ?? "", due: c.due || null,
        });
        if (created.id) {
          await setManualLabel(userId, created.id, {
            category: ["work", "personal"].includes(c.category) ? c.category : "work",
            urgency: ["high", "low"].includes(c.urgency) ? c.urgency : "low",
            importance: ["high", "low"].includes(c.importance) ? c.importance : "high",
            time_label: ["quick", "mid", "long"].includes(c.time) ? c.time : "mid",
            reason: "画像から抽出",
          });
          added.push(title);
        }
      } catch (e) {
        console.error("addTask failed:", e);
      }
    }
    return NextResponse.json({ ok: true, added });
  } catch (e: any) {
    await logError(userId, "/api/extract-image", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
