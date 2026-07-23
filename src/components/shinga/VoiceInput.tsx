"use client";

import { useRef, useState } from "react";

/**
 * 話すと、整った文章になって返ってくる入力。
 *
 * ふつうの音声入力は、聞こえた音をそのまま文字にするだけなので
 * 「えーっと あの なんか」がそのまま入る。
 * ここでは、聞き終わったあとに一度AIに通して、読める文章に直してから返す。
 */
export function VoiceInput({
  mode = "speech",
  onText,
  compact,
}: {
  mode?: "speech" | "quest" | "reflect";
  onText: (text: string) => void;
  compact?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [error, setError] = useState("");
  const recogRef = useRef<any>(null);
  const finalRef = useRef("");

  async function polish(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setPolishing(true);
    try {
      const r = await fetch("/api/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
      });
      const d = await r.json();
      onText(d.text || text);
    } catch {
      onText(text); // 整えられなくても、話した内容は必ず渡す
    } finally {
      setPolishing(false);
    }
  }

  function toggle() {
    if (recording) {
      try { recogRef.current?.stop(); } catch { /* ignore */ }
      return;
    }
    setError("");
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) {
      setError("このブラウザは音声入力に対応していません（Chrome か Edge を使ってください）");
      return;
    }
    const recog = new SR();
    recog.lang = "ja-JP";
    recog.continuous = true;
    recog.interimResults = true;
    finalRef.current = "";

    recog.onresult = (e: any) => {
      // 追記せず、結果セット全体から確定分を毎回作り直す（二重取り込みを防ぐ）
      let fin = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript;
      }
      finalRef.current = fin;
    };
    recog.onerror = (e: any) => {
      // no-speech は「黙っていただけ」なのでエラー表示しない
      if (e?.error !== "no-speech" && e?.error !== "aborted") {
        setError("マイクが使えませんでした（" + (e?.error ?? "") + "）");
      }
      setRecording(false);
    };
    recog.onend = () => {
      setRecording(false);
      void polish(finalRef.current);
    };

    recog.start();
    recogRef.current = recog;
    setRecording(true);
  }

  return (
    <div className={compact ? "inline-flex items-center" : "inline-flex flex-col items-center"}>
      <button
        type="button"
        onClick={toggle}
        disabled={polishing}
        className={`singa-mic ${recording ? "is-on" : ""} ${polishing ? "is-busy" : ""}`}
        title={recording ? "話し終わったら押す" : "押して話す（話し終わると文章に整えます）"}
      >
        {polishing ? "…" : recording ? "■" : "🎙"}
      </button>
      {error && <span className="text-[10px] text-red-600 ml-1">{error}</span>}
      {recording && !compact && <span className="text-[10px] opacity-70 mt-0.5">聞いています</span>}
      {polishing && !compact && <span className="text-[10px] opacity-70 mt-0.5">整えています</span>}
    </div>
  );
}
