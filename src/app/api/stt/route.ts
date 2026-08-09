/**
 * 音声→整った文章（Typeless級の音声入力エンジン）。
 *
 * 工程を2つに分けている（ここが事故防止の要）:
 *   ① 聞く（音声→逐語）   … Gemini。音声を扱えるのがこちらだけのため
 *   ② 整える（逐語→本文） … Claude(Haiku)。src/lib/polish.ts
 * 以前は①②を1回のJSONでGeminiにやらせていたが、指示が複雑なぶん、
 * 聞き取れなかったモデルが「指示文そのもの」を返し、入力欄に貼りつく事故が起きた。
 *
 * 費用設計（BYO-key）:
 *   - 聞く工程はユーザー自身の Gemini キー（無料枠内）
 *   - 整える工程は Haiku。キーが無ければ通常のエンジンに自動で戻る
 *   - OPENAI_API_KEY があれば、Gemini失敗時だけ高精度ASRに退避（任意）
 *
 * 品質設計:
 *   - 逐語（言い直し・フィラー込み）をまず取り、整形で最終意図だけ残す
 *   - 数字・盛り・箇条書き化・指示文エコーを検査し、落ちたら逐語へ戻す
 *   - 小声対応はクライアント側（全区間録音＋AGC＋NSオフ）で行う
 *   - 音声は保存しない（メモリ上で処理して破棄）
 */
import { auth } from "@/auth";
import { getUserSettings } from "@/lib/supabase";
import { polishSpeech, looksLikePromptEcho } from "@/lib/polish";

export const maxDuration = 60;

// 音声を理解できる Gemini モデル（新→安定の順で試す。ai.ts の連鎖と同方針）
// モデル順は「無料枠で実際に通るか」を最優先に決める（2026-07 調査）。
//  ・3.5-flash は無料枠がほぼ枯れており(20 RPD報告)、1回目から429になる報告が多数 → 先頭に置かない
//  ・*-flash-lite は高スループット向けで無料枠が緩く、3.1-lite は稼働報告が多い
//  ・2.5-flash も無料枠で動き続けている実績あり（最後の保険）
// 参考: https://discuss.ai.google.dev/t/gemini-3-5-flash-and-flash-latest-free-tier-api-failing-immediately-with-quota-resource-exhausted-errors-on-first-request/171753
const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",   // 軽量・高スループット
  "gemini-3.1-flash-lite",   // 無料枠で通る報告が多い
  "gemini-2.5-flash",        // 無料枠で安定して動く実績
  "gemini-3.5-flash",        // 枠が枯れがちなので最後に回す
];
// 予備の OpenAI ASR（キーがある場合のみ）
const OPENAI_ASR = ["gpt-transcribe", "gpt-4o-mini-transcribe", "whisper-1"];

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

// Gemini にやってもらうのは「聞こえたまま書き起こす」ことだけ。
// 以前は整形まで1回のJSONでやらせていたが、指示が複雑なぶん、
// 聞き取れなかったモデルが指示文をそのまま返してくる事故が起きた。
// 工程を分け、整えるのは Claude(Haiku) に任せる（src/lib/polish.ts）。
const INSTRUCTION = `この音声を、聞こえたまま日本語で書き起こして。
- ささやき声や小さな声のこともある。拾えるだけ拾う。
- 言い直しや「えー」などもそのまま書く。
- 書き起こした文だけを返す。前置き・説明・記号は付けない。`;

async function sttGemini(
  key: string, b64: string, mime: string,
  log: string[] = [],   // 失敗理由を持ち帰る（リクエストごと。ユーザー間で共有しない）
): Promise<string | null> {
  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: INSTRUCTION }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 3000, thinkingConfig: { thinkingBudget: 0 } },
        }),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        const msg = (body.match(/"message"\s*:\s*"([^"]{0,160})"/)?.[1] ?? body.slice(0, 120)).trim();
        log.push(`${model}: ${r.status} ${msg}`);
        // 429 は「1分あたり(RPM)」と「1日あたり(RPD)」の2種類。どちらも即諦めず次のモデルへ回す
        // （カウンタはモデルごとに別なので、替えれば通ることが多い）
        continue;
      }
      const d = await r.json();
      const text = String(d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "").trim();
      const fin = d?.candidates?.[0]?.finishReason;
      if (!text) { log.push(`${model}: 応答が空(${fin ?? "empty"})`); continue; }
      // 聞き取れなかったモデルが指示文をオウム返しすることがある。入力欄に入れる前に必ず弾く
      if (looksLikePromptEcho(text)) {
        log.push(`${model}: 指示文をそのまま返した（聞き取れていない）`);
        continue;
      }
      return text;
    } catch (e: any) {
      log.push(`${model}: ${String(e?.message ?? e).slice(0, 100)}`);
    }
  }
  return null;
}

async function sttOpenAI(key: string, blob: Blob, filename: string): Promise<string | null> {
  for (const model of OPENAI_ASR) {
    const fd = new FormData();
    fd.append("file", blob, filename);
    fd.append("model", model);
    fd.append("language", "ja");
    fd.append("prompt", "自然な日本語の話し言葉。小さな声やささやきも書き起こす。");
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd,
    });
    if (r.ok) { const d = await r.json(); return String(d.text ?? "").trim() || null; }
    if (r.status === 401 || r.status === 429) return null;
  }
  return null;
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return json({ error: "unauthenticated" }, 401);

  try {
    const fd = await req.formData();
    const file = fd.get("audio") as File | null;
    if (!file || file.size === 0) return json({ error: "no_audio" }, 400);
    if (file.size > 15 * 1024 * 1024) return json({ error: "音声が長すぎます（もう少し短く区切ってね）" }, 400);

    const s: any = await getUserSettings(userId).catch(() => null);
    const geminiKey = s?.gemini_api_key && String(s.gemini_api_key).trim() ? String(s.gemini_api_key).trim() : null;
    const openaiKey = process.env.OPENAI_API_KEY || null;
    // 最後の砦：運営（淳くん）のキー。ユーザーのキーが枯れても音声入力を止めない
    const ownerKey = process.env.GEMINI_API_KEY || null;
    if (!geminiKey && !openaiKey && !ownerKey) {
      return json({ error: "AIキーが未設定です。設定画面で Gemini API キーを登録してね。" }, 503);
    }

    const buf = Buffer.from(await file.arrayBuffer());
    // Gemini は "audio/webm;codecs=opus" のようなパラメータ付きMIMEを受け付けないので、素の型に正規化する
    const rawMime = file.type || (file.name?.endsWith(".m4a") ? "audio/mp4" : "audio/webm");
    let mime = rawMime.split(";")[0].trim().toLowerCase();
    if (mime === "audio/x-m4a" || mime === "audio/m4a") mime = "audio/mp4";
    if (mime === "video/webm") mime = "audio/webm";
    if (!/^audio\//.test(mime)) mime = "audio/webm";

    const log: string[] = [];
    // 【標準】ユーザーのGeminiキーで「聞く」。整えるのは後段の Haiku
    if (geminiKey) {
      const b64 = buf.toString("base64");
      let g = await sttGemini(geminiKey, b64, mime, log);
      // 全モデルが 1分あたりの上限(RPM)で弾かれた場合だけ、少し待って一度だけ再挑戦する。
      // RPM は短時間で回復するので、これで「連発したときのエラー」がほぼ消える。
      const isDailyLimit = /per day|daily limit|RPD|GenerateRequestsPerDay/i.test(log.join(" "));
      if (!g && !isDailyLimit && log.length > 0 && log.every((l) => /429/.test(l))) {
        log.push("→ 1分あたりの上限。8秒待って再挑戦");
        await new Promise((r) => setTimeout(r, 8000));
        g = await sttGemini(geminiKey, b64, mime, log);
      }
      if (g) {
        const { text, edited } = await polishSpeech(userId, g);   // 整えるのは Haiku
        return json({ text, raw: g, engine: "gemini", edited });
      }
    }
    // 【予備】OpenAI ASR（キーがある場合のみ。整形なしの逐語でも返す価値はある）
    if (openaiKey) {
      const raw = await sttOpenAI(openaiKey, file, file.name || "speech.webm");
      if (raw) {
        const { text, edited } = await polishSpeech(userId, raw);
        return json({ text, raw, engine: "openai", edited });
      }
      log.push("openai: 失敗");
    }

    // 【最後の砦】運営のキーで通す。ここまで来たらユーザーを止めない方を優先する
    if (ownerKey && ownerKey !== geminiKey) {
      const g = await sttGemini(ownerKey, buf.toString("base64"), mime, log);
      if (g) {
        const { text, edited } = await polishSpeech(userId, g);
        return json({ text, raw: g, engine: "gemini-owner", edited });
      }
    }

    // 何が起きたかを、ユーザーに分かる言葉で返す
    const all = log.join(" / ");
    let msg = "文字化に失敗しました。少し待ってもう一度試してね。";
    if (/指示文をそのまま返した/.test(all)) {
      msg = "うまく聞き取れなかった。もう少しはっきり、短めに話してみて。";
    } else if (/per day|daily limit|RPD|GenerateRequestsPerDay/i.test(all)) {
      msg = "今日のAI利用回数を使い切ったみたい。日付が変わるとまた使えるよ。";
    } else if (/429|quota|rate/i.test(all)) {
      msg = "少し使いすぎて、AIが一息ついてる。30秒ほど待ってからもう一度話しかけてね。";
    }
    else if (/API key not valid|401|403|PERMISSION/i.test(all)) msg = "Gemini APIキーが無効かも。設定画面で入れ直してみて。";
    else if (/not found|不明|404|not supported|INVALID_ARGUMENT|400/i.test(all)) msg = "この音声形式に対応できなかった。もう一度短く話してみて。";
    return json({ error: msg, detail: all.slice(0, 300) }, 502);
  } catch (e: any) {
    return json({ error: String(e?.message ?? e).slice(0, 300) }, 500);
  }
}

/**
 * 書き起こしの準備ができているかだけを見る（音声は送らない）。
 *
 * 【なぜ要るか】
 * お客様から届いた「マイクの調子」に、マイクは全部○なのに
 * 「文字におこすところで失敗する」と書かれていた。
 * ところがその紙には、書き起こしが動くのかどうかがどこにも出ていない。
 * キーが無いのか、キーが枯れているのか、そもそも録れていないのかが分からなかった。
 * だからここで、**音声を送る前に**準備の状態だけ返す。
 * キーそのものは返さない（あるかどうかだけ）。
 */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return json({ error: "unauthenticated" }, 401);

  const s: any = await getUserSettings(userId).catch(() => null);
  const mine = !!(s?.gemini_api_key && String(s.gemini_api_key).trim());
  const owner = !!process.env.GEMINI_API_KEY;
  const openai = !!process.env.OPENAI_API_KEY;

  return json({
    ready: mine || owner || openai,
    // どれで動くのか（お客様に説明できるように、日本語で返す）
    source: mine ? "自分のGeminiキー" : owner ? "こちらで用意したキー" : openai ? "予備のしくみ" : "なし",
    mine, owner, openai,
  });
}
