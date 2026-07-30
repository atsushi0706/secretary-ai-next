"use client";
import { useEffect, useState } from "react";
import { ShingaWorld } from "@/components/shinga/ShingaWorld";

/** PV撮影用ハーネス。?fresh=1 で手紙フローから、?img&real&questdone&level で状態切替 */
export default function ZzpDemo() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const fresh = q.get("fresh") === "1";
    const img = Number(q.get("img") ?? "5");
    const real = Number(q.get("real") ?? "1");
    const level = Number(q.get("level") ?? "62");
    const questdone = q.get("questdone") === "1";
    try {
      const t = new Date();
      const d = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      localStorage.clear();
      if (!fresh) {
        localStorage.setItem(`iw-mood-${d}`, "3");
        localStorage.setItem(`iw-perf-${d}`, "7");
        localStorage.setItem(`iw-letterseen-${d}`, "1");
      }
    } catch {}
    const orig = window.fetch.bind(window);
    (window as any).fetch = async (url: any, opts: any) => {
      const u = String(url);
      const j = (o: any) => new Response(JSON.stringify(o), { status: 200, headers: { "Content-Type": "application/json" } });
      if (u.includes("/api/quest-card")) {
        if (opts?.method === "POST") return j({ ok: true, card: { date: "x", symbol: 4, interpretation: "x", challenge: "うん、その気持ち、まず受け取るよ😌\nじゃあ今日は——その一歩だけ、踏み出してみて。\n今日これに立ち向かう？", done: false } });
        return j({ card: { date: "x", symbol: 4, interpretation: "", challenge: "", done: false } });
      }
      if (u.includes("/api/link-letter")) return j({ letter: { date: "x", hasIdeal: true, emotion: "解放", body: "やあ。\n今日は少し、胸が重たい日だったね。\nでも大丈夫。あの頃があったから、今の私がある。\nだから今日は、その感じを先に受け取って。" } });
      if (u.includes("/api/inner-hud")) return j({
        grounding: { imageDays: img, realDays: real },
        quest: { date: "x", items: [{ text: "書きかけの記事を1段落だけ書く", done: questdone }], percent: questdone ? 100 : 0 },
        level: { level, max: 100, actions: [] },
      });
      if (u.includes("/api/hero")) return j({ hasIdentity: true, hero: { desired_world: "自分の言葉で堂々と発信できている世界", hero_statement: "私は、恐れながらも一歩踏み出す人。", levels: { inner: 55, embodiment: 35, relationship: 60, delivery: 30, socialization: 15 } } });
      if (u.includes("/api/cycles")) return j({ hasBirth: true, hasGender: true, master: false, activeDays: 10, elapsedDays: 45, cycles: [], life: { startAge: 1, currentIndex: 3, nearBoundary: false, periods: [
        { ageStart: 1, ageEnd: 11, label: "ゆるめて整える時期", meaning: "x", isCurrent: false },
        { ageStart: 11, ageEnd: 21, label: "外へ出ていく時期", meaning: "x", isCurrent: false },
        { ageStart: 21, ageEnd: 31, label: "地に足がつく時期", meaning: "x", isCurrent: false },
        { ageStart: 31, ageEnd: 41, label: "形になっていく時期", meaning: "自分が整い、外へ出る準備が進む。輪郭がはっきりしていく10年。", isCurrent: true },
        { ageStart: 41, ageEnd: 51, label: "揺れながら磨かれる時期", meaning: "x", isCurrent: false },
        { ageStart: 51, ageEnd: 61, label: "芽吹きの時期", meaning: "x", isCurrent: false },
      ] } });
      if (u.includes("/api/shinga/chat")) {
        const b = JSON.parse(opts?.body ?? "{}");
        const isWall = b.mode === "breakthrough";
        const t = String(b.text ?? "");
        let reply: string;
        if (isWall) {
          reply = t.includes("安心")
            ? "そう、それ「一度うまくいったやり方」なんだよ。責める必要ないやつ😌 じゃあ本当はどうありたい？<wall>3</wall>"
            : t.includes("届け")
              ? "そこが統合点だね。深く作り込める力＝きみの才能だよ。「無理」は方向を変えれば強みになる😏<wall>5</wall>"
              : "うん、その「無理」って気持ち、まず受け取るよ。それがあると、どんな良いことがある？<wall>2</wall>";
        } else {
          reply = t.includes("海")
            ? "いいね、その景色😊 もっと聞かせて——そこで何を感じてる？"
            : t.includes("でも")
              ? "いまはいいんだって。ちゃんとパラレル（理想）を見ようよ。"
              : "なるほどね。そう感じてるんだ😊 それ、もう少し具体的に見える？";
        }
        const enc = (n: string, d2: any) => `event: ${n}\ndata: ${JSON.stringify(d2)}\n\n`;
        const m = reply.match(/<wall>(\d)<\/wall>/);
        const body = enc("delta", { text: reply }) + enc("replace", { text: reply.replace(/<wall>.*?<\/wall>/, "") }) + (m ? enc("wall", { stage: Number(m[1]) }) : "") + enc("done", { ok: true });
        return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
      }
      if (u.includes("/api/tts")) return new Response("no", { status: 500 });
      return j({ ok: true, tasks: [], items: [], url: null, configured: false });
    };
    setReady(true);
    return () => { (window as any).fetch = orig; };
  }, []);
  if (!ready) return null;
  return <div style={{ position: "fixed", inset: 0 }}><ShingaWorld guideName="清瀬リンク" avatarUrl="/kiyose.png" /></div>;
}
