"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 会話の生命線になる音声入力バー。
 *
 * 直したこと:
 * - 遅さ：話し終えたら AI 整形を待たず、聞き取った文字をすぐ出す。整形は任意ボタンで。
 * - 文字数：入力欄は打った量に合わせて大きく伸びる（上限なし・画面の4割まで）。
 * - 時間制限：無音や途切れで止まっても、自動で録音を再開し続ける。
 * - スリープ：録音中は画面が消えないようにする（Wake Lock）。
 * - 勝手に送らない：必ず文字を見せて、確認・編集してから送る。
 */

type Phase = "idle" | "recording" | "paused" | "review";

const STATE_LABEL: Record<Phase, string> = {
  idle: "",
  recording: "聞いています…",
  paused: "一時停止中",
  review: "内容を確認してください",
};

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
  const [polishing, setPolishing] = useState(false);

  const recogRef = useRef<any>(null);
  const wantRecording = useRef(false);
  const wakeLockRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setSupported(!!getSR()); }, []);

  // 入力量に合わせて高さを伸ばす（画面の4割まで）
  const autosize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = Math.floor(window.innerHeight * 0.4);
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, []);
  useEffect(() => { autosize(); }, [text, phase, autosize]);

  // 画面を消させない（録音中）
  async function acquireWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch { /* 取れなくても録音は続ける */ }
  }
  function releaseWakeLock() {
    try { wakeLockRef.current?.release?.(); } catch { /* ignore */ }
    wakeLockRef.current = null;
  }
  // タブに戻ったとき、録音中なら Wake Lock を取り直す
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

  function startRecognition() {
    const SR = getSR();
    if (!SR) { setSupported(false); return; }
    setError("");

    const recog = new SR();
    recog.lang = "ja-JP";
    recog.continuous = true;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onresult = (e: any) => {
      let iv = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) setText((prev) => (prev ? prev + r[0].transcript : r[0].transcript));
        else iv += r[0].transcript;
      }
      setInterim(iv);
    };
    recog.onerror = (e: any) => {
      const err = e?.error ?? "";
      if (err === "not-allowed" || err === "service-not-allowed") {
        setError("マイクの使用が許可されていません。ブラウザの設定で許可してください。文字入力もできます。");
        wantRecording.current = false;
        setPhase("idle");
        releaseWakeLock();
      }
      // no-speech / network / aborted は onend の自動再開に任せる
    };
    recog.onend = () => {
      // ユーザーがまだ話したいなら、途切れても続ける（時間制限で勝手に終わらせない）
      if (wantRecording.current) {
        try { recog.start(); } catch { /* すぐ再試行される */ }
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

  function pause() {
    wantRecording.current = false;
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    releaseWakeLock();
    setInterim((iv) => { if (iv) setText((p) => p + iv); return ""; });
    setPhase("paused");
  }

  function finish() {
    wantRecording.current = false;
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    releaseWakeLock();
    setInterim((iv) => { if (iv) setText((p) => (p ? p + iv : iv)); return ""; });
    setPhase(text.trim() || interim.trim() ? "review" : "idle");
  }

  // 任意：聞き取った文字を、読みやすく整える（遅いので押したときだけ）
  async function polish() {
    const t = text.trim();
    if (!t) return;
    setPolishing(true);
    try {
      const r = await fetch("/api/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, mode: "speech" }),
      });
      const d = await r.json();
      if (d.text) setText(d.text);
    } catch { /* 失敗しても原文のまま */ }
    finally { setPolishing(false); }
  }

  function redo() {
    setText(""); setInterim(""); setError(""); setPhase("idle");
  }

  async function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    stopRecognition();
    await onSend(t);
    setText(""); setInterim(""); setPhase("idle");
  }

  const stateLabel = disabled ? "考えています…" : STATE_LABEL[phase];
  const canType = phase === "idle" || phase === "review";

  return (
    <div className="vbar">
      {stateLabel && (
        <div className={`vbar-state ${disabled ? "is-think" : ""}`}>
          {phase === "recording" && <span className="pulse" />}
          {stateLabel}
        </div>
      )}

      {/* 録音中も、聞き取った文字がそのまま入力欄に増えていくのが見える */}
      {(canType || phase === "recording" || phase === "paused") && (
        <textarea
          ref={taRef}
          value={text + (interim ? (text ? " " : "") + interim : "")}
          onChange={(e) => { setInterim(""); setText(e.target.value); }}
          onInput={autosize}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && canType) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          className="vbar-text"
          disabled={disabled || phase === "recording"}
          rows={1}
        />
      )}

      {error && <div className="vbar-err">{error}</div>}

      <div className="vbar-row">
        {phase === "idle" && (
          <>
            {supported && (
              <button className="vbar-btn is-rec" onClick={startRecognition} disabled={disabled}>
                <span className="mic">🎙</span> 話す
              </button>
            )}
            <button className="vbar-btn is-send" onClick={() => void submit()} disabled={disabled || !text.trim()}>
              送信
            </button>
          </>
        )}

        {phase === "recording" && (
          <>
            <button className="vbar-btn" onClick={pause}>一時停止</button>
            <button className="vbar-btn is-send" onClick={finish}>完了</button>
          </>
        )}

        {phase === "paused" && (
          <>
            <button className="vbar-btn is-rec" onClick={startRecognition}>再開</button>
            <button className="vbar-btn is-send" onClick={finish}>完了</button>
          </>
        )}

        {phase === "review" && (
          <>
            <button className="vbar-btn" onClick={redo}>やり直す</button>
            <button className="vbar-btn" onClick={polish} disabled={polishing || !text.trim()}>
              {polishing ? "整え中…" : "✨整える"}
            </button>
            {supported && (
              <button className="vbar-btn is-rec" onClick={startRecognition}>
                <span className="mic">🎙</span> 続ける
              </button>
            )}
            <button className="vbar-btn is-send" onClick={() => void submit()} disabled={disabled || !text.trim()}>
              送信
            </button>
          </>
        )}
      </div>
    </div>
  );
}
