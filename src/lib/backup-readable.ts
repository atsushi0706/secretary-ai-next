/**
 * 「読める形」の書き出し。サーバ専用。
 *
 * 【なぜ要るか】
 * これまで出していたのは、表をそのまま並べたJSONだった。
 * 中身は入っていても、
 *   ・誰なのかが user_id（英数字の羅列）でしか分からない
 *   ・会話が別々の表に散っていて、やり取りとして読めない
 *   ・いつ・どの部屋の話なのかを、自分で突き合わせないといけない
 * ——つまり「開いても分からない」。それでは控えを取る意味がない。
 *
 * ここでは **人ごとに・日付ごとに・部屋ごとに** 並べ直して、
 * 上から読めばその人の1日が分かる文章にする。
 */
import { supabaseAdmin } from "./supabase";
import { MODES, isModeKey } from "./modes";

const NL = String.fromCharCode(10);

/** 1000件で切られないよう、端まで取り切る */
async function fetchAll(table: string, userId?: string): Promise<any[]> {
  const supa = supabaseAdmin();
  const out: any[] = [];
  const STEP = 1000;
  try {
    for (let from = 0; ; from += STEP) {
      let q = supa.from(table).select("*").range(from, from + STEP - 1);
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) return out;                    // 無い表は、そこまでで返す
      const got = data ?? [];
      out.push(...got);
      if (got.length < STEP) break;
      if (out.length > 200000) break;
    }
  } catch { /* 読めなければ、取れたぶんだけ */ }
  return out;
}

const WD = ["日", "月", "火", "水", "木", "金", "土"];
function dayLabel(date: string): string {
  try {
    const d = new Date(`${date}T00:00:00+09:00`);
    return `${date}（${WD[d.getDay()]}）`;
  } catch { return date; }
}
/** 日本時間の時刻（HH:MM） */
function hhmm(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo", hour12: false,
    }).format(d);
  } catch { return ""; }
}
/** どの部屋の話か */
function roomName(place: string | null | undefined): string {
  const p = String(place ?? "").trim();
  if (!p) return "会話";
  if (isModeKey(p)) return MODES[p].label;
  const byPlace: Record<string, string> = {
    peak: "ピークステート", walk: "パラレルウォーク", akashic: "アカシックレコーダー",
    higher: "ハイヤークエスト", deep: "内側のワーク", map: "地図での会話",
  };
  return byPlace[p] ?? p;
}
const clean = (t: unknown) => String(t ?? "").replace(/\r/g, "").trim();

type Person = { userId: string; name: string; email: string; call: string };

/**
 * 読める形の書き出しを作る。
 * @param userId 指定するとその人だけ。省略で全員。
 */
export async function buildReadable(userId?: string): Promise<string> {
  const [settings, shinga, talks, walks, emos, marks, acts, crystals, quests, weeklies] =
    await Promise.all([
      fetchAll("user_settings", userId),
      fetchAll("shinga_conversations", userId),
      fetchAll("conversations", userId),
      fetchAll("walk_logs", userId),
      fetchAll("emotion_logs", userId),
      fetchAll("day_marks", userId),
      fetchAll("real_actions", userId),
      fetchAll("crystals", userId),
      fetchAll("quests", userId),
      fetchAll("weekly_reports", userId),
    ]);

  const people: Person[] = settings.map((s: any) => ({
    userId: String(s.user_id),
    name: clean(s.birth_name) || clean(s.display_name) || clean(s.user_call_name) || clean(s.email) || String(s.user_id).slice(0, 8) + "…",
    email: clean(s.email),
    call: clean(s.user_call_name),
  })).sort((a, b) => a.name.localeCompare(b.name, "ja"));

  const mine = <T extends { user_id?: string }>(rows: T[], id: string) =>
    rows.filter((r) => String(r.user_id) === id);

  const lines: string[] = [];
  lines.push("シンガワールド　会話と記録の控え");
  lines.push(`作成：${new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date())}`);
  lines.push(`人数：${people.length}人`);
  lines.push("");
  lines.push("※ このファイルには、話した内容がそのまま入っています。扱いにご注意ください。");
  lines.push("");

  for (const p of people) {
    const sh = mine(shinga, p.userId);
    const tk = mine(talks, p.userId);
    const wk = mine(walks, p.userId);
    const em = mine(emos, p.userId);
    const mk = mine(marks, p.userId);
    const ac = mine(acts, p.userId);
    const cr = mine(crystals, p.userId);
    const qs = mine(quests, p.userId);
    const wr = mine(weeklies, p.userId);

    lines.push("");
    lines.push("═".repeat(60));
    lines.push(`■ ${p.name}${p.call && p.call !== p.name ? `（${p.call}）` : ""}`);
    if (p.email) lines.push(`  ${p.email}`);
    lines.push(`  発言 ${sh.length + tk.length}件 ／ 記録のある日 ${new Set([...sh, ...tk, ...em, ...ac].map((r: any) => r.date)).size}日`);
    lines.push("═".repeat(60));

    // 日付ごとにまとめる
    const days = new Set<string>();
    for (const r of [...sh, ...tk, ...wk, ...em, ...mk, ...ac, ...cr]) if (r?.date) days.add(String(r.date));
    const sorted = [...days].sort();

    if (sorted.length === 0) {
      lines.push("");
      lines.push("  （まだ記録がありません）");
      continue;
    }

    for (const day of sorted) {
      lines.push("");
      lines.push(`── ${dayLabel(day)} ${"─".repeat(30)}`);

      // その日の気分
      const emoDay = em.filter((e: any) => e.date === day)
        .sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)));
      for (const e of emoDay) {
        lines.push(`  [${hhmm(e.created_at)}] 気分 ${e.level}/10${e.energy != null ? `・動けそう ${e.energy}/10` : ""}${clean(e.note) ? `　「${clean(e.note)}」` : ""}`);
      }
      const mkDay = mk.filter((m: any) => m.date === day);
      for (const m of mkDay) lines.push(`  [その日の印] ${clean(m.kind)}`);

      // 部屋ごとの会話（時刻順）
      const shDay = sh.filter((r: any) => r.date === day)
        .sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)));
      const byRoom = new Map<string, any[]>();
      for (const r of shDay) {
        const k = roomName(r.place);
        byRoom.set(k, [...(byRoom.get(k) ?? []), r]);
      }
      for (const [room, rows] of byRoom) {
        lines.push("");
        lines.push(`  【${room}】`);
        for (const r of rows) {
          const who = r.role === "user" ? p.call || "本人" : "清瀬リンク";
          const body = clean(r.content);
          if (!body) continue;
          // 長い発言も切らない。読めることが目的なので、そのまま入れる
          const head = `  [${hhmm(r.created_at)}] ${who}：`;
          const wrapped = body.split(NL).map((x, i) => (i === 0 ? head + x : " ".repeat(head.length) + x));
          lines.push(...wrapped);
        }
      }

      // 朝夜の会話
      const tkDay = tk.filter((r: any) => r.date === day)
        .sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)));
      if (tkDay.length) {
        lines.push("");
        lines.push("  【朝夜の会話】");
        for (const r of tkDay) {
          const who = r.role === "user" ? p.call || "本人" : "清瀬リンク";
          const body = clean(r.content);
          if (body) lines.push(`  [${hhmm(r.created_at)}] ${who}：${body}`);
        }
      }

      // その日の成果物
      const wkDay = wk.filter((r: any) => r.date === day);
      for (const w of wkDay) {
        lines.push("");
        lines.push(`  【パラレルウォークのまとめ】${NL}  ${clean(w.summary)}`);
      }
      const crDay = cr.filter((r: any) => r.date === day);
      for (const c of crDay) {
        lines.push("");
        lines.push(`  【クリスタル】${clean(c.name)}`);
        if (clean(c.headline)) lines.push(`  ${clean(c.headline)}`);
        if (clean(c.summary)) lines.push(`  ${clean(c.summary)}`);
        for (const x of (c.points ?? [])) lines.push(`   ✓ ${clean(x)}`);
        for (const x of (c.next_steps ?? [])) lines.push(`   ▸ ${clean(x)}`);
      }
      const acDay = ac.filter((r: any) => r.date === day);
      for (const a of acDay) {
        if (clean(a.title)) lines.push(`  [やったこと] ${clean(a.title)}`);
      }
    }

    // 週のふりかえり
    if (wr.length) {
      lines.push("");
      lines.push("── 週のふりかえり ──────────────────────────");
      for (const w of wr.sort((a: any, b: any) => String(a.week_start).localeCompare(String(b.week_start)))) {
        lines.push("");
        lines.push(`  ${w.week_start} の週（${w.status === "draft" ? "未送信" : "送信ずみ"}）`);
        for (const x of clean(w.body).split(NL)) lines.push(`  ${x}`);
      }
    }

    // クエスト
    if (qs.length) {
      lines.push("");
      lines.push("── クエスト ────────────────────────────────");
      for (const q of qs) {
        lines.push(`  ${q.done ? "✓" : "○"} ${clean(q.title)}${clean(q.body) ? `　（${clean(q.body)}）` : ""}`);
      }
    }
  }

  return lines.join(NL);
}
