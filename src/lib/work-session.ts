/**
 * ワーク1回分の記録（＝発信の素材）。サーバ専用。
 *
 * ここが無いと何が起きるか（実際に起きた失敗）：
 *   「直近3日の会話」をまるごと混ぜて要約すると、個別のワークの中身が消えて、
 *   たまたま会話に出ていた話題が主役になってしまう。メソッドとも無関係な投稿が出る。
 *
 * だから素材は「ワーク1回＝1件」で貯める。
 * 投稿を作るときは、**どの体験から作るかを必ず選ぶ**。混ぜない。
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { jstDateStr } from "./google";
import { MODES, type ModeKey } from "./modes";

export type WorkSession = {
  id?: number;
  date: string;
  mode: string;
  /** そのワークの見出し（あとから選ぶときの目印） */
  title: string;
  /** 何をして何が起きたか（外に出せる形に要約済み） */
  summary: string;
  /** そこで生まれた気づき */
  insights: string[];
  /** 本人の言葉のうち、外に出しても差し支えない短い断片 */
  quotes: string[];
  /** すでに投稿にしたか */
  used?: boolean;
  created_at?: string;
};

function parseObject<T>(text: string): T | null {
  let t = String(text ?? "").trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");
  const start = t.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { try { return JSON.parse(t.slice(start, i + 1)) as T; } catch { return null; } } }
  }
  return null;
}

export async function listWorkSessions(userId: string, limit = 20): Promise<WorkSession[]> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("work_sessions")
      .select("id, date, mode, title, summary, insights, quotes, used, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    return (data ?? []) as WorkSession[];
  } catch { return []; }
}

export async function getWorkSession(userId: string, id: number): Promise<WorkSession | null> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("work_sessions")
      .select("id, date, mode, title, summary, insights, quotes, used, created_at")
      .eq("user_id", userId).eq("id", id).maybeSingle();
    return (data as WorkSession) ?? null;
  } catch { return null; }
}

export async function markUsed(userId: string, id: number): Promise<void> {
  try {
    const supa = supabaseAdmin();
    await supa.from("work_sessions").update({ used: true }).eq("user_id", userId).eq("id", id);
  } catch { /* 印が付かなくても本体は動く */ }
}

/**
 * ワークが終わったところで、その1回ぶんを素材として保存する。
 * 会話の逐語はここで捨てる（＝外に持ち出さない）。残すのは「何が起きたか」だけ。
 */
export async function saveWorkSession(
  userId: string,
  mode: ModeKey,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<WorkSession | null> {
  const mine = messages.filter((m) => m.role === "user" && m.content.trim());
  if (mine.length < 2) return null;   // ほとんど話していない＝素材にならない

  const modeLabel = MODES[mode]?.label ?? String(mode);
  const transcript = messages
    .map((m) => `${m.role === "user" ? "本人" : "案内役"}：${m.content.slice(0, 300)}`)
    .join("\n").slice(-6000);

  const raw = await complete({
    userId,
    prompt: `下は「${modeLabel}」というワークの記録。この1回で何が起きたかを、あとで発信の素材にできる形にまとめて。

# まとめ方
- **この回に実際にあったことだけ**書く。一般論・推測・出てきていない話を足さない。
- 内面の会話をそのまま持ち出さない。個人が特定される事情・固有名詞は落とす。
- 「気づき」は、本人の中で何かが動いた瞬間だけを拾う。無ければ空でよい。
- 「本人の言葉」は、外に出しても差し支えない短い断片だけ（各30字以内・最大3つ）。
  生々しい打ち明け話は入れない。判断に迷ったら入れない。

# 出力（JSONのみ）
{
 "title": "この回を一言で（12〜20字。あとから選ぶときの目印になるように具体的に）",
 "summary": "何をして何が起きたか（120〜200字）",
 "insights": ["この回で生まれた気づき（0〜3つ・各30〜60字）"],
 "quotes": ["外に出せる本人の言葉（0〜3つ・各30字以内）"]
}

# ワークの記録
${transcript}`,
    maxTokens: 900,
    temperature: 0.5,
  });

  const p = parseObject<any>(raw);
  if (!p || !String(p.title ?? "").trim()) return null;

  const row = {
    user_id: userId,
    date: jstDateStr(),
    mode: String(mode),
    title: String(p.title).slice(0, 60),
    summary: String(p.summary ?? "").slice(0, 600),
    insights: Array.isArray(p.insights) ? p.insights.map((x: any) => String(x).slice(0, 120)).slice(0, 3) : [],
    quotes: Array.isArray(p.quotes) ? p.quotes.map((x: any) => String(x).slice(0, 60)).slice(0, 3) : [],
    used: false,
    created_at: new Date().toISOString(),
  };

  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("work_sessions").insert(row)
      .select("id, date, mode, title, summary, insights, quotes, used, created_at").single();
    return (data as WorkSession) ?? null;
  } catch { return null; }
}

/** 投稿を作るときに渡す、素材1件ぶんの文字列 */
export function materialText(w: WorkSession): string {
  const label = MODES[w.mode as ModeKey]?.label ?? w.mode;
  return [
    `## 素材にするワーク：${label}（${w.date}）`,
    `- 見出し：${w.title}`,
    `- 起きたこと：${w.summary}`,
    w.insights?.length ? `- 生まれた気づき：\n${w.insights.map((i) => `  ・${i}`).join("\n")}` : "",
    w.quotes?.length ? `- 本人の言葉（そのまま引用してよい短い断片）：\n${w.quotes.map((q) => `  ・「${q}」`).join("\n")}` : "",
    "",
    "※ ここに書かれていないことは書かない。この体験を、読者の役に立つ形へ変換する。",
  ].filter(Boolean).join("\n");
}
