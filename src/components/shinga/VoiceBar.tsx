"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 会話の生命線になる音声入力バー。
 *
 * 大事にしていること:
 * - 勝手に送らない。話し終えたら必ず文字を見せて、確認してから送る。
 * - いま何が起きているかを、常に言葉で出す（聞いています／文字にしています…）。
 * - 録音・一時停止・送信・やり直す のボタンを常に出す。
 * - 精度が完璧でなくても、文字を編集してから送れるので破綻しない。
 * - キーボードでも打てる。音声が使えない環境でも困らない。
 */

type Phase = "idle" | "recording" | "paused" | "transcribing" | "review";

const STATE_LABEL: Record<Phase, string> = {
  idle: "",
  recording: "聞いています…",
  paused: "一時停止中",
  transcribing: "文字にしています…",
  review: "内容を確認してください",
};

function getSR(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function VoiceBar({
  onSend,
  disabled,
  placeholder = "話す",
}: {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");        // 確定して編集できる文字
  const [interim, setInterim] = useState("");   // いま聞き取っている途中の文字
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const recogRef = useRef<any>(null);
  const wantRecording = useRef(false);          // ユーザーが録音を望んでいるか（自動再開の判定用）
  const rawRef = useRef("");                     // 音声から起こした生テキスト（未整形）

  useEffect(() => {
    setSupported(!!getSR());
  }, []);

  const stopRecognition = useCallback(() => {
    wantRecording.current = false;
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    recogRef.current = null;
  }, []);

  useEffect(() => () => stopRecognition(), [stopRecognition]);

  // 録音開始（silence で勝手に止まるブラウザ対策として、止まったら自動で再開する）
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
        if (r.isFinal) rawRef.current += r[0].transcript;
        else iv += r[0].transcript;
      }
      setInterim(iv);
    };
    recog.onerror = (e: any) => {
      const err = e?.error ?? "";
      // no-speech / aborted は「黙っていた」だけなのでエラーにしない
      if (err && err !== "no-speech" && err !== "aborted") {
        setError("マイクが使えませんでした（" + err + "）。文字で入力もできます。");
        wantRecording.current = false;
        setPhase("idle");
      }
    };
    recog.onend = () => {
      // ユーザーがまだ録音したいなら、途切れても続ける
      if (wantRecording.current) {
        try { recog.start(); } catch { /* ignore */ }
      }
    };

    try {
      recog.start();
      recogRef.current = recog;
      wantRecording.current = true;
      setPhase("recording");
    } catch {
      setError("マイクを起動できませんでした。");
    }
  }

  function pause() {
    wantRecording.current = false;
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    setInterim("");
    setPhase("paused");
  }

  function resume() {
    startRecognition();
  }

  // 話し終わり → 生テキストを整えて、確認画面に出す（まだ送らない）
  async function finishAndReview() {
    stopRecognition();
    const raw = (rawRef.current + " " + interim).trim();
    setInterim("");
    if (!raw) {
      setPhase("idle");
      return;
    }
    setPhase("transcribing");
    try {
      const r = await fetch("/api/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw, mode: "speech" }),
      });
      const d = await r.json();
      setText((prev) => {
        const add = (d.text || raw).trim();
        return prev ? `${prev} ${add}` : add;
      });
    } catch {
      setText((prev) => (prev ? `${prev} ${raw}` : raw)); // 整形に失敗しても、話した内容は必ず残す
    } finally {
      rawRef.current = "";
      setPhase("review");
    }
  }

  function redo() {
    rawRef.current = "";
    setInterim("");
    setText("");
    setError("");
    setPhase("idle");
  }

  async function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    stopRecognition();
    await onSend(t);
    rawRef.current = "";
    setText("");
    setInterim("");
    setPhase("idle");
  }

  const stateLabel = disabled ? "考えています…" : STATE_LABEL[phase];
  const showLive = phase === "recording" || phase === "paused";
  const canType = phase === "idle" || phase === "review";

  return (
    <div className="vbar">
      {/* いま何が起きているか */}
      {stateLabel && (
        <div className={`vbar-state ${disabled ? "is-think" : ""}`}>
          {phase === "recording" && <span className="pulse" />}
          {stateLabel}
        </div>
      )}

      {/* 録音中：聞き取っている言葉をそのまま見せる */}
      {showLive && (
        <div className="vbar-live">
          {(rawRef.current || interim)
            ? <span>{rawRef.current}<span className="dim">{interim}</span></span>
            : <span className="dim">話しかけてください…</span>}
        </div>
      )}

      {/* 確認・入力欄 */}
      {canType && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={phase === "review" ? 2 : 1}
          placeholder={placeholder}
          className="vbar-text"
          disabled={disabled}
        />
      )}

      {error && <div className="vbar-err">{error}</div>}

      {/* ボタン列（状態によって出るものが変わる） */}
      <div className="vbar-row">
        {phase === "idle" && (
          <>
            {supported && (
              <button className="vbar-btn is-rec" onClick={startRecognition} disabled={disabled} title="押して話す">
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
            <button className="vbar-btn is-send" onClick={() => void finishAndReview()}>完了</button>
          </>
        )}

        {phase === "paused" && (
          <>
            <button className="vbar-btn is-rec" onClick={resume}>再開</button>
            <button className="vbar-btn is-send" onClick={() => void finishAndReview()}>完了</button>
          </>
        )}

        {phase === "transcribing" && (
          <button className="vbar-btn" disabled>整えています…</button>
        )}

        {phase === "review" && (
          <>
            <button className="vbar-btn" onClick={redo}>やり直す</button>
            {supported && (
              <button className="vbar-btn is-rec" onClick={resume} title="続けて話す">
                <span className="mic">🎙</span> 続ける
              </button>
            )}
            <button className="vbar-btn is-send" onClick={() => void submit()} disabled={disabled || !text.trim()}>
              送信する
            </button>
          </>
        )}
      </div>
    </div>
  );
}
