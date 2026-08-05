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
type Record = Analysis & { id: string; meal_type: string; created_at: string };
type Total = { kcal: number; protein_g: number; fat_g: number; carbs_g: number; min_kcal: number; max_kcal: number };

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

const hhmm = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo", hour12: false,
    }).format(new Date(iso));
  } catch { return ""; }
};

export function MealLens({ onBack }: { onBack: () => void }) {
  const [meals, setMeals] = useState<Record[]>([]);
  const [total, setTotal] = useState<Total | null>(null);
  const [err, setErr] = useState("");
  const [sql, setSql] = useState("");
  const [busy, setBusy] = useState(false);

  // 撮ったあとの状態
  const [shot, setShot] = useState<string | null>(null);   // 画面に出すだけ。どこにも送らない
  const [ana, setAna] = useState<Analysis | null>(null);
  const [mealType, setMealType] = useState(guessType());
  const [saving, setSaving] = useState(false);

  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/meal");
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "読み込めなかった"); setSql(d.sql || ""); return; }
      setErr(""); setSql("");
      setMeals(d.meals ?? []); setTotal(d.total ?? null);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  /** 写真を1枚見てもらう */
  async function analyze(file: File) {
    setErr(""); setAna(null); setBusy(true);
    try { setShot(URL.createObjectURL(file)); } catch { /* 出せなくても進む */ }
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await fetch("/api/meal/analyze", { method: "POST", body: fd });
      const d = await r.json();
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
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "記録できなかった"); setSql(d.sql || ""); return; }
      setAna(null); setShot(null);
      await load();
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    try {
      await fetch(`/api/meal?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } catch { /* 消せなくても画面は壊さない */ }
  }

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

        {/* ── 今日の合計 ───────────────────────── */}
        {total && (
          <div className="ml-total">
            <div className="ml-total-t">今日ここまで</div>
            <div className="ml-kcal">
              <strong>{total.kcal}</strong><span>kcal</span>
            </div>
            {total.kcal > 0 && (
              <div className="ml-range">だいたい {total.min_kcal}〜{total.max_kcal} kcal のあいだ</div>
            )}
            <div className="ml-pfc">
              <span>たんぱく質 <b>{total.protein_g}</b>g</span>
              <span>脂質 <b>{total.fat_g}</b>g</span>
              <span>炭水化物 <b>{total.carbs_g}</b>g</span>
            </div>
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
