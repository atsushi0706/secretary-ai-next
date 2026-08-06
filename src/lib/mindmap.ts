/**
 * マインドマップ・スケジューラー。サーバ専用。
 *
 * 【何をする道具か】
 * 頭の中でわーっと考えていること・口頭で話した内容を、
 *   ① 構造（マインドマップ）に整理する
 *   ② だいたいの進め方（第1週・第2週…のロードマップ。日付は振らない）に組む
 *   ③ 30分以内の作業になるまで細分化する。粗いところは指摘する
 *
 * 【類似サービスから採ったもの】
 * ・Goblin Tools (Magic ToDo)：**項目ごとに「割る」ボタン**。全体を一気にやらせず、
 *   粗い1つを選んで割る。分解は動詞で終わる具体的な手順にする
 * ・Mapify / Xmind AI：話した内容からマップを作る。ただし優れたものは
 *   **作り直さずに、いまあるマップへ追記（マージ）する**。手で直したものを消さない
 * ・Taskade系のロードマップ生成：日付ではなく**フェーズ＋依存関係**で組む
 *
 * 【この家の流儀】
 * ・30分ルールの判定は**AIに任せない。コードで数える**（葉のノードで、
 *   30分超え or 時間未記入のものを機械的に拾う）。AIに任せると日によってブレる
 * ・分解の案は出すが、**置くのは本人が選んでから**（勝手にツリーを書き換えない）
 * ・一撃で全部やらせない。構造化→細分化→ロードマップは別々の呼び出しにする
 */
import { supabaseAdmin } from "./supabase";
import { complete } from "./ai";

/* ── 形 ────────────────────────────────────────── */

export type NodeKind = "goal" | "group" | "task" | "step";

export type MNode = {
  id: string;
  label: string;
  kind: NodeKind;
  /** 見込みの分数。葉のノードだけが持つ。分からなければ null */
  minutes: number | null;
  children: MNode[];
};

export type Tree = {
  title: string;
  /** 何のためのマップか（ゴールの一文） */
  goal: string;
  nodes: MNode[];
};

export type Phase = {
  name: string;
  /** 「第1週」「第2〜3週」「第1月」のような相対の幅。日付は使わない */
  span: string;
  items: string[];
  /** なぜこの順番か（依存関係） */
  why: string;
};

export type Sched = {
  /** 全体の見立て（例：約1か月／約3か月／約1年） */
  horizon: string;
  note: string;
  phases: Phase[];
};

export type MapRow = {
  id: string;
  title: string;
  tree: Tree;
  schedule: Sched | null;
  created_at: string;
  updated_at: string;
};

/* ── 正規化（AIの返しをそのまま信じない） ───────────── */

const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
const KINDS: NodeKind[] = ["goal", "group", "task", "step"];

/**
 * ツリーを均す。
 * ・idは重複や欠けを直す（既存のidは保つ＝マージで手直しが消えないように）
 * ・深さは5段まで、全体で120ノードまで（描けない大きさにしない）
 * ・分数は5〜480に丸める。数字でなければ null（「分からない」を偽らない）
 */
export function normalizeTree(value: unknown): Tree {
  const src = (value ?? {}) as any;
  const seen = new Set<string>();
  let counter = 0;
  const nextId = () => {
    let id = `n${++counter}`;
    while (seen.has(id)) id = `n${++counter}`;
    return id;
  };
  let total = 0;

  const walk = (raw: unknown, depth: number): MNode | null => {
    if (!raw || typeof raw !== "object" || depth > 5 || total >= 120) return null;
    const r = raw as any;
    const label = str(r.label, 120);
    if (!label) return null;
    total += 1;
    let id = str(r.id, 24);
    if (!id || seen.has(id)) id = nextId();
    seen.add(id);
    const kind: NodeKind = KINDS.includes(r.kind) ? r.kind : (depth <= 1 ? "group" : "task");
    const m = Number(r.minutes);
    const minutes = Number.isFinite(m) && m > 0 ? Math.max(5, Math.min(480, Math.round(m))) : null;
    const children = (Array.isArray(r.children) ? r.children : [])
      .map((c: unknown) => walk(c, depth + 1))
      .filter(Boolean) as MNode[];
    // 子を持つノードは束ねる係なので、分数は持たせない（合計は子から出す）
    return { id, label, kind, minutes: children.length ? null : minutes, children };
  };

  const nodes = (Array.isArray(src.nodes) ? src.nodes : [])
    .map((n: unknown) => walk(n, 1))
    .filter(Boolean) as MNode[];

  return {
    title: str(src.title, 80) || "無題のマップ",
    goal: str(src.goal, 200),
    nodes,
  };
}

export function normalizeSched(value: unknown): Sched | null {
  const src = (value ?? {}) as any;
  const phases: Phase[] = (Array.isArray(src.phases) ? src.phases : [])
    .slice(0, 12)
    .map((p: any) => ({
      name: str(p.name, 60),
      span: str(p.span, 24),
      items: (Array.isArray(p.items) ? p.items : []).map((x: unknown) => str(x, 120)).filter(Boolean).slice(0, 12),
      why: str(p.why, 240),
    }))
    .filter((p: Phase) => p.name && p.items.length);
  if (!phases.length) return null;
  return { horizon: str(src.horizon, 40), note: str(src.note, 300), phases };
}

/* ── 30分ルール（コードで数える） ───────────────────── */

export type Coarse = { id: string; label: string; minutes: number | null; path: string[] };

/**
 * まだ粗いところを拾う。
 * 葉のノード（子がいない task/step）のうち、
 *   ・30分を超えるもの
 *   ・時間が見えていないもの（null）
 * を返す。**AIには判定させない。** 数えられることはこちらで数える。
 */
export function coarseLeaves(tree: Tree): Coarse[] {
  const out: Coarse[] = [];
  const walk = (n: MNode, path: string[]) => {
    if (n.children.length) {
      for (const c of n.children) walk(c, [...path, n.label]);
      return;
    }
    if (n.kind === "goal" || n.kind === "group") return;
    if (n.minutes == null || n.minutes > 30) {
      out.push({ id: n.id, label: n.label, minutes: n.minutes, path });
    }
  };
  for (const n of tree.nodes) walk(n, []);
  return out;
}

/** ツリー全体の合計分数（見えているぶんだけ）と、葉の数 */
export function treeStats(tree: Tree): { leaves: number; knownMinutes: number; unknown: number } {
  let leaves = 0, knownMinutes = 0, unknown = 0;
  const walk = (n: MNode) => {
    if (n.children.length) { n.children.forEach(walk); return; }
    if (n.kind === "goal" || n.kind === "group") return;
    leaves += 1;
    if (n.minutes == null) unknown += 1;
    else knownMinutes += n.minutes;
  };
  tree.nodes.forEach(walk);
  return { leaves, knownMinutes, unknown };
}

/** idでノードを探す（親も返す） */
export function findNode(tree: Tree, id: string): { node: MNode; parents: string[] } | null {
  const walk = (n: MNode, parents: string[]): { node: MNode; parents: string[] } | null => {
    if (n.id === id) return { node: n, parents };
    for (const c of n.children) {
      const hit = walk(c, [...parents, n.label]);
      if (hit) return hit;
    }
    return null;
  };
  for (const n of tree.nodes) {
    const hit = walk(n, []);
    if (hit) return hit;
  }
  return null;
}

/** ノードに子を足す（本人が選んだ手順を置くときに使う） */
export function attachSteps(
  tree: Tree, id: string,
  steps: { label: string; minutes: number }[],
): Tree {
  const next: Tree = JSON.parse(JSON.stringify(tree));
  const hit = findNode(next, id);
  if (!hit) return next;
  hit.node.children = steps.slice(0, 12).map((s, i) => ({
    id: `${id}-s${i + 1}`,
    label: str(s.label, 120),
    kind: "step" as NodeKind,
    minutes: Math.max(5, Math.min(30, Math.round(Number(s.minutes) || 30))),
    children: [],
  }));
  hit.node.minutes = null;   // 子を持ったら、束ねる係になる
  return normalizeTree(next); // idの重複などを最終チェック
}

/** ノードを消す */
export function removeNode(tree: Tree, id: string): Tree {
  const next: Tree = JSON.parse(JSON.stringify(tree));
  const prune = (list: MNode[]): MNode[] =>
    list.filter((n) => n.id !== id).map((n) => ({ ...n, children: prune(n.children) }));
  next.nodes = prune(next.nodes);
  return next;
}

/* ── AIの呼び出し（段は分ける。一撃でやらせない） ────── */

const COMMON = [
  "あなたは、話し言葉を構造に整理する参謀。相手はこの計画の当事者。",
  "",
  "# 守ること",
  "- **本人が言っていないことを足さない。** 整理はするが、内容は作らない。",
  "- 精神論を書かない。**やること**と**測れること**だけ。",
  "- カタカナの経営用語で埋めない（KPI・PDCA・アジェンダ等は使わない）。",
  "- 出力はJSONだけ。前後に説明を付けない。",
].join("\n");

/**
 * ① 構造化。話した内容を、いまあるツリーへ**マージ**する。
 *
 * 前後関係がバラバラでも「ここはこの要素だよね」と束ね直す。
 * いまあるノードは**消さない・idを変えない**（手で直したものを守る）。
 */
export async function runStructure(
  userId: string, tree: Tree | null, said: string,
): Promise<{ tree: Tree; say: string }> {
  const prompt = [
    COMMON, "",
    "# いまのマップ（これを土台に。ノードを消さない・idを変えない）",
    JSON.stringify(tree ?? { title: "", goal: "", nodes: [] }).slice(0, 6000), "",
    "# 本人がいま話したこと（順番はバラバラかもしれない）",
    said.slice(0, 3000), "",
    "# やること",
    "- 話した内容を要素ごとに束ねて、上のマップへ**足す**。似た枝があればそこへ入れる。",
    "- 前後関係がバラバラでも、「これは集客の話」「これは商品の話」のように要素で整理する。",
    "- 大きな塊は group、実際にやることは task。動詞で終わる言い方にする。",
    "- 各 task に、見込みの分数 minutes を入れる。**見当がつかなければ null**（偽らない）。",
    "- 30分より大きくても、この段では割らなくていい（割るのは次の段）。",
    "- title と goal が空なら、話した内容から短く付ける。",
    "",
    '{"tree":{"title":"","goal":"","nodes":[{"id":"n1","label":"","kind":"group|task","minutes":null,"children":[]}]},',
    ' "say":"本人への一言（60字以内）。何をどこに整理したか"}',
  ].join("\n");
  const raw = await complete({ userId, prompt, maxTokens: 4000, temperature: 0.4 });
  const m = String(raw ?? "").match(/\{[\s\S]*\}/);
  const j = m ? JSON.parse(m[0]) : {};
  return { tree: normalizeTree(j.tree), say: str(j.say, 200) };
}

/**
 * ② 1ノードの細分化（Goblin Tools 方式：選んだ1つだけ割る）。
 * 30分以内・動詞で終わる手順にする。置くかどうかは本人が選ぶ。
 */
export async function runBreakdown(
  userId: string, tree: Tree, nodeId: string,
): Promise<{ steps: { label: string; minutes: number }[]; say: string }> {
  const hit = findNode(tree, nodeId);
  if (!hit) return { steps: [], say: "そのノードが見つからなかった" };
  const prompt = [
    COMMON, "",
    `# 目的\n${tree.goal || tree.title}`, "",
    `# 割りたい作業\n「${hit.node.label}」（いまの見込み：${hit.node.minutes ?? "不明"}分）`,
    `場所：${hit.parents.join(" → ") || "いちばん上"}`, "",
    "# やること",
    "- この作業を、**1つ30分以内**の手順に割る（2〜7個）。",
    "- 動詞で終わる具体的な言い方にする（「考える」で終わらせない。何を書く・何を集める・どこを直す）。",
    "- 最初の1歩は、いちばん軽いものにする（着手の壁を下げる）。",
    "- 順番に並べる。先にやらないと次が進まないものを前に。",
    "",
    '{"steps":[{"label":"","minutes":25}],',
    ' "say":"本人への一言（60字以内）"}',
  ].join("\n");
  const raw = await complete({ userId, prompt, maxTokens: 1600, temperature: 0.4 });
  const m = String(raw ?? "").match(/\{[\s\S]*\}/);
  const j = m ? JSON.parse(m[0]) : {};
  const steps = (Array.isArray(j.steps) ? j.steps : [])
    .map((s: any) => ({
      label: str(s.label, 120),
      minutes: Math.max(5, Math.min(30, Math.round(Number(s.minutes) || 30))),
    }))
    .filter((s: any) => s.label)
    .slice(0, 7);
  return { steps, say: str(j.say, 200) };
}

/**
 * ③ ロードマップ。日付は振らない。フェーズ（第1週…）と依存関係で組む。
 */
export async function runSchedule(
  userId: string, tree: Tree,
): Promise<{ sched: Sched | null; say: string }> {
  const stats = treeStats(tree);
  const prompt = [
    COMMON, "",
    "# マップ", JSON.stringify(tree).slice(0, 6000), "",
    `# 分かっていること\n葉の作業 ${stats.leaves}個／見えている合計 約${Math.round(stats.knownMinutes / 60)}時間／時間未記入 ${stats.unknown}個`, "",
    "# やること",
    "- 全体がどれくらいの道のりか（horizon）を見立てる（例：約1か月／約3か月／約1年）。",
    "- フェーズに割る。**日付は使わない。**「第1週」「第2〜3週」「第1月」のような相対の幅（span）で書く。",
    "- 各フェーズの items は、マップにある label をそのまま使う（作らない）。",
    "- why に、なぜこの順番か（これが先にないと次が動かない）を書く。",
    "- 前半に重い立ち上げを置く。最後のフェーズに大物を残さない。",
    "- note に、この見立ての前提（1日30分〜1時間使える想定、など）を書く。",
    "",
    '{"sched":{"horizon":"約1か月","note":"","phases":[{"name":"","span":"第1週","items":[""],"why":""}]},',
    ' "say":"本人への一言（60字以内）"}',
  ].join("\n");
  const raw = await complete({ userId, prompt, maxTokens: 2400, temperature: 0.4 });
  const m = String(raw ?? "").match(/\{[\s\S]*\}/);
  const j = m ? JSON.parse(m[0]) : {};
  return { sched: normalizeSched(j.sched), say: str(j.say, 200) };
}

/* ── 読み書き ──────────────────────────────────── */

export async function listMaps(userId: string): Promise<Pick<MapRow, "id" | "title" | "updated_at">[]> {
  const supa = supabaseAdmin();
  const { data, error } = await supa.from("mind_maps")
    .select("id, title, updated_at").eq("user_id", userId)
    .order("updated_at", { ascending: false }).limit(30);
  if (error) throw error;
  return (data ?? []) as any;
}

export async function getMap(userId: string, id: string): Promise<MapRow | null> {
  const supa = supabaseAdmin();
  const { data, error } = await supa.from("mind_maps")
    .select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as MapRow | null;
}

export async function saveMap(
  userId: string,
  m: { id?: string; title?: string; tree: Tree; schedule?: Sched | null },
): Promise<MapRow> {
  const supa = supabaseAdmin();
  const row: any = {
    user_id: userId,
    title: str(m.title ?? m.tree.title, 80) || "無題のマップ",
    tree: m.tree,
    updated_at: new Date().toISOString(),
  };
  if (m.schedule !== undefined) row.schedule = m.schedule;
  if (m.id) row.id = m.id;
  const { data, error } = await supa.from("mind_maps")
    .upsert(row, { onConflict: "id" }).select("*").single();
  if (error) throw error;
  return data as MapRow;
}

export async function deleteMap(userId: string, id: string): Promise<void> {
  const supa = supabaseAdmin();
  const { error } = await supa.from("mind_maps").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

/** この表を作るSQL（画面から見せる） */
export const MINDMAP_MIGRATION = `
create table if not exists mind_maps (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  title      text not null default '',
  tree       jsonb not null default '{}'::jsonb,
  schedule   jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mind_maps_user_idx on mind_maps (user_id, updated_at desc);
`.trim();
