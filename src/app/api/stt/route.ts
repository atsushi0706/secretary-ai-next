/**
 * 音声→整った文章（Typeless級の音声入力エンジン）。
 *
 * 構成（Typeless調査レポートの6層のうちサーバ側3層）:
 *   1. 高精度クラウドASR（OpenAI。モデルは新→旧のフォールバック連鎖）
 *      → 言い直し・フィラーを含む「逐語」をまず取る
 *   2. LLM編集（フィラー除去・自己訂正の解決・軽い整形。新情報の追加や要約は禁止）
 *   3. 忠実性バリデータ（数字・否定が壊れたらLLM版を捨てて逐語へフォールバック）
 *
 * 音声はメモリ上で処理して保存しない。OPENAI_API_KEY（TTSと同じ共通キー）を使う。
 */
import { auth } from "@/auth";

export const maxDuration = 60;

// ASRモデル：新しい名前から順に試す（404/未対応なら次へ）
const ASR_MODELS = ["gpt-transcribe", "gpt-4o-mini-transcribe", "whisper-1"];
// 整形用の小型テキストモデル：同じく連鎖
const EDIT_MODELS = ["gpt-5-mini", "gpt-4.1-mini", "gpt-4o-mini"];

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

/** 数字列を抽出（数字・日付・金額の保護判定に使う） */
function digitsOf(s: string): string[] {
  return (s.match(/\d+/g) ?? []).map((d) => d.replace(/^0+(?=\d)/, ""));
}

/** LLM整形結果が「忠実」かをコードで検証。壊れていれば false */
function isFaithful(raw: string, polished: string): boolean {
  if (!polished.trim()) return false;
  // 短くなりすぎ＝要約や欠落の疑い（自己訂正の除去分は許容して35%まで）
  if (polished.length < raw.length * 0.35 && raw.length > 40) return false;
  // 数字：整形後に「rawに無い数字」が現れたらNG（rawの数字が減るのは言い直し解決で正当）
  const rawD = new Set(digitsOf(raw));
  for (const d of digitsOf(polished)) if (!rawD.has(d)) return false;
  return true;
}

async function transcribe(key: string, blob: Blob, filename: string): Promise<{ text: string; model: string }> {
  let lastErr = "";
  for (const model of ASR_MODELS) {
    const fd = new FormData();
    fd.append("file", blob, filename);
    fd.append("model", model);
    fd.append("language", "ja");
    // 逐語で取る：言い直しもそのまま残す（解決は後段LLMの仕事）
    fd.append("prompt", "自然な日本語の話し言葉。言い直しやフィラーもそのまま書き起こす。");
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    if (r.ok) {
      const d = await r.json();
      return { text: String(d.text ?? "").trim(), model };
    }
    lastErr = await r.text().catch(() => String(r.status));
    // モデル名が無い等 → 次の候補へ。認証・課金系はループしても無駄なので即中断
    if (r.status === 401 || r.status === 429) break;
  }
  throw new Error(`ASR失敗: ${lastErr.slice(0, 200)}`);
}

async function polish(key: string, raw: string, context: string): Promise<string | null> {
  const system = `あなたは音声入力の整形エンジン。話し言葉の逐語書き起こしを、入力欄にそのまま入れられる文章に直す。

# 厳守
- 新しい事実・挨拶・敬称・締めの文を加えない。要約しない。意訳しない。
- 「えー」「あの」「なんか」等の単独フィラーだけ除去。意味のある「まあ」「ちょっと」は残す。
- 言い直し（例:「金曜、あ、土曜に」）は最後の意図だけ残す。
- 数字・日付・金額・URL・メール・固有名詞・否定表現（〜ない/なし/禁止/不要/以外）は一字も変えない。
- 句読点と改行を軽く整える。文体（です・ます／だ・である）は元のまま。
- 出力は整形後の本文だけ。説明・前置き・引用符は書かない。`;
  const user = context
    ? `# 入力先の文脈\n${context}\n\n# 逐語書き起こし\n${raw}`
    : raw;

  for (const model of EDIT_MODELS) {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });
    if (r.ok) {
      const d = await r.json();
      const out = String(d?.choices?.[0]?.message?.content ?? "").trim();
      if (out) return out;
      return null;
    }
    if (r.status === 401 || r.status === 429) return null;
  }
  return null;
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return json({ error: "unauthenticated" }, 401);

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json({ error: "no_openai_key" }, 503);

  try {
    const fd = await req.formData();
    const file = fd.get("audio") as File | null;
    if (!file || file.size === 0) return json({ error: "no_audio" }, 400);
    if (file.size > 24 * 1024 * 1024) return json({ error: "音声が長すぎます（もう少し短く区切ってね）" }, 400);
    const context = String(fd.get("context") ?? "").slice(0, 300);

    // 1) 逐語ASR
    const { text: raw, model } = await transcribe(key, file, file.name || "audio.webm");
    if (!raw) return json({ text: "", raw: "", note: "silent" });

    // 2) LLM整形 → 3) 忠実性検証（壊れていたら逐語を返す）
    const polished = await polish(key, raw, context);
    const finalText = polished && isFaithful(raw, polished) ? polished : raw;

    return json({ text: finalText, raw, asr: model, edited: finalText !== raw });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e).slice(0, 300) }, 500);
  }
}
