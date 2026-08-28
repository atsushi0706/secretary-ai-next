"use client";

import { useEffect, useState } from "react";
import { EP1 } from "@/lib/learn/ep1";
import { LearnPlayer } from "@/components/learn/LearnPlayer";

/** 通信を偽物にして、本物の LearnPlayer を動かす */
export function LearnHarness({ part }: { part: number }) {
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
      if (url.startsWith("/api/learn/ask")) {
        await new Promise((r) => setTimeout(r, 400));
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          question?: unknown;
          context?: { evidence?: unknown; location?: unknown; theme?: unknown; exception?: unknown; exceptionScore?: unknown; clue?: unknown; resource?: unknown };
        };
        const question = String(body?.question ?? "");
        const context = body?.context ?? {};
        const evidence = Array.isArray(context.evidence) ? context.evidence.join("、") : "";
        const answer = /操|支配/.test(question)
          ? `いいえ。催眠は人の意思を奪って操ることではありません。いまの「${context.location || "講義"}」では、できないことを無理に続けさせず、本人が今分かる感覚へ注意を移しています。`
          : /(?:目標|課題).{0,16}(?:小さ|細か)|(?:小さく|細かく).{0,16}(?:目標|課題)/.test(question)
            ? "違いは、変える場所です。目標を小さくする方法は、主に課題の大きさを変えます。今回の催眠では、その前に『本当は全部を今すぐやらなければ』という自己暗示と、失敗を見張り続ける注意から目を外します。その後で、今できる一動作を次の暗示に使います。二つは一緒に使えますが、同じではありません。"
          : /自分|私|僕|入力した悩み|どう試|どう使/.test(question)
            ? `まず「できないのに、やらなければ」と頑張っている方向から目を外します。次に「${context.clue || "今すでに分かる感覚"}」へ注意を移し、${context.resource || "今できる最初の一動作から次の暗示を作る"}、という順で考えます。`
            : /簡単|言い換え/.test(question)
              ? "できないことを同じやり方で頑張るのをいったんやめます。今できることへ目を向け、そこから次の一歩を作る、ということです。"
              : /別の解釈|当てはまらない/.test(question)
                ? "声も、体の感覚も分からないと言われたら、無理に続けません。別の方法を一緒に探すか、本人が望めばそこで終わります。"
                : `「${question}」ですね。${evidence ? `いま持っている「${evidence}」から考えると、` : "第1話の内容から考えると、"}先に、できない方向を頑張り続ける自己暗示から目を外します。その後で、今分かる感覚やできる動作へ注意を移し、次の暗示を作ります。`;
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
  }, []);
  if (!ready) return null;
  return <LearnPlayer episode={EP1} userName="淳くん" startPart={part} />;
}
