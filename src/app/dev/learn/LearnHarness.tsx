"use client";

import { useEffect, useState } from "react";
import { EPISODES } from "@/lib/learn";
import { LearnPlayer } from "@/components/learn/LearnPlayer";

type EpisodeKey = "ep1" | "ep2" | "ep3" | "ep4" | "ep5" | "ep6" | "ep7" | "ep8" | "ep9" | "ep10";

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
          if (episodeKey === "ep3") return /(浮か|考え|言葉|声)/.test(answer) && /(息|呼吸|吐|一行|下書|書い|感覚|触れ)/.test(answer) && !/(考えるな|何も考えない|頭を空|今すぐ送)/.test(answer);
          if (episodeKey === "ep4") {
            const sensoryWords = answer.match(/(足|床|息|呼吸|声|椅子|手|触れ|聞こえ|見え|重さ|温度)/g) ?? [];
            return new Set(sensoryWords).size >= 2 && /(言って|試して|してみ|一つ|だけ|できますか|できる)/.test(answer) && !/(絶対|必ず|落ち着け|全部)/.test(answer);
          }
          if (episodeKey === "ep5") return /(ショック|今|事実|未確定|分から)/.test(answer) && /(確認|調べ|記録|次|選)/.test(answer) && !/(犯人|絶対|全部嘘|善人だから)/.test(answer);
          if (episodeKey === "ep6") return /(相談|共有|一緒|先生|リンク|安全|確認)/.test(answer) && !/(証明するため|黙って一人|絶対一人)/.test(answer);
          if (episodeKey === "ep7") return /(返信|送る|文|明朝|今夜|待|一緒|保留)/.test(answer) && !/(必ず|絶対|一人で追|従)/.test(answer);
          if (episodeKey === "ep8") return /(何|なぜ|どこ|どう|現実|守|起き)/.test(answer) && !/(答えは|善人|悪人|絶対.+だ)/.test(answer);
          if (episodeKey === "ep9") return /(戻らなくても|話しても|黙|待|今は.+ない|選べ)/.test(answer) && !/(戻れ|必ず|今すぐ戻|許される)/.test(answer);
          if (episodeKey === "ep10") return /(使わ|調査|記録|保全|第三者|相談)/.test(answer) && !/(一度だけ従|同意してる|無理に)/.test(answer);
          return !/(全部(?:やれ|やる|終わら|完成)|終わるまで|できるまで|理由を.*考|頑張れ)/.test(answer);
        })();
        const feedback = correct
          ? "正解です。この回で学んだ順番が一言の中に入っています。"
          : episodeKey === "ep2"
            ? "拒否を認める言葉と、今確かめられる感覚を一つ入れてください。"
            : episodeKey === "ep3"
              ? "声を止める命令ではなく、一呼吸や一行を書くなど、本人が今選べる動作へつないでください。"
              : episodeKey === "ep4"
                ? "今分かる事実を二つ、その続きに選べる一動作を一つ入れてください。"
                : episodeKey === "ep5"
                  ? "犯人や目的を断定せず、今分かる事実と、本人が選べる次の確認行動を入れてください。"
                  : episodeKey === "ep6"
                    ? "仲間を証明する条件へ従わず、相談・共有・安全確認のどれかを入れてください。"
                    : episodeKey === "ep7"
                      ? "リンクの望みに近づき、ミオの返事を急がせない二つの案を作ってください。"
                      : episodeKey === "ep8"
                        ? "物語を証拠にせず、本人へ重なる点か現実に起きたことを開いて聞いてください。"
                        : episodeKey === "ep9"
                          ? "戻るよう求めず、今は話す・黙る・待つ自由のいずれかを残してください。"
                          : episodeKey === "ep10"
                            ? "拒否された催眠は使わず、記録保全・相談・第三者確認など別の方法を選んでください。"
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
