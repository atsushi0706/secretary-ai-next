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
          context?: { evidence?: unknown; location?: unknown; theme?: unknown; exception?: unknown; exceptionScore?: unknown; clue?: unknown };
        };
        const question = String(body?.question ?? "");
        const context = body?.context ?? {};
        const evidence = Array.isArray(context.evidence) ? context.evidence.join("、") : "";
        const answer = /操|支配/.test(question)
          ? `いいえ。催眠は人の意思を奪って操ることではありません。いまの「${context.location || "事件"}」で、命令と本人の反応を証拠で比べて確かめてみましょう。`
          : /自分の場合|入力した悩み/.test(question)
            ? `あなたが書いた「${context.theme || "変えたいこと"}」を100とすると、「${context.exception || "100ではなかった瞬間"}」では${context.exceptionScore || "100未満"}でした。その差を作った「${context.clue || "条件"}」を一つ観察するところから始められます。`
            : /簡単|言い換え/.test(question)
              ? "無理に動かそうとする前に、もう動いている小さな反応を見つけて使う、ということです。"
              : /別の解釈|当てはまらない/.test(question)
                ? "一度の反応だけなら偶然という解釈も残ります。だから、このゲームでは観察と反復の証拠まで集めて確かめます。"
                : `「${question}」ですね。${evidence ? `いま持っている「${evidence}」から考えると、` : "まだ証拠がないので、"}答えを先に決めず、起きた順番を比べるのが最初です。`;
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
  return <LearnPlayer episode={EP1} startPart={part} />;
}
