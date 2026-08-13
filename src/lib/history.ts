/**
 * チャットの記録（保管庫）。
 *
 * 【なぜ作ったか】
 * 「これまでのチャット履歴が欲しい」という声。会話はぜんぶ残っている
 * （インナーワールドは shinga_conversations に部屋つき、
 * 　リアルバースは conversations に朝/夜つき）のに、**読み返す画面が無かった**。
 *
 * ここは並べ替えの頭脳だけ（純粋な関数）。DBを触るのは route 側。
 * 関数にしてあるのは、実際のデータの形で検査を回すため。
 */
import { PLACES } from "./places";

export type HistRow = { date: string; place?: string | null; mode?: string | null; role: string; content: string; created_at?: string };
export type Session = {
  /** 開くときの鍵。iw:日付:部屋 ／ rv:日付:morning|evening */
  key: string;
  date: string;
  room: string;
  roomJa: string;
  count: number;
  /** 一覧に出す最初のひとこと（本人の発言を優先） */
  title: string;
};

/** 部屋の名前。知らない部屋でも落ちない */
export function roomJa(room: string): string {
  if (room === "rv:morning") return "リアルバース（朝）";
  if (room === "rv:evening") return "リアルバース（夜）";
  if (room === "dreamkiller") return "ドリームキラー";
  return (PLACES as any)[room]?.ja ?? "どこかの部屋";
}

/** カード・印（[[card]] や [[dk]]）は会話の中身ではないので、見せない */
export function isNoise(content: string): boolean {
  return !String(content ?? "").trim() || String(content).startsWith("[[");
}

/**
 * 会話の行を「日付 × 部屋」の束にまとめる。新しい日が上。
 * ChatGPT のサイドバーの1行に相当するものを作る。
 */
export function toSessions(iwRows: HistRow[], rvRows: HistRow[]): Session[] {
  const map = new Map<string, { date: string; room: string; count: number; firstUser: string; firstAny: string }>();

  const feed = (rows: HistRow[], roomOf: (r: HistRow) => string) => {
    for (const r of rows) {
      if (isNoise(r.content)) continue;
      const room = roomOf(r);
      const key = `${r.date}:${room}`;
      let g = map.get(key);
      if (!g) { g = { date: r.date, room, count: 0, firstUser: "", firstAny: "" }; map.set(key, g); }
      g.count += 1;
      // 行は新しい順で来る。毎回上書きすると、最後に残るのが**いちばん古い発言**
      // ＝その日その部屋の「最初のひとこと」になる
      if (r.role === "user") g.firstUser = r.content;
      g.firstAny = r.content;
    }
  };
  feed(iwRows, (r) => String(r.place ?? "map"));
  feed(rvRows, (r) => `rv:${r.mode ?? "morning"}`);

  const out: Session[] = [];
  for (const [k, g] of map) {
    const title = (g.firstUser || g.firstAny).replace(/\s+/g, " ").trim().slice(0, 42);
    out.push({
      key: (g.room.startsWith("rv:") ? `rv:${g.date}:${g.room.slice(3)}` : `iw:${g.date}:${g.room}`),
      date: g.date, room: g.room, roomJa: roomJa(g.room), count: g.count, title,
    });
    void k;
  }
  // 新しい日付が上。同じ日はインナーワールド→リアルバースの順
  out.sort((a, b) => (a.date === b.date ? a.room.localeCompare(b.room) : (a.date < b.date ? 1 : -1)));
  return out;
}

/* ══ 続きから話す ═══════════════════════════════════════════
 * 会話の記録には「場所（place）」しか残っていない。
 * ひとつの場所を複数のワークが借りていることがあるので
 *（例：ハイヤークエストの場所は、ほかのワークも見た目に使っている）、
 * **その場所の主のワーク**を1つ決めておく。
 * 続きを開いたときは、そのワークで、前の会話を持ったまま始まる。
 */
export const MODE_BY_PLACE: Record<string, string> = {
  peak: "peak",
  walk: "walk",
  akashic: "akashic",
  higher: "higher",
  deep: "deep",
};

/** その記録から「続きから話す」ができるか（できるなら、どのワークか） */
export function resumeMode(room: string): string | null {
  if (room.startsWith("rv:")) return null;      // リアルバースは別の画面
  return MODE_BY_PLACE[room] ?? null;
}

/* ══ 探す ══════════════════════════════════════════════════
 * 「なに話したか」で見つけられるように。
 * 大文字小文字・全角半角は気にしない。空白で区切れば AND。
 */
export function normalize(s: string): string {
  return String(s ?? "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .trim();
}

/** 検索語をばらす（空白区切り。ぜんぶ含むものだけ出す） */
export function terms(q: string): string[] {
  return normalize(q).split(/\s+/).filter(Boolean).slice(0, 5);
}

export function matches(text: string, ts: string[]): boolean {
  if (!ts.length) return true;
  const t = normalize(text);
  return ts.every((w) => t.includes(w));
}

/** 見つかった場所の前後を切り出して見せる（どこが当たったか分かるように） */
export function snippet(text: string, ts: string[], len = 46): string {
  const raw = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!ts.length) return raw.slice(0, len);
  const i = normalize(raw).indexOf(ts[0]);
  if (i < 0) return raw.slice(0, len);
  const from = Math.max(0, i - Math.floor(len / 3));
  return (from > 0 ? "…" : "") + raw.slice(from, from + len) + (from + len < raw.length ? "…" : "");
}
