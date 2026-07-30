"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Typeless級の音声入力フック（リアルバース・インナーワールド共用）。
 *
 * 小声対策（Typeless調査レポート§4.2に準拠）:
 * - 録音はタップ〜タップの全区間。VADに「無音」と誤判定させて切らせない（最重要）
 * - autoGainControl で弱い信号を持ち上げる
 * - noiseSuppression は切る（強いノイズ除去は小声をノイズとして消すため）
 * - 録音中に入力レベル(RMS)を可視化 → 拾えているかその場で分かる
 *
 * 使い方: const d = useDictation(); d.start() → d.stop() → 整った文章が返る
 */

export type DictPhase = "idle" | "recording" | "transcribing";

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  // mp4(AAC)を最優先（GeminiもOpenAIも公式対応）。無ければwebm/opus
  for (const m of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* ignore */ }
  }
  return "";
}

export function useDictation() {
  const [phase, setPhase] = useState<DictPhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);       // 0..1 入力レベル（小声でも拾えてるかの可視化）
  const [error, setError] = useState("");

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<any>(null);
  const mimeRef = useRef("");

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    streamRef.current = null;
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    audioCtxRef.current = null;
    try { wakeLockRef.current?.release?.(); } catch { /* ignore */ }
    wakeLockRef.current = null;
    recRef.current = null;
    setLevel(0);
  }, []);
  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (phase !== "idle") return;
    setError("");
    try {
      // 小声設定：AGCで持ち上げ、強いNSは切る（小声がノイズとして消えるのを防ぐ）
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      // 入力レベルの可視化（拾えているかを見せる）
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
          const rms = Math.sqrt(sum / buf.length);
          setLevel(Math.min(1, rms * 6)); // 小声でも動くよう感度高め
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch { /* レベル表示が無くても録音は続ける */ }

      const mime = pickMime();
      mimeRef.current = mime;
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.start(1000);
      recRef.current = rec;

      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => {
        // 5分で自動停止の合図（実停止はUI側のstop呼び出しに任せず、ここで打ち切る）
        if (s + 1 >= 300 && recRef.current?.state === "recording") { try { recRef.current.requestData(); } catch { /* ignore */ } }
        return s + 1;
      }), 1000);

      try { if ("wakeLock" in navigator) wakeLockRef.current = await (navigator as any).wakeLock.request("screen"); } catch { /* ignore */ }
      setPhase("recording");
    } catch (e: any) {
      const name = e?.name ?? "";
      setError(name === "NotAllowedError"
        ? "マイクが許可されていません。ブラウザの設定で許可してね。"
        : "マイクを起動できませんでした。");
      cleanup();
    }
  }, [phase, cleanup]);

  /** 録音を止めて文字化。整った文章を返す（失敗時 null） */
  const stop = useCallback(async (context?: string): Promise<string | null> => {
    const rec = recRef.current;
    if (!rec || phase !== "recording") return null;
    setPhase("transcribing");
    clearInterval(timerRef.current);

    const blob: Blob = await new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" }));
      try { rec.stop(); } catch { resolve(new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" })); }
    });
    cleanup();

    if (blob.size < 1200) { setPhase("idle"); return null; } // 実質無音

    try {
      const fd = new FormData();
      const ext = (mimeRef.current || "").includes("mp4") ? "m4a" : "webm";
      fd.append("audio", blob, `speech.${ext}`);
      if (context) fd.append("context", context);
      const r = await fetch("/api/stt", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) {
        // 原因が分かるよう、サーバーが返した詳細も添える
        setError(d?.detail ? `${d.error}（${String(d.detail).slice(0, 90)}）` : (d?.error || "文字化に失敗しました"));
        return null;
      }
      return String(d.text ?? "").trim() || null;
    } catch (e: any) {
      setError("通信に失敗しました。もう一度試してね。");
      return null;
    } finally {
      setPhase("idle");
    }
  }, [phase, cleanup]);

  const cancel = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    cleanup();
    setPhase("idle");
  }, [cleanup]);

  return { phase, seconds, level, error, start, stop, cancel, supported: typeof navigator !== "undefined" && !!navigator.mediaDevices };
}
