"use client";

/**
 * ミールレンズ（食事の写真 → カロリーとPFCの目安）。
 *
 * 【どこから来たか】
 * `mealens-app`（MEALENS）で作ったものを、シンガワールドの中に移した画面。
 * あちらは画面が7つに分かれた独立アプリだったが、ここでは
 * **撮る → 直す → 記録する → 今日の合計** の1枚にまとめてある。
 *
 * 【言い切らない】
 * 写真1枚から出せるのは目安。だから数字は必ず **幅（〜kcal）** と
 * **どこが不確かか** を添えて出す。「◯◯kcalです」とは言わない。
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Food = {
  name: string; detail: string; grams: number;
  calories: number; protein_g: number; fat_g: number; carbs_g: number; confidence: number;
};
type Analysis = {
  food_detected: boolean; meal_name: string; foods: Food[];
  total_kcal: number; protein_g: number; fat_g: number; carbs_g: number;
  confidence: number; estimate_min_kcal: number; estimate_max_kcal: number;
  uncertainty_reason: string; warnings: string[];
};
/** 保存ずみの1食（型名を Record にすると TypeScript の Record を隠してしまう） */
type MealRow = Analysis & { id: string; meal_type: string; created_at: string };
type Total = { kcal: number; protein_g: number; fat_g: number; carbs_g: number; min_kcal: number; max_kcal: number };

/** つり合い（消費・目標・PFC・ビタミンの目安） */
type Nutrient = { key: string; label: string; unit: string; kind: "want" | "cap"; from: string };
type Sum = Total & { meals: number; micros: Record<string, number> };
type Bal = {
  missing: string[];
  input: { weight: number | null; height: number | null; age: number | null; sex: string | null; activity: string; wantedKg: number };
  balance: null | {
    plan: { bmr: number; tdee: number; target: number; deficit: number; paceKg: number; wantedKg: number; capped: boolean; note: string };
    pfc: { protein_g: number; fat_g: number; carbs_g: number; note: string };
    micros: Record<string, number>;
  };
  today: Sum | null;
  yesterday: Sum | null;
  nutrients: Nutrient[];
};

const ACTIVITY_UI = [
  { key: "low", label: "ほとんど座って過ごす", hint: "デスクワーク中心・運動なし" },
  { key: "mid", label: "少し動く", hint: "軽い運動を週1〜3回／よく歩く" },
  { key: "high", label: "よく動く", hint: "中くらいの運動を週3〜5回" },
  { key: "vhigh", label: "かなり動く", hint: "強い運動をほぼ毎日／立ち仕事" },
];

const TYPES = [
  { key: "breakfast", emoji: "🌅", label: "朝" },
  { key: "lunch", emoji: "☀️", label: "昼" },
  { key: "dinner", emoji: "🌙", label: "夕" },
  { key: "snack", emoji: "🍪", label: "間食" },
];
const typeOf = (k: string) => TYPES.find((t) => t.key === k);

/** いまの時刻から、たぶんこれだろう、を選んでおく（変えられる） */
function guessType(): string {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

/**
 * 送る前に、写真を小さくする。
 *
 * 【なぜ要るか】
 * スマホの写真はそのままだと3〜6MBある。Vercelが受け取れるのは4.5MBまでなので、
 * 大きい写真を送ると「Request Entity Too Large」という**JSONでない**返事が返ってきて、
 * 画面が落ちていた（Unexpected token 'R', "Request En"... is not valid JSON）。
 *
 * 料理を見分けるのに4000pxは要らない。長辺1280pxまで縮めれば十分で、
 * 送るのも速くなるし、AIに渡す量も減る。
 * ——縮められない形式（古い端末のHEIC等）のときは、そのまま返す。
 */
async function shrink(file: File): Promise<File> {
  const MAX_EDGE = 1280;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob || blob.size === 0) return file;
    // 縮めたつもりが大きくなった、ということが起きたら元のまま送る
    if (blob.size >= file.size && file.size < 3_500_000) return file;
    return new File([blob], "meal.jpg", { type: "image/jpeg" });
  } catch {
    return file;   // 読めない形式でも、送るところまではやってみる
  }
}

/** JSONで返ってこないことがある（Vercelの上限超えなど）。落ちずに理由を出す */
async function readJson(r: Response): Promise<any> {
  const text = await r.text();
  try { return JSON.parse(text); } catch { /* JSONじゃなかった */ }
  if (r.status === 413 || /Request En|too large|FUNCTION_PAYLOAD/i.test(text)) {
    return { error: "写真が大きすぎて送れなかった。もう一度撮ってみて（それでもだめなら、少し引いて撮ってね）" };
  }
  return { error: `うまく返ってこなかった（${r.status}）${text.slice(0, 80)}` };
}

const hhmm = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo", hour12: false,
    }).format(new Date(iso));
  } catch { return ""; }
};

export function MealLens({ onBack }: { onBack: () => void }) {
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [total, setTotal] = useState<Total | null>(null);
  const [err, setErr] = useState("");
  const [sql, setSql] = useState("");
  const [busy, setBusy] = useState(false);

  // 撮ったあとの状態
  const [shot, setShot] = useState<string | null>(null);   // 画面に出すだけ。どこにも送らない
  const [ana, setAna] = useState<Analysis | null>(null);
  const [mealType, setMealType] = useState(guessType());
  const [saving, setSaving] = useState(false);

  // つり合い（消費・目標・PFC・ビタミン）
  const [bal, setBal] = useState<Bal | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [microOpen, setMicroOpen] = useState(false);
  const [hIn, setHIn] = useState("");
  const [gIn, setGIn] = useState("");
  const [savingSetup, setSavingSetup] = useState(false);

  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/meal");
      const d = await readJson(r);
      if (!r.ok) { setErr(d.error || "読み込めなかった"); setSql(d.sql || ""); return; }
      setErr(""); setSql("");
      setMeals(d.meals ?? []); setTotal(d.total ?? null);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
  }, []);
  const loadBal = useCallback(async () => {
    try {
      const r = await fetch("/api/meal/balance");
      const d = await readJson(r);
      if (!r.ok) { if (d.sql) setSql(d.sql); return; }
      setBal(d);
      setHIn(d.input?.height ? String(d.input.height) : "");
      setGIn(d.input?.wantedKg ? String(d.input.wantedKg) : "");
    } catch { /* つり合いが出なくても、記録はできる */ }
  }, []);
  useEffect(() => { void load(); void loadBal(); }, [load, loadBal]);

  /** 身長・動く量・落としたい量を保存 */
  async function saveSetup(patch: Record<string, unknown>) {
    if (savingSetup) return;
    setSavingSetup(true);
    try {
      const r = await fetch("/api/meal/balance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await readJson(r);
      if (!r.ok) { setErr(d.error || "保存できなかった"); return; }
      setErr("");
      await loadBal();
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setSavingSetup(false); }
  }

  /** 写真を1枚見てもらう */
  async function analyze(file: File) {
    setErr(""); setAna(null); setBusy(true);
    try { setShot(URL.createObjectURL(file)); } catch { /* 出せなくても進む */ }
    try {
      const small = await shrink(file);
      const fd = new FormData();
      fd.append("image", small);
      const r = await fetch("/api/meal/analyze", { method: "POST", body: fd });
      const d = await readJson(r);
      if (!r.ok) { setErr(d.detail ? `${d.error}（${d.detail}）` : (d.error || "読み取れなかった")); return; }
      const a: Analysis = d.result;
      if (!a.food_detected) {
        setErr(a.uncertainty_reason || "食べ物が写っていないみたい。もう一度撮ってみて");
        return;
      }
      setAna(a);
      setMealType(guessType());
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  /** 1品の量を動かす。カロリーとPFCも同じ比で動かす（gだけ変えると数字が嘘になる） */
  function nudge(i: number, deltaG: number) {
    setAna((prev) => {
      if (!prev) return prev;
      const f = prev.foods[i];
      const next = Math.max(0, Math.round((f.grams + deltaG) * 10) / 10);
      if (f.grams === 0 || next === 0) {
        // 元が0gだと比が作れない。0にするだけにする
        const foods = prev.foods.map((x, j) => j === i
          ? { ...x, grams: next, calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 } : x);
        return retotal(prev, foods);
      }
      const k = next / f.grams;
      const foods = prev.foods.map((x, j) => j === i ? {
        ...x, grams: next,
        calories: Math.round(x.calories * k * 10) / 10,
        protein_g: Math.round(x.protein_g * k * 10) / 10,
        fat_g: Math.round(x.fat_g * k * 10) / 10,
        carbs_g: Math.round(x.carbs_g * k * 10) / 10,
      } : x);
      return retotal(prev, foods);
    });
  }

  function rename(i: number, name: string) {
    setAna((prev) => prev ? { ...prev, foods: prev.foods.map((x, j) => j === i ? { ...x, name } : x) } : prev);
  }
  function drop(i: number) {
    setAna((prev) => prev ? retotal(prev, prev.foods.filter((_, j) => j !== i)) : prev);
  }

  /** 合計は必ず足し算で作り直す（サーバー側でも同じことをする） */
  function retotal(prev: Analysis, foods: Food[]): Analysis {
    const kcal = Math.round(foods.reduce((s, f) => s + f.calories, 0));
    const r1 = (v: number) => Math.round(v * 10) / 10;
    return {
      ...prev, foods,
      total_kcal: kcal,
      protein_g: r1(foods.reduce((s, f) => s + f.protein_g, 0)),
      fat_g: r1(foods.reduce((s, f) => s + f.fat_g, 0)),
      carbs_g: r1(foods.reduce((s, f) => s + f.carbs_g, 0)),
      estimate_min_kcal: Math.round(kcal * 0.8),
      estimate_max_kcal: Math.round(kcal * 1.2),
    };
  }

  async function save() {
    if (!ana || saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/meal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealType, result: ana }),
      });
      const d = await readJson(r);
      if (!r.ok) { setErr(d.error || "記録できなかった"); setSql(d.sql || ""); return; }
      setAna(null); setShot(null);
      await load(); await loadBal();
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    try {
      await fetch(`/api/meal?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await load(); await loadBal();
    } catch { /* 消せなくても画面は壊さない */ }
  }

  const pl = bal?.balance?.plan ?? null;
  const tgt = bal?.balance?.pfc ?? null;

  /**
   * いま足りているのか、余っているのか。この画面の主役。
   *
   * 大事なのは順番。**「基礎代謝を割っている」がいちばん強い警告**にする。
   * 目標より少ないのは良いことのように見えるが、基礎代謝を割ると
   * 体が省エネに切り替わって減らなくなり、筋肉から削られていくので。
   * ——ただし、まだ1食も食べていない朝に「足りない」と言っても意味がないので、
   *   その日の記録がまだ無いうちは何も言わない。
   */
  const verdict = (() => {
    const got = total?.kcal ?? 0;
    if (!pl || meals.length === 0) return { tone: "", text: "" };
    if (got < pl.bmr) {
      return {
        tone: "is-under",
        text: `いま ${pl.bmr - got}kcal、基礎代謝に足りていない。`
          + `ここを割ると体が省エネに切り替わって、かえって減りにくくなるよ。あと少し食べよう。`,
      };
    }
    if (got <= pl.target) {
      return {
        tone: "is-ok",
        text: `目標まであと ${pl.target - got}kcal。基礎代謝は超えているから、いい位置だよ。`,
      };
    }
    const over = got - pl.target;
    if (got <= pl.tdee) {
      return {
        tone: "is-warn",
        text: `目標を ${over}kcal 超えた。でも使う量（${pl.tdee}）の中には収まってる。`
          + `増えはしないけど、減るペースはゆるやかになるね。`,
      };
    }
    return {
      tone: "is-over",
      text: `使う量（${pl.tdee}kcal）を ${got - pl.tdee}kcal 超えてる。`
        + `明日で戻せば大丈夫。1日で決まるものじゃないよ。`,
    };
  })();

  return (
    <div className="ml-screen">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>

      <div className="ml-card">
        <div className="ml-head">
          <div>
            <div className="ml-en">MEAL LENS</div>
            <div className="ml-ja">食事のレンズ</div>
          </div>
          <div className="ml-note">撮るだけ。数字は目安だよ</div>
        </div>

        {err && (
          <div className="ml-err">
            {err}
            {sql && (
              <details className="ml-sql">
                <summary>先に Supabase で表を作る必要があります（押すとSQLが出ます）</summary>
                <pre>{sql}</pre>
              </details>
            )}
          </div>
        )}

        {/* ── 今日の合計と、消費とのつり合い ───────────── */}
        {total && (
          <div className="ml-total">
            <div className="ml-total-t">今日ここまで</div>
            <div className="ml-kcal">
              <strong>{total.kcal}</strong><span>kcal</span>
              {pl && <span className="ml-of">／ 目標 {pl.target}</span>}
            </div>
            {total.kcal > 0 && (
              <div className="ml-range">だいたい {total.min_kcal}〜{total.max_kcal} kcal のあいだ</div>
            )}

            {/* 目標に対してどこまで来たか。目標を超えたら色が変わる */}
            {pl && (
              <>
                <div className={`ml-bar ${total.kcal > pl.target ? "is-over" : ""}`}>
                  <span style={{ width: `${Math.min(100, (total.kcal / Math.max(1, pl.target)) * 100)}%` }} />
                  {/* 基礎代謝の線。ここより下は「食べ足りない」側 */}
                  <i style={{ left: `${Math.min(100, (pl.bmr / Math.max(1, pl.target)) * 100)}%` }} />
                </div>
                <div className="ml-bal">
                  <span>使う量 <b>{pl.tdee}</b></span>
                  <span>食べる目標 <b>{pl.target}</b></span>
                  <span>基礎代謝 <b>{pl.bmr}</b></span>
                </div>
                {/* いま足りているか、余っているか。ここがこの画面の主役 */}
                <div className={`ml-verdict ${verdict.tone}`}>{verdict.text}</div>
              </>
            )}

            <div className="ml-pfc">
              <span>たんぱく質 <b>{total.protein_g}</b>g{tgt && <i>／{tgt.protein_g}</i>}</span>
              <span>脂質 <b>{total.fat_g}</b>g{tgt && <i>／{tgt.fat_g}</i>}</span>
              <span>炭水化物 <b>{total.carbs_g}</b>g{tgt && <i>／{tgt.carbs_g}</i>}</span>
            </div>

            {/* 昨日ぶん（並べて見えないと、増えたのか減ったのか分からない） */}
            {bal?.yesterday && bal.yesterday.meals > 0 && (
              <div className="ml-yday">
                昨日は <b>{bal.yesterday.kcal}</b> kcal（{bal.yesterday.meals}食）
                {pl && (total.kcal > 0
                  ? <>　今日はここまで <b>{total.kcal - bal.yesterday.kcal > 0 ? "+" : ""}{total.kcal - bal.yesterday.kcal}</b></>
                  : null)}
              </div>
            )}
          </div>
        )}

        {/* ── 体の情報（足りないときだけ、うるさく言う） ───── */}
        {bal && bal.missing.length > 0 && (
          <button className="ml-need" onClick={() => setSetupOpen(true)}>
            消費カロリーを出すのに、あと{bal.missing.length}つ要る
            <small>{bal.missing.join("／")}</small>
          </button>
        )}

        {/* ── 設定（身長・動く量・落としたい量） ───────── */}
        {bal && (setupOpen || (bal.missing.length === 0 && !bal.input.height)) && (
          <div className="ml-setup">
            <div className="ml-setup-h">
              <span>からだと目標</span>
              <button onClick={() => setSetupOpen(false)}>×</button>
            </div>

            <label className="ml-row">
              <span>身長</span>
              <input type="number" inputMode="decimal" step="0.1" value={hIn}
                onChange={(e) => setHIn(e.target.value)} placeholder="170" />
              <em>cm</em>
              <button disabled={savingSetup || !hIn} onClick={() => void saveSetup({ height: Number(hIn) })}>保存</button>
            </label>

            <div className="ml-row is-col">
              <span>どれくらい動く？</span>
              <div className="ml-acts">
                {ACTIVITY_UI.map((a) => (
                  <button key={a.key} className={bal.input.activity === a.key ? "on" : ""}
                    disabled={savingSetup}
                    onClick={() => void saveSetup({ activity: a.key })}>
                    <b>{a.label}</b><small>{a.hint}</small>
                  </button>
                ))}
              </div>
            </div>

            <label className="ml-row">
              <span>1か月に落としたい</span>
              <input type="number" inputMode="decimal" step="0.5" min="0" max="10" value={gIn}
                onChange={(e) => setGIn(e.target.value)} placeholder="0" />
              <em>kg</em>
              <button disabled={savingSetup} onClick={() => void saveSetup({ wantedKg: Number(gIn) || 0 })}>保存</button>
            </label>
            <p className="ml-setup-n">
              0にすると「いまの体重を保つ」量になるよ。<br />
              脂肪1kgを落とすには約7200kcalの赤字が要る、という計算で出している。
            </p>
          </div>
        )}

        {/* 望んだペースが速すぎたときは、なぜ落としたかを必ず出す */}
        {pl?.capped && <div className="ml-capped">⚠ {pl.note}</div>}
        {pl && !pl.capped && pl.deficit > 0 && <div className="ml-note2">{pl.note}</div>}
        {bal?.balance?.pfc.note && <div className="ml-note2">{bal.balance.pfc.note}</div>}

        {/* ── ビタミンとミネラル（畳んでおく） ─────────── */}
        {bal?.balance && total && total.kcal > 0 && (
          <div className="ml-micro">
            <button className="ml-micro-h" onClick={() => setMicroOpen((v) => !v)}>
              🥬 ビタミンとミネラル（今日）
              <small>{microOpen ? "▲ 閉じる" : "▼ 開く"}</small>
            </button>
            {microOpen && (
              <>
                {bal.nutrients.map((n) => {
                  const got = bal.today?.micros?.[n.key] ?? 0;
                  const want = bal.balance!.micros[n.key] ?? 0;
                  const pct = want > 0 ? Math.round((got / want) * 100) : 0;
                  const over = n.kind === "cap" && got > want;
                  return (
                    <div key={n.key} className={`ml-mrow ${over ? "is-over" : ""}`}>
                      <span className="l">{n.label}</span>
                      <span className="v">{got}<i>/{want}{n.unit}</i></span>
                      <span className="b">
                        <span style={{ width: `${Math.min(100, pct)}%` }} />
                      </span>
                      <span className="p">{pct}%</span>
                    </div>
                  );
                })}
                <p className="ml-micro-n">
                  「摂りたい量」は日本人の食事摂取基準（2020年版）の代表値。<b>食塩相当量だけは上限</b>で、
                  超えたら赤くなるよ。集団の代表値なので、その人の必要量とはずれる目安。
                </p>
              </>
            )}
          </div>
        )}

        {/* ── 撮る ─────────────────────────────── */}
        {!ana && (
          <>
            <input ref={camRef} type="file" hidden capture="environment"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void analyze(f); e.target.value = ""; }} />
            <input ref={libRef} type="file" hidden
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void analyze(f); e.target.value = ""; }} />

            {busy ? (
              <div className="ml-busy">
                {shot && <img src={shot} alt="" />}
                <div className="ml-busy-t">写真を見ています…</div>
                <div className="ml-busy-s">10〜30秒くらいかかるよ</div>
              </div>
            ) : (
              <div className="ml-shoot">
                <button className="ml-cam" onClick={() => camRef.current?.click()}>
                  <span className="e">📷</span>
                  <span className="l">食事を撮る</span>
                </button>
                <button className="ml-lib" onClick={() => libRef.current?.click()}>🖼 写真から選ぶ</button>
              </div>
            )}
          </>
        )}

        {/* ── 結果を直して記録する ────────────────── */}
        {ana && (
          <div className="ml-result">
            {shot && <img className="ml-shot" src={shot} alt="" />}
            <div className="ml-name">{ana.meal_name}</div>
            <div className="ml-kcal is-one">
              <strong>{ana.total_kcal}</strong><span>kcal</span>
            </div>
            <div className="ml-range">
              だいたい {ana.estimate_min_kcal}〜{ana.estimate_max_kcal} kcal ／ 見え方の確かさ {ana.confidence}%
            </div>

            <div className="ml-why">{ana.uncertainty_reason}</div>
            {ana.warnings.length > 0 && (
              <ul className="ml-warn">{ana.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            )}

            <div className="ml-foods-t">中身（違ったら直してね）</div>
            {ana.foods.map((f, i) => (
              <div key={i} className="ml-food">
                <input value={f.name} onChange={(e) => rename(i, e.target.value)} aria-label="料理の名前" />
                <div className="ml-food-row">
                  <button onClick={() => nudge(i, -10)} aria-label="10g減らす">−</button>
                  <span className="g">{Math.round(f.grams)}g</span>
                  <button onClick={() => nudge(i, 10)} aria-label="10g増やす">＋</button>
                  <span className="kc">{Math.round(f.calories)} kcal</span>
                  <button className="x" onClick={() => drop(i)} aria-label="これは違う">×</button>
                </div>
                {f.detail && <div className="ml-food-d">{f.detail}</div>}
              </div>
            ))}

            <div className="ml-foods-t">いつの食事？</div>
            <div className="ml-types">
              {TYPES.map((t) => (
                <button key={t.key} className={mealType === t.key ? "on" : ""}
                  onClick={() => setMealType(t.key)}>
                  <span className="e">{t.emoji}</span><span className="l">{t.label}</span>
                </button>
              ))}
            </div>

            <button className="ml-go" disabled={saving || ana.foods.length === 0} onClick={() => void save()}>
              {saving ? "記録してる…" : "これで記録する"}
            </button>
            <button className="ml-again" onClick={() => { setAna(null); setShot(null); }}>撮り直す</button>
          </div>
        )}

        {/* ── 今日の記録 ───────────────────────── */}
        {!ana && meals.length > 0 && (
          <div className="ml-list">
            <div className="ml-foods-t">今日の記録</div>
            {meals.map((m) => (
              <div key={m.id} className="ml-item">
                <span className="t">{typeOf(m.meal_type)?.emoji ?? "🍽"} {hhmm(m.created_at)}</span>
                <span className="n">
                  {m.meal_name}
                  <small>{(m.foods ?? []).map((f) => f.name).join("・")}</small>
                </span>
                <span className="k">{m.total_kcal}<small>kcal</small></span>
                <button onClick={() => void remove(m.id)} aria-label="この記録を消す">×</button>
              </div>
            ))}
          </div>
        )}
        {!ana && !busy && meals.length === 0 && !err && (
          <div className="ml-empty">まだ今日の記録はないよ。1枚撮ってみて。</div>
        )}

        <p className="ml-foot">
          写真はその場で読み取って、そのまま捨てているよ。どこにも保存していない。<br />
          出てくる数字は記録のための目安で、正確な栄養値ではないからね。
        </p>
      </div>
    </div>
  );
}
