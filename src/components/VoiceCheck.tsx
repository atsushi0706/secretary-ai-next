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

/**
 * 端末ごとの「マイクを許可するやりかた」。
 *
 * ここが無いと「ブラウザの設定で許可してね」で終わってしまい、
 * **どこを押せばいいのか分からない**（淳くん本人がパソコンで詰まった）。
 * だから端末を見分けて、押す場所を名指しで出す。
 */
function howToAllow(ua: string): { title: string; steps: string[]; deeper: string[]; url?: string } {
  const ios = /iPhone|iPad/i.test(ua);
  const android = /Android/i.test(ua);
  const mac = /Macintosh/i.test(ua);
  const safari = /Safari\//i.test(ua) && !/Chrome|CriOS|Edg/i.test(ua);

  if (ios) {
    return {
      title: "iPhone・iPad（Safari）でのやりかた",
      steps: [
        "アドレスバーの左にある「ぁあ」を押す",
        "「Webサイトの設定」を押す",
        "「マイク」を「許可」にする",
        "この画面を下に引っぱって読み込み直す",
      ],
      deeper: [
        "それでも出るなら：「設定」アプリ →「Safari」→「マイク」→「確認」か「許可」にする",
        "LINE・インスタ・Threadsの中のブラウザでは、そもそもマイクが使えません。Safariで開いてください",
      ],
    };
  }
  if (android) {
    return {
      title: "Android（Chrome）でのやりかた",
      steps: [
        "アドレスバーの左にある鍵のマークを押す",
        "「権限」または「サイトの設定」を押す",
        "「マイク」を「許可」にする",
        "この画面を読み込み直す",
      ],
      deeper: [
        "それでも出るなら：「設定」アプリ →「アプリ」→「Chrome」→「権限」→「マイク」を許可にする",
      ],
    };
  }
  if (mac && safari) {
    return {
      title: "Mac（Safari）でのやりかた",
      steps: [
        "画面のいちばん上のメニューで「Safari」→「設定」を開く",
        "「Webサイト」を選ぶ",
        "左の並びから「マイク」を選ぶ",
        "singaworld.rinq-systeme.jp を「許可」にする",
      ],
      deeper: [
        "それでも出るなら：「システム設定」→「プライバシーとセキュリティ」→「マイク」で Safari をオンにする",
      ],
    };
  }
  // パソコンの Chrome / Edge（いちばん多い）
  return {
    title: "パソコン（Chrome・Edge）でのやりかた",
    steps: [
      "アドレスバー（URLが出ているところ）の左端にあるマークを押す（🎤 か 鍵 か スライダーの形）",
      "出てきた一覧の「マイク」を「許可」にする",
      "右上の × でその一覧を閉じ、この画面を読み込み直す（F5）",
    ],
    deeper: [
      "アドレスバーの右端に「マイクがブロックされました」の 🎤 が出ていたら、それを押して「常に許可する」を選ぶ方法もあります",
      "それでも出るなら、パソコン側でマイクが止められています：Windowsの「設定」→「プライバシーとセキュリティ」→「マイク」で、"
        + "「マイクへのアクセス」と「アプリにマイクへのアクセスを許可する」を両方オンにして、ブラウザを閉じて開き直してください",
      "Zoom や 録音アプリ が動いていると、マイクを取り合って失敗することがあります。いったん閉じてみてください",
    ],
    url: "chrome://settings/content/microphone",
  };
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
  const [showHow, setShowHow] = useState(false);
  /**
   * 書き起こしが使えない（＝Geminiキーが無い）。
   * 「使ったしくみ：なし」で終わってしまう人は、ここが原因。
   * 気づけるように、設定画面へのボタンをはっきり出す。
   */
  const [noKey, setNoKey] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

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

    /*
     * 書き起こしの準備（キー）を、録る前に見る。
     * ここが無いと「マイクは全部○なのに文字にならない」の原因が分からない。
     */
    (async () => {
      try {
        const r = await fetch("/api/stt");
        const j = await r.json().catch(() => ({}));
        if (r.status === 401) return;   // ログインしていないだけ
        setNoKey(!j.ready);
        setSteps((p) => [...p, {
          name: "文字にするしくみ",
          ok: !!j.ready,
          note: j.ready
            ? `使えます（${j.source}）`
            : "まだ使えません。Gemini API キーの登録がいります（下のボタンから）",
        }]);
      } catch { /* 聞けなくても、録るところまでは進める */ }
    })();

    // マイクが1本も見えないときは、ブラウザではなくパソコン側で止められている
    (async () => {
      try {
        const ds = await navigator.mediaDevices?.enumerateDevices?.();
        if (!ds) return;
        const mics = ds.filter((d) => d.kind === "audioinput");
        setSteps((p) => [...p, {
          name: "マイクが見えているか",
          ok: mics.length > 0,
          note: mics.length > 0
            ? `${mics.length}本 見えています`
            : "1本も見えません。ブラウザではなく、パソコン（またはスマホ）側でマイクが止められている可能性があります",
        }]);
      } catch { /* 見られないブラウザは飛ばす */ }
    })();

    // 許可の状態は聞けるときだけ聞く（Safariは対応していない）
    (async () => {
      try {
        const st = await (navigator as any).permissions?.query?.({ name: "microphone" });
        if (!st) return;
        setSteps((p) => [...p, {
          name: "マイクの許可",
          ok: st.state !== "denied",
          note: st.state === "granted" ? "許可されています"
            : st.state === "denied" ? "ブロックされています。下の「マイクを許可するやりかた」のとおりに直せます"
              : "まだ聞かれていません（録音を始めると聞かれます）",
        }]);
        if (st.state === "denied") setShowHow(true);   // 詰まっている人には最初から開いて見せる
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
        ? "マイクが許可されませんでした。下の「マイクを許可するやりかた」のとおりに進めてください。"
        : name === "NotFoundError" ? "マイクが見つかりませんでした。パソコン（スマホ）側でマイクが止められているか、つながっていないようです。"
          : name === "NotReadableError" ? "マイクが他のアプリに使われているようです。Zoom や 録音アプリ を閉じて、もう一度お試しください。"
            : `マイクを始められませんでした（${name || "原因不明"}）`);
      setShowHow(true);
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
        // キーまわりで落ちているなら、設定へ促す
        if (r.status === 503 || /キー|API key|401|403|PERMISSION/i.test(`${d?.error ?? ""}${d?.detail ?? ""}`)) {
          setNoKey(true);
        }
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
    /*
     * 録らずにコピーして送られると、いちばん知りたいところが全部「なし」になり、
     * こちらでは何も分からない（実際にそれが届いた）。だから先頭に大きく書く。
     */
    if (phase !== "done") {
      return [
        "【マイクの調子】",
        "",
        "★★ まだ「録ってみる」を押していません ★★",
        "　この紙だけでは、声が届いているか・文字になるかが分かりません。",
        "　下の「🎤 録ってみる」を押して5秒ほど話してから、もう一度コピーしてください。",
        "",
        ...l,
        `端末の情報：${ua}`,
      ].join(String.fromCharCode(10));
    }
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

      {/*
        書き起こしが使えないとき。
        ここが「使ったしくみ：なし」で終わる人の、いちばんの原因。
        文字で説明するだけでは動けないので、**押すところ**を出す。
      */}
      {noKey && (
        <div className="vc-nokey">
          <div className="t">🔑 あと1つだけ：Gemini API キーの登録がいります</div>
          <p>
            声を文字にするところで、AIを使っています。<br />
            そのための鍵（キー）が、まだこのアカウントに入っていません。
            <b>無料で、3分ほどで取れます。</b>
          </p>
          <a className="go" href="/settings">⚙ 設定画面をひらいて登録する</a>
          <a className="sub" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            先にキーを取りにいく（Google AI Studio）→
          </a>
          <div className="vc-nokey-steps">
            <div className="k">かんたんな流れ</div>
            <ol>
              <li>「先にキーを取りにいく」を押して、Googleでログイン</li>
              <li>「Create API key」を押す</li>
              <li>出てきた長い文字をコピー</li>
              <li>この画面にもどって「設定画面をひらいて登録する」に貼る</li>
            </ol>
            <p className="note">1日1,000回まで無料。お金はかかりません。</p>
          </div>
        </div>
      )}

      {/* マイクを許可するやりかた（端末で出し分ける）。断られたときは自動で開く */}
      {(() => {
        const h = howToAllow(ua);
        return (
          <div className={`vc-how ${showHow ? "is-open" : ""}`}>
            <button className="vc-how-h" onClick={() => setShowHow((v) => !v)}>
              🔑 マイクを許可するやりかた{showHow ? "" : "（押すと開きます）"}
            </button>
            {showHow && (
              <div className="vc-how-b">
                <div className="t">{h.title}</div>
                <ol>{h.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
                <div className="t2">それでも出るとき</div>
                <ul>{h.deeper.map((x, i) => <li key={i}>{x}</li>)}</ul>
                {h.url && (
                  <div className="vc-how-url">
                    <span>この住所をアドレスバーに貼ると、設定を直接開けます</span>
                    <code>{h.url}</code>
                    <button onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(h.url as string);
                        setUrlCopied(true);
                        setTimeout(() => setUrlCopied(false), 2500);
                      } catch { /* 押せなくても文字は見えている */ }
                    }}>{urlCopied ? "コピーしました" : "コピー"}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div className="vc-send">
        {phase === "done" ? (
          <p>うまくいかないときは、この下の内容をコピーして送ってください。原因を調べます。</p>
        ) : (
          <p className="vc-notyet">
            <b>先に「🎤 録ってみる」を押してください。</b><br />
            録らずに送ると、声が届いているか・文字になるかが分からないままになります。
          </p>
        )}
        <button className="vc-copy" onClick={() => void copy()}>{copied ? "コピーしました" : "まるごとコピー"}</button>
        <pre className="vc-report">{report()}</pre>
      </div>
    </div>
  );
}
