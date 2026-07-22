import Link from "next/link";

/**
 * シンガワールドのトップ ＝「心の宝の地図」。
 * 地図の各エリアが、そのままアプリの機能への入口になっている。
 * まだ作っていない場所は「未踏の地」として置いておく（世界の輪郭を先に見せる）。
 */

type Land = {
  href?: string;
  en: string;
  ja: string;
  desc: string;
  gem: string;
};

/** 歩ける場所 */
const OPEN_LANDS: Land[] = [
  {
    href: "/shinga/quests",
    en: "The Sky of Possibilities",
    ja: "可能性の空",
    desc: "人生で体験したいこと、挑戦したいこと。ここに置いたものが、リアルバースの行動になる。",
    gem: "✦",
  },
  {
    href: "/shinga/walk",
    en: "The Forest of Intuition",
    ja: "直感の森",
    desc: "歩きながら、魂のささやきを聴く。青写真ウォーキングの入口。",
    gem: "❧",
  },
  {
    href: "/shinga/records",
    en: "The River of Emotion",
    ja: "感情の川",
    desc: "感じる。流れる。動かされる。感情の10段階と、これまでの振り返り。",
    gem: "≈",
  },
];

/** これから開かれる場所 */
const LOCKED_LANDS: Land[] = [
  {
    en: "The Sanctuary of Self-Disclosure",
    ja: "自己開示の聖域",
    desc: "本当のことを話す。見られる。自分でいる。AIとの対話と会話記録。",
    gem: "✧",
  },
  {
    en: "The Cave of Shadow",
    ja: "影の洞窟",
    desc: "隠れているものと向き合い、変えて、昇る。クロートコード。",
    gem: "◈",
  },
  {
    en: "The Shrine of Symbols",
    ja: "シンボルの社",
    desc: "すべてのシンボルが鍵を持っている。シンボル青写真。",
    gem: "❖",
  },
  {
    en: "The Garden of Healing",
    ja: "癒しの庭",
    desc: "休む。回復する。もう一度咲く。",
    gem: "✿",
  },
  {
    en: "The Treasure of the Heart",
    ja: "心の宝",
    desc: "あなたの本当の贈り物を、世界に手渡す。自分の変化の記録。",
    gem: "♥",
  },
];

const LEGEND = [
  { gem: "◆", ja: "真実", en: "Truth" },
  { gem: "◆", ja: "慈しみ", en: "Compassion" },
  { gem: "◆", ja: "勇気", en: "Courage" },
  { gem: "◆", ja: "創造", en: "Creativity" },
  { gem: "◆", ja: "叡智", en: "Wisdom" },
  { gem: "♥", ja: "愛", en: "Love" },
];

const CYCLE = [
  { t: "自分を開く", realm: "s" },
  { t: "青写真を見つける", realm: "s" },
  { t: "クエストを作る", realm: "s" },
  { t: "タスクに変える", realm: "r" },
  { t: "現実で実行する", realm: "r" },
  { t: "感情の変化を振り返る", realm: "s" },
  { t: "次のクエストへ", realm: "s" },
];

function LandCard({ land }: { land: Land }) {
  const inner = (
    <>
      <div className="flex items-start gap-2">
        <span className="text-[var(--singa-gold)] text-lg leading-none mt-0.5">{land.gem}</span>
        <div className="min-w-0">
          <div className="land-en truncate">{land.en}</div>
          <div className="land-ja">{land.ja}</div>
        </div>
      </div>
      <div className="land-desc">{land.desc}</div>
      {land.href ? (
        <div className="mt-3 text-[11px] font-bold text-[var(--singa-gold)]">進む →</div>
      ) : (
        <div className="mt-3 text-[11px] text-[rgba(107,85,53,.6)]">未踏の地</div>
      )}
    </>
  );

  if (!land.href) {
    return <div className="singa-land is-locked">{inner}</div>;
  }
  return (
    <Link href={land.href} className="singa-land">
      {inner}
    </Link>
  );
}

export default function ShingaHomePage() {
  return (
    <div className="space-y-5">
      {/* 地図のタイトル */}
      <header className="singa-scroll">
        <div className="singa-sub">Treasure Map of the Inner Heart</div>
        <h1 className="singa-heading text-2xl sm:text-3xl font-bold mt-1.5">シンガワールド</h1>
        <div className="singa-rule" />
        <p className="text-xs sm:text-sm leading-relaxed text-[var(--singa-ink-soft)]">
          探る。癒す。思い出す。なる。<br />
          ここは、自己開示と自己探求を通して<b>自分自身を開いていく</b>ための場所。<br />
          見つけたものは、
          <Link href="/" className="font-bold text-[var(--singa-gold)] hover:underline">リアルバース</Link>
          の行動へ渡していきます。
        </p>
      </header>

      {/* 歩ける場所 */}
      <section>
        <div className="singa-sub mb-2">Where you can walk now</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {OPEN_LANDS.map((l) => <LandCard key={l.en} land={l} />)}
        </div>
      </section>

      {/* 未踏の地 */}
      <section>
        <div className="singa-sub mb-2">Lands not yet opened</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOCKED_LANDS.map((l) => <LandCard key={l.en} land={l} />)}
        </div>
      </section>

      {/* 地図の凡例 */}
      <section className="card">
        <div className="singa-sub">Map Legend</div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs">
          {LEGEND.map((g) => (
            <li key={g.en} className="flex items-center gap-1.5">
              <span className="text-[var(--singa-gold)]">{g.gem}</span>
              <span className="font-bold">{g.ja}</span>
              <span className="text-[10px] text-[rgba(107,85,53,.65)]">{g.en}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2つの世界の循環 */}
      <section className="card">
        <div className="singa-sub">The Cycle of Two Worlds</div>
        <ol className="flex flex-wrap gap-1.5 mt-2 text-[11px]">
          {CYCLE.map((c, i) => (
            <li
              key={c.t}
              className={`px-2 py-1 rounded-lg border ${
                c.realm === "s"
                  ? "border-[rgba(168,129,47,.4)] bg-[rgba(255,246,222,.7)] text-[#5b431a]"
                  : "border-[rgba(60,110,170,.35)] bg-[rgba(226,240,252,.7)] text-[#1f5a97]"
              }`}
            >
              <span className="opacity-50 mr-1">{i + 1}</span>
              {c.t}
            </li>
          ))}
        </ol>
        <div className="text-[10px] mt-2 text-[rgba(107,85,53,.7)]">
          金＝シンガワールド ／ 青＝リアルバース
        </div>
      </section>

      <footer className="text-center py-2">
        <div className="singa-rule" />
        <div className="text-[11px] tracking-widest text-[var(--singa-gold)]">
          YOU ARE THE STORY. YOU ARE THE MAP. YOU ARE THE MAGIC.
        </div>
        <div className="text-xs font-bold mt-1.5 singa-heading">鍵は、あなた。</div>
      </footer>
    </div>
  );
}
