/**
 * 空想 ↔ 現実のメーター。
 *
 * 【なぜ作り直したか】
 * これまで針の位置は「7日間の日数差」と「AIが会話を読んだ所見」で決まっていた。
 * その結果、致命的な逆転が起きていた：
 *  - パラレルウォークをやるほど"理想の話"が増え、AIが「空想寄り」と判定する。
 *    つまり**ワークをやるほど針が空想側へ振れる**。
 *  - リアルバースで日常タスクをこなしても、記録がどこにも残らないので現実側に入らない。
 *  - 画面には「✓すると針が中央へ動くよ」と書いてあるのに、実際は7日窓の日数差と
 *    AI所見で決まるので、1つ✓しても動かない。**言っていることとやっていることが違った。**
 *
 * 【新しい決まり（ここが唯一の正）】
 *  ① 針の位置は「実際にやったこと」だけで決める。AIの所見は言葉にだけ使い、位置には効かせない。
 *  ② **今日、理想を1つでも現実に合わせたら、その日は真ん中（ゾーン）。**
 *     ・ハイヤークエスト（今日の一手）に✓
 *     ・未来からのクエストに✓
 *     ・理想（クエスト）から生まれたタスクを完了
 *     予定がずれてもいい。1つ合わせれば戻れる、という手ざわりにする。
 *  ③ 何をすれば戻るのかを、必ず画面に具体で出す（当てもの にしない）。
 */
import { supabaseAdmin } from "./supabase";
import { jstDateStr } from "./google";

export type BalanceSide = { days: number; today: number; items: string[] };
export type BalanceNext = { key: string; label: string; how: string };

export type Balance = {
  /** 0=空想いっぱい / 50=真ん中 / 100=現実いっぱい */
  pos: number;
  state: "zone" | "flow" | "image" | "real" | "neutral";
  /** 今日、理想を現実に合わせたか（合わせたら必ず真ん中） */
  linkedToday: boolean;
  /** 今日つないだ回数 */
  linkedCount: number;
  image: BalanceSide;
  real: BalanceSide;
  /** 真ん中に戻すために、いまできること */
  next: BalanceNext[];
};

const DAYS = 7;
const since = (n = DAYS) => jstDateStr(new Date(Date.now() - n * 86400000));

/** 空でも落ちない読み取り */
async function rows(q: any): Promise<any[]> {
  try { const { data } = await q; return Array.isArray(data) ? data : []; } catch { return []; }
}

export async function computeBalance(userId: string): Promise<Balance> {
  const supa = supabaseAdmin();
  const from = since();
  const today = jstDateStr();

  const [walks, innerTalk, letters, hq, cards, done] = await Promise.all([
    rows(supa.from("walk_logs").select("date").eq("user_id", userId).gte("date", from)),
    rows(supa.from("shinga_conversations").select("date, place").eq("user_id", userId)
      .eq("role", "user").in("place", ["walk", "higher", "peak", "deep"]).gte("date", from)),
    rows(supa.from("link_letter").select("date").eq("user_id", userId).gte("date", from)),
    rows(supa.from("higher_quest").select("date, items").eq("user_id", userId).gte("date", from)),
    rows(supa.from("quest_cards").select("date, done, title").eq("user_id", userId).gte("date", from)),
    // リアルバースで実際に終わらせたこと（これが無かったので、日常タスクが反映されなかった）
    rows(supa.from("real_actions").select("date, kind, title, aligned").eq("user_id", userId).gte("date", from)),
  ]);

  /* ── 空想側（理想を見にいった日） ── */
  const imgDays = new Set<string>();
  const imgItems: string[] = [];
  for (const w of walks) if (w.date) { imgDays.add(w.date); }
  if (walks.length) imgItems.push(`パラレルウォーク ${new Set(walks.map((w) => w.date)).size}日`);
  for (const c of innerTalk) if (c.date) imgDays.add(c.date);
  if (innerTalk.length) imgItems.push(`内側のワーク ${new Set(innerTalk.map((c) => c.date)).size}日`);
  for (const l of letters) if (l.date) imgDays.add(l.date);
  if (letters.length) imgItems.push(`未来からの手紙 ${letters.length}通`);

  /* ── 現実側（今日に落とした日） ── */
  const realDays = new Set<string>();
  const realItems: string[] = [];
  let linkedCount = 0;

  let hqDone = 0;
  for (const q of hq) {
    const items = Array.isArray(q.items) ? q.items : [];
    const n = items.filter((it: any) => it?.done).length;
    if (n > 0) { realDays.add(q.date); hqDone += n; if (q.date === today) linkedCount += n; }
  }
  if (hqDone) realItems.push(`今日の一手 ✓${hqDone}`);

  let cardDone = 0;
  for (const c of cards) {
    if (c?.done) { realDays.add(c.date); cardDone++; if (c.date === today) linkedCount++; }
  }
  if (cardDone) realItems.push(`未来からのクエスト ✓${cardDone}`);

  let taskDone = 0, alignedTasks = 0;
  for (const a of done) {
    if (!a?.date) continue;
    realDays.add(a.date);
    taskDone++;
    // 理想（クエスト）から生まれたタスクを終わらせたなら、それは"つないだ"こと
    if (a.aligned && a.date === today) { linkedCount++; alignedTasks++; }
  }
  if (taskDone) realItems.push(`リアルバースのタスク ✓${taskDone}`);
  void alignedTasks;

  const imageToday = imgDays.has(today) ? 1 : 0;
  const realToday = realDays.has(today) ? 1 : 0;
  const linkedToday = linkedCount > 0;

  /* ── 針の位置 ── */
  let pos: number;
  let state: Balance["state"];
  if (linkedToday) {
    // ② 今日つないだ＝真ん中。ここは何があっても揺らがせない
    pos = 50;
    state = "zone";
  } else if (imgDays.size === 0 && realDays.size === 0) {
    pos = 50;
    state = "neutral";
  } else {
    const total = imgDays.size + realDays.size;
    const diff = realDays.size - imgDays.size;      // 正＝現実寄り
    pos = Math.max(8, Math.min(92, 50 + (diff / total) * 42));
    const off = Math.abs(pos - 50);
    state = off <= 9 ? "zone" : off <= 22 ? "flow" : pos > 50 ? "real" : "image";
  }

  /* ── 真ん中に戻すために、いまできること ──
     整っている（ゾーン／フロー）ときは何も返さない。
     いま流れに乗っている人へ「これをやれ」と並べるのは、ただの雑音になる。 */
  const next: BalanceNext[] = [];
  const offCenter = state === "image" || state === "real";
  if (offCenter && !linkedToday) {
    next.push({
      key: "quest",
      label: "今日の一手にひとつ ✓ を付ける",
      how: "ハイヤークエストの ○ をタップするだけ。これが「理想を今日に合わせた」ということ。",
    });
    if (hq.every((q) => q.date !== today)) {
      next.push({
        key: "card",
        label: "未来からのクエストを受け取る",
        how: "受け取ると「今日の一手」が入る。まだ今日のぶんが無いときはここから。",
      });
    }
    next.push({
      key: "task",
      label: "リアルバースのタスクをひとつ終わらせる",
      how: "理想から生まれたタスクを終えると、それも「合わせた」ことになる。",
    });
  }
  if (offCenter && !imageToday && state !== "image") {
    next.push({
      key: "walk",
      label: "上を向く時間をとる（パラレルウォーク／ピークステート）",
      how: "現実だけになると、何のためかを見失う。5分でいい。",
    });
  }

  return {
    pos, state, linkedToday, linkedCount,
    image: { days: imgDays.size, today: imageToday, items: imgItems },
    real: { days: realDays.size, today: realToday, items: realItems },
    next: next.slice(0, 3),
  };
}

/**
 * 「現実で終わらせたこと」を1件残す。
 * リアルバースでタスクを完了したときに呼ぶ。ここが無いと、
 * 日常のタスクをいくらこなしても、メーターからは見えない。
 */
export async function recordRealAction(
  userId: string,
  a: { kind: string; title?: string; aligned?: boolean },
): Promise<void> {
  try {
    const supa = supabaseAdmin();
    await supa.from("real_actions").insert({
      user_id: userId,
      date: jstDateStr(),
      kind: a.kind,
      title: (a.title ?? "").slice(0, 120),
      aligned: !!a.aligned,
    });
  } catch { /* 残せなくても、完了そのものは成功させる */ }
}
