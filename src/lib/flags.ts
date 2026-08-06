/**
 * お試しスイッチ。
 *
 * 【何のためか】
 * 新しいものを作ったとき、いきなり全員に出すと、変だったときに全員が巻き込まれる。
 * そこで **まず淳くんの画面だけに出して、確かめてから全員に配る**。
 *
 * 3つの状態を持つ：
 *   admin … 淳くん（管理者）だけに出る  ← 新しいものは、ここから始める
 *   all   … 全員に出る                  ← 確かめてOKならここへ
 *   off   … 誰にも出さない              ← いったん引っ込めたいとき
 *
 * 【できないこと（正直に）】
 * これで包めるのは「出す／出さない」を選べるもの＝新しい画面・新しいボタン・新しい部屋。
 * 言い回しの変更・レイアウトの手直し・バグ修正のように
 * **既にあるものを差し替える**変更は、包んでも意味がないので全員に一度に反映される。
 */
import { supabaseAdmin } from "./supabase";

export type FlagState = "admin" | "all" | "off";

export type FlagDef = {
  key: string;
  label: string;
  /** これは何か（管理画面に出す） */
  note: string;
  /** 既定の状態。**新しく足すものは必ず "admin" にする** */
  fallback: FlagState;
};

/**
 * いまあるスイッチ。
 * 新しい機能を作ったら、ここに1行足して fallback: "admin" にしておく。
 * そうすれば、淳くんが確かめるまで他の人には出ない。
 */
export const FLAGS: FlagDef[] = [
  {
    key: "homeVoice",
    label: "ホームの音声入力（話しかけて行き先を決める）",
    note: "地図の上で話しかけると、どの部屋がよさそうか案内するもの。",
    fallback: "all",   // すでに配ってあるので、現状のまま
  },
  {
    key: "tutorial",
    label: "各ワークのチュートリアル",
    note: "初めて入った部屋で出る「何をするためのもの／こう使う」の案内。",
    fallback: "all",   // すでに配ってあるので、現状のまま
  },
  {
    key: "mealLens",
    label: "ミールレンズ（食事の写真からカロリー）",
    note: "食事を撮ると、料理・量・カロリー・PFCの目安が出る。数字は目安として幅つきで出す。"
      + "使うのは本人のGeminiキー。写真は保存しない。",
    fallback: "admin",   // まず淳くんの画面だけ。試してよければ "all" へ
  },
  {
    key: "broadcast",
    label: "発信スタジオ（まだ未完成）",
    note: "ワークの体験をSNS投稿にする部屋。まだ完成していないので、既定は off（誰にも出さない）。"
      + "off にすると、棚のボタンだけでなく **ワーク直後に出る「発信の素材になったよ」の通知も止まる**。"
      + "admin＝淳くんだけ。all＝管理画面で個別に開けた人に出る（これまでの挙動）。",
    fallback: "off",
  },
  {
    key: "points",
    label: "速学力プレゼント企画のポイント",
    note: "会話・ワーク・完了の記録から数えたポイントを、清瀬リンクの右上に出す。"
      + "ポイントは持たずに毎回数え直すので、あとから増減できない。8/31まで。",
    fallback: "admin",   // まず淳くんだけで検証してから全員へ
  },
];

export const isFlagKey = (v: unknown): v is string =>
  typeof v === "string" && FLAGS.some((f) => f.key === v);
export const isFlagState = (v: unknown): v is FlagState =>
  v === "admin" || v === "all" || v === "off";

const KEY = "feature_flags";

/** いまの設定（保存されていないものは、既定のまま） */
export async function getFlags(): Promise<Record<string, FlagState>> {
  const out: Record<string, FlagState> = {};
  for (const f of FLAGS) out[f.key] = f.fallback;
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from("app_config").select("value").eq("key", KEY).maybeSingle();
    const v = (data?.value ?? {}) as any;
    for (const f of FLAGS) if (isFlagState(v[f.key])) out[f.key] = v[f.key];
    return out;
  } catch {
    // 読めないときは既定のまま。新しいものは "admin" なので、勝手に配られることはない
    return out;
  }
}

/** その人に、それぞれが出るかどうか */
export function resolveFlags(
  states: Record<string, FlagState>,
  isAdmin: boolean,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const f of FLAGS) {
    const st = states[f.key] ?? f.fallback;
    out[f.key] = st === "all" ? true : st === "admin" ? isAdmin : false;
  }
  return out;
}

export async function setFlag(key: string, state: FlagState): Promise<Record<string, FlagState>> {
  const cur = await getFlags();
  const next = { ...cur, [key]: state };
  const supa = supabaseAdmin();
  const { error } = await supa.from("app_config").upsert(
    { key: KEY, value: next, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw error;
  return next;
}
