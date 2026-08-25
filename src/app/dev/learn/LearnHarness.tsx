"use client";

import { useEffect, useState } from "react";
import { EP1 } from "@/lib/learn/ep1";
import { LearnPlayer } from "@/components/learn/LearnPlayer";

/** 通信を偽物にして、本物の LearnPlayer を動かす */
export function LearnHarness({ part }: { part: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const real = window.fetch.bind(window);
    window.fetch = async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input?.url ?? "";
      if (url.startsWith("/api/tts")) return new Response("{}", { status: 404 });
      if (url.startsWith("/api/learn/ask")) {
        await new Promise((r) => setTimeout(r, 400));
        return new Response(JSON.stringify({ answer: "いい質問です。怒りも、そこに「すでに起きている反応」です。まず、いつ強く、いつ弱いかを見てください。" }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      }
      return real(input, init);
    };
    // 声の無い環境で固まらないよう、ブラウザ読み上げは使わない（文字数ぶん待つ動きになる）
    try { Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true }); } catch { /* ignore */ }
    setReady(true);
  }, []);
  if (!ready) return null;
  return <LearnPlayer episode={EP1} startPart={part} />;
}
