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
          ? `いいえ。催眠は人の意思を奪って操ることではありません。いまの「${context.location || "講義"}」では、本人が使えるやり方に合わせて暗示を変えています。`
          : /自分|私|僕|入力した悩み|どう試|どう使/.test(question)
            ? `あなたが選んだ催眠の入口は「${context.clue || "本人が使いやすかった入口"}」です。そこから、${context.resource || "本人が実際に使えるやり方に合わせて次の暗示を作る"}、という順で考えます。`
            : /簡単|言い換え/.test(question)
              ? "催眠を受ける人を台本へ合わせず、催眠の言葉をその人へ合わせ直す、ということです。"
              : /別の解釈|当てはまらない/.test(question)
                ? "どの方法も分かりにくい時は、催眠に入ったことにせず、別の方法を探すか、そこでやめます。"
                : `「${question}」ですね。${evidence ? `いま持っている「${evidence}」から考えると、` : "第1話の内容から考えると、"}本人が実際に使える入口を確かめ、その入口に合わせて暗示を変えるのが最初です。`;
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
