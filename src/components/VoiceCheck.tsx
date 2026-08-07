"use client";

/**
 * マイクの調子をみる画面。
 *
 * 【なぜ作ったか】
 * 「私の声にまだ反応してくれない」というお客様の声。
 * こちらの端末（Windows・パソコン）では起きないので、画面を見ても分からない。
 * だから **お客様の端末で何が起きているかを、お客様自身の画面に出す**。
 * 結果はまるごとコピーできる。それを送ってもらえば、こちらで原因が読める。
 *
 * 【つまずくところは、だいたいこの4つ】
 * ① iPhone で LINE・インスタ・Threads の中のブラウザから開いている → マイクが使えない
 * ② マイクの許可を「ブロック」にしている
 * ③ 声が小さすぎて、音として届いていない（レベルの棒が動かない）
 * ④ 音は届いているが、書き起こしが空になる（Geminiのキーや枠の問題）
 * どこで止まっているのかを、順番に見えるようにする。
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Step = { name: string; ok: boolean | null; note: string };

/** アプリの中のブラウザ（LINE・インスタなど）から開いていないか */
function inAppBrowser(ua: string): string {
  const hit: [RegExp, string][] = [
    [/Line\//i, "LINE"],
    [/Instagram/i, "Instagram"],
    [/\bBarcelona\b|Threads/i, "Threads"],
    [/FBAN|FBAV/i, "Facebook"],
    [/TikTok|musical_ly/i, "TikTok"],
    [/Twitter/i, "X（Twitter）"],
  ];
  for (const [re, name] of hit) if (re.test(ua)) return name;
  return "";
}

function deviceOf(ua: string): string {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "その他";
}

function browserOf(ua: string): string {
  if (/CriOS/i.test(ua)) return "Chrome（iPhone版）";
  if (/FxiOS/i.test(ua)) return "Firefox（iPhone版）";
  if (/EdgiOS|Edg\//i.test(ua)) return "Edge";
  if (/SamsungBrowser/i.test(ua)) return "Samsungブラウザ";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  return "不明";
}

export function VoiceCheck() {
  const [ua, setUa] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [phase, setPhase] = useState<"idle" | "rec" | "sending" | "done">("idle");
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [secs, setSecs] = useState(0);
  const [size, setSize] = useState(0);
  const [mime, setMime] = useState("");
  const [raw, setRaw] = useState("");
  const [text, setText] = useState("");
  const [engine, setEngine] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const timerRef = useRef<any>(null);

  /* ── 端末のことを調べる（録音の前に分かること） ── */
  useEffect(() => {
    const u = navigator.userAgent;
    setUa(u);
    const app = inAppBrowser(u);
    const ios = /iPhone|iPad/i.test(u);
    const list: Step[] = [];

    list.push({
      name: "使っている端末",
      ok: true,
      note: `${deviceOf(u)} / ${browserOf(u)}`,
    });

    list.push({
      name: "アプリの中のブラウザではないか",
      ok: !app,
      note: app
        ? (ios
          ? `${app} の中のブラウザで開いています。iPhoneだとここではマイクが使えません。右下などの「…」から Safari で開いてください。`
          : `${app} の中のブラウザで開いています。Chrome で開き直すと安定します。`)
        : "ふつうのブラウザで開けています",
    });

    list.push({
      name: "安全な通信（マイクに必要）",
      ok: typeof window !== "undefined" && (window.isSecureContext ?? location.protocol === "https:"),
      note: location.protocol === "https:" ? "https で開けています" : "https で開いてください",
    });

    const hasGum = !!navigator.mediaDevices?.getUserMedia;
    list.push({
      name: "マイクを使う機能",
      ok: hasGum,
      note: hasGum ? "使えます" : "このブラウザでは使えません。Safari か Chrome で開いてください",
    });

    const canRec = typeof MediaRecorder !== "undefined";
    const forms = canRec
      ? ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
        .filter((m) => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } })
      : [];
    list.push({
      name: "録音できる形",
      ok: forms.length > 0,
      note: forms.length ? forms.join(" / ") : "録音の仕組みが無いブラウザです",
    });

    setSteps(list);

    // 許可の状態は聞けるときだけ聞く（Safariは対応していない）
    (async () => {
      try {
        const st = await (navigator as any).permissions?.query?.({ name: "microphone" });
        if (!st) return;
        setSteps((p) => [...p, {
          name: "マイクの許可",
          ok: st.state !== "denied",
          note: st.state === "granted" ? "許可されています"
            : st.state === "denied" ? "ブロックされています。ブラウザの設定で許可してください"
              : "まだ聞かれていません（録音を始めると聞かれます）",
        }]);
      } catch { /* 聞けないブラウザは飛ばす */ }
    })();
  }, []);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    streamRef.current = null;
    try { ctxRef.current?.close(); } catch { /* ignore */ }
    ctxRef.current = null;
    recRef.current = null;
    setLevel(0);
  }, []);
  useEffect(() => () => cleanup(), [cleanup]);

  async function start() {
    setErr(""); setRaw(""); setText(""); setEngine(""); setPeak(0); setSize(0); setSecs(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
      });
      streamRef.current = stream;

      try {
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.fftSize);
        const tick = () => {
          an.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i += 1) { const v = (buf[i] - 128) / 128; sum += v * v; }
          const rms = Math.min(1, Math.sqrt(sum / buf.length) * 6);
          setLevel(rms);
          setPeak((p) => Math.max(p, rms));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch { /* 棒が出なくても録音は続ける */ }

      const forms = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
      const m = forms.find((f) => { try { return MediaRecorder.isTypeSupported(f); } catch { return false; } }) ?? "";
      setMime(m);
      const rec = m ? new MediaRecorder(stream, { mimeType: m }) : new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      // 細切れにしない（iPhoneでは細切れにすると壊れた音声ファイルになることがある）
      rec.start();
      recRef.current = rec;
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
      setPhase("rec");
    } catch (e: any) {
      const name = e?.name ?? "";
      setErr(name === "NotAllowedError"
        ? "マイクが許可されませんでした。ブラウザの設定でこのサイトのマイクを「許可」にしてください。"
        : name === "NotFoundError" ? "マイクが見つかりませんでした。"
          : `マイクを始められませんでした（${name || "原因不明"}）`);
      cleanup();
    }
  }

  async function stop() {
    const rec = recRef.current;
    if (!rec) return;
    setPhase("sending");
    clearInterval(timerRef.current);
    const blob: Blob = await new Promise((res) => {
      rec.onstop = () => res(new Blob(chunks.current, { type: mime || "audio/webm" }));
      try { rec.stop(); } catch { res(new Blob(chunks.current, { type: mime || "audio/webm" })); }
    });
    cleanup();
    setSize(blob.size);

    if (blob.size < 1200) {
      setErr("音がほとんど入っていません。マイクの許可、口との距離、イヤホンの向きを確かめてみてください。");
      setPhase("done");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("audio", blob, `check.${(mime || "").includes("mp4") ? "m4a" : "webm"}`);
      fd.append("context", "マイクの調子をみるための試し録り");
      const r = await fetch("/api/stt", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d?.detail ? `${d.error}（${String(d.detail).slice(0, 200)}）` : (d?.error || "書き起こしに失敗しました"));
      } else {
        setRaw(String(d.raw ?? ""));
        setText(String(d.text ?? ""));
        setEngine(String(d.engine ?? ""));
        if (!String(d.text ?? "").trim()) {
          setErr("音は届いていますが、言葉として聞き取れませんでした。もう少しはっきり、近くで話してみてください。");
        }
      }
    } catch {
      setErr("送るところで失敗しました。電波の良いところで、もう一度お試しください。");
    } finally {
      setPhase("done");
    }
  }

  /** この画面の内容をまるごと文字にする（送ってもらうため） */
  function report(): string {
    const l = steps.map((s) => `${s.ok === false ? "×" : s.ok === true ? "○" : "?"} ${s.name}：${s.note}`);
    return [
      "【マイクの調子】",
      ...l,
      `録音の形：${mime || "既定"}`,
      `録った長さ：${secs}秒 / 大きさ：${(size / 1024).toFixed(0)}KB`,
      `声の大きさ（いちばん大きいとき）：${Math.round(peak * 100)}%`,
      `書き起こし（そのまま）：${raw || "（なし）"}`,
      `書き起こし（整えたあと）：${text || "（なし）"}`,
      `使ったしくみ：${engine || "（なし）"}`,
      `うまくいかなかった点：${err || "（なし）"}`,
      `端末の情報：${ua}`,
    ].join("\n");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(report());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErr("コピーできませんでした。下の四角を長押しして選んでコピーしてください。");
    }
  }

  const weak = phase === "done" && peak > 0 && peak < 0.12;

  return (
    <div className="vc">
      <h1 className="vc-h">マイクの調子をみる</h1>
      <p className="vc-lead">
        声がうまく入らないときに、どこで止まっているのかを見る画面です。
        順番に見ていって、最後の「録ってみる」まで進んでください。
      </p>

      <ol className="vc-steps">
        {steps.map((s, i) => (
          <li key={i} className={s.ok === false ? "is-ng" : s.ok === true ? "is-ok" : ""}>
            <span className="mk">{s.ok === false ? "×" : s.ok === true ? "○" : "?"}</span>
            <span className="nm">{s.name}</span>
            <span className="nt">{s.note}</span>
          </li>
        ))}
      </ol>

      <div className="vc-rec">
        <div className="vc-rec-t">実際に録ってみる</div>
        <p className="vc-rec-p">
          「録ってみる」を押して、<b>ふつうの声で5秒くらい</b>話してください。
          たとえば「きょうは、はれています」でいいです。
        </p>

        {phase === "rec" && (
          <>
            <div className="vc-bar"><span style={{ width: `${Math.round(level * 100)}%` }} /></div>
            <div className="vc-secs">{secs}秒 — 棒が動いていれば、声は届いています</div>
          </>
        )}

        {phase === "idle" || phase === "done" ? (
          <button className="vc-go" onClick={() => void start()}>🎤 録ってみる</button>
        ) : phase === "rec" ? (
          <button className="vc-stop" onClick={() => void stop()}>■ 止めて調べる</button>
        ) : (
          <button className="vc-go" disabled>調べています…</button>
        )}
      </div>

      {phase === "done" && (
        <div className="vc-out">
          <div className="vc-row"><span>声の大きさ（最大）</span><b>{Math.round(peak * 100)}%</b></div>
          <div className="vc-row"><span>録れた大きさ</span><b>{(size / 1024).toFixed(0)}KB / {secs}秒</b></div>
          {engine && <div className="vc-row"><span>使ったしくみ</span><b>{engine}</b></div>}
          {weak && (
            <div className="vc-warn">
              声が小さすぎるようです。口から10〜15cmくらいまで近づけて、もう一度お試しください。
              イヤホンをしているときは、イヤホンのマイクの向きも確かめてみてください。
            </div>
          )}
          {raw && (
            <div className="vc-said">
              <div className="k">聞こえたまま</div>
              <p>{raw}</p>
              {text && text !== raw && (<><div className="k">整えたあと</div><p>{text}</p></>)}
            </div>
          )}
          {err && <div className="vc-err">{err}</div>}
        </div>
      )}

      {err && phase !== "done" && <div className="vc-err">{err}</div>}

      <div className="vc-send">
        <p>うまくいかないときは、この下の内容をコピーして送ってください。原因を調べます。</p>
        <button className="vc-copy" onClick={() => void copy()}>{copied ? "コピーしました" : "まるごとコピー"}</button>
        <pre className="vc-report">{report()}</pre>
      </div>
    </div>
  );
}
