"use client";

/**
 * 本物の ShingaWorld を、偽の通信で動かす実験台（開発用）。
 *
 * 目的：「返事が来たあと、チャットの表示だけ消える」の再現。
 * 通信は window.fetch を丸ごと差し替えて、その場で返す。
 */
import { useEffect, useState } from "react";
import { ShingaWorld } from "@/components/shinga/ShingaWorld";

const NL = String.fromCharCode(10);

/** ?case=… で、サーバが返しうる形を切り替えて試す */
function sse(text: string, kind: string): Response {
  const ev = (n: string, d: any) => `event: ${n}${NL}data: ${JSON.stringify(d)}${NL}${NL}`;
  const parts = [ev("delta", { text })];
  if (kind === "move") parts.push(ev("move", { place: "peak" }));
  if (kind === "emptyreplace") parts.push(ev("replace", { text: "" }));
  else parts.push(ev("replace", { text }));
  if (kind === "choices") parts.push(ev("choices", [{ label: "もう少し歩く" }, { label: "結晶化する", mode: "crystal" }]));
  if (kind === "emotion") parts.push(ev("emotion", {}));
  if (kind === "care") parts.push(ev("care", { text: "無理しないでね" }));
  if (kind === "walk10") parts.push(ev("walk", { stage: 10 }));
  else parts.push(ev("walk", { stage: 2 }));
  parts.push(ev("done", {}));
  return new Response(parts.join(""), { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

export function WalkHarness() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const real = window.fetch.bind(window);
    let turn = 0;
    (window as any).fetch = async (input: any, init?: any) => {
      const url = String(typeof input === "string" ? input : input?.url ?? "");
      if (url.startsWith("/api/shinga/chat")) {
        turn += 1;
        const kind = new URLSearchParams(window.location.search).get("case") ?? "plain";
        return sse(`${turn}回目の返事だよ。あさから筋トレね、それ最高だわ。そこで、何がしたくなってくる？`, kind);
      }
      if (url.startsWith("/api/")) {
        // それ以外はぜんぶ空で返す（画面が止まらない最小限）
        return new Response(JSON.stringify({
          flags: {}, features: {}, quests: [], cards: [], works: [], sessions: [], memories: [],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return real(input, init);
    };
    setReady(true);
    return () => { (window as any).fetch = real; };
  }, []);

  if (!ready) return <div style={{ padding: 20 }}>準備中…</div>;
  return (
    <main className="min-h-screen">
      <ShingaWorld guideName="清瀬リンク" avatarUrl="/kiyose.png" openMode="walk" />
    </main>
  );
}
