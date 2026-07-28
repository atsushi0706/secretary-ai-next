"use client";

import { useEffect, useState } from "react";

/**
 * リンクからの便り（今日の1通）。理想が"向こうから会いに来る"。
 * 未来の自分の日記（future）か、昔の自分の言葉の回収（recall）。読むだけ。
 */
type Letter = { date: string; kind: "future" | "recall" | "none"; body: string; source: string };

export function LinkLetter({ guideName }: { guideName: string }) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/link-letter").then((r) => r.json()).then((d) => {
      if (d?.letter && d.letter.kind !== "none" && d.letter.body) setLetter(d.letter);
    }).catch(() => {});
  }, []);

  if (!letter) return null;

  const head = letter.kind === "future"
    ? "📬 未来のきみから、手紙が届いてるよ"
    : "📬 きみが置き忘れた言葉、拾ってきたよ";

  return (
    <div className={`iw-letter ${open ? "is-open" : ""}`}>
      <button className="iw-letter-head" onClick={() => setOpen((v) => !v)}>
        <span className="ttl">{head}</span>
        <span className="chev">{open ? "▲" : "▼ 読む"}</span>
      </button>
      {open && (
        <div className="iw-letter-body">
          <p>{letter.body}</p>
          <div className="sign">— {guideName} より{letter.kind === "recall" && letter.source ? `（${letter.source} のきみの言葉）` : ""}</div>
        </div>
      )}
    </div>
  );
}
