/**
 * テキスト→音声。
 *
 * 使う順（上から、使えるものを使う）:
 *   1. VOICEVOX  … 既定。日本語ネイティブで、従量課金なし。**キーが無くても無料枠で鳴る**
 *   2. ElevenLabs … VOICEVOX が落ちたときの保険。文字数ぶんクレジットを食う
 *   3. OpenAI TTS … 次点
 *   4. どれも無ければ 503 → 画面側が焼き込み音声／同梱mp3／ブラウザ読み上げに退避
 *
 * 【お金の話】ElevenLabs は1文字ずつクレジットを消費するので、人が増えると枯れる。
 * だから主役を VOICEVOX に置いた。こちらは従量課金がないので、何人来ても枯れない。
 * 呼吸ガイドのような固定セリフは /api/tts/bake で1回だけ焼いてファイルにすること。
 *
 * 声について：
 *   ELEVENLABS_VOICE_ID を決めていなければ、そのアカウントで使える声を自動で拾う。
 *   （固定のIDを埋め込むと、そのアカウントに無い声だったときに必ず失敗するため）
 *
 * セリフはほぼ固定なので、画面側がブラウザのキャッシュに貯める。生成は初回だけ。
 */
import { auth } from "@/auth";

// 設定を変えたら即反映したいので、固めない
export const dynamic = "force-dynamic";

const DEFAULT_INSTRUCTIONS =
  "やわらかく、あたたかい、少し子どもっぽい落ち着いた声で。急がず、やさしく、包むように。呼吸に寄り添うテンポで。";

const EL_MODEL = process.env.ELEVENLABS_MODEL?.trim() || "eleven_multilingual_v2";
const elKey = () => process.env.ELEVENLABS_API_KEY?.trim() || "";

/* ─────────────── VOICEVOX（無料・日本語ネイティブ） */
// 自前サーバ（VOICEVOX ENGINE）か、公式のWeb版APIのどちらでも使える
const VV_URL = process.env.VOICEVOX_URL?.trim() || "";
const VV_KEY = process.env.VOICEVOX_API_KEY?.trim() || "";
// 12 = 白上虎太郎（ふつう）。アニメ寄りの、幼い男の子の声
const VV_SPEAKER = process.env.VOICEVOX_SPEAKER?.trim() || "12";

/**
 * エンジンの優先順。
 * 既定は VOICEVOX。理由は、従量課金がなく、キーも要らず、日本語ネイティブだから。
 * ElevenLabs を主役に戻したいときだけ TTS_ENGINE=elevenlabs にする。
 */
const PREFER = (process.env.TTS_ENGINE?.trim() || "voicevox").toLowerCase();

/** 声のクレジット表記（VOICEVOX の規約で必要）。画面はこれを出す */
const VOICE_CREDIT = "VOICEVOX:白上虎太郎";

/** 聴きくらべ用。清瀬リンク（少年）に合いそうな声だけを並べる */
const VV_SPEAKER_LIST = [
  ["12", "白上虎太郎（ふつう）", "アニメ寄りの、幼い男の子。いまの標準"],
  ["32", "白上虎太郎（わーい）", "同じ子の、うれしいとき"],
  ["33", "白上虎太郎（びくびく）", "同じ子の、こわがっているとき"],
  ["3",  "ずんだもん（ノーマル）", "中性的で高め。やわらかい"],
  ["1",  "四国めたん（ノーマル）", "少し年上の、澄んだ声"],
  ["11", "玄野武宏（ノーマル）", "落ち着いた青年。大人びた回に"],
] as const;
const VV_SPEAKERS = VV_SPEAKER_LIST.map(([id, name, note]) => ({ id, name, note }));

async function voicevox(text: string, speakerOverride?: string): Promise<{ res?: Response; error?: string }> {
  const spk = speakerOverride?.trim() || VV_SPEAKER;
  // ① 自前の VOICEVOX ENGINE（audio_query → synthesis の2段）
  if (VV_URL) {
    try {
      const base = VV_URL.replace(/\/$/, "");
      const q = await fetch(`${base}/audio_query?text=${encodeURIComponent(text)}&speaker=${spk}`, { method: "POST" });
      if (!q.ok) return { error: `VOICEVOX audio_query ${q.status}` };
      const query = await q.json();
      // 呼吸ガイドに合わせて、少しゆっくり・やわらかく
      query.speedScale = 0.92;
      query.pitchScale = 0.0;
      query.intonationScale = 1.05;
      const r = await fetch(`${base}/synthesis?speaker=${spk}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query),
      });
      if (!r.ok) return { error: `VOICEVOX synthesis ${r.status}` };
      return { res: audio(await r.arrayBuffer(), "voicevox", spk) };
    } catch (e: any) {
      return { error: `VOICEVOX 通信エラー: ${String(e?.message ?? e).slice(0, 120)}` };
    }
  }
  // ② 公式Web版API（キーだけで使える。1リクエストで完結）
  if (VV_KEY) {
    try {
      const u = `https://deprecatedapis.tts.quest/v2/voicevox/audio/?key=${encodeURIComponent(VV_KEY)}&speaker=${spk}&text=${encodeURIComponent(text)}`;
      const r = await fetch(u);
      if (!r.ok) return { error: `VOICEVOX Web ${r.status}` };
      const buf = await r.arrayBuffer();
      if (buf.byteLength < 500) return { error: "VOICEVOX Web: 音声が返らなかった（キーや残量を確認）" };
      return { res: audio(buf, "voicevox", spk) };
    } catch (e: any) {
      return { error: `VOICEVOX 通信エラー: ${String(e?.message ?? e).slice(0, 120)}` };
    }
  }
  // ③ キーなしの無料枠（tts.quest v3）。
  //    「作ってから取りに行く」2段構え。混んでいると数秒待たされるので、少しだけ粘る。
  //    ここがあるおかげで、環境変数を1つも設定しなくても声が鳴る。
  try {
    const u = `https://api.tts.quest/v3/voicevox/synthesis?speaker=${encodeURIComponent(spk)}&text=${encodeURIComponent(text)}`;
    const r = await fetch(u);
    if (!r.ok) return { error: `VOICEVOX 無料枠 ${r.status}（混雑のときは少し待つと戻る）` };
    const d: any = await r.json().catch(() => null);
    if (!d?.success || !d?.mp3DownloadUrl) {
      return { error: `VOICEVOX 無料枠: ${String(d?.errorMessage ?? "音声が作れなかった").slice(0, 120)}` };
    }
    for (let i = 0; i < 10; i++) {
      const s = await fetch(String(d.audioStatusUrl)).then((x) => x.json()).catch(() => null);
      if (s?.isAudioError) return { error: "VOICEVOX 無料枠: 生成に失敗した" };
      if (s?.isAudioReady) break;
      await new Promise((ok) => setTimeout(ok, 700));
    }
    const a = await fetch(String(d.mp3DownloadUrl));
    if (!a.ok) return { error: `VOICEVOX 無料枠 取得 ${a.status}` };
    const buf = await a.arrayBuffer();
    if (buf.byteLength < 500) return { error: "VOICEVOX 無料枠: 音声がまだ出来ていない" };
    return { res: audio(buf, "voicevox-free", spk) };
  } catch (e: any) {
    return { error: `VOICEVOX 通信エラー: ${String(e?.message ?? e).slice(0, 120)}` };
  }
}
// 無料枠があるので、設定が無くても VOICEVOX は常に使える
const vvReady = () => true;

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
  const speaker = typeof body.speaker === "string" ? body.speaker : undefined;

  const notes: string[] = [];

  // VOICEVOX を先に使う設定なら、まずそちら（無料・日本語ネイティブ）
  if (PREFER === "voicevox" && vvReady()) {
    const vv = await voicevox(text, speaker);
    if (vv.res) return vv.res;
    if (vv.error) notes.push(vv.error);
  }

  const el = await elevenlabs(text, voiceId);
  if (el.res) return el.res;
  if (el.error) notes.push(el.error);

  // ElevenLabs がだめでも VOICEVOX があれば鳴らす（クレジット切れの保険）
  if (PREFER !== "voicevox" && vvReady()) {
    const vv = await voicevox(text, speaker);
    if (vv.res) return vv.res;
    if (vv.error) notes.push(vv.error);
  }

  const oa = await openai(text, voice, instructions);
  if (oa) return oa;

  // 失敗の理由を隠さない（ここを黙らせると原因にたどり着けない）
  return new Response(JSON.stringify({ error: "no_tts_engine", detail: notes.join(" / ") }), {
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
    voicevox: true,
    voicevoxSpeaker: VV_SPEAKER,
    voicevoxMode: VV_URL ? "自前サーバ" : VV_KEY ? "キーあり" : "無料枠（キー不要）",
    voicevoxSpeakers: VV_SPEAKERS,
    voiceCredit: VOICE_CREDIT,
    prefer: PREFER,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
