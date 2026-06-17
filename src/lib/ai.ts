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
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export type AIEngine = "gemini" | "claude";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "tool_start"; name: string };

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
  const result = await model.generateContentStream({ contents });
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield { type: "delta", text };
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
}
