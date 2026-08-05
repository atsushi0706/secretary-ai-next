/**
 * ミールレンズ（食事の写真 → カロリーとPFC）。サーバ専用。
 *
 * 【どこから来たか】
 * `claudecode『開発』/mealens-app`（MEALENS）で作った仕組みを、
 * シンガワールドの中に移したもの。あちらは Cloudflare + D1 だったので、
 * ・保存先を Supabase に
 * ・Gemini の呼び方をこのアプリの流儀（本人のキー・v1beta・モデル総当たり）に
 * 置き換えてある。推定の指示文と、値の均しかたは、あちらのものをそのまま使う。
 *
 * 【言い切らない】
 * 写真1枚から出せるのは目安であって、正確な栄養値ではない。
 * だから **幅（min〜max）と、どこが不確かか** を必ず一緒に出す。
 * 「◯◯kcalです」と言い切る画面は作らない。
 */
import { supabaseAdmin, getUserSettings } from "./supabase";
import { jstDateStr } from "./google";

/** この形でしか受け取らない（Geminiに渡す型） */
const SCHEMA = {
  type: "object",
  required: [
    "food_detected", "meal_name", "foods", "total_kcal", "protein_g", "fat_g", "carbs_g",
    "confidence", "estimate_min_kcal", "estimate_max_kcal", "uncertainty_reason", "warnings",
  ],
  properties: {
    food_detected: { type: "boolean" },
    meal_name: { type: "string" },
    foods: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "detail", "grams", "calories", "protein_g", "fat_g", "carbs_g", "confidence"],
        properties: {
          name: { type: "string" },
          detail: { type: "string" },
          grams: { type: "number" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          fat_g: { type: "number" },
          carbs_g: { type: "number" },
          confidence: { type: "number" },
        },
      },
    },
    total_kcal: { type: "number" },
    protein_g: { type: "number" },
    fat_g: { type: "number" },
    carbs_g: { type: "number" },
    confidence: { type: "number" },
    estimate_min_kcal: { type: "number" },
    estimate_max_kcal: { type: "number" },
    uncertainty_reason: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;

const INSTRUCTIONS = `
あなたは日本の食生活に詳しい管理栄養士の補助AIです。食事写真を観察し、見えている食品と量、栄養を推定してください。

必須ルール:
- 写真ごとに実際の内容を判断する。定型の料理を返さない。
- 食べ物、飲み物、食材が確認できない場合は food_detected=false とし、foodsは空配列、数値は0にする。
- 生鮮食材や未調理食材も食べ物として扱い、見える単位で分ける。
- 複数料理、丼、麺、カレー、汁物、菓子、飲料、食べ残しを区別する。
- 重量は写真1枚からの推定であることを前提に、過度に細かい断定をしない。
- 各料理のカロリーとPFCは、その料理の推定重量に対応させる。合計値は各料理の合計と整合させる。
- confidenceは0〜100の校正された値にする。不鮮明、遮蔽、量が読めない場合は低くする。
- estimate_min_kcal <= total_kcal <= estimate_max_kcal を守る。
- 画像だけで分からない油、砂糖、ソース、容器の深さは uncertainty_reason と warnings に明記する。
- 出力は日本語。meal_nameは短く自然な料理名にする。
- 医療診断や厳密な栄養値ではなく、記録用の目安として推定する。

JSONだけを返す。前後に説明や記号を付けない。
`.trim();

/**
 * 使うモデル。/api/stt と同じ考えで並べる。
 * 無料枠で実際に通るかを最優先にし、枠が枯れがちなものは後ろへ回す。
 */
const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
];

/**
 * 受け取れる写真の大きさ。
 * Vercel が1回に受け取れるのは 4.5MB まで。それを超えると、こちらのコードに届く前に
 * 「Request Entity Too Large」という**JSONでない**返事が返る（画面が落ちていた原因）。
 * 画面側で送る前に長辺1280pxへ縮めているので、普通はこの上限に当たらない。
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MIME_OK = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export type MealFood = {
  name: string; detail: string; grams: number;
  calories: number; protein_g: number; fat_g: number; carbs_g: number; confidence: number;
};
export type MealAnalysis = {
  food_detected: boolean;
  meal_name: string;
  foods: MealFood[];
  total_kcal: number;
  protein_g: number; fat_g: number; carbs_g: number;
  confidence: number;
  estimate_min_kcal: number; estimate_max_kcal: number;
  uncertainty_reason: string;
  warnings: string[];
};

/** 中身が本当にその形式の画像か（拡張子だけを信じない） */
export function looksLikeImage(bytes: Uint8Array, mime: string): boolean {
  if (!MIME_OK.has(mime)) return false;
  const s = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b));
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "image/webp") return s(0, 4) === "RIFF" && s(8, 12) === "WEBP";
  if (mime === "image/heic" || mime === "image/heif") {
    return s(4, 8) === "ftyp" &&
      ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(s(8, 12));
  }
  return false;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const r1 = (v: number) => Number(v.toFixed(1));

/**
 * AIが返したものを、そのまま信じずに均す。
 * 合計は **各料理の足し算で作り直す**（AIの合計は合わないことがある）。
 */
export function normalize(value: unknown): MealAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const src = value as Record<string, unknown>;
  const warnings = Array.isArray(src.warnings)
    ? src.warnings.map((w) => str(w, 200)).filter(Boolean).slice(0, 8) : [];
  const why = str(src.uncertainty_reason, 500);

  if (src.food_detected !== true) {
    return {
      food_detected: false, meal_name: "", foods: [],
      total_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, confidence: 0,
      estimate_min_kcal: 0, estimate_max_kcal: 0,
      uncertainty_reason: why || "食べ物を確認できませんでした。",
      warnings,
    };
  }

  const foods: MealFood[] = (Array.isArray(src.foods) ? src.foods.slice(0, 20) : []).flatMap((it) => {
    if (!it || typeof it !== "object") return [];
    const f = it as Record<string, unknown>;
    const name = str(f.name, 80);
    if (!name) return [];
    return [{
      name,
      detail: str(f.detail, 160),
      grams: r1(num(f.grams)),
      calories: r1(num(f.calories)),
      protein_g: r1(num(f.protein_g)),
      fat_g: r1(num(f.fat_g)),
      carbs_g: r1(num(f.carbs_g)),
      confidence: Math.round(Math.min(100, num(f.confidence))),
    }];
  });
  if (foods.length === 0) return null;

  const total = Math.round(foods.reduce((s, f) => s + f.calories, 0));
  const min = num(src.estimate_min_kcal), max = num(src.estimate_max_kcal);
  return {
    food_detected: true,
    meal_name: str(src.meal_name, 80) || foods.map((f) => f.name).join("・").slice(0, 80),
    foods,
    total_kcal: total,
    protein_g: r1(foods.reduce((s, f) => s + f.protein_g, 0)),
    fat_g: r1(foods.reduce((s, f) => s + f.fat_g, 0)),
    carbs_g: r1(foods.reduce((s, f) => s + f.carbs_g, 0)),
    confidence: Math.round(Math.min(100, num(src.confidence))),
    // 幅は必ず合計をまたぐようにする（AIが逆さの値を返すことがある）
    estimate_min_kcal: Math.round(Math.min(total, min || total * 0.8)),
    estimate_max_kcal: Math.round(Math.max(total, max || total * 1.2)),
    uncertainty_reason: why || "写真1枚からの推定のため、量や調味料に幅があります。",
    warnings,
  };
}

/** 写真を見てもらう。使うのは本人のGeminiキー（無ければ運営のキー） */
export async function analyzeMeal(
  userId: string, b64: string, mime: string,
  log: string[] = [],
): Promise<MealAnalysis | null> {
  const s: any = await getUserSettings(userId).catch(() => null);
  const key = (s?.gemini_api_key && String(s.gemini_api_key).trim())
    ? String(s.gemini_api_key).trim()
    : (process.env.GEMINI_API_KEY || "");
  if (!key) { log.push("Geminiのキーがまだ設定されていない"); return null; }

  for (const model of MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
            contents: [{
              parts: [
                { inline_data: { mime_type: mime, data: b64 } },
                { text: "この写真に写る食事・飲料・食材を分析してください。" },
              ],
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2400,
              responseMimeType: "application/json",
              responseSchema: SCHEMA,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        },
      );
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        const msg = (body.match(/"message"\s*:\s*"([^"]{0,160})"/)?.[1] ?? body.slice(0, 120)).trim();
        log.push(`${model}: ${r.status} ${msg}`);
        continue;   // 429 はモデルごとに別枠。替えれば通ることが多い
      }
      const d = await r.json();
      const text = String(
        d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "",
      ).trim();
      if (!text) { log.push(`${model}: 応答が空`); continue; }
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) { log.push(`${model}: JSONが見つからない`); continue; }
      const out = normalize(JSON.parse(m[0]));
      if (out) return out;
      log.push(`${model}: 中身が空だった`);
    } catch (e: any) {
      log.push(`${model}: ${String(e?.message ?? e).slice(0, 100)}`);
    }
  }
  return null;
}

/* ── 保存と読み出し ──────────────────────────────────── */

export type MealRecord = {
  id: string;
  date: string;
  meal_type: string;
  meal_name: string;
  foods: MealFood[];
  total_kcal: number;
  protein_g: number; fat_g: number; carbs_g: number;
  confidence: number;
  estimate_min_kcal: number; estimate_max_kcal: number;
  uncertainty_reason: string;
  created_at: string;
};

export async function saveMeal(
  userId: string, mealType: string, a: MealAnalysis,
): Promise<void> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("meal_records").insert({
    user_id: userId,
    date: jstDateStr(),
    meal_type: mealType,
    meal_name: a.meal_name,
    foods: a.foods,
    total_kcal: a.total_kcal,
    protein_g: a.protein_g,
    fat_g: a.fat_g,
    carbs_g: a.carbs_g,
    confidence: a.confidence,
    estimate_min_kcal: a.estimate_min_kcal,
    estimate_max_kcal: a.estimate_max_kcal,
    uncertainty_reason: a.uncertainty_reason,
  });
  if (error) throw error;
}

/** 直近の記録（既定は今日のぶん） */
export async function listMeals(userId: string, date?: string): Promise<MealRecord[]> {
  const supa = supabaseAdmin();
  let q = supa.from("meal_records").select("*").eq("user_id", userId)
    .order("created_at", { ascending: true }).limit(60);
  if (date !== "all") q = q.eq("date", date || jstDateStr());
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MealRecord[];
}

export async function deleteMeal(userId: string, id: string): Promise<void> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("meal_records").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

/** この表を作るSQL（管理画面から見せる） */
export const MEAL_MIGRATION = `
create table if not exists meal_records (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,
  date               date not null,
  meal_type          text not null default 'other',
  meal_name          text not null default '',
  foods              jsonb not null default '[]'::jsonb,
  total_kcal         integer not null default 0,
  protein_g          real not null default 0,
  fat_g              real not null default 0,
  carbs_g            real not null default 0,
  confidence         integer not null default 0,
  estimate_min_kcal  integer not null default 0,
  estimate_max_kcal  integer not null default 0,
  uncertainty_reason text not null default '',
  created_at         timestamptz not null default now()
);
create index if not exists meal_records_user_date_idx on meal_records (user_id, date);
`.trim();
