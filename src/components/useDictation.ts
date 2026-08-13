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

/**
 * 書き起こしのはずが、AIへの指示文がそのまま返ってくることがある
 * （音声を聞き取れなかったモデルがプロンプトをオウム返しする）。
 * それを入力欄に入れてしまわないための判定。サーバ側でも同じ検査をしている。
 */
const PROMPT_MARKERS = ["polished", "逐語書き起こし", "JSONだけ", "フィラー", "この音声はアプリの音声入力", "出力形式", "整形版"];
function looksLikePrompt(s: string): boolean {
  if (!s) return false;
  return PROMPT_MARKERS.filter((m) => s.includes(m)).length >= 2;
}

/**
 * 「いま録音している」の目印。
 *
 * 【なぜ要るか】
 * 「iPhoneで、パラレルウォーク中に音声入力すると強制終了する」という声が届いた。
 * ただ、**本当に落ちているのか、こちらでは確かめようがなかった。**
 * タブごと消えるので、その場で何かを送ることもできない。
 *
 * だから、録りはじめに目印を置き、ちゃんと録り終わったら消す。
 * 次にアプリを開いたとき目印が残っていれば、
 * 「録音の途中で、画面がいなくなった」ということ。それを一度だけ報告する。
 *
 * 推測で手当てをするのをやめて、まず**起きているかどうかを確かめる**ためのもの。
 */
const CRUMB = "singa-mic-crumb";

function crumbOn(where: string) {
  try {
    localStorage.setItem(CRUMB, JSON.stringify({
      at: Date.now(), where,
      ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "",
    }));
  } catch { /* 置けなくても録音はできる */ }
}
function crumbOff() {
  try { localStorage.removeItem(CRUMB); } catch { /* ignore */ }
}

/**
 * 前回、録音の途中で画面がいなくなっていたら、一度だけ報告する。
 * アプリを開いたときに1回呼ぶ。
 */
export function reportMicCrash(): void {
  try {
    const raw = localStorage.getItem(CRUMB);
    if (!raw) return;
    localStorage.removeItem(CRUMB);
    const k = JSON.parse(raw);
    // 1日以上前のものは、もう手がかりにならない
    if (!k?.at || Date.now() - Number(k.at) > 86400000) return;
    void fetch("/api/client-error", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({
        where: "mic-interrupted",
        message: `録音の途中で画面がいなくなった（${k.where ?? "?"}）`,
        stack: "", componentStack: "", ua: k.ua ?? "",
      }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

export function useDictation() {
  const [phase, setPhase] = useState<DictPhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);       // 0..1 入力レベル（小声でも拾えてるかの可視化）
  const [error, setError] = useState("");
  /** 鍵（Gemini APIキー）が無くて失敗した。画面に設定への入口を出すのに使う */
  const [needsKey, setNeedsKey] = useState(false);

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
    crumbOff();          // ちゃんと終わったので、目印を消す
  }, []);
  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (phase !== "idle") return;
    setError("");
    try {
      // 小声設定：AGCで持ち上げ、強いNSは切る（小声がノイズとして消えるのを防ぐ）
      // 録りはじめの目印（ちゃんと終われば消える。残っていたら＝途中で落ちた）
      crumbOn(typeof location !== "undefined" ? location.pathname : "");
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
      /**
       * 細切れ（timeslice）にしない。
       * iPhone の Safari は mp4 を「断片つなぎ」で吐くので、
       * 細切れにしたものをつなぐと、書き起こし側が開けないファイルになることがある。
       * こちらは途中のデータを使っていないので、止めたときに一度で受け取れば足りる。
       */
      rec.start();
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
      // 「ブラウザの設定で」だけでは、どこを押すのか分からない（実際に詰まった）。
      // パソコンとスマホで押す場所が違うので、その端末に合わせて言う。
      const touch = (() => {
        try { return window.matchMedia("(hover: none), (pointer: coarse)").matches; } catch { return false; }
      })();
      setError(name === "NotAllowedError"
        ? (touch
          ? "マイクが許可されていません。アドレスバーの左のマーク（「ぁあ」か鍵）を押して、「マイク」を「許可」にしてね。"
          : "マイクが許可されていません。アドレスバー左端のマーク（🎤 か 鍵）を押して、「マイク」を「許可」にしてから、F5で読み込み直してね。")
        : name === "NotFoundError" ? "マイクが見つかりませんでした。パソコン側でマイクが止められているかもしれません。"
          : name === "NotReadableError" ? "マイクが他のアプリに使われているみたい。Zoomや録音アプリを閉じて、もう一度試してね。"
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
      /*
       * 録った音は、ひとつのBlobにまとめたら**すぐ手放す**。
       * 前は chunksRef に持ったままで、次に録るまでメモリに残っていた。
       * 背景画像と重なると、スマホのタブが落ちる原因になる。
       */
      const take = () => {
        const b = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
        chunksRef.current = [];
        return b;
      };
      rec.onstop = () => resolve(take());
      try { rec.stop(); } catch { resolve(take()); }
    });
    cleanup();

    // 音が入っていないとき。黙って戻ると「押しても反応しない」ように見えるので必ず言う
    if (blob.size < 1200) {
      setError("音がほとんど入っていませんでした。マイクの許可と、口との距離（10〜15cm）を確かめてみて。うまくいかないときは /voice-check で調べられるよ。");
      setPhase("idle");
      return null;
    }

    try {
      const fd = new FormData();
      const ext = (mimeRef.current || "").includes("mp4") ? "m4a" : "webm";
      fd.append("audio", blob, `speech.${ext}`);
      if (context) fd.append("context", context);
      const r = await fetch("/api/stt", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) {
        /*
         * キーが無い／効かないのが原因なら、それをはっきり言う。
         * 「文字化に失敗しました」だけでは、何をすればいいのか分からないまま終わる
         *（実際に、そこで止まったままのお客様がいた）。
         */
        const why = `${d?.error ?? ""}${d?.detail ?? ""}`;
        if (r.status === 503 || /キー|API key|401|403|PERMISSION/i.test(why)) {
          setNeedsKey(true);
          setError("声を文字にするための鍵（Gemini APIキー）が、まだ入っていません。設定画面で登録すると使えるようになるよ。");
          return null;
        }
        // 原因が分かるよう、サーバーが返した詳細も添える
        setError(d?.detail ? `${d.error}（${String(d.detail).slice(0, 90)}）` : (d?.error || "文字化に失敗しました"));
        return null;
      }
      const text = String(d.text ?? "").trim();
      if (!text) {
        setError("音は届いたけれど、言葉として聞き取れなかった。もう少しはっきり、近くで話してみて。");
        return null;
      }
      // 最後の砦：万一AIへの指示文がそのまま返ってきても、入力欄には絶対に入れない
      if (looksLikePrompt(text)) {
        setError("うまく聞き取れなかった。もう一度、少しはっきり話してみて。");
        return null;
      }
      return text || null;
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

  return { phase, seconds, level, error, needsKey, start, stop, cancel, supported: typeof navigator !== "undefined" && !!navigator.mediaDevices };
}
