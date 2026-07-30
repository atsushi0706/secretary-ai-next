/**
 * AI クライアント抽象化レイヤー
 *
 * ロジック:
 *  - ユーザーが gemini_api_key を設定済み → Gemini (無料枠) を使う
 *  - 未設定 → 環境変数の ANTHROPIC_API_KEY で Claude を使う(運営持ち / 管理者用)
 *  - どちらもなければ throw
 *
 * 公開関数:
 *  - streamChat: 会話チャット (SSE 互換のジェネレータ)
 *  - complete: 1回完結のテキスト生成 (JSON抽出用)
 *  - vision: 画像 + プロンプト → テキスト
 *  - hasWebSearch: web 検索ツールが使えるか (Claude のみ true)
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserSettings } from "./supabase";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
// Gemini モデルの優先順位。前から順に試して、503/overloaded/404 なら次へフォールバック。
// 2026-07 調査：1.5系と2.0系は提供終了（shut down）済み。2.5系はまだ稼働中。
// 並び順は「賢さ」ではなく「無料枠で実際に通るか」で決める：
//  - gemini-3.6-flash:  最新の安定版。まずここ
//  - *-flash-lite:      高スループット向けで枠が緩い。実際に通る報告が多い
//  - gemini-2.5-flash:  無料枠で動き続けている実績あり
//  - gemini-3.5-flash:  最も賢いが無料枠がほぼ枯れており(20 RPD報告)1回目から429になるため最後に回す
//
// 環境変数 GEMINI_MODEL を指定するとそれが先頭になる。
const GEMINI_FALLBACK_CHAIN: string[] = (() => {
  const userPick = process.env.GEMINI_MODEL?.trim();
  const defaults = [
    "gemini-3.6-flash",        // 最新の安定版
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.5-flash",        // 無料枠が枯れがち(20 RPD報告)なので最後に回す
  ];
  if (userPick) return [userPick, ...defaults.filter((m) => m !== userPick)];
  return defaults;
})();

export type AIEngine = "gemini" | "claude";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "tool_start"; name: string };

/**
 * Gemini/Claude の「一時的に応答できない」状態を表す型付き例外。
 *  - kind="rate_limit": 429 / quota枯渇 (1分 or 1日の上限)
 *  - kind="overloaded": 503 Service Unavailable (Google/Anthropic 側の混雑)
 * 上位ルート (chat/greet) で instanceof チェックして、秘書っぽい返答に置き換える。
 */
export class AIRateLimitError extends Error {
  retryAfterSec: number;
  engine: AIEngine;
  kind: "rate_limit" | "overloaded";
  constructor(
    engine: AIEngine,
    retryAfterSec: number,
    kind: "rate_limit" | "overloaded" = "rate_limit",
    original?: unknown,
  ) {
    const orig = original instanceof Error ? original.message : String(original ?? "");
    super(`AI ${kind} (${engine}, retry in ${retryAfterSec}s): ${orig}`);
    this.name = "AIRateLimitError";
    this.engine = engine;
    this.retryAfterSec = retryAfterSec;
    this.kind = kind;
  }
}

/**
 * AIRateLimitError を秘書AI口調 + 技術的注釈 に変換するヘルパー。
 * チャット画面に流す delta テキストを返す。
 */
export function formatRateLimitForUser(
  err: AIRateLimitError,
  secretaryName: string = "清瀬リンク",
): string {
  const sec = err.retryAfterSec;
  const wait =
    sec >= 3600 ? `約${Math.ceil(sec / 3600)}時間`
    : sec >= 60  ? `約${Math.ceil(sec / 60)}分`
    :              `${sec}秒`;
  const engineLabel = err.engine === "gemini" ? "Gemini" : "Claude";

  if (err.kind === "overloaded") {
    return [
      `ごめんね、AIサービスが今ちょっと混雑してるみたい…${wait}くらい待ってから、もう一回話しかけてくれる？🙏`,
      ``,
      `――― ⚙ 内部の状況（${secretaryName}の頭の中）―――`,
      `${engineLabel} のサービスが一時的に過負荷状態です（HTTP 503）。`,
      `・原因: Google/Anthropic 側のサーバー混雑。あなたの API キーは正常です。`,
      `・推定待機時間: ${wait}`,
      `・対処: 1〜2分待ってからもう一度話しかけてください。新モデル登場直後に出やすい一時現象です。`,
      `―――――――――――――――――`,
    ].join("\n");
  }

  // 24秒前後の短い待ち時間 → 1分あたりの上限(RPM) を踏んだ可能性が高い
  // 数時間以上の長い待ち時間 → 1日あたりの上限(RPD) を踏んだ可能性が高い
  const likelyCause = sec <= 70
    ? "1分あたりの上限を一時的に踏みました。立て続けに連発した直後によく出ます。"
    : "1日あたりの上限を踏んだ可能性があります（無料枠の回数はモデルごとに異なり、AI Studio の Rate limits で確認できます）。翌日リセットされます。";

  return [
    `ごめんね、ちょっと立て込んでて頭がパンクしそう…${wait}くらい休ませてもらえるかな🙏`,
    ``,
    `――― ⚙ 内部の状況（${secretaryName}の頭の中）―――`,
    `${engineLabel} API の利用上限に到達したため、AI が一時的に応答できません。`,
    `・推定待機時間: ${wait}（${sec}秒）`,
    `・原因: ${likelyCause}`,
    err.engine === "gemini"
      ? `・対処: ${wait}後に自動回復します。本来は別モデルへ自動切替で回避できるはずですが、すべてのモデルで上限に達したケースです。`
      : `・対処: ${wait}後に自動回復します。発生頻度が高い場合は管理者にご連絡ください。`,
    `―――――――――――――――――`,
  ].join("\n");
}

function detectRateLimit(engine: AIEngine, err: unknown): AIRateLimitError | null {
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as any)?.status ?? (err as any)?.response?.status;

  // 503 / Service Unavailable / overloaded / high demand → Google/Anthropic 側の混雑
  const looksOverloaded =
    status === 503 ||
    /503|Service Unavailable|overloaded|high demand|temporarily.{0,20}unavail/i.test(msg);
  if (looksOverloaded) {
    // 503 は具体的な retry-after を返さないことが多いので 90秒デフォルト (1〜2分目安)
    const m = msg.match(/retry.{0,15}after\s*[:=]?\s*([\d.]+)/i);
    const sec = m ? Math.max(1, Math.ceil(parseFloat(m[1]))) : 90;
    return new AIRateLimitError(engine, sec, "overloaded", err);
  }

  // 429 / Too Many Requests / quota → ユーザーの上限到達
  const looksRateLimit =
    status === 429 ||
    /429|Too Many Requests|quota|rate.?limit/i.test(msg);
  if (!looksRateLimit) return null;
  // "retry in 22.5s" を拾う。なければ 30 秒デフォルト
  const m = msg.match(/retry in\s+([\d.]+)\s*s/i)
    ?? msg.match(/retry.{0,15}after\s*[:=]?\s*([\d.]+)/i);
  const sec = m ? Math.max(1, Math.ceil(parseFloat(m[1]))) : 30;
  return new AIRateLimitError(engine, sec, "rate_limit", err);
}

async function pickEngine(userId: string): Promise<{
  engine: AIEngine;
  geminiKey?: string;
}> {
  const s: any = await getUserSettings(userId);
  if (s?.gemini_api_key && String(s.gemini_api_key).trim()) {
    return { engine: "gemini", geminiKey: s.gemini_api_key };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "AIキーが未設定です。設定画面で Gemini API キーを登録してください。",
    );
  }
  return { engine: "claude" };
}

export async function hasWebSearch(userId: string): Promise<boolean> {
  const { engine } = await pickEngine(userId);
  return engine === "claude";
}

// ────────────────────────────────────────────────────────────
// streamChat: SSE 互換のストリーミング会話
// ────────────────────────────────────────────────────────────
export async function* streamChat(opts: {
  userId: string;
  system: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  enableWebSearch?: boolean;
}): AsyncGenerator<StreamEvent, void, unknown> {
  const { engine, geminiKey } = await pickEngine(opts.userId);

  if (engine === "gemini") {
    // Gemini を試して、全モデル失敗 (チャンク前で死亡) なら Claude にフォールバック
    let hasYieldedFromGemini = false;
    try {
      for await (const ev of streamGemini(geminiKey!, opts)) {
        hasYieldedFromGemini = true;
        yield ev;
      }
      return;
    } catch (e) {
      if (hasYieldedFromGemini) {
        // 途中まで Gemini が返してた場合、フォールバックは混乱を生むので throw
        throw e;
      }
      // Anthropic キーがあれば Claude にフォールバック
      if (process.env.ANTHROPIC_API_KEY) {
        console.warn("[ai] Gemini fully failed, falling back to Claude:", e instanceof Error ? e.message : e);
        yield* streamClaude({ ...opts, enableWebSearch: false }); // フォールバック時は web search 切る (淳くん財布節約)
        return;
      }
      throw e;
    }
  } else {
    yield* streamClaude(opts);
  }
}

/**
 * フォールバックして次モデルを試すべき一時障害かを判定。
 *  - 503 (overloaded)
 *  - 404 (モデル名が不正/廃止 — 万一未来に廃止されてもチェーンが死なないため)
 *  - 500 (Internal Server Error — Google側の一時障害)
 *  - 429 (rate limit) — Gemini は各モデルが独自カウンタなので、3.5 で詰まっても 3.1 Lite はOK
 *  - FirstChunkTimeoutError - 初回チャンクが来ないモデルもタイムアウトでフォールバック
 */
function shouldFallback(err: unknown): boolean {
  if (err instanceof FirstChunkTimeoutError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as any)?.status ?? (err as any)?.response?.status;
  if (status === 503 || status === 404 || status === 500 || status === 429) return true;
  return /\b(503|404|500|429)\b|Service Unavailable|overloaded|high demand|not found|Internal.{0,10}Server.{0,10}Error|Too Many Requests|quota|rate.?limit|timeout/i.test(msg);
}

function isOverloadedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as any)?.status ?? (err as any)?.response?.status;
  return status === 503 || /503|Service Unavailable|overloaded|high demand/i.test(msg);
}

/** タイムアウト印 (フォールバック判定で「次のモデルへ」と扱うため shouldFallback を pass する) */
const FIRST_CHUNK_TIMEOUT_MS = 12_000; // 各モデルで初回チャンクを待つ最大時間
class FirstChunkTimeoutError extends Error {
  constructor(modelName: string) {
    super(`First chunk timeout for ${modelName} (${FIRST_CHUNK_TIMEOUT_MS}ms)`);
    this.name = "FirstChunkTimeoutError";
  }
}

/**
 * 単一の Gemini モデル名でストリーミング呼び出し。例外をそのまま伝搬する。
 * 「初回チャンクが timeoutMs 以内に来ない」場合は FirstChunkTimeoutError を throw。
 */
async function* streamGeminiOne(
  apiKey: string,
  modelName: string,
  opts: {
    system: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  },
): AsyncGenerator<StreamEvent, void, unknown> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: opts.system,
    generationConfig: {
      temperature: opts.temperature ?? 0.6,
      maxOutputTokens: opts.maxTokens ?? 2048,
    },
  });
  // Gemini: user/model の交互前提。先頭は user 必須。
  const contents = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  if (contents.length === 0 || contents[0].role !== "user") {
    contents.unshift({ role: "user", parts: [{ text: "（秘書業務を開始）" }] });
  }
  // generateContentStream を呼ぶ前段階のタイムアウト
  const result = await Promise.race([
    model.generateContentStream({ contents }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new FirstChunkTimeoutError(modelName)), FIRST_CHUNK_TIMEOUT_MS),
    ),
  ]);

  // 初回チャンクが来るまでにもタイムアウトをかける
  let receivedFirstChunk = false;
  let firstChunkTimer: any = null;
  const firstChunkPromise = new Promise<never>((_, reject) => {
    firstChunkTimer = setTimeout(() => {
      if (!receivedFirstChunk) reject(new FirstChunkTimeoutError(modelName));
    }, FIRST_CHUNK_TIMEOUT_MS);
  });
  try {
    const iter = result.stream[Symbol.asyncIterator]();
    while (true) {
      const nextPromise = iter.next();
      const step = receivedFirstChunk
        ? await nextPromise
        : await Promise.race([nextPromise, firstChunkPromise]);
      if (step.done) break;
      const text = step.value.text();
      if (text) {
        receivedFirstChunk = true;
        if (firstChunkTimer) { clearTimeout(firstChunkTimer); firstChunkTimer = null; }
        yield { type: "delta", text };
      }
    }
  } finally {
    if (firstChunkTimer) clearTimeout(firstChunkTimer);
  }
}

/**
 * Gemini フォールバックチェーン: 各モデルを順番に試す。
 * 「チャンクを yield していない時点」での 503 のみ次へフォールバック。
 * 一度でも yield したら、その時点で異常が出ても fallback はしない (応答が混ざるため)。
 */
async function* streamGemini(
  apiKey: string,
  opts: {
    system: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  },
): AsyncGenerator<StreamEvent, void, unknown> {
  let lastErr: unknown = null;
  for (let i = 0; i < GEMINI_FALLBACK_CHAIN.length; i++) {
    const modelName = GEMINI_FALLBACK_CHAIN[i];
    let hasYielded = false;
    try {
      for await (const ev of streamGeminiOne(apiKey, modelName, opts)) {
        hasYielded = true;
        yield ev;
      }
      return; // 成功
    } catch (e) {
      lastErr = e;
      if (hasYielded) {
        // 途中まで返した状態でこけたらフォールバックしない
        const rl = detectRateLimit("gemini", e);
        if (rl) throw rl;
        throw e;
      }
      // チャンク前にこけた場合、503/overloaded なら次のモデルへ
      if (shouldFallback(e) && i < GEMINI_FALLBACK_CHAIN.length - 1) {
        console.warn(`[Gemini] ${modelName} unavailable (${(e as any)?.status ?? "?"}), trying ${GEMINI_FALLBACK_CHAIN[i + 1]}`);
        continue;
      }
      // それ以外はそのまま投げる
      const rl = detectRateLimit("gemini", e);
      if (rl) throw rl;
      throw e;
    }
  }
  // 全モデル枯死
  const rl = detectRateLimit("gemini", lastErr);
  if (rl) throw rl;
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function* streamClaude(opts: {
  system: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  enableWebSearch?: boolean;
}): AsyncGenerator<StreamEvent, void, unknown> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const tools: any[] = [];
  if (opts.enableWebSearch !== false) {
    tools.push({ type: "web_search_20250305", name: "web_search", max_uses: 3 });
  }
  try {
    const stream = client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.6,
      system: opts.system,
      messages: opts.messages,
      tools: tools.length > 0 ? tools : undefined,
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        const d: any = event.delta;
        if (d.type === "text_delta" && d.text) {
          yield { type: "delta", text: d.text };
        }
      } else if (event.type === "content_block_start") {
        const cb: any = event.content_block;
        if (cb?.type === "server_tool_use" && cb?.name === "web_search") {
          yield { type: "tool_start", name: "web_search" };
        }
      }
    }
  } catch (e) {
    const rl = detectRateLimit("claude", e);
    if (rl) throw rl;
    throw e;
  }
}

// ────────────────────────────────────────────────────────────
// complete: 1ターンのテキスト生成 (JSON抽出など)
// ────────────────────────────────────────────────────────────
async function completeGeminiOne(
  apiKey: string,
  modelName: string,
  opts: { system?: string; prompt: string; maxTokens?: number; temperature?: number },
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: opts.system,
    // thinking を無効化（思考トークンが maxOutputTokens を食い、本文が途中で切れるのを防ぐ）。
    // 未対応モデルでは無視される。単発の補完はどれも thinking 不要。
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.maxTokens ?? 2048,
      thinkingConfig: { thinkingBudget: 0 },
    } as any,
  });
  const r = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
  });
  return r.response.text();
}

export async function complete(opts: {
  userId: string;
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const { engine, geminiKey } = await pickEngine(opts.userId);

  if (engine === "gemini") {
    let lastErr: unknown = null;
    for (let i = 0; i < GEMINI_FALLBACK_CHAIN.length; i++) {
      const modelName = GEMINI_FALLBACK_CHAIN[i];
      try {
        return await completeGeminiOne(geminiKey!, modelName, opts);
      } catch (e) {
        lastErr = e;
        if (shouldFallback(e) && i < GEMINI_FALLBACK_CHAIN.length - 1) {
          console.warn(`[Gemini complete] ${modelName} unavailable, trying ${GEMINI_FALLBACK_CHAIN[i + 1]}`);
          continue;
        }
        const rl = detectRateLimit("gemini", e);
        if (rl) throw rl;
        throw e;
      }
    }
    const rl = detectRateLimit("gemini", lastErr);
    if (rl) throw rl;
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  // Claude
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const r = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.3,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });
    return r.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
  } catch (e) {
    const rl = detectRateLimit("claude", e);
    if (rl) throw rl;
    throw e;
  }
}

// ────────────────────────────────────────────────────────────
// vision: 画像 + テキスト → テキスト
// ────────────────────────────────────────────────────────────
async function visionGeminiOne(
  apiKey: string,
  modelName: string,
  opts: { prompt: string; imageBase64: string; mediaType: string; maxTokens?: number },
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { maxOutputTokens: opts.maxTokens ?? 2048 },
  });
  const r = await model.generateContent([
    { inlineData: { data: opts.imageBase64, mimeType: opts.mediaType } },
    { text: opts.prompt },
  ]);
  return r.response.text();
}

export async function vision(opts: {
  userId: string;
  prompt: string;
  imageBase64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  maxTokens?: number;
}): Promise<string> {
  const { engine, geminiKey } = await pickEngine(opts.userId);

  if (engine === "gemini") {
    let lastErr: unknown = null;
    for (let i = 0; i < GEMINI_FALLBACK_CHAIN.length; i++) {
      const modelName = GEMINI_FALLBACK_CHAIN[i];
      try {
        return await visionGeminiOne(geminiKey!, modelName, opts);
      } catch (e) {
        lastErr = e;
        if (shouldFallback(e) && i < GEMINI_FALLBACK_CHAIN.length - 1) {
          console.warn(`[Gemini vision] ${modelName} unavailable, trying ${GEMINI_FALLBACK_CHAIN[i + 1]}`);
          continue;
        }
        const rl = detectRateLimit("gemini", e);
        if (rl) throw rl;
        throw e;
      }
    }
    const rl = detectRateLimit("gemini", lastErr);
    if (rl) throw rl;
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  // Claude
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const r = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: opts.mediaType, data: opts.imageBase64 } },
          { type: "text", text: opts.prompt },
        ],
      }],
    });
    return r.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
  } catch (e) {
    const rl = detectRateLimit("claude", e);
    if (rl) throw rl;
    throw e;
  }
}
