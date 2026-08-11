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
