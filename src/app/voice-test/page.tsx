"use client";

/**
 * 声の確認ページ。
 *
 * どのエンジンが使われているのか、実際にどう聞こえるのかを、その場で確かめる。
 * 声を選び直したくなったときに、ここで聴いてから環境変数を決められる。
 */
import { useEffect, useState } from "react";
import Link from "next/link";

const SAMPLES = [
  "ゆっくり、息を吸って。……そのまま、少し止めてね。",
  "おはよう。今日も、ここから始めよっか。",
  "だいじょうぶ。きみの勇気は、ちゃんとここにあるよ。",
];

export default function VoiceTest() {
  const [info, setInfo] = useState<any>(null);
  const [text, setText] = useState(SAMPLES[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [engine, setEngine] = useState("");

  useEffect(() => { fetch("/api/tts").then((r) => r.json()).then(setInfo).catch(() => {}); }, []);

  async function play() {
    setBusy(true); setMsg(""); setEngine("");
    try {
      const r = await fetch("/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error === "no_tts_engine"
          ? "使える音声エンジンがありません（ELEVENLABS_API_KEY か OPENAI_API_KEY を設定してね）"
          : (d.error ?? r.status));
      }
      setEngine(r.headers.get("X-TTS-Engine") ?? "?");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.onended = () => URL.revokeObjectURL(url);
      await a.play();
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally { setBusy(false); }
  }

  return (
    <main className="gd-page">
      <header className="gd-head">
        <div className="gd-kicker">SINGA WORLD</div>
        <h1>声のテスト</h1>
        <p className="gd-lead">いま使われている音声エンジンを確かめて、実際に聴いてみる。</p>
      </header>

      <section className="gd-sec">
        <h2><span className="gd-num">1</span>いま使えるもの</h2>
        {!info ? <p className="gd-txt">確認中…</p> : (
          <div className="gd-check">
            <div className={`gc-row ${info.elevenlabs ? "ok" : "ng"}`}>
              <span className="gc-mark">{info.elevenlabs ? "✓" : "✕"}</span>
              <div><b>ElevenLabs</b>（いちばん自然）<br />
                {info.elevenlabs
                  ? <>使えます。声ID：<code style={{ fontSize: ".72rem" }}>{info.voiceId}</code> ／ モデル：{info.model}</>
                  : "ELEVENLABS_API_KEY が未設定です。"}</div>
            </div>
            <div className={`gc-row ${info.openai ? "ok" : ""}`}>
              <span className="gc-mark">{info.openai ? "✓" : "－"}</span>
              <div><b>OpenAI TTS</b>（次点）<br />
                {info.openai ? "使えます（ElevenLabs が無いときに使われます）。" : "OPENAI_API_KEY が未設定です。"}</div>
            </div>
            {!info.elevenlabs && !info.openai && (
              <div className="gc-row ng"><span className="gc-mark">!</span>
                <div>どちらも無いので、<b>同梱の音声ファイル</b>（機械的な声）が鳴ります。</div></div>
            )}
          </div>
        )}
      </section>

      <section className="gd-sec">
        <h2><span className="gd-num">2</span>聴いてみる</h2>
        <div className="gd-devtabs">
          {SAMPLES.map((s, i) => (
            <button key={i} className={`gd-devtab ${text === s ? "on" : ""}`} onClick={() => setText(s)}>
              <b>{["呼吸", "朝の声かけ", "励まし"][i]}</b>
            </button>
          ))}
        </div>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} rows={3}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: ".88rem", lineHeight: 1.9,
            background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.16)",
            color: "#f3ebdc", resize: "vertical",
          }}
        />
        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="gd-btn" onClick={() => void play()} disabled={busy}>
            {busy ? "生成中…" : "🔊 この声で聴く"}
          </button>
          {engine && <span style={{ fontSize: ".74rem", color: "#e0bd72" }}>← {engine} で再生</span>}
        </div>
        {msg && <p className="gd-txt" style={{ color: "#e6a0a0", marginTop: 12 }}>{msg}</p>}
        <p className="gd-txt gd-hint" style={{ marginTop: 16 }}>
          ※ 一度作った音声はブラウザに保存されます。声を変えたのに古い声が鳴るときは、
          ブラウザの「サイトデータを削除」をしてから開き直してください。
        </p>
      </section>

      <footer className="gd-foot">
        <Link href="/guide" className="gd-btn is-ghost">📘 使い方の説明書</Link>
        <Link href="/shinga" className="gd-btn is-ghost">🔑 インナーワールドへ</Link>
      </footer>
    </main>
  );
}
