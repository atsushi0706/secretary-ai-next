/**
 * テキスト→音声。
 *
 * 使う順（上から、使えるものを使う）:
 *   1. ElevenLabs … いちばん自然。日本語もちゃんと喋る。ELEVENLABS_API_KEY があれば最優先
 *   2. OpenAI TTS  … 次点。OPENAI_API_KEY があれば
 *   3. どちらも無ければ 503 → 画面側が同梱mp3／ブラウザ読み上げに退避
 *
 * セリフはほぼ固定なので、画面側がブラウザのキャッシュに貯める。生成は初回だけ。
 */
import { auth } from "@/auth";

const DEFAULT_INSTRUCTIONS =
  "やわらかく、あたたかい、少し子どもっぽい落ち着いた声で。急がず、やさしく、包むように。呼吸に寄り添うテンポで。";

// 声は環境変数で差し替えられる（ELEVENLABS_VOICE_ID）
const EL_VOICE = process.env.ELEVENLABS_VOICE_ID?.trim() || "8EkOjt4xTPGMclNlh1pk";
const EL_MODEL = process.env.ELEVENLABS_MODEL?.trim() || "eleven_multilingual_v2";

function audio(buf: ArrayBuffer, engine: string) {
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-TTS-Engine": engine,
    },
  });
}

async function elevenlabs(text: string): Promise<Response | null> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) return null;
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: EL_MODEL,
        voice_settings: {
          stability: 0.42,        // 低いほど抑揚が出る。棒読みにならない程度に
          similarity_boost: 0.8,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    });
    if (!r.ok) {
      console.warn("[tts] elevenlabs failed:", r.status, (await r.text().catch(() => "")).slice(0, 200));
      return null;   // 失敗したら次のエンジンへ落とす
    }
    return audio(await r.arrayBuffer(), "elevenlabs");
  } catch (e) {
    console.warn("[tts] elevenlabs error:", e);
    return null;
  }
}

async function openai(text: string, voice: string, instructions: string): Promise<Response | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: text, instructions, response_format: "mp3" }),
    });
    if (!r.ok) return null;
    return audio(await r.arrayBuffer(), "openai");
  } catch { return null; }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim().slice(0, 500);
  if (!text) return new Response(JSON.stringify({ error: "empty" }), { status: 400 });
  const voice = typeof body.voice === "string" ? body.voice : "shimmer";
  const instructions = typeof body.instructions === "string" ? body.instructions : DEFAULT_INSTRUCTIONS;

  const out = (await elevenlabs(text)) ?? (await openai(text, voice, instructions));
  if (out) return out;

  return new Response(JSON.stringify({ error: "no_tts_engine" }), {
    status: 503, headers: { "Content-Type": "application/json" },
  });
}

/** どの声が使えるかの確認（設定の切り分け用。鍵の値は返さない） */
export async function GET() {
  return new Response(JSON.stringify({
    elevenlabs: !!process.env.ELEVENLABS_API_KEY?.trim(),
    openai: !!process.env.OPENAI_API_KEY?.trim(),
    voiceId: process.env.ELEVENLABS_API_KEY?.trim() ? EL_VOICE : null,
    model: EL_MODEL,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
