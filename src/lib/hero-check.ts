/**
 * レベルチェック（週に1回）。サーバ専用。
 *
 * 【なぜ作り直したか】
 * 前のやり方は、5つの領域の段階を本人がボタンで選ぶものだった。
 * 選ぶ基準がどこにもないので「いま自分はどれだろう」で手が止まるし、
 * 選び直すたびに平均が -19 のように動いて、その数字が何なのかも伝わらない。
 *
 * だから、**数字は本人に選ばせない**。会話でいまの様子を聞いて、その答えから決める。
 * 本人がやることは、聞かれたことに答えるだけ。
 *
 * 【50から始まる、でも50とは出さない】
 * 内部の基準は 50（0〜100の真ん中）。ただし測る前から「あなたは50です」と出しても
 * 意味がないので、**一度も測っていない領域は空のまま**にする。
 * 初めて測った領域は、その回の値をそのまま置く（50から動かす、ではない）。
 *
 * 【一気に下げない】
 * 悪い週があっても、そこで数字を叩き落とさない。1回で下がるのは最大 6。
 * 上がるほうも、話を盛れば青天井、では意味がないので 1回 20 まで。
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";
import { DOMAINS, STEPS, type HeroDomain, type HeroLevels, type HeroRow, type HeroSnapshot, emptyLevels } from "./hero";

/** 内部の基準値（真ん中）。画面には出さない */
export const CHECK_BASE = 50;
/** 1回のチェックで下がる上限。悪い週でも、ここまでしか落ちない */
export const MAX_DOWN = 6;
/** 1回のチェックで上がる上限 */
export const MAX_UP = 20;
/** チェックの間隔（日） */
export const CHECK_INTERVAL_DAYS = 7;
/** 会話の上限。ここまで来たら締める */
export const MAX_TURNS = 8;

export type CheckPick = { domain: HeroDomain; value: number; why: string };
export type CheckTurn = { say: string; picks: CheckPick[]; done: boolean };

const DOMAIN_KEYS = DOMAINS.map((d) => d.key);
const isDomain = (v: any): v is HeroDomain => DOMAIN_KEYS.includes(v);

/** 週チェックの履歴だけを取り出す */
export function checkHistory(hero: HeroRow | null): HeroSnapshot[] {
  return (hero?.history ?? []).filter((h) => h.source === "週チェック" || h.source === "選び直し");
}

/** 最後に測った日時 */
export function lastCheckedAt(hero: HeroRow | null): string | null {
  const h = checkHistory(hero);
  return h.length ? h[h.length - 1].at : null;
}

/** 次に測れるようになるまでの日数（0＝いま測れる） */
export function daysUntilDue(hero: HeroRow | null, now = new Date()): number {
  const last = lastCheckedAt(hero);
  if (!last) return 0;                       // 一度も測っていないなら、いますぐ測れる
  const elapsed = (now.getTime() - new Date(last).getTime()) / 86400000;
  return Math.max(0, Math.ceil(CHECK_INTERVAL_DAYS - elapsed));
}

export function isDue(hero: HeroRow | null, now = new Date()): boolean {
  return daysUntilDue(hero, now) === 0;
}

/** 一度でも測ったことがあるか（＝画面に数字を出していいか） */
export function hasMeasured(hero: HeroRow | null): boolean {
  const l = hero?.levels;
  return !!l && DOMAIN_KEYS.some((k) => typeof l[k] === "number");
}

/**
 * 前の値と今回の値から、実際に置く値を決める。
 * ・初めて測る領域は、そのまま置く
 * ・下がるのは 1回 MAX_DOWN まで
 * ・上がるのは 1回 MAX_UP まで
 */
export function damp(prev: number | null | undefined, next: number): number {
  const v = Math.max(0, Math.min(100, Math.round(next)));
  if (typeof prev !== "number") return v;
  const lo = Math.max(0, prev - MAX_DOWN);
  const hi = Math.min(100, prev + MAX_UP);
  return Math.max(lo, Math.min(hi, v));
}

/** picks を今の値に重ねる（触られていない領域はそのまま） */
export function mergeLevels(prev: HeroLevels | null, picks: CheckPick[]): HeroLevels {
  const base: HeroLevels = { ...emptyLevels(), ...(prev ?? {}) };
  for (const p of picks) {
    if (!isDomain(p.domain)) continue;
    base[p.domain] = damp(base[p.domain], p.value);
  }
  return base;
}

/** 領域ごとの「どこにいるか」の物差しを、AIに渡せる形にする */
function ladder(): string {
  return DOMAINS.map((d) => {
    const steps = (STEPS[d.key] ?? []).map((s) => `    ${s.value}: ${s.label}`).join("\n");
    return `- ${d.key}（${d.label}）… ${d.hint}\n${steps}`;
  }).join("\n");
}

/**
 * チェックの1ターン。
 * AIは「次の問いかけ」を1つ出しつつ、これまでの答えから分かった領域を埋めていく。
 * 数字は本人に見せない（見せると、その数字に合わせて答えてしまう）。
 */
export async function checkTurn(
  userId: string,
  who: string,
  guideName: string,
  history: { role: "assistant" | "user"; content: string }[],
  filled: HeroDomain[],
): Promise<CheckTurn> {
  const remaining = DOMAIN_KEYS.filter((k) => !filled.includes(k));
  const turns = history.filter((h) => h.role === "user").length;

  const prompt = `あなたは ${guideName}。${who} の相棒。
いまは「レベルチェック」の時間。週に1回、いまの ${who} がどのあたりにいるかを、**会話で**確かめる。

# やり方
- 問いかけは**1回に1つだけ**。短く、日常の言葉で聞く。
  例：「最近、時間の使い方どう？」「人との関わりで、いま引っかかってることある？」
- 診断っぽく聞かない。「あなたのレベルは？」とは絶対に聞かない。数字の話は一切出さない。
- 答えをもらったら、ひとこと受けてから次の問いへ。深掘りしすぎない（ここは掘る場所ではない）。
- まだ聞けていない領域から選んで聞く。
- ${MAX_TURNS}往復以内に終わらせる。全部埋まったら done を true にして、短く締める。

# 埋めたい領域（内部の物差し。**この段階の言葉づかいを ${who} に見せない**）
${ladder()}

# いま埋まっている領域
${filled.length ? filled.join("・") : "（まだ何も埋まっていない）"}
# まだ埋まっていない領域
${remaining.length ? remaining.join("・") : "（全部埋まった）"}
# ここまでのやりとり回数：${turns}

# 埋め方
${who} の答えから、その領域が上の物差しのどこに当たるかを選び、その value を picks に入れる。
- **答えから読み取れないものは入れない。** 想像で埋めない。
- why は「${who} がそう言ったから」と分かる一言（20字以内）。本人の言葉を使う。
- 1ターンで入れるのは多くても2つ。

# 出す形（JSONだけ。前後に何も書かない）
{
  "say": "${who} への返事＋次の問いかけ（80字以内）",
  "picks": [{"domain": "inner", "value": 55, "why": "落ち着いてる時は戻れる、と言った"}],
  "done": false
}

# これまでの会話
${history.map((h) => `${h.role === "user" ? who : guideName}：${h.content}`).join("\n") || "（まだ始まっていない）"}`;

  const fallbackSay = remaining.length
    ? "オッケー。じゃあ次、最近の人との関わりってどんな感じ？"
    : "ありがとう。だいたい見えたよ。";
  try {
    const raw = await complete({ userId, prompt, maxTokens: 600, temperature: 0.7 });
    const m = String(raw ?? "").match(/\{[\s\S]*\}/);
    if (!m) return { say: fallbackSay, picks: [], done: remaining.length === 0 };
    const j = JSON.parse(m[0]);
    const picks: CheckPick[] = (Array.isArray(j.picks) ? j.picks : [])
      .filter((p: any) => isDomain(p?.domain) && Number.isFinite(Number(p?.value)))
      .map((p: any) => ({
        domain: p.domain as HeroDomain,
        value: Math.max(0, Math.min(100, Math.round(Number(p.value)))),
        why: String(p.why ?? "").trim().slice(0, 40),
      }))
      .slice(0, 2);
    const nowFilled = new Set([...filled, ...picks.map((p) => p.domain)]);
    return {
      say: String(j.say ?? "").trim().slice(0, 200) || fallbackSay,
      picks,
      // 全部埋まった／往復が上限に達したら、AIが何と言おうとそこで締める
      done: !!j.done || nowFilled.size >= DOMAIN_KEYS.length || turns >= MAX_TURNS,
    };
  } catch {
    return { say: fallbackSay, picks: [], done: remaining.length === 0 || turns >= MAX_TURNS };
  }
}

/** チェックの結果を確定して保存する */
export async function commitCheck(
  userId: string,
  hero: HeroRow | null,
  picks: CheckPick[],
  note?: string,
): Promise<HeroLevels> {
  const levels = mergeLevels(hero?.levels ?? null, picks);
  const at = new Date().toISOString();
  const history = [...(hero?.history ?? []), { at, levels, source: "週チェック" as const, note }].slice(-80);
  const supa = supabaseAdmin();
  const { error } = await supa.from("hero").upsert({
    user_id: userId, levels, history, updated_at: at, assessed_at: at,
  });
  if (error) throw error;
  return levels;
}
