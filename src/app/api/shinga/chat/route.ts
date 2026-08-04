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
import { buildGuidePersona, buildWalkPersona } from "@/lib/guide";
import { isPlaceKey, type PlaceKey } from "@/lib/places";
import { isModeKey, MODES, WALK_SCENERY_PROMPT, type ModeKey } from "@/lib/modes";
import { jstDateStr } from "@/lib/google";
import { getUserSettings, logError } from "@/lib/supabase";
import {
  saveShingaMessage, loadShingaMessages, createQuest, isMissingTable, MIGRATION_HINT,
} from "@/lib/shinga";
import { getHero, applyHeroDeltas, labelOf, type HeroRow, type HeroDelta, type HeroDomain } from "@/lib/hero";
import { isPartColor, partPrompt, cuesForPrompt, PARTS, type PartColor } from "@/lib/parts";
import { releaseGuardian } from "@/lib/parts-db";

const HERO_DOMAINS: HeroDomain[] = ["inner", "embodiment", "relationship", "delivery", "socialization"];

function clean0(t: string): string {
  return t.replace(/<[^>]{1,60}>/g, " ");
}

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
  // 内なる子の神殿：いま扱っている守り手の色（画面で選ばれたもの）
  const partColor: PartColor | null = isPartColor(body.partColor) ? body.partColor : null;
  // 画面に表示中の進行状況。AIに「いまどこか」を教えて、同じ質問の堂々巡りを止める
  // じぶんワーク：定義そのものを毎ターン受け取る（DBを引かない＝ステートレスで簡単）
  const customWork = body.customWork && typeof body.customWork === "object" ? body.customWork : null;
  const customIdx = Number.isFinite(Number(body.customIdx)) ? Number(body.customIdx) : 0;

  const progress = {
    partsStep: Number.isFinite(Number(body.partsStep)) ? Number(body.partsStep) : null,
    walkStage: Number.isFinite(Number(body.walkStage)) ? Number(body.walkStage) : null,
    travelStage: Number.isFinite(Number(body.travelStage)) ? Number(body.travelStage) : null,
    wallStage: Number.isFinite(Number(body.wallStage)) ? Number(body.wallStage) : null,
    shadowStep: Number.isFinite(Number(body.shadowStep)) ? Number(body.shadowStep) : null,
  };
  // ミラーオブワールド：画面のゲートで選ばれた安全度と、選択ずみの幻獣
  const { isShadowPairId, shadowPair } = await import("@/lib/shadow");
  const shadowSafety: "normal" | "boundary" = body.shadowSafety === "boundary" ? "boundary" : "normal";
  const shadowPicked = isShadowPairId(body.shadowPair) ? body.shadowPair : null;

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
        // パラレルウォークは「きよブラック」＝普通に受け止めて普通に返す1対1の人格（構造化フローなし）
        const system = mode === "walk"
          ? buildWalkPersona({
              guideName: settings?.secretary_name,
              userCallName: settings?.user_call_name,
              birthDate: settings?.birth_date,
              birthName: settings?.birth_name,
              todayStr: today,
              // ここは専用人格なので MODES.walk.flow が渡らない。風景の指示だけ別に足す
            }) + `\n\n${WALK_SCENERY_PROMPT}`
          : buildGuidePersona({
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

        // 「真ん中に戻す」では、いまの偏りと"実際にやったことの記録"を必ず渡す。
        // これが無いと、やれているのに「動けてないね」と言ってしまう。
        let balanceCtx = "";
        if (mode === "balance") {
          const { readLean, recentDoneText } = await import("@/lib/lean");
          const [lean, done] = await Promise.all([
            readLean(userId).catch(() => null),
            recentDoneText(userId).catch(() => ""),
          ]);
          balanceCtx = [
            "# いま画面に出ている状態",
            lean
              ? `- 偏り：${lean.lean === "image" ? "空想寄り" : lean.lean === "real" ? "現実寄り" : "整っている"}（強さ ${lean.strength}）\n- 気づき：${lean.pattern}`
              : "- 偏りはまだ読めていない（本人の実感を聞くところから始める）",
            "",
            "# この人が実際にやったこと（事実。ここにあることは全部やっている。無かったことにしない）",
            done || "（記録なし）",
          ].join("\n");
        }

        // アカシックは「引いていい場所」。過去のワークで本人が言ったことを渡す。
        // 個別のワーク（ウォールブレイク等）には渡さない——言っていないことが混ざる事故になるため。
        let pastCtx = "";
        if (mode === "akashic" && !greet) {
          try {
            const { listWalkLogs } = await import("@/lib/shinga");
            const supa = (await import("@/lib/supabase")).supabaseAdmin();
            const since = jstDateStr(new Date(Date.now() - 21 * 86400000));
            const [walks, said] = await Promise.all([
              listWalkLogs(userId, 4).catch(() => []),
              supa.from("shinga_conversations")
                .select("date, place, content").eq("user_id", userId).eq("role", "user")
                .gte("date", since).neq("date", today)
                .order("created_at", { ascending: false }).limit(14)
                .then((r) => r.data ?? [], () => []),
            ]);
            const lines = [
              ...walks.map((w: any) => `- ${w.date} パラレルウォークで：${String(w.summary ?? "").slice(0, 160)}`),
              ...(said as any[]).map((m) => `- ${m.date} ${MODES[m.place as ModeKey]?.label ?? "会話"}で：${String(m.content ?? "").slice(0, 110)}`),
            ];
            if (lines.length) {
              pastCtx = [
                "# これまでに本人が話したこと（引いていい。ただしここに無いことは言わない）",
                ...lines.slice(0, 16),
              ].join("\n");
            }
          } catch { /* 引けなくても会話は進む */ }
        }

        // いまの進行状況（画面に出ている段階）。これが無いとAIは自分がどこまで進めたか分からず、
        // 同じ質問を繰り返して「1/9のまま堂々巡り」になる。
        let progressCtx = "";
        if (!greet) {
          const lines: string[] = [];
          if (mode === "parts" && progress.partsStep) {
            lines.push(`- 内なる子の神殿：いま段階 ${progress.partsStep}/9（画面に表示中）。`);
            lines.push(`  この段階の問いにはもう答えをもらっている前提で進める。**同じ質問を二度しない。**`);
            lines.push(`  答えを受け取ったら次の段階へ進み、<parts_step>${Math.min(9, progress.partsStep + 1)}</parts_step> 以上を付ける。`);
            lines.push(`  同じ数字を3回続けて出してはいけない（進むか、進めない理由の"新しい"問いを出す）。`);
          }
          if (mode === "walk" && progress.walkStage) {
            lines.push(`- パラレルウォーク：いまの地点 ${progress.walkStage}/10。`);
            lines.push(`  理想の解像度が少しでも上がったら必ず数字を上げる。同じ数字を2回続けたら、次は上げるか、五感・人・役割など"まだ聞いていない角度"の問いを出す。`);
          }
          if (mode === "travel" && progress.travelStage) {
            lines.push(`- パラレルトラベル：いまの高度 ${progress.travelStage}/10。話が広がったら必ず上げる。`);
          }
          if (mode === "breakthrough" && progress.wallStage) {
            lines.push(`- ウォールブレイク：扉はいま ${progress.wallStage}/5。ほどけてきたら必ず上げる。`);
          }
          if (mode === "shadow") {
            if (progress.shadowStep) {
              lines.push(`- ミラーオブワールド：いま段階 ${progress.shadowStep}/9（画面に表示中）。同じ質問を二度しない。答えを受け取ったら進める。`);
            }
            if (shadowPicked) {
              const p = shadowPair(shadowPicked);
              lines.push(`- 選ばれた幻獣：${p.shadow.label}（pair_id: ${p.id}）。光は「${p.light.label}」、奥の力は ${p.core.join("・")}。この見立てを勝手に変えない。`);
            }
            if (shadowSafety === "boundary") {
              lines.push(`- **境界線優先モード**：継続的な不安がある相手。鏡の問い（4〜7）を出さない。1→2→8→9で進め、記録・距離・相談を優先する。`);
            }
          }
          if (lines.length) progressCtx = ["# いまの進行状況（厳守）", ...lines].join("\n");
        }

        // じぶんワーク：本人が作った進め方どおりに、1つずつ進める
        let customCtx = "";
        if (customWork) {
          const steps = (customWork.steps ?? []) as any[];
          const cur = steps[customIdx];
          const total = steps.length;
          const stepLine = (st: any, i: number) =>
            `${i + 1}. ${st.kind === "q" ? `問いかけ「${st.q}」` : "カードを1枚引く（画面が担当）"}`;
          customCtx = [
            `# いまは本人が自分で作ったワーク「${customWork.name}」の最中`,
            `- このワークの目的：${customWork.purpose || "（本人の内省の時間）"}`,
            `- 進め方（全${total}歩）：`,
            ...steps.map(stepLine),
            `- いまは ${Math.min(customIdx + 1, total)} 歩目。`,
            cur?.kind === "q"
              ? `- やること：問いかけ「${cur.q}」を、あなたの言葉でやさしく1つだけ聞く。前の答えがあれば短く受け止めてから。`
              : `- やること：直前の答えを受け止める。カードは画面側が引くので、あなたは引く動作に触れない。`,
            customIdx >= total
              ? `- 全部歩き終えた。締めかた：「${customWork.closing || "今日の自分にひとことを置いて、深呼吸して終わる"}」に沿って、短くあたたかく締める。新しい問いは出さない。`
              : "",
            `- 本人が作ったワークであることを尊重する。問いの言い換えは最小限。順番を飛ばさない。`,
          ].filter(Boolean).join("\n");
        }

        // 実書き込みの掟（AIが「入れておいた」と言ったのに実体が無い、を絶対に起こさない）
        const honestyCtx = [
          "# 実行の掟（最重要）",
          "- 「クエストに置いておく」「追加しておく」と言うときは、**同じ返事の最後に必ず** <quest_to_add>[{\"title\":\"...\"}]</quest_to_add> を付ける。",
          "- タグを付けずに「置いた」「入れた」と言うのは嘘になる。絶対に禁止。",
          "- タグが出せない状況なら「いまは置けなかった」と正直に言う。",
        ].join("\n");

        // 内なる子の神殿：扱う守り手が決まっていればその設定を、未定なら4色の手がかりを渡す
        const systemBase = [system, honestyCtx, progressCtx, balanceCtx, customCtx].filter(Boolean).join("\n\n");
        const systemFull = mode !== "parts" ? systemBase : [
          systemBase,
          partColor
            ? partPrompt(partColor)
            : ["# まだ守り手が決まっていない", "相手の話から、どの守り手が前に出ているかを一緒に見立てる。決めつけず、確かめる。", cuesForPrompt()].join("\n"),
        ].join("\n\n");

        if (greet) {
          const openLine = customWork
            ? `（本人が作ったワーク「${customWork.name}」をいま始める。まず intro（「${customWork.intro || "はじめよう"}」）を自分の言葉で言ってから、1歩目へ。過去の別の話は持ち出さない）`
            : mode === "parts" && partColor
            ? `（「内なる子の神殿」で、${PARTS[partColor].defense.name}（${PARTS[partColor].defense.title}）のワークをいま始める。過去の別の話は持ち出さない。**しくみの説明は画面がもう見せたので繰り返さない**。前置きも断り書きも要らない。【1】①の問い（その守り手はどんな感覚か・身体のどこにあるか）だけを、1つ投げかけて）`
            : mode === "shadow"
            ? `（「ミラーオブワールド」をいま始める。しくみの説明は画面がもう見せたので繰り返さない。${shadowSafety === "boundary" ? "境界線優先モード：鏡や幻獣の話はせず、" : ""}まず「いま現実で、関係が悪い人・ネックになってる人のことを、好きなように話してみて」とだけ、やさしく誘って。質問攻めにしない。<shadow_step>1</shadow_step> を付けて）`
            : mode
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
            systemPrompt: systemFull,                  // システムプロンプト全文
            settingsBirth: { date: settings?.birth_date ?? null, name: settings?.birth_name ?? null, gender: settings?.birth_gender ?? null },
          });
        }

        let full = "";
        for await (const ev of streamChat({
          userId,
          system: systemFull,
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

        // ウォールブレイク：壁（無理）が解けていく度合いを扉の開き具合で見せる。
        // 1=固く閉じた扉 … 5=全開（谷が見える）。回数ではなく、AIが今の状態を判定して出す。
        let wallStage: number | null = null;
        const wallMatch = full.match(/<wall>\s*([1-5])\s*<\/wall>/);
        if (wallMatch) wallStage = Number(wallMatch[1]);

        // パラレルウォーク：理想の解像度＝どこまで歩いたか（1=入口 … 10=理想郷）
        let walkStage: number | null = null;
        const walkMatch = full.match(/<walk>\s*(10|[1-9])\s*<\/walk>/);
        if (walkMatch) walkStage = Number(walkMatch[1]);

        // パラレルトラベル：話の抽象度＝高度（1=目の前の出来事 … 10=すべてがつながる）。
        // 背景の風景が、この数字に合わせて引いていく。
        let travelStage: number | null = null;
        const travelMatch = full.match(/<travel>\s*(10|[1-9])\s*<\/travel>/);
        if (travelMatch) travelStage = Number(travelMatch[1]);

        // 内なる子の神殿：ワークの段階（1=守り手に出会う … 6=解き放つ）と、解放されたガーディアン
        let partsStep: number | null = null;
        const stepMatch = full.match(/<parts_step>\s*([1-9])\s*<\/parts_step>/);
        if (stepMatch) partsStep = Number(stepMatch[1]);
        const guardMatch = full.match(/<guardian>\s*(red|blue|green|yellow)\s*<\/guardian>/i);
        const releasedColor = guardMatch && isPartColor(guardMatch[1].toLowerCase())
          ? (guardMatch[1].toLowerCase() as "red" | "blue" | "green" | "yellow")
          : null;

        // ミラーオブワールド：段階／選ばれた幻獣／回収の完了
        let shadowStep: number | null = null;
        const shStepMatch = full.match(/<shadow_step>\s*([1-9])\s*<\/shadow_step>/);
        if (shStepMatch) shadowStep = Number(shStepMatch[1]);
        const shPickMatch = full.match(/<shadow_pick>\s*([a-z_]+)\s*<\/shadow_pick>/);
        const shadowPick = shPickMatch && isShadowPairId(shPickMatch[1]) ? shPickMatch[1] : null;
        const shLightMatch = full.match(/<shadow_light>\s*([a-z_]+)\s*<\/shadow_light>/);
        const shadowLight = shLightMatch && isShadowPairId(shLightMatch[1])
          ? shLightMatch[1]
          : (shLightMatch && shadowPicked ? shadowPicked : null);   // idを書き間違えても、選択ずみの影で成立させる

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
              // ふだんは3つまで。影獣の鏡だけは「鏡の4方向＋当てはまらない」で5つ要る
              .slice(0, mode === "shadow" ? 5 : 3);
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

        // 「クエストに置いた」と**言い切った**のにタグが無い場合だけ、発言から拾って本当に置く。
        // （AIの約束を実体にする。これが無いと信頼が一番傷つく）
        //
        // ※ ここは以前、「クエストに置いとく？」という**問いかけ**にもマッチしていた。
        //   パラレルウォークは「それ、クエストに置いとく？」と聞く場所なので、
        //   本人が答える前に勝手に登録されてしまっていた。問いかけは対象外にする。
        const declaredQuest = clean0(full).split(/[。！\n]/).some((sentence) => {
          const s = sentence.trim();
          if (!s || /[？?]$/.test(s)) return false;                    // 問いかけは実行しない
          if (!/(クエスト|一手)/.test(s)) return false;
          return /(置いた|置いとく|置いといた|置いておく|置いておいた|入れた|入れとく|入れといた|入れておく|入れておいた|追加した|追加しておく|登録した|登録しておく)/.test(s);
        });
        const claimedQuest = declaredQuest && !questMatch;
        if (claimedQuest && !greet) {
          try {
            const { complete } = await import("@/lib/ai");
            const raw = await complete({
              userId,
              prompt: `下の発言で「クエストに置く」と約束した内容を、そのままクエスト化して。約束していなければ空配列。\nJSONのみ：{"quests":[{"title":"20字以内の行動","body":"ひとこと補足"}]}\n\n# 発言\n${clean0(full).slice(0, 1200)}`,
              maxTokens: 300, temperature: 0.2,
            });
            const m2 = raw.match(/\{[\s\S]*\}/);
            if (m2) {
              const arr = (JSON.parse(m2[0])?.quests ?? []) as any[];
              for (const c of arr.slice(0, 2)) {
                const title = String(c?.title ?? "").trim();
                if (!title) continue;
                const q = await createQuest(userId, { title, body: String(c?.body ?? ""), category: "life" });
                addedQuests.push({ id: q.id, title: q.title });
              }
            }
          } catch { /* 拾えなければ、下の掟の強化に任せる */ }
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
          .replace(/<wall>[\s\S]*?<\/wall>/g, "")
          .replace(/<parts_step>[\s\S]*?<\/parts_step>/g, "")
          .replace(/<guardian>[\s\S]*?<\/guardian>/g, "")
          .replace(/<travel>[\s\S]*?<\/travel>/g, "")
          .replace(/<walk>[\s\S]*?<\/walk>/g, "")
          .replace(/<shadow_step>[\s\S]*?<\/shadow_step>/g, "")
          .replace(/<shadow_pick>[\s\S]*?<\/shadow_pick>/g, "")
          .replace(/<shadow_light>[\s\S]*?<\/shadow_light>/g, "")
          // 最後の網：AIがタグ名を書き間違えても、本文には絶対に出さない。
          // 実際 <hero_delta> を <q-delta> と書いて、JSONごと画面に出たことがある。
          // 日本語の文章に <英小文字_-> の組は出てこないので、まとめて落とす。
          .replace(/<([a-z][a-z0-9_-]{1,22})>[\s\S]*?<\/>/g, "")
          .replace(/<[a-z][a-z0-9_-]{1,22}\s*\/?>/g, "")
          .trim();

        // タグが本文に混じっていたら、削り直した本文で置き換える
        if (faceMatch || moveMatch || choMatch || questMatch || heroMatch || wantEmotion || wantBreath || wallMatch || stepMatch || guardMatch || travelMatch || walkMatch || shStepMatch || shPickMatch || shLightMatch) {
          send("replace", { text: clean });
        }
        if (face) send("face", { face });
        if (wantEmotion) send("emotion", {});
        if (wantBreath) send("breath", {});
        if (wallStage) send("wall", { stage: wallStage });
        if (partsStep) send("parts_step", { step: partsStep });
        if (travelStage) send("travel", { stage: travelStage });
        if (walkStage) send("walk", { stage: walkStage });
        if (shadowStep) send("shadow_step", { step: shadowStep });
        if (shadowPick) send("shadow_pick", { pair: shadowPick });

        // 光の回収が完了 → 会話からカードを抽出して保存し、演出を出す
        if (shadowLight) {
          try {
            const pair = shadowPair(shadowLight);
            const { complete } = await import("@/lib/ai");
            const talked = [...history.map((h) => `${h.role === "user" ? "本人" : "案内役"}：${h.content}`), `案内役：${clean}`]
              .join("\n").slice(-3600);
            const raw = await complete({
              userId,
              prompt: `下は「影獣の鏡」のワークの対話。本人が光を取り戻した記録を、カード1枚ぶんに整理して。
**本人が言っていないことを作らない。** 出ていない項目は空文字にする。相手の実名・会社名など特定できる情報は入れない。
JSONだけで返す：
{"corePower":"取り戻した力(20字以内・本人の言葉ベース)","ownership":"許可の一文(「私は…してよい」の形・40字以内)","otherResp":"相手に返す責任(30字以内)","boundary":"決めた境界線(40字以内)","action24h":"24時間以内の一歩(30字以内)","before":数字かnull,"after":数字かnull}

# 対話
${talked}`,
              maxTokens: 400, temperature: 0.3,
            });
            const m = String(raw ?? "").match(/\{[\s\S]*\}/);
            // 抽出に失敗しても、回収の事実（影→光）だけのカードは必ず出す
            let c: any = {};
            try { c = m ? JSON.parse(m[0]) : {}; } catch { c = {}; }
            const card = {
              pairId: pair.id,
              shadowLabel: pair.shadow.label,
              lightLabel: pair.light.label,
              corePower: String(c.corePower ?? "").trim() || pair.core.join("・"),
              ownership: String(c.ownership ?? "").trim(),
              otherResp: String(c.otherResp ?? "").trim(),
              boundary: String(c.boundary ?? "").trim(),
              action24h: String(c.action24h ?? "").trim(),
              before: Number.isFinite(Number(c.before)) ? Number(c.before) : null,
              after: Number.isFinite(Number(c.after)) ? Number(c.after) : null,
            };
            // 記録（テーブルが無くても体験は止めない）
            try {
              const { saveShadowEncounter } = await import("@/lib/shadow-db");
              await saveShadowEncounter(userId, card as any);
            } catch (e) {
              if (!isMissingTable(e)) console.error("[shinga/chat] saveShadowEncounter failed:", e);
            }
            // 集めるカードにも1枚（ホームのコレクションに並ぶ）
            try {
              const { grantSkillCard } = await import("@/lib/awaken");
              await grantSkillCard(userId, {
                key: `shadow-${pair.id}-${today}`,
                title: pair.light.label,
                body: card.ownership || `${pair.shadow.short}の影から「${pair.light.short}」の光を取り戻した。`,
                rarity: "gold",
                source: `ミラーオブワールド（${pair.shadow.short}→${pair.light.short}）`,
              });
            } catch { /* カードが出せなくても続ける */ }
            send("shadow_card", { card });
          } catch (e) {
            console.error("[shinga/chat] shadow card failed:", e);
          }
        }

        // ガーディアン解放：守り手が役割を降り、才能として開いた瞬間
        if (releasedColor) {
          try {
            const trio = PARTS[releasedColor];
            // 「本当はどうしたい？」の答えを、その人の言葉のまま記録に残す
            const said = history.filter((h) => h.role === "user").slice(-4).map((h) => h.content).join(" / ").slice(0, 300);
            const { first, total } = await releaseGuardian(userId, releasedColor, said);
            send("guardian", {
              color: releasedColor, first, total,
              name: trio.guardian.name, title: trio.guardian.title,
              from: `${trio.defense.name}（${trio.defense.title}）`,
              message: trio.guardian.message,
              complete: total >= 4,
            });
            // 解放そのものを1枚のカードに（初回だけ。2回目以降は演出のみ）
            if (first) {
              const { grantSkillCard } = await import("@/lib/awaken");
              await grantSkillCard(userId, {
                key: `guardian-${releasedColor}`,
                title: `${trio.guardian.name}（${trio.guardian.title}）`,
                body: `${trio.defense.name}が役割を降りて、${trio.guardian.acts.slice(0, 3).join("・")}力になった。${trio.guardian.message}`,
                rarity: "gold",
                source: `内なる子の神殿（${trio.kanji}）`,
              });
            }
          } catch { /* 解放が記録できなくても、体験は止めない */ }
        }

        // 壁が全開＝ブロックが壊れた瞬間。そこで生まれた力を「スキルカード」として授ける
        if (wallStage === 5) {
          try {
            const { grantSkillCard } = await import("@/lib/awaken");
            const { complete } = await import("@/lib/ai");
            const talked = [...history.map((h) => h.content), clean].join("\n").slice(-1800);
            const raw = await complete({
              userId,
              prompt: `下は「どうせ無理」という思い込みを越えた対話。ここで壊れたブロックと、その裏返しで手に入った力を、カード1枚にして。
JSONだけで返す：{"title":"力の名前(8〜14字・かっこよく)","body":"どんな力か(40〜60字・その人の言葉に基づいて)","broke":"壊れたブロック(15字以内)"}

# 対話
${talked}`,
              maxTokens: 400, temperature: 0.9,
            });
            const m = String(raw ?? "").match(/\{[\s\S]*\}/);
            if (m) {
              const c = JSON.parse(m[0]);
              const title = String(c.title ?? "").trim();
              if (title) {
                await grantSkillCard(userId, {
                  key: `wall-${today}-${title.slice(0, 8)}`,
                  title,
                  body: String(c.body ?? "").trim(),
                  rarity: "gold",   // 壁を壊すのは最上位の出来事
                  source: `ウォールブレイク（${String(c.broke ?? "").trim()}を破壊）`,
                });
                send("skill", { title, body: String(c.body ?? "").trim(), rarity: "gold" });
              }
            }
          } catch { /* カードが出せなくても会話は続ける */ }
        }
        // ミラーオブワールド：いま続いている暴力・つきまといの話が出たら、内省ではなく窓口を添える
        if (!greet && mode === "shadow" && /殴られ|暴力|DV|つきまと|ストーカー|脅され|監視され|閉じ込め/.test(text)) {
          send("care", {
            text: [
              "それは、心のワークより先に、現実の安全がいちばん大事な状況だよ。",
              "・警察相談専用電話 #9110（緊急なら110）",
              "・DV相談ナビ #8008（最寄りの相談窓口につながる）",
              "・よりそいホットライン 0120-279-338（24時間・無料）",
              "記録を残すこと、物理的に距離を取ること、信頼できる人に話すことを優先してね。",
            ].join("\n"),
          });
        }
        // 命に関わる言葉が出たときは、相談先を必ず添える（機能ではなく責任として）
        if (!greet && /死にたい|消えたい|自殺|いなくなりたい|生きて(る|いる)意味|生きる意味|終わらせたい|リストカット/.test(text)) {
          send("care", {
            text: [
              "ひとりで抱えないでほしい。つらさが強いときは、人の声につながってね。",
              "・よりそいホットライン 0120-279-338（24時間・無料）",
              "・いのちの電話 0570-783-556",
              "・SNS相談「生きづらびっと」（LINE）",
              "このアプリは医療やカウンセリングの代わりにはなれません。",
            ].join("\n"),
          });
        }

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
