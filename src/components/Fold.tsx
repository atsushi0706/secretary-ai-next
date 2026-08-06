"use client";

/**
 * 畳んでおくセクション。
 *
 * 【なぜ要るか】
 * リアルバースは、開いた瞬間に全部が縦に並んでいた。スマホでは延々スクロールになり、
 * 「いま何を見ればいいのか」が分からない。
 *
 * だから**閉じておくのを基本**にした。押して、自分で見に行く。
 * 表に出しておくのは「今日のフォーカス」と「優先順位」だけ。
 *
 * 【閉じているときも、中身の気配は出す】
 * ただ閉じるだけだと、開くかどうかの判断ができない。
 * だから閉じているときは **一行のあらまし**（今日3件／今週7件、など）を出す。
 * これがあると「いま開く必要はない」も判断できる。
 *
 * 【覚えておく】
 * 開いたものは、その端末に覚えておく。毎回開き直すのは手間なので。
 */
import { useEffect, useState } from "react";

const KEY = "secretary-ai-next.fold";

function seen(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function Fold({
  id,
  title,
  summary,
  accent = "purple",
  defaultOpen = false,
  children,
}: {
  /** 覚えておくための名前 */
  id: string;
  title: React.ReactNode;
  /** 閉じているときに出す一行（無ければ出さない） */
  summary?: React.ReactNode;
  accent?: "purple" | "amber" | "rose" | "sky" | "gray";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [ready, setReady] = useState(false);

  // 覚えていたものを反映する（最初の一瞬だけ既定の状態が見えるのは許容）
  useEffect(() => {
    const s = seen();
    if (typeof s[id] === "boolean") setOpen(s[id]);
    setReady(true);
  }, [id]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      const s = seen(); s[id] = next;
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch { /* 覚えられなくても、開け閉めはできる */ }
  }

  const line: Record<string, string> = {
    purple: "border-purple-500", amber: "border-amber-400",
    rose: "border-rose-500", sky: "border-sky-400", gray: "border-gray-300",
  };

  return (
    <section className={`card border-l-4 ${line[accent] ?? line.purple}`}>
      <button className="w-full flex items-center gap-2 text-left" onClick={toggle}
        aria-expanded={open}>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-sm">{title}</span>
          {!open && summary && (
            <span className="block text-[11px] text-gray-500 mt-0.5">{summary}</span>
          )}
        </span>
        <span className="shrink-0 text-[11px] text-gray-500 border border-gray-200 rounded px-2 py-1">
          {open ? "▲ 閉じる" : "▼ 開く"}
        </span>
      </button>
      {/* ready になる前に開いた状態で描くと、閉じている想定の中身が一瞬見えるので待つ */}
      {ready && open && <div className="mt-3">{children}</div>}
    </section>
  );
}
