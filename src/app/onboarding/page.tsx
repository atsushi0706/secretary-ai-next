"use client";

/**
 * はじめての人の入口（説明書＋初期設定）。
 *
 * 何ができるかを知らないまま設定だけさせられると、何のための入力か分からない。
 * かといって説明を読ませてから設定させると、読み終える頃には気持ちが切れている。
 * だから **「これは何をする場所か」→「そのために要るもの」** の順で交互に進む。
 *
 * ここを終えるまで、中には入れない（必要な情報が無いと機能が動かないため）。
 *
 * ?preview=1 を付けて開くと、**何も保存せずに** 流れだけ体験できる。
 * すでに設定が済んでいる人が「初めての人にどう見えるか」を確かめるためのもの。
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TOTAL = 5;

function OnboardingInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const preview = sp.get("preview") === "1";

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(preview);

  useEffect(() => {
    if (preview) return;             // 体験モードでは、既存の設定を持ち込まない
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      if (s.user_call_name) setName(s.user_call_name);
      if (s.birth_date) setBirth(String(s.birth_date).slice(0, 10));
      if (s.birth_gender === "male" || s.birth_gender === "female") setGender(s.birth_gender);
      // 全部そろっている人は、ここに留める意味がない
      if (s.user_call_name && s.birth_date && s.gemini_api_key_set) router.replace("/");
      else setReady(true);
    }).catch(() => setReady(true));
  }, [router, preview]);

  async function save(body: any) {
    if (preview) return true;        // 体験モードでは何も書き込まない
    const r = await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("保存できませんでした。もう一度お願いします。");
    return true;
  }

  async function next() {
    setError(""); setSaving(true);
    try {
      if (step === 2) {
        if (!name.trim()) throw new Error("呼ばれたい名前を入れてください");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) throw new Error("生年月日を入れてください");
        await save({ user_call_name: name.trim(), birth_date: birth, birth_gender: gender || null });
      }
      if (step === 4) {
        if (!key.trim()) throw new Error("APIキーを貼り付けてください");
        await save({ gemini_api_key: key.trim() });
      }
      if (step < TOTAL) setStep(step + 1);
      else router.replace(preview ? "/onboarding?preview=1" : "/");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setSaving(false); }
  }

  if (!ready) return <main className="min-h-screen grid place-items-center text-sm text-gray-500">読み込み中…</main>;

  return (
    <main className="ob-page">
      {preview && (
        <div className="ob-preview">
          👀 体験モード：<b>何も保存されません</b>。初めての人にどう見えるかを確かめるための画面です。
          {/* 読み終わったら戻れないと、ここで行き止まりになる */}
          <a className="ob-exit" href="/">← 世界にもどる</a>
        </div>
      )}

      <div className="ob-wrap">
        <div className="ob-dots">
          {Array.from({ length: TOTAL }, (_, i) => (
            <span key={i} className={`ob-dot ${step > i ? "on" : ""} ${step === i + 1 ? "now" : ""}`} />
          ))}
        </div>

        {/* ① この世界は何をする場所か */}
        {step === 1 && (
          <section className="ob-card">
            <div className="ob-kicker">SINGA WORLD</div>
            <h1>ようこそ</h1>
            <p className="ob-lead">
              ここは、<b>やりたいことを思い出して、それを today に落とす</b>ための場所です。
            </p>
            <div className="ob-two">
              <div className="ob-half">
                <div className="ob-half-t">🔑 インナーワールド</div>
                <p>理想を歩いて、内側にあるものをほどく。呼吸で整え、望む世界を言葉にする。</p>
              </div>
              <div className="ob-half">
                <div className="ob-half-t">🧭 リアルバース</div>
                <p>そこで掴んだものを、今日の予定とタスクに落とす。カレンダーとタスクに繋がる。</p>
              </div>
            </div>
            <p className="ob-note">
              この2つを行き来するのが、このアプリの使い方です。<br />
              先に、始めるための情報を<b>2つだけ</b>いただきます（3分ほど）。
            </p>
          </section>
        )}

        {/* ② プロフィール */}
        {step === 2 && (
          <section className="ob-card">
            <div className="ob-kicker">STEP 1 / 2</div>
            <h1>あなたのこと</h1>
            <p className="ob-lead">呼び方と、生まれた日を教えてください。</p>

            <label className="ob-label">なんて呼べばいい？</label>
            <input className="ob-input" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="例：淳くん / ゆかさん" maxLength={20} />
            <p className="ob-hint">秘書がこの名前で呼びかけます。あだ名でもOK。</p>

            <label className="ob-label">生年月日</label>
            <input className="ob-input" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
            <p className="ob-hint">
              生まれ持った性質と、年・月・今日の流れを読むのに使います。<br />
              これが無いと「自分の取扱説明書」と「アカシックレコーダー」が動きません。
            </p>

            <label className="ob-label">性別（任意）</label>
            <div className="ob-seg">
              {([["male", "男性"], ["female", "女性"], ["", "答えない"]] as const).map(([v, l]) => (
                <button key={l} className={gender === v ? "on" : ""} onClick={() => setGender(v as any)}>{l}</button>
              ))}
            </div>
            <p className="ob-hint">入れると、10年ごとの流れまで読めるようになります。</p>
          </section>
        )}

        {/* ③ なぜAPIキーが要るのか（先に理由を渡す） */}
        {step === 3 && (
          <section className="ob-card">
            <div className="ob-kicker">STEP 2 / 2</div>
            <h1>あなた専用の鍵</h1>
            <p className="ob-lead">
              次に、Google の <b>API キー</b>をひとつ取ってきていただきます。
            </p>
            <div className="ob-why">
              <div className="ob-why-t">💰 お金は<b>一切かかりません</b></div>
              <p>Google が無料で配っている鍵です。クレジットカードの登録も要りません。</p>
            </div>
            <div className="ob-why">
              <div className="ob-why-t">🛡 なぜ、ご自身の鍵が要るのか</div>
              <p>
                みんなで同じ鍵を使っていると、<b>混み合ったときにサーバーエラーで動かなくなります</b>。
                「返事が返ってこない」「途中で止まる」の原因は、ほとんどこれです。<br />
                ご自身の鍵にしておけば、他の人の使用状況に左右されず、いつでも動きます。
              </p>
            </div>
            <p className="ob-note">次の画面で、取り方を1つずつ案内します。</p>
          </section>
        )}

        {/* ④ APIキーを取って貼る */}
        {step === 4 && (
          <section className="ob-card">
            <div className="ob-kicker">STEP 2 / 2</div>
            <h1>鍵を取ってくる</h1>
            <ol className="ob-steps">
              <li>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="ob-link">
                  Google AI Studio を開く ↗
                </a>
                <span>（Googleアカウントでそのまま入れます）</span>
              </li>
              <li><b>「Create API key」</b> を押す</li>
              <li>プロジェクトを選ぶ画面が出たら、<b>「Create API key in new project」</b></li>
              <li>出てきた文字列を<b>コピー</b>（<code>AIza…</code> で始まります）</li>
              <li>下に貼り付ける</li>
            </ol>
            <input className="ob-input is-key" value={key} onChange={(e) => setKey(e.target.value)}
              placeholder="AIza… で始まる文字列を貼り付け" spellCheck={false} />
            <p className="ob-hint">
              鍵は暗号化して保存され、あなたの応答生成にしか使いません。他の人には見えません。
            </p>
          </section>
        )}

        {/* ⑤ 1日の流れ（使い方の説明書） */}
        {step === 5 && (
          <section className="ob-card">
            <div className="ob-kicker">READY</div>
            <h1>1日の流れ</h1>
            <p className="ob-lead">迷ったら、この順でどうぞ。</p>
            <div className="ob-flow">
              <div className="ob-flow-row"><span className="n">朝</span>
                <div><b>今日のあなたの取扱説明書</b><span>10年後の自分から届く、今日の手引き。通知から開けます。</span></div></div>
              <div className="ob-flow-row"><span className="n">整える</span>
                <div><b>ピークステート</b><span>呼吸で、いちばん良かったときの自分に戻る。</span></div></div>
              <div className="ob-flow-row"><span className="n">歩く</span>
                <div><b>パラレルウォーク</b><span>望む世界を、上を向いて口に出す。</span></div></div>
              <div className="ob-flow-row"><span className="n">落とす</span>
                <div><b>今日1ミリ</b><span>ワークの終わりに「今日1つだけ入れること」を決める。それが今日の一手になります。</span></div></div>
              <div className="ob-flow-row"><span className="n">夜</span>
                <div><b>1日の振り返り</b><span>今日を置いて、明日の感情を決めて閉じる。20時に通知が届きます。</span></div></div>
            </div>
            <p className="ob-note">
              あとは自由です。気が向いたワークから触ってみてください。<br />
              使い方は <Link href="/guide" className="ob-link">📘 説明書</Link> にいつでもあります。
            </p>
          </section>
        )}

        {error && <div className="ob-err">{error}</div>}

        <button className="ob-go" onClick={() => void next()} disabled={saving}>
          {saving ? "保存中…"
            : step === 1 ? "はじめる →"
            : step === 2 ? "これで進む →"
            : step === 3 ? "鍵を取りにいく →"
            : step === 4 ? "この鍵で始める →"
            : preview ? "体験おわり（最初に戻る）" : "世界に入る →"}
        </button>

        {step > 1 && !saving && (
          <button className="ob-back" onClick={() => setStep(step - 1)}>← ひとつ戻る</button>
        )}
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen grid place-items-center text-sm text-gray-500">読み込み中…</main>}>
      <OnboardingInner />
    </Suspense>
  );
}
