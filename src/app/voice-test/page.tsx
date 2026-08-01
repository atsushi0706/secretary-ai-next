"use client";

/**
 * 声の確認・選択ページ。
 *
 * ElevenLabs のサイトへ行かなくても、ここでアカウントの声を全部聴き比べて、
 * 決めたら設定する値（ELEVENLABS_VOICE_ID）をそのままコピーできる。
 */
import { useEffect, useState } from "react";
import Link from "next/link";

type Voice = { id: string; name: string; labels?: Record<string, string> };
type Info = { elevenlabs: boolean; openai: boolean; voiceId: string | null; model: string; voices: Voice[]; voicesError?: string | null };

const SAMPLES: { label: string; text: string }[] = [
  { label: "呼吸ガイド", text: "ゆっくり、息を吸って。……そのまま、少し止めてね。" },
  { label: "朝の声かけ", text: "おはよう。今日も、ここから始めよっか。" },
  { label: "励まし", text: "だいじょうぶ。きみの勇気は、ちゃんとここにあるよ。" },
];

export default function VoiceTest() {
  const [info, setInfo] = useState<Info | null>(null);
  const [text, setText] = useState(SAMPLES[0].text);
  const [picked, setPicked] = useState<string>("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [engine, setEngine] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/tts").then((r) => r.json()).then((d: Info) => {
      setInfo(d);
      setPicked(d.voiceId ?? d.voices?.[0]?.id ?? "");
    }).catch(() => {});
  }, []);

  async function play(voiceId?: string) {
    const id = voiceId ?? picked;
    setBusy(id || "x"); setMsg(""); setEngine("");
    try {
      const r = await fetch("/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: id || undefined }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || d.error || `エラー ${r.status}`);
      }
      setEngine(r.headers.get("X-TTS-Engine") ?? "?");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.onended = () => URL.revokeObjectURL(url);
      await a.play();
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally { setBusy(""); }
  }

  const voices = info?.voices ?? [];

  return (
    <main className="gd-page">
      <header className="gd-head">
        <div className="gd-kicker">SINGA WORLD</div>
        <h1>声をえらぶ</h1>
        <p className="gd-lead">ここで全部聴き比べて、気に入った声を決められます。</p>
      </header>

      <section className="gd-sec">
        <h2><span className="gd-num">1</span>いま使えるもの</h2>
        {!info ? <p className="gd-txt">確認中…</p> : (
          <div className="gd-check">
            <div className={`gc-row ${info.elevenlabs ? "ok" : "ng"}`}>
              <span className="gc-mark">{info.elevenlabs ? "✓" : "✕"}</span>
              <div><b>ElevenLabs</b>（いちばん自然）<br />
                {info.elevenlabs
                  ? <>使えます。アカウントの声：<b>{voices.length}種類</b>{info.voiceId ? <> ／ 設定中のID：<code style={{ fontSize: ".7rem" }}>{info.voiceId}</code></> : <> ／ IDは未指定（自動で選ばれます）</>}</>
                  : "ELEVENLABS_API_KEY が未設定です。"}</div>
            </div>
            <div className={`gc-row ${info.openai ? "ok" : ""}`}>
              <span className="gc-mark">{info.openai ? "✓" : "－"}</span>
              <div><b>OpenAI TTS</b>（次点）<br />
                {info.openai ? "使えます。" : "未設定（ElevenLabs があるので不要）"}</div>
            </div>
          </div>
        )}
      </section>

      <section className="gd-sec">
        <h2><span className="gd-num">2</span>読ませる文</h2>
        <div className="gd-devtabs">
          {SAMPLES.map((s) => (
            <button key={s.label} className={`gd-devtab ${text === s.text ? "on" : ""}`} onClick={() => setText(s.text)}>
              <b>{s.label}</b>
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
        {msg && (
          <p className="gd-txt" style={{ color: "#e6a0a0", marginTop: 12, wordBreak: "break-all" }}>{msg}</p>
        )}
        {engine && <p className="gd-txt" style={{ color: "#e0bd72", marginTop: 10 }}>▶ {engine} で再生しました</p>}
      </section>

      <section className="gd-sec">
        <h2><span className="gd-num">3</span>声をえらぶ</h2>
        {voices.length === 0 ? (
          <>
            <p className="gd-txt gd-hint">
              声の一覧を取れませんでした。<b>ElevenLabs の APIキーに「Voices: Read」の権限</b>が
              付いていないと、ここには出てきません。
            </p>
            {info?.voicesError && (
              <p className="gd-txt" style={{ color: "#e6a0a0", wordBreak: "break-all", fontSize: ".72rem" }}>
                {info.voicesError}
              </p>
            )}
            <div className="gd-warn" style={{ marginTop: 12 }}>
              一覧が出なくても大丈夫。ElevenLabs の <b>My Voices</b> で声の「⋯」→
              <b>Copy Voice ID</b> して、Vercel の <b>ELEVENLABS_VOICE_ID</b> に入れれば使えます。
            </div>
          </>
        ) : (
          <>
            <p className="gd-txt">▶ を押すと、上の文をその声で読みます。決めたら「この声にする」でIDをコピー。</p>
            <div className="gd-list">
              {voices.map((v) => (
                <div key={v.id} className="gl-row" style={{ alignItems: "center" }}>
                  <button className="gd-btn" style={{ padding: "8px 14px", flexShrink: 0 }}
                    onClick={() => void play(v.id)} disabled={!!busy}>
                    {busy === v.id ? "…" : "▶"}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{v.name}</b>
                    {info?.voiceId === v.id && <span style={{ marginLeft: 8, fontSize: ".64rem", color: "#8fd0a0" }}>いま使用中</span>}
                    <br />
                    <code style={{ fontSize: ".64rem", color: "#a99a80", wordBreak: "break-all" }}>{v.id}</code>
                  </div>
                  <button className="gd-btn is-ghost" style={{ padding: "7px 12px", flexShrink: 0, fontSize: ".7rem" }}
                    onClick={() => { navigator.clipboard?.writeText(v.id); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                    この声にする
                  </button>
                </div>
              ))}
            </div>
            {copied && <p className="gd-txt" style={{ color: "#8fd0a0" }}>IDをコピーしました。</p>}
            <div className="gd-warn" style={{ marginTop: 16 }}>
              コピーしたIDを Vercel の環境変数 <b>ELEVENLABS_VOICE_ID</b> に入れて
              <b>Redeploy</b> すると、その声がアプリ全体で使われます。
            </div>
          </>
        )}
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
