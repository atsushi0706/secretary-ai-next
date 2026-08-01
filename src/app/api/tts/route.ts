/**
 * テキスト→音声。
 *
 * 使う順（上から、使えるものを使う）:
 *   1. ElevenLabs … いちばん自然。日本語もちゃんと喋る。ELEVENLABS_API_KEY があれば最優先
 *   2. OpenAI TTS  … 次点。OPENAI_API_KEY があれば
 *   3. どちらも無ければ 503 → 画面側が同梱mp3／ブラウザ読み上げに退避
 *
 * 声について：
 *   ELEVENLABS_VOICE_ID を決めていなければ、そのアカウントで使える声を自動で拾う。
 *   （固定のIDを埋め込むと、そのアカウントに無い声だったときに必ず失敗するため）
 *
 * セリフはほぼ固定なので、画面側がブラウザのキャッシュに貯める。生成は初回だけ。
 */
import { auth } from "@/auth";

const DEFAULT_INSTRUCTIONS =
  "やわらかく、あたたかい、少し子どもっぽい落ち着いた声で。急がず、やさしく、包むように。呼吸に寄り添うテンポで。";

const EL_MODEL = process.env.ELEVENLABS_MODEL?.trim() || "eleven_multilingual_v2";
const elKey = () => process.env.ELEVENLABS_API_KEY?.trim() || "";

export type ElVoice = {
  id: string; name: string; labels?: Record<string, string>;
  /** premade = 標準の声。無料プランでもAPIから使える。library/generated は有料プランが必要 */
  category?: string;
  free?: boolean;
};

let voiceCache: { at: number; list: ElVoice[] } | null = null;
let lastVoiceError = "";

/**
 * アカウントで使える声の一覧。
 * v2 が新しい入口。古い鍵や権限では v2 が使えないことがあるので v1 にも落とす。
 * 取れなかった理由は lastVoiceError に残して、画面で見えるようにする。
 */
async function listVoices(): Promise<ElVoice[]> {
  const key = elKey();
  if (!key) { lastVoiceError = "ELEVENLABS_API_KEY が未設定"; return []; }
  if (voiceCache && Date.now() - voiceCache.at < 120_000) return voiceCache.list;

  const tries = [
    "https://api.elevenlabs.io/v2/voices?page_size=100",
    "https://api.elevenlabs.io/v1/voices",
  ];
  const notes: string[] = [];
  for (const url of tries) {
    try {
      const r = await fetch(url, { headers: { "xi-api-key": key } });
      if (!r.ok) {
        const body = (await r.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
        notes.push(`${url.includes("/v2/") ? "v2" : "v1"}: ${r.status} ${body}`);
        continue;
      }
      const d = await r.json();
      const list: ElVoice[] = (d?.voices ?? []).map((v: any) => {
        const category = String(v.category ?? "");
        return {
          id: String(v.voice_id), name: String(v.name ?? ""), labels: v.labels ?? {},
          category,
          // 無料プランでAPIから鳴らせるのは標準の声だけ（Voice Library の声は有料）
          free: category === "premade" || category === "default",
        };
      });
      if (list.length === 0) { notes.push(`${url.includes("/v2/") ? "v2" : "v1"}: 0件`); continue; }
      lastVoiceError = "";
      voiceCache = { at: Date.now(), list };
      return list;
    } catch (e: any) {
      notes.push(`${url.includes("/v2/") ? "v2" : "v1"}: ${String(e?.message ?? e).slice(0, 120)}`);
    }
  }
  lastVoiceError = notes.join(" / ");
  return [];
}

/** 無料プランでも鳴らせる標準の声を1つ選ぶ（402 のときの逃げ道） */
async function pickFreeVoice(): Promise<string | null> {
  const list = await listVoices();
  const free = list.filter((v) => v.free);
  if (free.length === 0) return null;
  // 落ち着いた女性寄りの声を優先（呼吸ガイドに合う）
  const pref = free.find((v) => /rachel|bella|elli|charlotte|alice|lily|sarah/i.test(v.name));
  return (pref ?? free[0]).id;
}

/** 使う声を決める。指定があればそれ、無ければ「無料で使える声」を優先して選ぶ */
async function pickVoice(override?: string): Promise<string | null> {
  const fixed = override?.trim() || process.env.ELEVENLABS_VOICE_ID?.trim();
  if (fixed) return fixed;
  const list = await listVoices();
  if (list.length === 0) return null;
  const free = list.filter((v) => v.free);
  const pool = free.length > 0 ? free : list;
  const ja = pool.find((v) => /japan/i.test(JSON.stringify(v.labels ?? {})));
  return (ja ?? pool[0]).id;
}

function audio(buf: ArrayBuffer, engine: string, voiceId: string) {
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-TTS-Engine": engine,
      "X-TTS-Voice": voiceId,
    },
  });
}

async function elevenlabs(text: string, override?: string, retried = false): Promise<{ res?: Response; error?: string }> {
  const key = elKey();
  if (!key) return { error: "ELEVENLABS_API_KEY が未設定" };
  const voiceId = await pickVoice(override);
  if (!voiceId) return { error: "使える声が見つかりません（アカウントに声が1つもない可能性）" };
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
      const body = (await r.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 240);
      // 無料プランは Voice Library の声をAPIから使えない。標準の声で鳴らし直す
      if (r.status === 402 && /paid_plan_required|library voices/i.test(body) && !retried) {
        const freeId = await pickFreeVoice();
        if (freeId && freeId !== voiceId) return elevenlabs(text, freeId, true);
        return { error: "無料プランでは Voice Library の声を使えません。標準の声（Default Voices）を選んでね。" };
      }
      return { error: `ElevenLabs ${r.status}（声ID: ${voiceId}）${body}` };
    }
    return { res: audio(await r.arrayBuffer(), "elevenlabs", voiceId) };
  } catch (e: any) {
    return { error: `ElevenLabs 通信エラー: ${String(e?.message ?? e).slice(0, 160)}` };
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
    return audio(await r.arrayBuffer(), "openai", voice);
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
  // 画面から「この声で試す」ができるように、1回きりの指定を受け付ける
  const voiceId = typeof body.voiceId === "string" ? body.voiceId : undefined;

  const el = await elevenlabs(text, voiceId);
  if (el.res) return el.res;

  const oa = await openai(text, voice, instructions);
  if (oa) return oa;

  // 失敗の理由を隠さない（ここを黙らせると原因にたどり着けない）
  return new Response(JSON.stringify({ error: "no_tts_engine", detail: el.error ?? "" }), {
    status: 503, headers: { "Content-Type": "application/json" },
  });
}

/** 使えるエンジンと、アカウントの声の一覧（選ぶ画面用） */
export async function GET() {
  const voices = await listVoices();
  return new Response(JSON.stringify({
    elevenlabs: !!elKey(),
    openai: !!process.env.OPENAI_API_KEY?.trim(),
    voiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || null,
    model: EL_MODEL,
    voices,
    voicesError: lastVoiceError || null,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
