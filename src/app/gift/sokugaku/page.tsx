/**
 * 速学力プレゼント企画（8/12〜8/31）の贈り物ページ。
 *
 * 通知を開くとここに来る。上位10名（と運営）だけが受け取れる。
 * 順位はどこにも保存せず、**開いた瞬間に記録から数え直す**（ポイントと同じ考え方）。
 * 1〜3位には順位を伝える。ダウンロードはこのページのボタンから。
 */
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { ranking, giftStatus, CAMPAIGN } from "@/lib/points";
import { getUserSettings } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "速学力の贈り物 — SINGA WORLD" };

const PDF = "/gift/sokugaku-9k2fw7.pdf";
const MEDALS = ["🥇", "🥈", "🥉"];

export default async function SokugakuGiftPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/login");

  const [g, s] = await Promise.all([
    giftStatus(userId),
    getUserSettings(userId).catch(() => null),
  ]);
  const admin = isAdmin(userId);
  // 保存済みの順位表（配布時に凍結）を使う。まだ無ければ、その場で数える（重いので保険だけ）
  let rankNo: number | null = g.stored ? g.rank : null;
  if (!g.stored) {
    const top = await ranking(10);
    const i = top.findIndex((r) => r.userId === userId);
    rankNo = i >= 0 ? i + 1 : null;
  }
  const idx = rankNo !== null ? rankNo - 1 : -1;
  const who = ((s as any)?.user_call_name || (s as any)?.display_name || "あなた") as string;

  if (idx < 0 && !admin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "#0d2230" }}>
        <div className="max-w-md text-center text-white/90">
          <p className="text-4xl mb-4">📕</p>
          <h1 className="font-bold text-lg mb-3">速学力の贈り物</h1>
          <p className="text-sm leading-relaxed opacity-80">
            この贈り物は、{CAMPAIGN.name}（8/12〜8/31）で
            上位10名に入った人へのものです。<br />
            次の企画で、また会おうね。
          </p>
          <Link href="/" className="inline-block mt-6 text-sm underline text-white/70">← 地図にもどる</Link>
        </div>
      </main>
    );
  }

  const rank = idx >= 0 ? idx + 1 : null;

  return (
    <main className="min-h-screen px-5 py-10 flex justify-center" style={{ background: "#0d2230" }}>
      <div className="w-full max-w-md text-white">
        {/* 順位（1〜3位だけ大きく伝える） */}
        <div className="text-center mb-6">
          {rank !== null && rank <= 3 ? (
            <>
              <div className="text-6xl mb-2">{MEDALS[rank - 1]}</div>
              <div className="text-xl font-bold">8月、あなたは 第{rank}位 でした！</div>
            </>
          ) : rank !== null ? (
            <>
              <div className="text-5xl mb-2">🎉</div>
              <div className="text-xl font-bold">8月の上位10名に入りました</div>
            </>
          ) : (
            <div className="text-xs text-white/60">（運営テスト表示：あなたは上位10名の外です）</div>
          )}
        </div>

        {/* 淳くんからの一言 */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)" }}>
          <p className="text-sm leading-loose">
            {who}さんへ<br /><br />
            1ヶ月、おつかれさま。<br />
            SINGA WORLDを、しっかり使ってくれてありがとう。<br /><br />
            感謝を込めて、非売品の電子書籍<b>『速学力』</b>を贈ります。
            学んだ瞬間から使う——この1冊が、{who}さんの次の一歩の味方になりますように。
          </p>
          <p className="text-right text-xs mt-3 text-white/60">清瀬 淳</p>
        </div>

        {/* 本 */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "#0a1c28", border: "1px solid rgba(255,255,255,.15)" }}>
          <div className="p-6 text-center">
            <p className="text-[11px] tracking-widest text-orange-400 font-bold mb-2">AI時代の学び方を、逆転させる</p>
            <p className="text-4xl font-black mb-1">速学力</p>
            <p className="text-sm font-bold text-orange-300 mb-1">最速で学びを力に変える</p>
            <p className="text-[11px] text-white/60">やりながら、学びの本質を掴み取る。｜清瀬 淳</p>
          </div>
        </div>

        {/* ダウンロード */}
        <a href={PDF} download="速学力_最速で学びを力に変える.pdf"
          className="block w-full text-center font-bold py-4 rounded-xl text-base"
          style={{ background: "#f0862e", color: "#1a1206" }}>
          📕 本をダウンロードする（PDF・1.1MB）
        </a>
        <p className="text-[11px] text-white/50 mt-3 leading-relaxed text-center">
          スマホで開いた場合は、表示されたPDFの共有ボタンから「ファイルに保存」でも保存できます。
        </p>

        <div className="text-center mt-8">
          <Link href="/" className="text-sm underline text-white/70">← 地図にもどる</Link>
        </div>
      </div>
    </main>
  );
}
