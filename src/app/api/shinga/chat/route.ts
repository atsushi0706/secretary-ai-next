/**
 * シンガワールドの対話。
 *
 * 返事をそのまま流しつつ、AIが付けたタグを取り出して
 *   <move>場所</move>            → 地図を動かす
 *   <quest_to_add>[...]</quest_to_add> → クエストを置く
 * を実体化する。タグ本体は本文から取り除いてから表示させる。
 *
 * この作りは既存の /api/chat と同じ考え方に揃えてある。
 */
import { auth } from "@/auth";
import { streamChat, AIRateLimitError, formatRateLimitForUser } from "@/lib/ai";
import { extractJson } from "@/lib/claude";
import { buildGuidePersona } from "@/lib/guide";
import { isPlaceKey, type PlaceKey } from "@/lib/places";
import { isModeKey, MODES, type ModeKey } from "@/lib/modes";
import { jstDateStr } from "@/lib/google";
import { getUserSettings, logError } from "@/lib/supabase";
import {
  saveShingaMessage, loadShingaMessages, createQuest, isMissingTable, MIGRATION_HINT,
} from "@/lib/shinga";
import { getHero, applyHeroDeltas, labelOf, type HeroRow, type HeroDelta, type HeroDomain } from "@/lib/hero";

const HERO_DOMAINS: HeroDomain[] = ["inner", "embodiment", "relationship", "delivery", "socialization"];

function sseEvent(name: string, data: any): Uint8Array {
  return new TextEncoder().encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  const place: PlaceKey = isPlaceKey(body.place) ? body.place : "map";
  const mode: ModeKey | undefined = isModeKey(body.mode) ? body.mode : undefined;
  const greet = !!body.greet;   // 開いた直後の最初のひとこと
  const opener = typeof body.opener === "string" ? body.opener.trim() : ""; // テンプレで出した開始の一言
  const debug = !!body.debug;   // 可視化用：何を読み込みAIに渡したかを返す

  const stream = new ReadableStream({
    async start(controller) {
      const send = (name: string, data: any) => {
        try { controller.enqueue(sseEvent(name, data)); } catch { /* closed */ }
      };

      try {
        const today = jstDateStr();

        if (!greet && text) {
          // テンプレで先に出した開始の一言を、履歴の頭に積んでおく（AIが自分の一言目を認識して続きから進める）
          if (opener) await saveShingaMessage(userId, today, "assistant", opener, place);
          await saveShingaMessage(userId, today, "user", text, place);
        }

        const settings = await getUserSettings(userId).catch(() => null) as any;
        // 主人公レベル：会話で増減させるため、実際の対話（greet以外）のときだけ読み込んで渡す
        let hero: HeroRow | null = null;
        if (!greet) hero = await getHero(userId).catch(() => null);
        const system = buildGuidePersona({
          guideName: settings?.secretary_name,
          userCallName: settings?.user_call_name,
          birthDate: settings?.birth_date,
          birthName: settings?.birth_name,
          birthGender: settings?.birth_gender,
          place,
          mode,
          todayStr: today,
          hero,
        });

        // 会話履歴は「今日ぶんだけ」に絞る（何日も前の話が混ざって時間軸が壊れるのを防ぐ）。
        // さらに、特定のワークを greet で始めるときは、そのワークだけの新しいスレッドにする
        //（＝過去の別の話を引きずらない）。
        let history: { role: "assistant" | "user"; content: string }[] = [];
        let debugHistory: any[] = [];
        if (!(greet && mode)) {
          const past = await loadShingaMessages(userId, 24, today);
          debugHistory = past.map((m) => ({ role: m.role, date: m.date, at: m.created_at, content: m.content }));
          history = past.map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: m.content,
          }));
        }

        if (greet) {
          const openLine = mode
            ? `（「${MODES[mode].label}」の時間を、いま新しく始める。過去の別の話は持ち出さない。短く迎えて、この時間の最初の問いを1つだけ投げかけて。前置きは要らない）`
            : (history.length === 0
              ? "（はじめてこの世界に来た。まだ何も話していない。短く迎えて、今日はどこへ行きたいかを聞いて）"
              : "（また戻ってきた。短く迎えて、今日はどうしたいかを聞いて）");
          history.push({ role: "user", content: openLine });
        } else if (history.length === 0 || history[history.length - 1].role !== "user") {
          history.push({ role: "user", content: text });
        }

        // 可視化：AIに渡す直前の状態を丸ごと返す（何をいつ読み込んだか）
        if (debug) {
          send("debug", {
            stage: "input",
            today, mode: mode ?? null, place, greet,
            loadedFromDb: debugHistory,               // DBから読んだ履歴（日付つき）
            sentToAI: history,                         // 実際にAIへ渡したメッセージ列
            systemPrompt: system,                      // システムプロンプト全文
            settingsBirth: { date: settings?.birth_date ?? null, name: settings?.birth_name ?? null, gender: settings?.birth_gender ?? null },
          });
        }

        let full = "";
        for await (const ev of streamChat({
          userId,
          system,
          messages: history,
          maxTokens: 1600,
          temperature: 0.85,
        })) {
          if (ev.type === "delta") {
            full += ev.text;
            // タグが混じり始めたら、それ以降はユーザーに流さない（<face> 等が本文に出ないように）
            send("delta", { text: ev.text });
          }
        }

        // ── タグの取り出し ──
        // 表情
        const faceMatch = full.match(/<face>\s*(neutral|smile|anxious)\s*<\/face>/i);
        const face = faceMatch ? faceMatch[1].toLowerCase() : null;

        // 移動
        let moveTo: PlaceKey | null = null;
        const moveMatch = full.match(/<move>\s*([a-z]+)\s*<\/move>/i);
        if (moveMatch && isPlaceKey(moveMatch[1]) && moveMatch[1] !== place) {
          moveTo = moveMatch[1];
        }

        // ピークステートの進行トリガー
        const wantEmotion = /<emotion\s*\/?>/.test(full);
        const wantBreath = /<breath\s*\/?>/.test(full);

        // 選択肢ボタン
        let choices: Array<{ label: string; mode?: string }> | null = null;
        const choMatch = full.match(/<choices>([\s\S]*?)<\/choices>/);
        if (choMatch) {
          const parsed = extractJson<any[]>(choMatch[1]);
          if (Array.isArray(parsed)) {
            choices = parsed
              .map((c) => ({
                label: String(c?.label ?? "").trim(),
                mode: isModeKey(c?.mode) ? c.mode : undefined,
              }))
              .filter((c) => c.label)
              .slice(0, 3);
            if (choices.length === 0) choices = null;
          }
        }

        // 主人公レベルの増減（会話で観測された変化）
        let heroChanges: Array<{ domain: HeroDomain; label: string; from: number; to: number; reason?: string }> = [];
        const heroMatch = full.match(/<hero_delta>([\s\S]*?)<\/hero_delta>/);
        if (heroMatch && hero) {
          try {
            const cands = extractJson<any[]>(heroMatch[1]) ?? [];
            const deltas: HeroDelta[] = cands
              .map((c) => ({
                domain: c?.domain as HeroDomain,
                delta: Number(c?.delta),
                reason: typeof c?.reason === "string" ? c.reason : undefined,
              }))
              .filter((d) => HERO_DOMAINS.includes(d.domain) && Number.isFinite(d.delta));
            if (deltas.length) {
              const { changed } = await applyHeroDeltas(userId, deltas, hero);
              heroChanges = changed.map((c) => ({ ...c, label: labelOf(c.domain) }));
            }
          } catch (e) {
            if (!isMissingTable(e)) console.error("[shinga/chat] applyHeroDeltas failed:", e);
          }
        }

        // クエスト
        const addedQuests: Array<{ id: string; title: string }> = [];
        const questMatch = full.match(/<quest_to_add>([\s\S]*?)<\/quest_to_add>/);
        if (questMatch) {
          try {
            const cands = extractJson<any[]>(questMatch[1]) ?? [];
            for (const c of cands.slice(0, 2)) {
              const title = String(c?.title ?? "").trim();
              if (!title) continue;
              const q = await createQuest(userId, { title, body: String(c?.body ?? ""), category: "life" });
              addedQuests.push({ id: q.id, title: q.title });
            }
          } catch (e) {
            if (!isMissingTable(e)) console.error("[shinga/chat] createQuest failed:", e);
          }
        }

        // 本文からタグを全部取り除く
        const clean = full
          .replace(/<face>[\s\S]*?<\/face>/g, "")
          .replace(/<move>[\s\S]*?<\/move>/g, "")
          .replace(/<choices>[\s\S]*?<\/choices>/g, "")
          .replace(/<quest_to_add>[\s\S]*?<\/quest_to_add>/g, "")
          .replace(/<hero_delta>[\s\S]*?<\/hero_delta>/g, "")
          .replace(/<emotion\s*\/?>/g, "")
          .replace(/<breath\s*\/?>/g, "")
          .trim();

        // タグが本文に混じっていたら、削り直した本文で置き換える
        if (faceMatch || moveMatch || choMatch || questMatch || heroMatch || wantEmotion || wantBreath) {
          send("replace", { text: clean });
        }
        if (face) send("face", { face });
        if (wantEmotion) send("emotion", {});
        if (wantBreath) send("breath", {});
        if (choices) send("choices", { choices });
        if (moveTo) send("move", { place: moveTo });
        if (addedQuests.length > 0) send("quests", { quests: addedQuests });
        if (heroChanges.length > 0) send("hero", { changes: heroChanges });

        if (clean) {
          await saveShingaMessage(userId, today, "assistant", clean, moveTo ?? place);
        }
        // 可視化：AIの生レスポンス（タグ込み）と、抽出したもの
        if (debug) {
          send("debug", {
            stage: "output",
            raw: full,
            extracted: { face, move: moveTo, choices, wantEmotion, wantBreath, addedQuests, heroChanges },
          });
        }
        send("done", { ok: true });
      } catch (e: any) {
        if (e instanceof AIRateLimitError) {
          send("replace", { text: formatRateLimitForUser(e) });
          send("done", { ok: false });
        } else if (isMissingTable(e)) {
          send("replace", { text: MIGRATION_HINT });
          send("done", { ok: false });
        } else {
          await logError(userId, "/api/shinga/chat", e);
          send("replace", { text: `（うまく届かなかった: ${String(e?.message ?? e)}）` });
          send("done", { ok: false });
        }
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const messages = await loadShingaMessages(userId, 30);
    return Response.json({ messages });
  } catch (e: any) {
    if (isMissingTable(e)) {
      return Response.json({ messages: [], needsMigration: true });
    }
    return Response.json({ messages: [], error: String(e?.message ?? e) });
  }
}
