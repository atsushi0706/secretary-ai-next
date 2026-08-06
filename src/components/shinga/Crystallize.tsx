"use client";

/**
 * 壁打ちの締め。まとめを作って、名前をつけて、棚に置く。
 *
 * ① 話したことから、まとめの下書きを作る（本人の言葉ベース）
 * ② 中身を見せて、**名前をつけてもらう**（保管庫に並んだとき、名前が無いと分からない）
 * ③ 置いたあと、「どこから手をつけるか」をリアルバースへ渡すか選べる
 */
import { useEffect, useState } from "react";
import { hueOf, colorOf } from "@/lib/crystal-colors";
import { Gem, hueFor } from "./Gem";

type Draft = { headline: string; summary: string; points: string[]; next_steps: string[] };
type Line = { role: "assistant" | "user"; content: string };

export function Crystallize({ lines, onDone, onCancel }: {
  lines: Line[];
  /** 置き終わった（保管庫へ増えた） */
  onDone: (name: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<"making" | "name" | "saved">("making");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sql, setSql] = useState<string | null>(null);
  // リアルバースへ渡す一手（本人が選ぶ）
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [when, setWhen] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/crystals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "draft", lines }),
    }).then((r) => r.json()).then((d) => {
      if (d?.draft) {
        setDraft(d.draft);
        setPicked(Object.fromEntries((d.draft.next_steps ?? []).map((_: string, i: number) => [i, true])));
      }
      if (d?.sql) setSql(d.sql);
      setPhase("name");
    }).catch(() => { setErr("まとめが作れなかった。もう一度ためしてみて"); setPhase("name"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hue = hueOf(colorOf(name || "  "));

  async function save() {
    if (!name.trim()) { setErr("名前をつけてね"); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/crystals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", name: name.trim(), ...(draft ?? {}) }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error ?? "置けなかった"); if (d?.sql) setSql(d.sql); return; }
      setPhase("saved");
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  /** 選んだ一手を、リアルバースのタスクとして渡す */
  async function toRealverse() {
    const items = (draft?.next_steps ?? []).filter((_, i) => picked[i]);
    if (!items.length) return;
    setBusy(true); setErr("");
    try {
      let ok = 0;
      for (const title of items) {
        const r = await fetch("/api/shinga/quest", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body: when ? `${when}にやる（${name}）` : `${name} から` }),
        });
        if (r.ok) ok++;
      }
      setSent(ok > 0 ? `${ok}件、リアルバースに置いたよ${when ? `（${when}）` : ""}` : "置けなかった");
    } catch { setSent("置けなかった"); }
    finally { setBusy(false); }
  }

  if (phase === "making") {
    return (
      <div className="czl">
        <div className="czl-making">
          <div className="czl-spin" />
          <p>話したことを、結晶にしています…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="czl">
      {phase === "name" && (
        <div className="czl-card">
          <div className="czl-t">✨ 結晶になった</div>

          {draft?.headline && <div className="czl-head">{draft.headline}</div>}
          {draft?.summary && <p className="czl-sum">{draft.summary}</p>}
          {(draft?.points?.length ?? 0) > 0 && (
            <div className="czl-sec">
              <div className="czl-st">決まったこと</div>
              {draft!.points.map((p, i) => <div key={i} className="czl-item">✓ {p}</div>)}
            </div>
          )}
          {(draft?.next_steps?.length ?? 0) > 0 && (
            <div className="czl-sec">
              <div className="czl-st">どこから手をつけるか</div>
              {draft!.next_steps.map((p, i) => <div key={i} className="czl-item is-next">▸ {p}</div>)}
            </div>
          )}

          <div className="czl-name">
            <label>この結晶に、名前をつけて</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
              placeholder="例：3万円のコミュニティ" autoFocus />
            <p className="czl-hint">
              保管庫にこの名前で並びます。あとで見て、すぐ思い出せる言葉にしておくと楽です。
            </p>
          </div>

          {err && <div className="czl-err">{err}</div>}
          {sql && <pre className="cry-sql">{sql}</pre>}

          <div className="czl-btns">
            <button className="czl-go" onClick={() => void save()} disabled={busy || !name.trim()}>
              {busy ? "置いています…" : "💎 保管庫に置く"}
            </button>
            <button className="czl-no" onClick={onCancel} disabled={busy}>まだ置かない</button>
          </div>
        </div>
      )}

      {phase === "saved" && (
        <div className="czl-card">
          <div className="czl-done" style={{ ["--g" as any]: hue.glow }}>
            {/*
              前は clip-path で切った五角形だった。平らな紫の五角形にしか見えず、
              宝石に見えなかった。面（ファセット）を並べて描く形に差し替えた。
              色は名前から決めるので、同じ石はいつも同じ色になる。
            */}
            <Gem hue={hueFor(name || "crystal")} size={104} sparkle />
            <div className="czl-donename">{name}</div>
            <div className="czl-donesub">保管庫に置いたよ</div>
          </div>

          {(draft?.next_steps?.length ?? 0) > 0 && !sent && (
            <div className="czl-sec">
              <div className="czl-st">リアルバースに持っていく？</div>
              <p className="czl-hint">選んだものが、現実のタスクになります。</p>
              {draft!.next_steps.map((p, i) => (
                <label key={i} className="czl-pick">
                  <input type="checkbox" checked={!!picked[i]}
                    onChange={(e) => setPicked((s) => ({ ...s, [i]: e.target.checked }))} />
                  <span>{p}</span>
                </label>
              ))}
              <div className="czl-when">
                <label>いつやる？（書かなくてもいい）</label>
                <input value={when} onChange={(e) => setWhen(e.target.value)} maxLength={30}
                  placeholder="例：今日の21時 / 明日の朝いち" />
              </div>
              <button className="czl-go" onClick={() => void toRealverse()} disabled={busy}>
                {busy ? "渡しています…" : "🧭 リアルバースに置く"}
              </button>
            </div>
          )}

          {sent && <div className="czl-sent">{sent}</div>}
          <button className="czl-no" onClick={() => onDone(name)}>閉じる</button>
        </div>
      )}
    </div>
  );
}
