"use client";

/**
 * マインドマップ・スケジューラーの画面。淳くん専用。
 *
 * 【画面の作り】
 * ・下に話す欄。わーっと話すと、いまのマップへ**追記**される（作り直さない）
 * ・真ん中にツリー。粗いところ（30分超え・時間未記入）は赤い印が付く
 * ・ノードごとに「割る」ボタン（Goblin Tools 方式）。案が出て、選んだものだけ置く
 * ・「ロードマップ」タブで、フェーズ（第1週…）の進め方が見える。日付は出さない
 *
 * スマホでは2次元のマップは描けないので、**枝の形が分かるアウトライン**で描く。
 */
import { useCallback, useEffect, useState } from "react";
import { useDictation } from "@/components/useDictation";

type MNode = { id: string; label: string; kind: string; minutes: number | null; children: MNode[] };
type Tree = { title: string; goal: string; nodes: MNode[] };
type Phase = { name: string; span: string; items: string[]; why: string };
type Sched = { horizon: string; note: string; phases: Phase[] };
type MapRow = { id: string; title: string; tree: Tree; schedule: Sched | null; updated_at: string };
type Coarse = { id: string; label: string; minutes: number | null; path: string[] };
type Stats = { leaves: number; knownMinutes: number; unknown: number };

export function MindMapTool() {
  const [maps, setMaps] = useState<{ id: string; title: string; updated_at: string }[] | null>(null);
  const [map, setMap] = useState<MapRow | null>(null);
  const [coarse, setCoarse] = useState<Coarse[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"map" | "road">("map");
  const [err, setErr] = useState("");
  const [sql, setSql] = useState("");
  const [say, setSay] = useState("");
  const [busy, setBusy] = useState("");
  const [said, setSaid] = useState("");
  /** 割る案（ノードごと）。置くのは本人が選んでから */
  const [draft, setDraft] = useState<{ nodeId: string; steps: { label: string; minutes: number }[]; pick: boolean[] } | null>(null);
  const d = useDictation();

  const readJson = async (r: Response) => {
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { error: `うまく返ってこなかった（${r.status}）` }; }
  };

  const apply = (j: any) => {
    if (j.map) { setMap(j.map); setCoarse(j.coarse ?? []); setStats(j.stats ?? null); }
    if (j.say) setSay(j.say);
  };

  const loadList = useCallback(async () => {
    try {
      const r = await fetch("/api/mindmap");
      const j = await readJson(r);
      if (!r.ok) { setErr(j.error || "読み込めなかった"); setSql(j.sql || ""); return; }
      setErr(""); setSql("");
      setMaps(j.maps ?? []);
      // いちばん新しいものを開いておく（毎回選ばせない）
      if (j.maps?.length && !map) void open(j.maps[0].id);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void loadList(); }, [loadList]);

  async function open(id: string) {
    const r = await fetch(`/api/mindmap?id=${encodeURIComponent(id)}`);
    const j = await readJson(r);
    if (!r.ok) { setErr(j.error || "開けなかった"); return; }
    setErr(""); setSay(""); setDraft(null);
    apply(j);
  }

  async function post(body: Record<string, unknown>) {
    const r = await fetch("/api/mindmap", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await readJson(r);
    if (!r.ok) { setErr(j.error || "うまくいかなかった"); setSql(j.sql || ""); return null; }
    setErr("");
    return j;
  }

  /** わーっと話した内容を、いまのマップへ */
  async function talk() {
    const text = said.trim();
    if (!text || busy) return;
    setBusy("talk");
    try {
      const j = await post({ action: "talk", id: map?.id, said: text });
      if (j) { apply(j); setSaid(""); await loadList(); }
    } finally { setBusy(""); }
  }

  async function mic() {
    if (d.phase === "recording") {
      const t = await d.stop("計画や考えごとを、思いつくまま話している");
      if (t) setSaid((p) => (p ? `${p} ${t}` : t));
    } else if (d.phase === "idle") { await d.start(); }
  }

  /** 選んだ1つを割る（案が返る。置くのは選んでから） */
  async function breakdown(nodeId: string) {
    if (busy) return;
    setBusy(nodeId);
    try {
      const j = await post({ action: "breakdown", id: map!.id, nodeId });
      if (j?.steps?.length) {
        setDraft({ nodeId, steps: j.steps, pick: j.steps.map(() => true) });
        if (j.say) setSay(j.say);
      } else if (j) setErr("うまく割れなかった。もう一度試してみて");
    } finally { setBusy(""); }
  }

  async function applyDraft() {
    if (!draft || busy) return;
    const steps = draft.steps.filter((_, i) => draft.pick[i]);
    if (!steps.length) return;
    setBusy("apply");
    try {
      const j = await post({ action: "applySteps", id: map!.id, nodeId: draft.nodeId, steps });
      if (j) { apply(j); setDraft(null); }
    } finally { setBusy(""); }
  }

  async function drop(nodeId: string) {
    if (!confirm("この枝を消す？（下の枝も一緒に消えるよ）")) return;
    const j = await post({ action: "removeNode", id: map!.id, nodeId });
    if (j) apply(j);
  }

  async function makeRoad() {
    if (busy) return;
    setBusy("road");
    try {
      const j = await post({ action: "schedule", id: map!.id });
      if (j) { apply(j); setTab("road"); }
    } finally { setBusy(""); }
  }

  const coarseIds = new Set(coarse.map((c) => c.id));
  const hours = stats ? Math.round((stats.knownMinutes / 60) * 10) / 10 : 0;

  /* ── ツリーの1枝 ── */
  function Node({ n, depth }: { n: MNode; depth: number }) {
    const rough = coarseIds.has(n.id);
    const isLeaf = n.children.length === 0 && n.kind !== "group" && n.kind !== "goal";
    return (
      <div className={`mmp-node d${Math.min(depth, 4)}`}>
        <div className={`mmp-row ${rough ? "is-rough" : ""}`}>
          <span className="mmp-label">{n.label}</span>
          {isLeaf && (
            <span className={`mmp-min ${rough ? "is-rough" : ""}`}>
              {n.minutes == null ? "？分" : `${n.minutes}分`}
            </span>
          )}
          {isLeaf && rough && (
            <button className="mmp-split" disabled={!!busy}
              onClick={() => void breakdown(n.id)}
              title="30分以内の手順に割る">
              {busy === n.id ? "…" : "割る"}
            </button>
          )}
          <button className="mmp-x" onClick={() => void drop(n.id)} title="この枝を消す">×</button>
        </div>

        {/* 割る案。選んだものだけ置く */}
        {draft?.nodeId === n.id && (
          <div className="mmp-draft">
            <div className="mmp-draft-t">こう割ってみた — 置くものを選んで</div>
            {draft.steps.map((s, i) => (
              <label key={i} className={draft.pick[i] ? "on" : ""}>
                <input type="checkbox" checked={draft.pick[i]}
                  onChange={(e) => setDraft({ ...draft, pick: draft.pick.map((p, k) => (k === i ? e.target.checked : p)) })} />
                <span className="l">{s.label}</span>
                <span className="m">{s.minutes}分</span>
              </label>
            ))}
            <div className="mmp-draft-btns">
              <button className="go" disabled={busy === "apply" || !draft.pick.some(Boolean)}
                onClick={() => void applyDraft()}>
                {busy === "apply" ? "置いてる…" : "これで置く"}
              </button>
              <button className="no" onClick={() => setDraft(null)}>やめる</button>
            </div>
          </div>
        )}

        {n.children.length > 0 && (
          <div className="mmp-kids">
            {n.children.map((c) => <Node key={c.id} n={c} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mmp">
      {err && (
        <div className="mmp-err">
          {err}
          {sql && (
            <details><summary>先にSupabaseで表を作る必要があります（押すとSQL）</summary>
              <pre>{sql}</pre></details>
          )}
        </div>
      )}

      {/* マップの切り替え（複数あるときだけ） */}
      {maps && maps.length > 1 && (
        <div className="mmp-tabsmaps">
          {maps.map((m) => (
            <button key={m.id} className={map?.id === m.id ? "on" : ""} onClick={() => void open(m.id)}>
              {m.title}
            </button>
          ))}
        </div>
      )}

      {map ? (
        <>
          <div className="mmp-head">
            <div>
              <div className="mmp-title">{map.title}</div>
              {map.tree.goal && <div className="mmp-goal">{map.tree.goal}</div>}
            </div>
            <button className="mmp-del" onClick={async () => {
              if (!confirm(`「${map.title}」をまるごと消す？`)) return;
              await post({ action: "delete", id: map.id });
              setMap(null); setMaps(null); await loadList();
            }}>消す</button>
          </div>

          {/* 30分ルールの見張り。ここはコードで数えている */}
          {stats && (
            <div className={`mmp-check ${coarse.length ? "is-rough" : "is-ok"}`}>
              {coarse.length
                ? <>⚠ <b>30分に割れていないところが {coarse.length}個</b>。赤い印の「割る」を押していこう</>
                : <>✓ ぜんぶ30分以内。動ける粒になってる（{stats.leaves}個・約{hours}時間ぶん）</>}
              {stats.unknown > 0 && <span className="mmp-unknown">　時間が見えていないもの {stats.unknown}個</span>}
            </div>
          )}

          <div className="mmp-tabs">
            <button className={tab === "map" ? "on" : ""} onClick={() => setTab("map")}>🗺 マップ</button>
            <button className={tab === "road" ? "on" : ""} onClick={() => setTab("road")}>📅 ロードマップ</button>
          </div>

          {tab === "map" && (
            <div className="mmp-tree">
              {map.tree.nodes.map((n) => <Node key={n.id} n={n} depth={0} />)}
            </div>
          )}

          {tab === "road" && (
            <div className="mmp-road">
              {map.schedule ? (
                <>
                  <div className="mmp-horizon">全体の見立て：<b>{map.schedule.horizon}</b></div>
                  {map.schedule.note && <p className="mmp-note">{map.schedule.note}</p>}
                  {map.schedule.phases.map((p, i) => (
                    <div key={i} className="mmp-phase">
                      <div className="mmp-phase-h"><span className="span">{p.span}</span><b>{p.name}</b></div>
                      <ul>{p.items.map((x, k) => <li key={k}>{x}</li>)}</ul>
                      {p.why && <div className="why">{p.why}</div>}
                    </div>
                  ))}
                  <p className="mmp-note">※ 日付は振っていない。順番と幅の見立てだよ。マップを育てたら、また組み直せる。</p>
                </>
              ) : (
                <p className="mmp-note">まだ組んでいないよ。マップがある程度育ったら、下のボタンで組める。</p>
              )}
              <button className="mmp-mkroad" disabled={busy === "road"} onClick={() => void makeRoad()}>
                {busy === "road" ? "組んでる…" : map.schedule ? "組み直す" : "ロードマップを組む"}
              </button>
            </div>
          )}
        </>
      ) : (
        maps && maps.length === 0 && (
          <p className="mmp-empty">
            まだマップが無いよ。<br />
            下のマイクで、考えていることを<b>順番ばらばらのまま</b>わーっと話してみて。
            こっちで要素ごとに整理して、マップにするから。
          </p>
        )
      )}

      {say && <div className="mmp-say">{say}</div>}

      {/* 話す欄。話した内容が、いまのマップに追記される */}
      <div className="mmp-bar">
        <textarea rows={2} value={said} onChange={(e) => setSaid(e.target.value)}
          placeholder="🎙 考えてること、順番ばらばらでいいから話してみて" />
        <div className="mmp-bar-btns">
          <button className={`mic ${d.phase === "recording" ? "on" : ""}`}
            disabled={d.phase === "transcribing"}
            onClick={() => void mic()}>
            {d.phase === "recording" ? "■" : d.phase === "transcribing" ? "…" : "🎙"}
          </button>
          <button className="go" disabled={!said.trim() || busy === "talk" || d.phase !== "idle"}
            onClick={() => void talk()}>
            {busy === "talk" ? "整理してる…" : map ? "マップに足す" : "マップにする"}
          </button>
        </div>
        {d.phase === "recording" && (
          <div className="mmp-rec">聞いてる {Math.floor(d.seconds / 60)}:{String(d.seconds % 60).padStart(2, "0")} — もう一度押して確定</div>
        )}
        {d.error && <div className="mmp-rec is-err">{d.error}</div>}
      </div>
    </div>
  );
}
