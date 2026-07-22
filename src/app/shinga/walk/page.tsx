import Link from "next/link";

/**
 * 青写真ウォーキング ＝ 直感の森。
 * 音声認識・歩数計連携・画像生成は今回のスコープ外。
 * 今は「歩いて気づいたことをクエストにする」導線だけを置いておく。
 */
export default function WalkPage() {
  return (
    <div className="space-y-3">
      <Link href="/shinga" className="inline-block text-xs text-[rgba(107,85,53,.8)] hover:text-[var(--singa-gold)]">
        ← 地図に戻る
      </Link>

      <section className="card">
        <div className="singa-sub">The Forest of Intuition</div>
        <h1 className="singa-heading font-bold text-lg mt-0.5">❧ 青写真ウォーキング｜直感の森</h1>
        <div className="singa-rule" />
        <p className="text-sm leading-relaxed text-[var(--singa-ink-soft)]">
          歩きながら、魂のささやきを聴く。<br />
          望んでいる未来のイメージを、言葉にしていくワークです。
        </p>
        <p className="text-xs mt-2 text-[rgba(107,85,53,.75)]">
          音声入力・歩数計連携・シンボル青写真の生成は<b>これから</b>。
        </p>

        <div className="mt-3 text-xs rounded-xl p-3 leading-relaxed border border-[rgba(150,118,62,.35)] bg-[rgba(255,250,236,.6)]">
          <div className="font-bold mb-1 text-[#5b431a]">いま、この森でできること</div>
          歩いている間に浮かんだこと・やってみたくなったことを、そのままクエストにしてください。
          クエストにすれば、リアルバースの具体的な行動に落とし込めます。
        </div>

        <Link
          href="/shinga/quests"
          className="block mt-3 text-center text-sm font-bold py-2.5 rounded-xl text-[#f0d9a0] hover:opacity-90"
          style={{ background: "linear-gradient(160deg, #4a3418 0%, #33230f 55%, #241708 100%)" }}
        >
          ✦ 気づいたことをクエストにする
        </Link>
      </section>

      <section className="card">
        <div className="singa-sub">Coming to this forest</div>
        <div className="font-bold text-sm mt-1 mb-2">これから開かれるもの</div>
        <ul className="text-xs space-y-1.5 leading-relaxed text-[var(--singa-ink-soft)]">
          <li>・歩きながらの音声入力（クロートコード）</li>
          <li>・歩数と対話の連動</li>
          <li>・シンボル青写真の生成</li>
          <li>・歩いた後の4コマ振り返り</li>
        </ul>
      </section>
    </div>
  );
}
