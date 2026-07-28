"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ChatGPT / Claude のような、シンプルな入力バー。
 *
 * - テキスト欄 ＋ マイク ＋ 送信 の3つだけ。
 * - マイクを押すと録音開始。もう一度押すと止まり、
 *   自動で Typeless 風に整った文章が入力欄に入る（押すだけ）。
 * - あとは送信するだけ。もちろん手で打ってもいい。
 * - 録音は無音で途切れても自動で続く。録音中は画面を消させない。
 */

type Phase = "idle" | "recording" | "polishing";

function getSR(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function VoiceBar({
  onSend,
  disabled,
  placeholder = "話す、または書く",
}: {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const recogRef = useRef<any>(null);
  const wantRecording = useRef(false);
  const wakeLockRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 二重取り込み防止の土台（追記せず毎回作り直す）
  const baseRef = useRef("");
  const sessRef = useRef("");
  const textRef = useRef("");
  const interimRef = useRef("");
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { interimRef.current = interim; }, [interim]);

  useEffect(() => { setSupported(!!getSR()); }, []);

  // 入力量に合わせて高さを伸ばす（画面の4割まで）
  const autosize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = Math.floor(window.innerHeight * 0.4);
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, []);
  useEffect(() => { autosize(); }, [text, interim, phase, autosize]);

  // 画面を消させない（録音中）
  async function acquireWakeLock() {
    try {
      if ("wakeLock" in navigator) wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
    } catch { /* 取れなくても録音は続ける */ }
  }
  function releaseWakeLock() {
    try { wakeLockRef.current?.release?.(); } catch { /* ignore */ }
    wakeLockRef.current = null;
  }
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible" && wantRecording.current) void acquireWakeLock();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const stopRecognition = useCallback(() => {
    wantRecording.current = false;
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    recogRef.current = null;
    releaseWakeLock();
  }, []);
  useEffect(() => () => stopRecognition(), [stopRecognition]);

  function startRecording() {
    const SR = getSR();
    if (!SR) { setSupported(false); setError("この端末は音声入力に未対応です。文字で入力してください。"); return; }
    setError("");

    const recog = new SR();
    recog.lang = "ja-JP";
    recog.continuous = true;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    baseRef.current = textRef.current ? textRef.current + " " : "";
    sessRef.current = "";

    recog.onresult = (e: any) => {
      let fin = "", iv = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else iv += r[0].transcript;
      }
      sessRef.current = fin;
      setText(baseRef.current + fin);
      setInterim(iv);
    };
    recog.onerror = (e: any) => {
      const err = e?.error ?? "";
      if (err === "not-allowed" || err === "service-not-allowed") {
        setError("マイクが許可されていません。ブラウザの設定で許可してください。文字入力もできます。");
        wantRecording.current = false;
        setPhase("idle");
        releaseWakeLock();
      }
      // no-speech / network / aborted は自動再開に任せる
    };
    recog.onend = () => {
      if (wantRecording.current) {
        baseRef.current = baseRef.current + sessRef.current; // 確定分を土台へ（再開時の二重化を防ぐ）
        sessRef.current = "";
        try { recog.start(); } catch { /* すぐ再試行 */ }
      }
    };

    try {
      recog.start();
      recogRef.current = recog;
      wantRecording.current = true;
      setPhase("recording");
      void acquireWakeLock();
    } catch {
      setError("マイクを起動できませんでした。");
    }
  }

  // 録音を止めて、自動で整える（Typeless 風）
  async function stopAndPolish() {
    wantRecording.current = false;
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    releaseWakeLock();

    const raw = (baseRef.current + sessRef.current + (interimRef.current ? interimRef.current : "")).trim();
    setInterim("");
    setText(raw);
    if (!raw) { setPhase("idle"); return; }

    setPhase("polishing");
    try {
      const r = await fetch("/api/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw, mode: "speech" }),
      });
      const d = await r.json();
      if (d.text) setText(d.text);
    } catch { /* 整えに失敗しても、話した内容はそのまま残る */ }
    finally { setPhase("idle"); }
  }

  function toggleMic() {
    if (phase === "recording") void stopAndPolish();
    else if (phase === "idle") startRecording();
  }

  async function submit() {
    const t = text.trim();
    if (!t || disabled || phase !== "idle") return;
    stopRecognition();
    // 送信した瞬間に空にする（応答を待たない。残り続けるストレスをなくす）
    setText(""); setInterim("");
    baseRef.current = ""; sessRef.current = "";
    await onSend(t);
  }

  const display = phase === "recording"
    ? text + (interim ? (text ? " " : "") + interim : "")
    : text;

  const hint =
    disabled ? "考えています…" :
    phase === "recording" ? "聞いています… もう一度マイクで止める" :
    phase === "polishing" ? "整えています…" : "";

  return (
    <div className="vbar">
      {hint && (
        <div className={`vbar-state ${disabled ? "is-think" : ""}`}>
          {phase === "recording" && <span className="pulse" />}
          {hint}
        </div>
      )}
      {error && <div className="vbar-err">{error}</div>}

      <div className="vbar-input">
        <textarea
          ref={taRef}
          value={display}
          onChange={(e) => setText(e.target.value)}
          onInput={autosize}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && phase === "idle") {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          className="vbar-text"
          rows={1}
          disabled={disabled || phase !== "idle"}
        />

        <button
          type="button"
          className="vbar-go"
          onClick={() => void submit()}
          disabled={disabled || !text.trim() || phase !== "idle"}
          title="送信"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
