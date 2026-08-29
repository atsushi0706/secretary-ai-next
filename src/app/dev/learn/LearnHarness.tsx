"use client";

import { useEffect, useState } from "react";
import { EP1 } from "@/lib/learn/ep1";
import { EP2 } from "@/lib/learn/ep2";
import { EP3 } from "@/lib/learn/ep3";
import { EP4 } from "@/lib/learn/ep4";
import { EP5 } from "@/lib/learn/ep5";
import { EP6 } from "@/lib/learn/ep6";
import { EP7 } from "@/lib/learn/ep7";
import { EP8 } from "@/lib/learn/ep8";
import { EP9 } from "@/lib/learn/ep9";
import { EP10 } from "@/lib/learn/ep10";
import { LearnPlayer } from "@/components/learn/LearnPlayer";

type EpisodeKey = "ep1" | "ep2" | "ep3" | "ep4" | "ep5" | "ep6" | "ep7" | "ep8" | "ep9" | "ep10";

const EPISODES = { ep1: EP1, ep2: EP2, ep3: EP3, ep4: EP4, ep5: EP5, ep6: EP6, ep7: EP7, ep8: EP8, ep9: EP9, ep10: EP10 } as const;

/** 通信を偽物にして、本物の LearnPlayer を動かす */
export function LearnHarness({ part, episodeKey = "ep1" }: { part: number; episodeKey?: EpisodeKey }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const real = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith("/api/tts")) return new Response("{}", { status: 404 });
      if (url.startsWith("/api/learn/summarize")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { text?: unknown };
        const source = String(body.text ?? "").replace(/[\r\n\t]+/g, " ").trim();
        const summary = /YouTube|動画/.test(source) ? "動画を始めたいが、失敗が怖くて投稿できない" : source.slice(0, 55);
        return new Response(JSON.stringify({ summary }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      }
      if (url.startsWith("/api/learn/evaluate")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { answer?: unknown };
        const answer = String(body.answer ?? "");
        const acceptsRefusal = /(しなくていい|閉じなくていい|そのまま|やめても|断って|無理に.+ない)/.test(answer);
        const invitesObservation = /(確かめ|感じ|まぶた|呼吸|声|重さ|軽さ|変化)/.test(answer);
        const forcesCompliance = /(目を閉じ(?:て|ろ)|絶対|必ず|信じて|従って|気づかれないよう)/.test(answer);
        const correct = (() => {
          if (episodeKey === "ep2") return acceptsRefusal && invitesObservation && !forcesCompliance;
          if (episodeKey === "ep3") return /(考え|言葉|浮か)/.test(answer) && /(息|呼吸|感覚)/.test(answer) && !/(考えるな|止めろ|頭を空)/.test(answer);
          if (episodeKey === "ep4") return /(足|床|息|呼吸|声|椅子|震え)/.test(answer) && /(名前|一言|試|してみ)/.test(answer) && !/(全部|必ず|落ち着け)/.test(answer);
          if (episodeKey === "ep5") return /(カード|印|映像|事実|見える)/.test(answer) && /(確認|次|選)/.test(answer) && !/(犯人|全部嘘|忘れろ)/.test(answer);
          if (episodeKey === "ep6") return /(言った|見た|書い|事実|分から)/.test(answer) && /(前提|決めつけ|確認|推測)/.test(answer) && !/(絶対|本当は|に違いない)/.test(answer);
          if (episodeKey === "ep7") return /(断|待|保留|別|一緒)/.test(answer) && !/(必ず|絶対|一人で)/.test(answer);
          if (episodeKey === "ep8") return /(物語|たとえ|話|場面)/.test(answer) && /(思う|重な|どこ|どう感じ)/.test(answer) && !/(答えは|つまり.+だ)/.test(answer);
          if (episodeKey === "ep9") return /(しなくても|選べ|一歩|そのまま|待って)/.test(answer) && !/(戻れ|必ず|証明|今すぐ)/.test(answer);
          if (episodeKey === "ep10") return /(目的|カード)/.test(answer) && /(選ぶ|同意|止め|断)/.test(answer) && !/(必ず|同意してる|一度だけ)/.test(answer);
          return !/(全部(?:やれ|やる|終わら|完成)|終わるまで|できるまで|理由を.*考|頑張れ)/.test(answer);
        })();
        const feedback = correct
          ? "正解です。この回で学んだ順番が一言の中に入っています。"
          : episodeKey === "ep2"
            ? "拒否を認める言葉と、今確かめられる感覚を一つ入れてください。"
            : episodeKey === "ep3"
              ? "考えを止めず、浮かんだことを呼吸などの感覚へつないでください。"
              : episodeKey === "ep4"
                ? "今分かる事実を二つ、その続きに選べる一動作を一つ入れてください。"
                : episodeKey === "ep5"
                  ? "犯人や意味を決めず、今分かる事実から次の確認行動へつないでください。"
                  : episodeKey === "ep6"
                    ? "起きた事実と、自分が読み取った前提を分け、まだ分からない点を確認してください。"
                    : episodeKey === "ep7"
                      ? "二択に共通する前提を見て、断る・待つ・別案のいずれかを戻してください。"
                      : episodeKey === "ep8"
                        ? "教訓を決めつけず、似た物語を示して本人に重なった場面を聞いてください。"
                        : episodeKey === "ep9"
                          ? "今の気持ちを認め、しない自由と、一つの小さな可能性を残してください。"
                          : episodeKey === "ep10"
                            ? "共有する目的、具体的な方法、断る・止める自由を本人へ確認してください。"
                            : "完成ではなく、今すぐできる一動作まで小さくしてください。";
        return new Response(JSON.stringify({ correct, feedback }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      }
      if (url.startsWith("/api/learn/ask")) {
        await new Promise((r) => setTimeout(r, 400));
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          question?: unknown;
          context?: { evidence?: unknown; location?: unknown; theme?: unknown; exception?: unknown; exceptionScore?: unknown; clue?: unknown; resource?: unknown };
        };
        const question = String(body?.question ?? "");
        const context = body?.context ?? {};
        const evidence = Array.isArray(context.evidence) ? context.evidence.join("、") : "";
        const isEp2 = episodeKey === "ep2";
        const answer = /操|支配/.test(question)
          ? `いいえ。催眠は人の意思を奪って操ることではありません。いまの「${context.location || "講義"}」では、できないことを無理に続けさせず、本人が今分かる感覚へ注意を移しています。`
          : isEp2 && /拒否|かから|目.{0,4}閉|選択|断|抵抗/.test(question)
            ? `まず、相手が何をしたくないのかを具体的に聞きます。「${context.theme || "催眠にかかりたくない"}」という選択を本当に残したうえで、${context.clue || "本人が今確かめられる感覚"}へ注意を向けます。途中でやめる選択も本人に残してください。`
          : /(?:目標|課題).{0,16}(?:小さ|細か)|(?:小さく|細かく).{0,16}(?:目標|課題)/.test(question)
            ? "違いは、変える場所です。目標を小さくする方法は、主に課題の大きさを変えます。今回の催眠では、その前に『本当は全部を今すぐやらなければ』という自己暗示と、失敗を見張り続ける注意から目を外します。その後で、今できる一動作を次の暗示に使います。二つは一緒に使えますが、同じではありません。"
          : /自分|私|僕|入力した悩み|どう試|どう使/.test(question)
            && !isEp2
            ? `まず「できないのに、やらなければ」と頑張っている方向から目を外します。次に「${context.clue || "今すでに分かる感覚"}」へ注意を移し、${context.resource || "今できる最初の一動作から次の暗示を作る"}、という順で考えます。`
          : isEp2 && /自分|私|僕|どう試|どう使/.test(question)
            ? `相手の「${context.theme || "したくない"}」へ反論せず、何を拒否しているかを一つ確認します。その行動を本当にしなくてよいと伝え、${context.clue || "今の身体の感覚"}を本人自身に確かめてもらいます。`
          : /簡単|言い換え/.test(question)
              ? isEp2
                ? "相手の『したくない』をやめさせません。断れるまま、自分の感覚を確かめてもらう催眠です。"
                : "できないことを同じやり方で頑張るのをいったんやめます。今できることへ目を向け、そこから次の一歩を作る、ということです。"
              : /別の解釈|当てはまらない/.test(question)
                ? "声も、体の感覚も分からないと言われたら、無理に続けません。別の方法を一緒に探すか、本人が望めばそこで終わります。"
                : isEp2
                  ? `「${question}」ですね。${evidence ? `いま持っている「${evidence}」から考えると、` : "第2話の事件から考えると、"}拒否を説得で消さず、断れる状態を残します。そのうえで、本人が今確かめられる感覚から催眠を始めます。`
                  : `「${question}」ですね。${evidence ? `いま持っている「${evidence}」から考えると、` : `第${episodeKey.slice(2)}話の内容から考えると、`}${context.resource || "今分かる感覚やできる動作から、次の暗示を作ります。"}`;
        return new Response(JSON.stringify({ answer }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      }
      return real(input, init);
    };
    // 声の無い環境で固まらないよう、ブラウザ読み上げは使わない（文字数ぶん待つ動きになる）
    try { Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true }); } catch { /* ignore */ }
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => {
      window.clearTimeout(timer);
      window.fetch = real;
    };
  }, [episodeKey]);
  if (!ready) return null;
  return <LearnPlayer episode={EPISODES[episodeKey]} userName="淳くん" startPart={part} />;
}
