/**
 * テキスト→自然な音声（OpenAI TTS）。
 * 呼吸ガイドのセリフはほぼ固定なので、クライアント側でキャッシュして初回だけ生成する想定。
 * OPENAI_API_KEY（既存プロジェクトのキー）を環境変数に入れて使う。
 */
import { auth } from "@/auth";

const DEFAULT_INSTRUCTIONS =
  "やわらかく、あたたかい、少し子どもっぽい落ち着いた声で。急がず、やさしく、包むように。呼吸に寄り添うテンポで。";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: "no_openai_key" }), { status: 503 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim().slice(0, 500);
  if (!text) return new Response(JSON.stringify({ error: "empty" }), { status: 400 });
  const voice = typeof body.voice === "string" ? body.voice : "shimmer";
  const instructions = typeof body.instructions === "string" ? body.instructions : DEFAULT_INSTRUCTIONS;

  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input: text,
        instructions,
        response_format: "mp3",
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return new Response(JSON.stringify({ error: "openai_error", detail: t.slice(0, 300) }), { status: 502 });
    }
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
  }
}
