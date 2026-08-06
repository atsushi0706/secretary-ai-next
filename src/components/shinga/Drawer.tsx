"use client";

/**
 * 棚をまとめる引き出し。「ワールドメモリー」「若返りの部屋」のように、
 * 近いものを1つのボタンの中に入れる。
 *
 * 【なぜ要るか】
 * 地図の下に10個のボタンが並んでいた。PCでは横に散らばって、
 * 背景の絵と混ざって「どこに何があるのか」が読み取れない。
 * 近いものをまとめて、表に出るボタンを4つまでに絞る。
 *
 * 【押したらどうなるか】
 * その場でひらいて、中身が並ぶ。別の画面へは飛ばさない——
 * 飛ばすと戻ってくる手間が増えて、結局開かなくなる。
 */
import { useState } from "react";

export type DrawerItem = {
  key: string;
  emoji: string;
  label: string;
  /** 一言の説明（何が入っているか分かるように） */
  note?: string;
  onOpen: () => void;
  /** 新しいものが入っている数（印を出す） */
  badge?: number;
};

export function Drawer({
  emoji, label, note, items, tone = "memory",
}: {
  emoji: string;
  label: string;
  /** 閉じているときに出す一言 */
  note: string;
  items: DrawerItem[];
  tone?: "memory" | "care";
}) {
  const [open, setOpen] = useState(false);
  const badge = items.reduce((a, b) => a + (b.badge ?? 0), 0);

  return (
    <div className={`dw dw-${tone} ${open ? "is-open" : ""}`}>
      <button className="dw-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="dw-emoji">{emoji}</span>
        <span className="dw-t">
          <b>{label}</b>
          <small>{open ? "" : note}</small>
        </span>
        {badge > 0 && !open && <span className="dw-new">{badge}</span>}
        <span className="dw-arrow">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="dw-body">
          {items.map((it) => (
            <button key={it.key} className="dw-item" onClick={it.onOpen}>
              <span className="e">{it.emoji}</span>
              <span className="t">
                <b>{it.label}</b>
                {it.note && <small>{it.note}</small>}
              </span>
              {(it.badge ?? 0) > 0 && <span className="dw-new">{it.badge}</span>}
              <span className="a">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
