"use client";

import { useDictation } from "@/components/useDictation";

/**
 * 話すと、整った文章になって返ってくる入力（ボタン1個ぶん）。
 *
 * 【なぜ作り替えたか】
 * 前はブラウザ内蔵の音声認識（SpeechRecognition）を使っていた。これには弱点がある：
 *   ・**黙ると勝手に止まる**。考えながら話すと、途中で切られる
 *   ・Androidでは同じ文が**何度も重なって**入る
 *     （「どんな日だったかそうね 今日はどんな日だったかそうね…」になるのはこれ）
 *   ・小さい声を雑音として消してしまう
 * チャット欄（VoiceBar）はもっと良い仕組みを使っていたのに、
 * ふりかえり・クエスト・状態メモだけが古いままだった。だから**そこだけ動きが違った**。
 *
 * いまは、チャット欄とまったく同じ useDictation を使う：
 *   押す 〜 もう一度押す の**全部を録音**して、まとめてサーバーで文字にする。
 *   黙っても切れない。小声でも拾う。重なって入ることもない。
 */

/** 何を話しているところか。書き起こしの精度が上がる */
const CONTEXT: Record<string, string> = {
  speech: "インナーワールド（自己理解の対話）での発言",
  quest: "これからやること・小さな一手の宣言",
  reflect: "その日の振り返り。今日どんな一日だったかを話している",
};

export function VoiceInput({
  mode = "speech",
  onText,
  compact,
}: {
  mode?: "speech" | "quest" | "reflect";
  onText: (text: string) => void;
  compact?: boolean;
}) {
  const d = useDictation();

  async function toggle() {
    if (d.phase === "recording") {
      const text = await d.stop(CONTEXT[mode] ?? CONTEXT.speech);
      if (text) onText(text);
    } else if (d.phase === "idle") {
      await d.start();
    }
  }

  const mm = String(Math.floor(d.seconds / 60));
  const ss = String(d.seconds % 60).padStart(2, "0");
  const busy = d.phase === "transcribing";

  return (
    <div className={compact ? "inline-flex items-center gap-1.5" : "inline-flex flex-col items-center"}>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className={`singa-mic ${d.phase === "recording" ? "is-on" : ""} ${busy ? "is-busy" : ""}`}
        title={d.phase === "recording" ? "話し終わったら、もう一度押す" : "押して話す（黙っても切れないよ）"}
      >
        {busy ? "…" : d.phase === "recording" ? "■" : "🎙"}
      </button>

      {/* 拾えているかが見えないと、話していいのか分からない */}
      {d.phase === "recording" && (
        <span className="vi-state">
          <span className="pulse" />
          聞いてるよ {mm}:{ss}
          <span className="vi-level"><span style={{ width: `${Math.round(d.level * 100)}%` }} /></span>
        </span>
      )}
      {busy && <span className="vi-state">文字にしてる…</span>}
      {d.error && <span className="vi-err">{d.error}</span>}
    </div>
  );
}
