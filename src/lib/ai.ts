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
// Gemini 2.5 Flash の無料枠は 1日 250リクエストしかない (講座生には少なすぎる)。
// 3.5 Flash (2026-05-19 安定版リリース) は 1日 1,500リクエスト・1分 15回まで無料。
// 環境変数 GEMINI_MODEL で変更可能。
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

export type AIEngine = "gemini" | "claude";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "tool_start"; name: string };

/**
 * Gemini/Claude のレートリミット/クォータ枯渇を表す型付き例外。
 * 上位ルート (chat/greet) で instanceof チェックして、秘書っぽい返答に置き換える。
 */
export class AIRateLimitError extends Error {
  retryAfterSec: number;
  engine: AIEngine;
  constructor(engine: AIEngine, retryAfterSec: number, original?: unknown) {
    const orig = original instanceof Error ? original.message : String(original ?? "");
    super(`AI rate limit (${engine}, retry in ${retryAfterSec}s): ${orig}`);
    this.name = "AIRateLimitError";
    this.engine = engine;
    this.retryAfterSec = retryAfterSec;
  }
}

/**
 * RateLimit エラーを秘書AI口調 + 技術的注釈 に変換するヘルパー。
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
  return [
    `ごめんね、ちょっと立て込んでて頭がパンクしそう…${wait}くらい休ませてもらえるかな🙏`,
    ``,
    `――― ⚙ 内部の状況（${secretaryName}の頭の中）―――`,
    `${engineLabel} API の利用上限に到達したため、AI が一時的に応答できません。`,
    `・推定待機時間: ${wait}（${sec}秒）`,
    `・原因: 1分または1日あたりのリクエスト上限を超過`,
    err.engine === "gemini"
      ? `・対処: ${wait}後に自動回復します。連発した直後によく出ます。\n　長期的に詰まる場合は、設定画面で Gemini API キーを見直すか、無料枠の大きいモデル(gemini-3.5-flash)を使ってください。`
      : `・対処: ${wait}後に自動回復します。発生頻度が高い場合は管理者にご連絡ください。`,
    `―――――――――――――――――`,
  ].join("\n");
}

function detectRateLimit(engine: AIEngine, err: unknown): AIRateLimitError | null {
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as any)?.status ?? (err as any)?.response?.status;
  // 429 が含まれてる / "Too Many Requests" / "quota" / "rate" を含む
  const looksRateLimit =
    status === 429 ||
    /429|Too Many Requests|quota|rate.?limit/i.test(msg);
  if (!looksRateLimit) return null;
  // "retry in 22.5s" を拾う。なければ 30 秒デフォルト
  const m = msg.match(/retry in\s+([\d.]+)\s*s/i)
    ?? msg.match(/retry.{0,15}after\s*[:=]?\s*([\d.]+)/i);
  const sec = m ? Math.max(1, Math.ceil(parseFloat(m[1]))) : 30;
  return new AIRateLimitError(engine, sec, err);
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
    yield* streamGemini(geminiKey!, opts);
  } else {
    yield* streamClaude(opts);
  }
}

async function* streamGemini(
  apiKey: string,
  opts: {
    system: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  },
): AsyncGenerator<StreamEvent, void, unknown> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
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
  try {
    const result = await model.generateContentStream({ contents });
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield { type: "delta", text };
    }
  } catch (e) {
    const rl = detectRateLimit("gemini", e);
    if (rl) throw rl;
    throw e;
  }
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
export async function complete(opts: {
  userId: string;
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const { engine, geminiKey } = await pickEngine(opts.userId);
  try {
    if (engine === "gemini") {
      const genAI = new GoogleGenerativeAI(geminiKey!);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: opts.system,
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.maxTokens ?? 2048,
        },
      });
      const r = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      });
      return r.response.text();
    }
    // Claude
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
    const rl = detectRateLimit(engine, e);
    if (rl) throw rl;
    throw e;
  }
}

// ────────────────────────────────────────────────────────────
// vision: 画像 + テキスト → テキスト
// ────────────────────────────────────────────────────────────
export async function vision(opts: {
  userId: string;
  prompt: string;
  imageBase64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  maxTokens?: number;
}): Promise<string> {
  const { engine, geminiKey } = await pickEngine(opts.userId);
  try {
    if (engine === "gemini") {
      const genAI = new GoogleGenerativeAI(geminiKey!);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          maxOutputTokens: opts.maxTokens ?? 2048,
        },
      });
      const r = await model.generateContent([
        { inlineData: { data: opts.imageBase64, mimeType: opts.mediaType } },
        { text: opts.prompt },
      ]);
      return r.response.text();
    }
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
    const rl = detectRateLimit(engine, e);
    if (rl) throw rl;
    throw e;
  }
}
