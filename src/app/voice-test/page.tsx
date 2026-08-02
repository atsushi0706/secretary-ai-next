"use client";

/**
 * 声の確認・選択ページ。
 *
 * ElevenLabs のサイトへ行かなくても、ここでアカウントの声を全部聴き比べて、
 * 決めたら設定する値（ELEVENLABS_VOICE_ID）をそのままコピーできる。
 */
import { useEffect, useState } from "react";
import Link from "next/link";

type Voice = { id: string; name: string; labels?: Record<string, string>; category?: string; free?: boolean };
type VvVoice = { id: string; name: string; note: string };
type Info = {
  elevenlabs: boolean; openai: boolean; voiceId: string | null; model: string;
  voices: Voice[]; voicesError?: string | null;
  voicevox?: boolean; voicevoxSpeaker?: string | null; voicevoxMode?: string;
  voicevoxSpeakers?: VvVoice[]; voiceCredit?: string; prefer?: string;
};

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
  const [usedVoice, setUsedVoice] = useState("");
  const [askedVoice, setAskedVoice] = useState<Voice | null>(null);
  const [copied, setCopied] = useState(false);
  const [bake, setBake] = useState<{ baked: Record<string, string>; total: number } | null>(null);
  const [baking, setBaking] = useState(false);
  const [bakeMsg, setBakeMsg] = useState("");

  useEffect(() => {
    fetch("/api/tts").then((r) => r.json()).then((d: Info) => {
      setInfo(d);
      setPicked(d.voiceId ?? d.voices?.[0]?.id ?? "");
    }).catch(() => {});
    fetch("/api/tts/bake").then((r) => r.json()).then(setBake).catch(() => {});
  }, []);

  async function runBake() {
    setBaking(true); setBakeMsg("");
    try {
      const r = await fetch("/api/tts/bake", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "焼き込みに失敗");
      setBakeMsg(`${d.baked}/${d.total} 本を焼きました（消費 約${d.usedChars}文字）。${d.failed?.length ? "失敗: " + d.failed.join(" / ") : "以後この音声は無料で鳴ります。"}`);
      fetch("/api/tts/bake").then((x) => x.json()).then(setBake).catch(() => {});
    } catch (e: any) { setBakeMsg(String(e?.message ?? e)); }
    finally { setBaking(false); }
  }

  /** speaker を渡すと VOICEVOX の声、voiceId を渡すと ElevenLabs の声で鳴らす */
  async function play(voiceId?: string, speaker?: string) {
    const id = speaker ?? voiceId ?? picked;
    setBusy(id || "x"); setMsg(""); setEngine(""); setUsedVoice("");
    setAskedVoice(speaker ? null : (info?.voices ?? []).find((v) => v.id === id) ?? null);
    try {
      const r = await fetch("/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: speaker
          ? JSON.stringify({ text, speaker })
          : JSON.stringify({ text, voiceId: id || undefined }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || d.error || `エラー ${r.status}`);
      }
      setEngine(r.headers.get("X-TTS-Engine") ?? "?");
      // 実際に鳴った声を出す（頼んだ声と違うことがあるため。無料プランの自動切替など）
      const usedId = r.headers.get("X-TTS-Voice") ?? "";
      const used = (info?.voices ?? []).find((v) => v.id === usedId)
        ?? (info?.voicevoxSpeakers ?? []).find((v) => v.id === usedId);
      setUsedVoice(used ? used.name : usedId);
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
            <div className={`gc-row ${info.voicevox ? "ok" : ""}`}>
              <span className="gc-mark">{info.voicevox ? "✓" : "－"}</span>
              <div><b>VOICEVOX</b>（無料・日本語ネイティブ・従量課金なし）<br />
                使えます（話者ID: {info.voicevoxSpeaker} ／ {info.voicevoxMode}）。
                {info.prefer === "voicevox"
                  ? "いまはこれを最優先で使っています。文字数の料金がかからないので、人数が増えても枯れません。"
                  : "ElevenLabs が使えないときの控えです。"}</div>
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
        {engine && (
          <p className="gd-txt" style={{ color: "#e0bd72", marginTop: 10 }}>
            ▶ いま鳴った声：<b>{usedVoice || "（不明）"}</b>
            {askedVoice && !askedVoice.free && usedVoice !== askedVoice.name && (
              <><br /><span style={{ color: "#e0b48c" }}>
                ※「{askedVoice.name}」は有料プラン専用で鳴らせないため、
                無料で使える<b>「{usedVoice}」</b>の声で鳴らしました。
                ElevenLabs のサイトで聴く声と違うのはこのためです。
              </span></>
            )}
          </p>
        )}
      </section>

      {/* VOICEVOX を主役に。お金がかからないので、ここで決めきってしまうのが一番ラク */}
      <section className="gd-sec">
        <h2><span className="gd-num">3</span>声をえらぶ（VOICEVOX・無料）</h2>
        <p className="gd-txt">
          こちらは<b>クレジットを1文字も使いません</b>。キーの設定もいりません。<br />
          いまの標準は<b>白上虎太郎</b>（アニメ寄りの、幼い男の子の声）です。
        </p>
        <div className="gd-list">
          {(info?.voicevoxSpeakers ?? []).map((v) => (
            <div key={`vv-${v.id}`} className="gl-row" style={{ alignItems: "center" }}>
              <button className="gd-btn" style={{ padding: "8px 14px", flexShrink: 0 }}
                onClick={() => void play(undefined, v.id)} disabled={!!busy}>
                {busy === v.id ? "…" : "▶"}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{v.name}</b>
                <span style={{ marginLeft: 8, fontSize: ".6rem", padding: "2px 7px", borderRadius: 999,
                  color: "#8fd0a0", border: "1px solid rgba(140,210,160,.5)" }}>無料</span>
                {info?.voicevoxSpeaker === v.id && (
                  <span style={{ marginLeft: 8, fontSize: ".64rem", color: "#8fd0a0" }}>いま使用中</span>
                )}
                <br />
                <span style={{ fontSize: ".68rem", color: "#a99a80" }}>{v.note}</span>
              </div>
              <button className="gd-btn is-ghost" style={{ padding: "7px 12px", flexShrink: 0, fontSize: ".7rem" }}
                onClick={() => { navigator.clipboard?.writeText(v.id); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                この声にする
              </button>
            </div>
          ))}
        </div>
        <div className="gd-warn" style={{ marginTop: 14 }}>
          別の声にしたいときは、上でコピーした番号を Vercel の環境変数
          <b> VOICEVOX_SPEAKER</b> に入れて <b>Redeploy</b>。<br />
          いまの接続のしかた：<b>{info?.voicevoxMode ?? "確認中…"}</b>
        </div>
        <p className="gd-txt gd-hint" style={{ marginTop: 10 }}>
          ※ VOICEVOX は利用規約で、声のクレジット表記が必要です。アプリの説明書に
          <b>「{info?.voiceCredit ?? "VOICEVOX:白上虎太郎"}」</b>と出しています。
        </p>
      </section>

      <section className="gd-sec">
        <h2><span className="gd-num">4</span>声をえらぶ（ElevenLabs・クレジット消費）</h2>
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
            {voices.some((v) => !v.free) && (
              <div className="gd-warn">
                💳 <b>無料プランでは「ライブラリの声」をAPIから使えません</b>（Morioki など）。
                <b>無料OK</b>の印がある標準の声を選んでね。<br />
                有料プランにすると、ライブラリの声も使えるようになります。
              </div>
            )}
            <div className="gd-list">
              {voices.map((v) => (
                <div key={v.id} className="gl-row" style={{ alignItems: "center" }}>
                  <button className="gd-btn" style={{ padding: "8px 14px", flexShrink: 0 }}
                    onClick={() => void play(v.id)} disabled={!!busy}>
                    {busy === v.id ? "…" : "▶"}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{v.name}</b>
                    <span style={{ marginLeft: 8, fontSize: ".6rem", padding: "2px 7px", borderRadius: 999,
                      color: v.free ? "#8fd0a0" : "#e0b48c",
                      border: `1px solid ${v.free ? "rgba(140,210,160,.5)" : "rgba(224,180,140,.5)"}` }}>
                      {v.free ? "無料OK" : "有料プラン"}
                    </span>
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

      <section className="gd-sec">
        <h2><span className="gd-num">5</span>呼吸ガイドを焼き込む（お金の話）</h2>
        <p className="gd-txt">
          呼吸ガイドのセリフは<b>全ユーザー共通で毎回まったく同じ</b>。<br />
          1回だけ音声を作ってファイルにしておけば、<b>以後は何人使っても料金は0</b>になります。<br />
          焼かないままだと、開かれるたびに生成が走って、人が増えた瞬間にクレジットが枯れます。
        </p>
        <div className="gd-check">
          <div className={`gc-row ${bake && Object.keys(bake.baked).length >= (bake.total ?? 10) ? "ok" : "ng"}`}>
            <span className="gc-mark">{bake && Object.keys(bake.baked).length >= (bake.total ?? 10) ? "✓" : "！"}</span>
            <div>
              <b>焼き込みの状態</b><br />
              {bake ? `${Object.keys(bake.baked).length} / ${bake.total} 本` : "確認中…"}
              {bake && Object.keys(bake.baked).length < (bake.total ?? 10) &&
                <><br />まだ焼けていません。下のボタンを1回押してください（約240文字ぶん消費）。</>}
            </div>
          </div>
        </div>
        <button className="gd-btn" style={{ marginTop: 12 }} onClick={() => void runBake()} disabled={baking}>
          {baking ? "焼いています…" : "🔥 いまの声で焼き込む（1回だけ）"}
        </button>
        {bakeMsg && <p className="gd-txt" style={{ marginTop: 10, color: "#8fd0a0", wordBreak: "break-all" }}>{bakeMsg}</p>}
        <p className="gd-txt gd-hint" style={{ marginTop: 12 }}>
          ※ 声を変えたら、もう一度押してください（新しい声で焼き直します）。<br />
          ※ 管理者だけが実行できます。
        </p>
      </section>

      <footer className="gd-foot">
        <Link href="/guide" className="gd-btn is-ghost">📘 使い方の説明書</Link>
        <Link href="/shinga" className="gd-btn is-ghost">🔑 インナーワールドへ</Link>
      </footer>
    </main>
  );
}
