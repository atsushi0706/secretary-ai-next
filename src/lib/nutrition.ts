/**
 * 消費カロリー・目標カロリー・PFC・ビタミンとミネラルの目安。
 * サーバでも画面でも使うので、外から何も読まない純粋な計算だけを置く。
 *
 * 【いちばん大事な決まり】
 * **基礎代謝より少ない食事は、計画として出さない。**
 * 基礎代謝を割ると、体は「飢えている」と判断して省エネに切り替わる（ホメオスタシス）。
 * 消費が落ちるので同じ食事でも減らなくなり、足りないぶんは筋肉から持っていかれる。
 * つまり「早く減らそうとして減らなくなる」。だから、
 *   ・望んだ速さが基礎代謝を割るなら、**割らない範囲まで速さを落として**返す
 *   ・そのとき「なぜ落としたのか」を必ず言葉で添える
 * ——黙って数字を書き換えない。
 *
 * 【出す数字は目安】
 * 基礎代謝の式も、栄養の推奨量も、集団の代表値から出した推定。
 * 個人の実測値ではないので、医療の判断には使わない。画面にもそう書く。
 */

/* ── 体の情報 ──────────────────────────────────── */

export type Sex = "male" | "female";

/** 動く量。1日の消費は、基礎代謝にこの係数を掛けて出す */
export const ACTIVITY = [
  { key: "low", factor: 1.2, label: "ほとんど座って過ごす", hint: "デスクワーク中心・運動なし" },
  { key: "mid", factor: 1.375, label: "少し動く", hint: "軽い運動を週1〜3回／よく歩く" },
  { key: "high", factor: 1.55, label: "よく動く", hint: "中くらいの運動を週3〜5回" },
  { key: "vhigh", factor: 1.725, label: "かなり動く", hint: "強い運動をほぼ毎日／立ち仕事" },
] as const;
export type ActivityKey = typeof ACTIVITY[number]["key"];
export const isActivityKey = (v: unknown): v is ActivityKey =>
  typeof v === "string" && ACTIVITY.some((a) => a.key === v);
export const activityOf = (k: ActivityKey) => ACTIVITY.find((a) => a.key === k) ?? ACTIVITY[0];

export type Body = {
  /** kg */
  weight: number;
  /** cm */
  height: number;
  /** 歳 */
  age: number;
  sex: Sex;
  activity: ActivityKey;
};

/**
 * 基礎代謝（何もしなくても使う量）。Mifflin-St Jeor の式。
 * 体重・身長・年齢・性別から出す、いちばん広く使われている推定式。
 */
export function bmr(b: Body): number {
  const base = 10 * b.weight + 6.25 * b.height - 5 * b.age;
  return Math.round(base + (b.sex === "male" ? 5 : -161));
}

/** 1日に使う量（基礎代謝 × 動く量） */
export function tdee(b: Body): number {
  return Math.round(bmr(b) * activityOf(b.activity).factor);
}

/* ── 目標（どれくらいのペースで落としたいか） ───────── */

/** 脂肪1kgを落とすのに要る赤字（kcal）。体脂肪の実測からくる慣例値 */
export const KCAL_PER_KG_FAT = 7200;
const DAYS_PER_MONTH = 30.4;

export type Plan = {
  bmr: number;
  tdee: number;
  /** 1日に食べる目標 */
  target: number;
  /** 1日の赤字 */
  deficit: number;
  /** 実際に見込める1か月の減り（kg） */
  paceKg: number;
  /** 望まれたペース（kg／月） */
  wantedKg: number;
  /** 望まれたペースを落としたか */
  capped: boolean;
  /** 落としたなら、その理由（本人に見せる言葉） */
  note: string;
};

/**
 * 1か月に落としたい量から、1日の目標カロリーを決める。
 *
 * @param wantedKg 1か月に落としたいkg（0なら維持）
 */
export function plan(b: Body, wantedKg: number): Plan {
  const base = bmr(b);
  const out = tdee(b);
  const want = Math.max(0, Math.min(10, Number(wantedKg) || 0));

  // 望んだペースに要る赤字
  const wantDeficit = (want * KCAL_PER_KG_FAT) / DAYS_PER_MONTH;
  const wantTarget = out - wantDeficit;

  // ここが要点：基礎代謝より下の目標は作らない
  if (want > 0 && wantTarget < base) {
    const maxDeficit = Math.max(0, out - base);
    const maxKg = (maxDeficit * DAYS_PER_MONTH) / KCAL_PER_KG_FAT;
    return {
      bmr: base, tdee: out,
      target: base,
      deficit: Math.round(maxDeficit),
      paceKg: Math.round(maxKg * 10) / 10,
      wantedKg: want,
      capped: true,
      note: maxDeficit <= 0
        ? `いま動く量だと、消費（${out}kcal）が基礎代謝（${base}kcal）とほぼ同じ。`
          + `食事を削る余地がないので、まずは動く量を増やすほうが早いよ。`
        : `月${want}kgだと、食べる量が基礎代謝（${base}kcal）を下回ってしまう。`
          + `そこを割ると体が省エネに切り替わって、同じ食事でも減らなくなるし、`
          + `足りないぶんは筋肉から持っていかれる。だから**月${Math.round(maxKg * 10) / 10}kgまで**にしてある。`
          + `もっと速くしたいなら、削るのではなく動く量を増やすほう。`,
    };
  }

  return {
    bmr: base, tdee: out,
    target: Math.round(wantTarget),
    deficit: Math.round(wantDeficit),
    paceKg: Math.round(want * 10) / 10,
    wantedKg: want,
    capped: false,
    note: want === 0
      ? `いまの体重を保つ量だよ。`
      : `1日 ${Math.round(wantDeficit)}kcal の赤字で、月 ${want}kg のペース。基礎代謝は割っていない。`,
  };
}

/* ── PFC（たんぱく質・脂質・炭水化物）の配分 ───────── */

export type Pfc = { protein_g: number; fat_g: number; carbs_g: number; note: string };

/**
 * 年齢に合わせた配分。
 *
 * たんぱく質は「体重あたり何g」で決める（％で決めると、減量中に足りなくなる）。
 * 年齢が上がるほど多めにするのは、同じ量では筋肉を保ちにくくなるため。
 * 減量中はさらに多めにする——赤字のときに削られる先が筋肉になりやすいので。
 *
 * 脂質は総カロリーの25%（食事摂取基準の20〜30%の真ん中）。
 * 残りを炭水化物にする。
 */
export function pfc(b: Body, targetKcal: number, cutting: boolean): Pfc {
  // 体重あたりのたんぱく質（g/kg）
  const perKg =
    b.age >= 65 ? (cutting ? 1.5 : 1.3) :
    b.age >= 50 ? (cutting ? 1.4 : 1.2) :
    /* 〜49歳 */   (cutting ? 1.3 : 1.0);

  const protein = Math.round(b.weight * perKg);
  const fat = Math.round((targetKcal * 0.25) / 9);
  const rest = targetKcal - protein * 4 - fat * 9;
  const carbs = Math.max(0, Math.round(rest / 4));

  return {
    protein_g: protein, fat_g: fat, carbs_g: carbs,
    note: `たんぱく質は体重1kgあたり${perKg}g。`
      + (b.age >= 50 ? `年齢が上がると同じ量では筋肉を保ちにくいので、多めにしてある。` : "")
      + (cutting ? `減っていく時期は、削られる先が筋肉になりやすいのでさらに多め。` : "")
      + `脂質は全体の25%、残りを炭水化物に置いている。`,
  };
}

/* ── ビタミンとミネラル ─────────────────────────── */

/**
 * 1日にとりたい量（日本人の食事摂取基準2020年版の代表値）。
 *
 * ・kind: "want" … 足りているかを見るもの（推奨量・目安量・目標量の下限）
 * ・kind: "cap"  … 摂りすぎに気をつけるもの（塩分）
 *
 * 年齢で変わるものだけ帯を持たせている。変わらないものは1つの値。
 * ——集団の代表値なので、個人の必要量とはずれる。目安として見るもの。
 */
export type NutrientKey =
  | "fiber" | "salt" | "calcium" | "iron" | "zinc" | "magnesium" | "potassium"
  | "vitA" | "vitD" | "vitE" | "vitB1" | "vitB2" | "vitB6" | "vitB12" | "folate" | "vitC";

export type NutrientDef = {
  key: NutrientKey;
  label: string;
  unit: string;
  kind: "want" | "cap";
  /** その人の1日の目安を返す */
  amount: (age: number, sex: Sex) => number;
  /** どんなものに入っているか（画面に出す一言） */
  from: string;
};

const band = (age: number) =>
  age >= 75 ? "75+" : age >= 65 ? "65-74" : age >= 50 ? "50-64" : age >= 30 ? "30-49" : "18-29";

export const NUTRIENTS: NutrientDef[] = [
  {
    key: "fiber", label: "食物繊維", unit: "g", kind: "want", from: "野菜・きのこ・海藻・豆・玄米",
    amount: (age, sex) => (sex === "male"
      ? (band(age) === "65-74" || band(age) === "75+" ? 20 : 21)
      : (band(age) === "65-74" || band(age) === "75+" ? 17 : 18)),
  },
  {
    key: "salt", label: "食塩相当量", unit: "g", kind: "cap", from: "汁物・漬物・加工肉・外食",
    amount: (_age, sex) => (sex === "male" ? 7.5 : 6.5),
  },
  {
    key: "calcium", label: "カルシウム", unit: "mg", kind: "want", from: "乳製品・小魚・小松菜・豆腐",
    amount: (age, sex) => (sex === "male"
      ? (band(age) === "18-29" ? 800 : band(age) === "75+" ? 700 : 750)
      : (band(age) === "18-29" ? 650 : 650)),
  },
  {
    key: "iron", label: "鉄", unit: "mg", kind: "want", from: "赤身肉・レバー・貝・ほうれん草",
    // 女性は月経のある年代で多く要る。50歳以降は下がる
    amount: (age, sex) => (sex === "male" ? 7.5 : (age < 50 ? 10.5 : 6.5)),
  },
  {
    key: "zinc", label: "亜鉛", unit: "mg", kind: "want", from: "牡蠣・赤身肉・チーズ・ナッツ",
    amount: (_age, sex) => (sex === "male" ? 11 : 8),
  },
  {
    key: "magnesium", label: "マグネシウム", unit: "mg", kind: "want", from: "豆・ナッツ・海藻・全粒穀物",
    amount: (age, sex) => (sex === "male"
      ? (band(age) === "18-29" ? 340 : band(age) === "30-49" ? 370 : band(age) === "50-64" ? 370 : 350)
      : (band(age) === "18-29" ? 270 : band(age) === "30-49" ? 290 : 290)),
  },
  {
    key: "potassium", label: "カリウム", unit: "mg", kind: "want", from: "いも・果物・野菜・豆",
    amount: (_age, sex) => (sex === "male" ? 3000 : 2600),
  },
  {
    key: "vitA", label: "ビタミンA", unit: "µgRAE", kind: "want", from: "レバー・うなぎ・にんじん・卵",
    amount: (age, sex) => (sex === "male" ? (band(age) === "75+" ? 800 : 900) : 700),
  },
  {
    key: "vitD", label: "ビタミンD", unit: "µg", kind: "want", from: "魚（鮭・さんま）・きのこ・日光",
    amount: () => 8.5,
  },
  {
    key: "vitE", label: "ビタミンE", unit: "mg", kind: "want", from: "ナッツ・植物油・かぼちゃ",
    amount: (_age, sex) => (sex === "male" ? 6.0 : 5.0),
  },
  {
    key: "vitB1", label: "ビタミンB1", unit: "mg", kind: "want", from: "豚肉・玄米・豆・うなぎ",
    amount: (_age, sex) => (sex === "male" ? 1.4 : 1.1),
  },
  {
    key: "vitB2", label: "ビタミンB2", unit: "mg", kind: "want", from: "レバー・卵・乳製品・納豆",
    amount: (_age, sex) => (sex === "male" ? 1.6 : 1.2),
  },
  {
    key: "vitB6", label: "ビタミンB6", unit: "mg", kind: "want", from: "魚・肉・バナナ・にんにく",
    amount: (_age, sex) => (sex === "male" ? 1.4 : 1.1),
  },
  {
    key: "vitB12", label: "ビタミンB12", unit: "µg", kind: "want", from: "貝・魚・レバー・のり",
    amount: () => 2.4,
  },
  {
    key: "folate", label: "葉酸", unit: "µg", kind: "want", from: "緑の葉物・ブロッコリー・豆・レバー",
    amount: () => 240,
  },
  {
    key: "vitC", label: "ビタミンC", unit: "mg", kind: "want", from: "果物・ピーマン・ブロッコリー・いも",
    amount: () => 100,
  },
];

export const isNutrientKey = (v: unknown): v is NutrientKey =>
  typeof v === "string" && NUTRIENTS.some((n) => n.key === v);

/** その人の、1日ぶんの目安をまとめて出す */
export function targets(age: number, sex: Sex): Record<NutrientKey, number> {
  const out = {} as Record<NutrientKey, number>;
  for (const n of NUTRIENTS) out[n.key] = n.amount(age, sex);
  return out;
}

/* ── まとめ ────────────────────────────────────── */

export type Balance = {
  body: Body;
  plan: Plan;
  pfc: Pfc;
  /** ビタミン・ミネラルの1日の目安 */
  micros: Record<NutrientKey, number>;
};

export function balance(b: Body, wantedKg: number): Balance {
  const p = plan(b, wantedKg);
  return {
    body: b,
    plan: p,
    pfc: pfc(b, p.target, p.deficit > 0),
    micros: targets(b.age, b.sex),
  };
}

/** 生年月日から歳を出す（JSTの今日で数える） */
export function ageFrom(birth: string | null | undefined, todayStr: string): number | null {
  if (!birth) return null;
  const m = String(birth).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const t = String(todayStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m || !t) return null;
  let age = Number(t[1]) - Number(m[1]);
  if (Number(t[2]) < Number(m[2]) || (Number(t[2]) === Number(m[2]) && Number(t[3]) < Number(m[3]))) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}
