"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDictation } from "@/components/useDictation";
import { handleEnter, isTouchDevice } from "@/lib/enter-key";

/**
 * 入力バー（テキスト＋Typeless級の音声入力＋送信）。
 *
 * マイクをタップ → 話す（小声OK・無音でも切れない）→ もう一度タップ
 * → 高精度に文字化され、フィラーや言い直しが整った文章が入力欄に入る。
 * あとは送信するだけ。もちろん手で打ってもいい。
 */
export function VoiceBar({
  onSend,
  disabled,
  placeholder = "🎙 マイクを押して、話してみて",
  refill,
}: {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  /** 「書き直す」で戻ってきた文章。n を変えると同じ文章でも入り直す */
  refill?: { text: string; n: number };
}) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const d = useDictation();
  // スマホかどうかは画面が出てから調べる（サーバ側では分からない）
  const [touch, setTouch] = useState(false);
  useEffect(() => { setTouch(isTouchDevice()); }, []);

  // 「書き直す」で戻ってきた文章を入力欄に入れて、そこにカーソルを置く
  useEffect(() => {
    if (!refill?.text) return;
    setText(refill.text);
    const el = taRef.current;
    if (el) { el.focus(); el.setSelectionRange(refill.text.length, refill.text.length); }
  }, [refill?.n, refill?.text]);

  // 入力量に合わせて高さを伸ばす（画面の4割まで）
  const autosize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = Math.floor(window.innerHeight * 0.4);
    el.style.height = Math.min(el.scrollHeight, max) + "px";
  }, []);
  useEffect(() => { autosize(); }, [text, autosize]);

  async function toggleMic() {
    if (d.phase === "recording") {
      const result = await d.stop("インナーワールド（自己理解の対話）での発言");
      if (result) setText((t) => (t ? t + " " : "") + result);
    } else if (d.phase === "idle") {
      await d.start();
    }
  }

  async function submit() {
    const t = text.trim();
    if (!t || disabled || d.phase !== "idle") return;
    setText("");
    await onSend(t);
  }

  const mm = String(Math.floor(d.seconds / 60));
  const ss = String(d.seconds % 60).padStart(2, "0");
  const hint =
    disabled ? "考えています…" :
    d.phase === "recording" ? `聞いています ${mm}:${ss} — 小声でもOK。もう一度マイクで確定` :
    d.phase === "transcribing" ? "文字にして、整えています…" : "";

  return (
    <div className="vbar">
      {hint && (
        <div className={`vbar-state ${disabled ? "is-think" : ""}`}>
          {d.phase === "recording" && <span className="pulse" />}
          {hint}
          {d.phase === "recording" && (
            <span className="vbar-level"><span style={{ width: `${Math.round(d.level * 100)}%` }} /></span>
          )}
        </div>
      )}
      {d.error && (
        <div className="vbar-err">
          {d.error}
          {/* 鍵が無いのが原因なら、まっすぐ設定へ。それ以外は調子をみる画面へ */}
          {d.needsKey ? (
            <a href="/settings" className="vbar-err-a">⚙ キーを登録する →</a>
          ) : (
            <a href="/voice-check" className="vbar-err-a">マイクの調子をみる →</a>
          )}
        </div>
      )}
      {/* 「まだ書きたかったのに送信された」を無くす。スマホはEnterが改行だと明言する */}
      {touch && !!text && d.phase === "idle" && (
        <div className="vbar-nl">改行してOK。送るときだけ <b>▶</b> を押してね</div>
      )}

      {/*
        打つと、頭で整えてから出すことになる。話すと、整う前のものがそのまま出る。
        だから入口では必ず「話して」と言う。——ただし、
        ・もう話し始めている／打ち始めている
        ・録音中・文字化中
        ときは邪魔になるので引っ込める。
      */}
      {!text && d.phase === "idle" && !disabled && d.supported && (
        <div className="vbar-urge">🎙 打つより、<b>話して</b>。そのほうが、気持ちごと届くよ。</div>
      )}

      <div className="vbar-input">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onInput={autosize}
          onKeyDown={(e) => { if (d.phase === "idle") handleEnter(e, () => void submit()); }}
          placeholder={d.phase === "recording" ? "話してね…（あとで文字になるよ）" : placeholder}
          className="vbar-text"
          rows={1}
          disabled={disabled}
        />

        {d.supported && (
          <button
            type="button"
            className={`vbar-mic ${d.phase === "recording" ? "is-on" : ""} ${d.phase === "transcribing" ? "is-busy" : ""}`}
            onClick={() => void toggleMic()}
            disabled={disabled || d.phase === "transcribing"}
            title={d.phase === "recording" ? "タップで確定" : "音声入力"}
          >
            {d.phase === "recording" ? "■" : d.phase === "transcribing" ? "…" : "🎤"}
          </button>
        )}

        <button
          type="button"
          className="vbar-go"
          onClick={() => void submit()}
          disabled={disabled || !text.trim() || d.phase !== "idle"}
          title="送信"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
