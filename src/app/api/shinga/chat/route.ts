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

  const stream = new ReadableStream({
    async start(controller) {
      const send = (name: string, data: any) => {
        try { controller.enqueue(sseEvent(name, data)); } catch { /* closed */ }
      };

      try {
        const today = jstDateStr();

        if (!greet && text) {
          await saveShingaMessage(userId, today, "user", text, place);
        }

        const settings = await getUserSettings(userId).catch(() => null) as any;
        const system = buildGuidePersona({
          guideName: settings?.secretary_name,
          userCallName: settings?.user_call_name,
          birthDate: settings?.birth_date,
          place,
          mode,
        });

        // 直近30件だけ渡す（全部渡すと会話が伸びるほど重くなるため）
        const past = await loadShingaMessages(userId, 30);
        const history = past.map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }));

        if (greet) {
          const openLine = mode
            ? `（「${MODES[mode].label}」の時間を始める。短く迎えて、この時間の最初の問いを1つだけ投げかけて。前置きは要らない）`
            : (history.length === 0
              ? "（はじめてこの世界に来た。まだ何も話していない。短く迎えて、今日はどこへ行きたいかを聞いて）"
              : "（また戻ってきた。短く迎えて、今日はどうしたいかを聞いて）");
          history.push({ role: "user", content: openLine });
        } else if (history.length === 0 || history[history.length - 1].role !== "user") {
          history.push({ role: "user", content: text });
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
          .replace(/<emotion\s*\/?>/g, "")
          .replace(/<breath\s*\/?>/g, "")
          .trim();

        // タグが本文に混じっていたら、削り直した本文で置き換える
        if (faceMatch || moveMatch || choMatch || questMatch || wantEmotion || wantBreath) {
          send("replace", { text: clean });
        }
        if (face) send("face", { face });
        if (wantEmotion) send("emotion", {});
        if (wantBreath) send("breath", {});
        if (choices) send("choices", { choices });
        if (moveTo) send("move", { place: moveTo });
        if (addedQuests.length > 0) send("quests", { quests: addedQuests });

        if (clean) {
          await saveShingaMessage(userId, today, "assistant", clean, moveTo ?? place);
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
