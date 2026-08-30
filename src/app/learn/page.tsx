import Link from "next/link";
import { EPISODES } from "@/lib/learn";
import type { Part } from "@/lib/learn/types";
import { MangaArt } from "@/components/learn/MangaArt";

export default function LearnHome() {
  const eps = Object.values(EPISODES);
  const lastEpisode = eps[eps.length - 1];
  const teaser = lastEpisode?.parts.find((p): p is Extract<Part, { kind: "teaser" }> => p.kind === "teaser");
  return (
    <main className="min-h-screen" style={{ background: "#f3f4f8" }}>
      <div className="lrn-list">
        <div className="lrn-list-head">
          <Link href="/" className="inline-block text-xs text-purple-700 bg-white/80 border border-purple-200 rounded-full px-3 py-1.5">← 地図にもどる</Link>
          <h1>📚 AIラーニング</h1>
        </div>

        <section className="lrn-series-block">
          <div className="lrn-series-heading">
            <span>MENTAL MODEL COURSE</span>
            <h2>清瀬 淳の心の構造学</h2>
          </div>
          <Link href="/learn/inner-world-map" className="lrn-iwm-door">
            <div className="lrn-iwm-orbit" aria-hidden="true"><i /><b>✦</b></div>
            <div className="lrn-iwm-copy">
              <small>全6章＋実演セッション2本</small>
              <strong>INNER WORLD MAP</strong>
              <h3>繰り返す悩みの奥にいる自分を見つけ、未来へ進む地図を作る。</h3>
              <span>自分の地図を作る →</span>
            </div>
          </Link>
        </section>

        <div className="lrn-series-heading is-erickson">
          <span>HYPNOSIS ADVENTURE</span>
          <h2>変態催眠学者 ミルトン・エリクソン編</h2>
        </div>

        {eps.map((ep) => (
          <Link key={ep.key} href={`/learn/${ep.key}`} className="lrn-epcard">
            <div className="cover">
              <img className="episode-cover" src={ep.listing.cover} alt={ep.listing.coverAlt} />
              <span className="badge">第{ep.no}話</span>
              <div className="cover-hook"><span>{ep.listing.caseNo}</span><b>{ep.listing.hook}</b></div>
            </div>
            <div className="body">
              <div className="no">{ep.listing.principleNo}</div>
              <div className="title">{ep.title}</div>
              <div className="sub">{ep.subtitle}</div>
              <div className="meta"><span>📖 漫画{ep.listing.mangaPages}P</span><span>🎓 講義{ep.listing.classroomScenes}場面</span><span>🎫 質問チケット×{ep.tickets}</span><span>⏱ 約{ep.listing.minutes}分</span></div>
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
