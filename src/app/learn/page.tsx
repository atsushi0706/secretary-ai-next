import Link from "next/link";
import { EPISODES } from "@/lib/learn";
import type { Part } from "@/lib/learn/types";
import { MangaArt } from "@/components/learn/MangaArt";

export default function LearnHome() {
  const eps = Object.values(EPISODES);
  const ep1 = eps[0];
  const teaser = ep1.parts.find((p): p is Extract<Part, { kind: "teaser" }> => p.kind === "teaser");
  return (
    <main className="min-h-screen" style={{ background: "#f3f4f8" }}>
      <div className="lrn-list">
        <div className="lrn-list-head">
          <Link href="/" className="inline-block text-xs text-purple-700 bg-white/80 border border-purple-200 rounded-full px-3 py-1.5">← 地図にもどる</Link>
          <h1>📚 AIラーニング</h1>
        </div>

        {eps.map((ep) => (
          <Link key={ep.key} href={`/learn/${ep.key}`} className="lrn-epcard">
            <div className="cover">
              <img className="episode-cover" src="/learn/ep1/episode-cover.webp" alt="動けという命令をやめ、走るイメージへ注意を移す17歳のミルトン・エリクソン" />
              <span className="badge">第{ep.no}話</span>
              <div className="cover-hook"><span>CASE 01</span><b>「やらなきゃ」と思うほど、動けない。</b></div>
            </div>
            <div className="body">
              <div className="no">エリクソン原理 01</div>
              <div className="title">{ep.title}</div>
              <div className="sub">{ep.subtitle}</div>
              <div className="meta"><span>📖 漫画5P</span><span>🎓 教室13場面</span><span>🎫 質問チケット×{ep.tickets}</span><span>⏱ 約15分</span></div>
            </div>
          </Link>
        ))}

        <Link href="/learn/treasure" className="lrn-treasure-door">
          <span className="lrn-treasure-icon" aria-hidden="true"><i /></span>
          <span className="lrn-treasure-copy">
            <b>原理の宝物庫</b>
            <small>獲得した催眠の原理を、使いどころと一緒に見返す</small>
          </span>
          <span className="lrn-treasure-arrow" aria-hidden="true">›</span>
        </Link>

        {teaser && (
          <div className="lrn-epcard is-locked">
            <div className="cover">
              <MangaArt art="man-arms" />
              <span className="badge">{teaser.next.no}・準備中</span>
            </div>
            <div className="body">
              <div className="no">{teaser.next.series}</div>
              <div className="title">{teaser.next.title}</div>
              <div className="sub">{teaser.next.principle}</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
