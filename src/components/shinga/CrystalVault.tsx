"use client";

/**
 * クリスタル保管庫（ショーウィンドウ）。
 *
 * 「これだけ形にしてきた」が、一目で分かる場所。
 * 小さなクリスタルがずらっと並び、増えるほど棚が伸びていく。
 * 押すと、そのとき何をどこまで話したかが、まとめて出てくる。
 * ——「あの時、何だったっけ」を無くすのが、この部屋の仕事。
 */
import { useEffect, useState } from "react";
import { hueOf } from "@/lib/crystal-colors";

type Crystal = {
  id: string; date: string; name: string; color: number;
  headline: string; summary: string; points: string[]; next_steps: string[];
};

/** クリスタル1粒。色は名前から決まるので、同じものはいつも同じ色 */
function Gem({ color, size = 54 }: { color: number; size?: number }) {
  const h = hueOf(color);
  const id = `g${color}`;
  return (
    <svg width={size} height={size * 1.35} viewBox="0 0 40 54" aria-hidden>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={h.light} /><stop offset="1" stopColor={h.dark} />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={h.core} /><stop offset="1" stopColor={h.light} />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="49" rx="13" ry="3.5" fill={h.glow} opacity=".55" />
      {/* 左面・右面・上面で、削り出した石に見せる */}
      <polygon points="20,2 6,17 12,46 20,50" fill={`url(#${id}a)`} />
      <polygon points="20,2 34,17 28,46 20,50" fill={`url(#${id}b)`} />
      <polygon points="20,2 6,17 20,22 34,17" fill={h.core} opacity=".92" />
      <polygon points="20,22 12,46 20,50 28,46" fill={h.light} opacity=".45" />
      <polygon points="20,2 20,22 34,17" fill="#fff" opacity=".22" />
    </svg>
  );
}

export function CrystalVault({ guideName, avatarUrl, onBack }: {
  guideName: string; avatarUrl: string; onBack: () => void;
}) {
  const [list, setList] = useState<Crystal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Crystal | null>(null);
  const [sql, setSql] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/crystals").then((r) => r.json()).then((d) => {
      if (Array.isArray(d?.crystals)) setList(d.crystals);
      if (d?.sql) setSql(d.sql);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="cry-screen">
      <button className="singa-back" onClick={onBack}>← 地図にもどる</button>

      <div className="cry-card">
        <div className="rep-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="singa-face" src={avatarUrl} alt={guideName} />
          <div>
            <div className="rep-sub">クリスタル保管庫</div>
            <div className="rep-who">形にしてきたものが、ここに並ぶ</div>
          </div>
        </div>

        {loading && <div className="rep-loading">棚をひらいている…</div>}
        {sql && <pre className="cry-sql">{sql}</pre>}

        {!loading && list.length === 0 && !sql && (
          <p className="cry-empty">
            まだ1つも並んでいないよ。<br />
            <b>クリスタルルーム</b>で話がまとまると、ここに1粒ずつ増えていく。<br />
            増えるほど、この棚は光る。
          </p>
        )}

        {list.length > 0 && (
          <>
            <div className="cry-count"><b>{list.length}</b> 粒</div>
            {/* ショーウィンドウ。増えるほど下へ伸びる */}
            <div className="cry-shelf">
              {list.map((c) => (
                <button key={c.id} className="cry-gem" onClick={() => setOpen(c)} title={c.headline}>
                  <Gem color={c.color} />
                  <span className="cry-name">{c.name}</span>
                </button>
              ))}
            </div>
            <p className="cry-note">押すと、そのとき何をどこまで話したかが出るよ。</p>
          </>
        )}
      </div>

      {/* 1粒の中身 */}
      {open && (
        <div className="cry-detail" onClick={() => setOpen(null)}>
          <div className="cd-card" onClick={(e) => e.stopPropagation()}>
            <div className="cd-top">
              <Gem color={open.color} size={64} />
              <div>
                <div className="cd-name">{open.name}</div>
                <div className="cd-when">{open.date}</div>
              </div>
            </div>
            {open.headline && <div className="cd-head">{open.headline}</div>}
            {open.summary && (
              <div className="cd-sec">
                <div className="cd-t">どんな流れだったか</div>
                <p className="cd-body">{open.summary}</p>
              </div>
            )}
            {open.points?.length > 0 && (
              <div className="cd-sec">
                <div className="cd-t">決まったこと</div>
                {open.points.map((p, i) => <div key={i} className="cd-item">✓ {p}</div>)}
              </div>
            )}
            {open.next_steps?.length > 0 && (
              <div className="cd-sec">
                <div className="cd-t">どこから手をつけるか</div>
                {open.next_steps.map((p, i) => <div key={i} className="cd-item is-next">▸ {p}</div>)}
              </div>
            )}
            <button className="cd-close" onClick={() => setOpen(null)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
