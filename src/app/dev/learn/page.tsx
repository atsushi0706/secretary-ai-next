/**
 * AIラーニングの実験台。**本番では開かない**（notFound）。
 * ログイン無しで LearnPlayer を動かし、Playwright で画面を測るために使う。
 *   ?part=N … N番目のパートから始める
 *   （0=漫画 1=体験 2=推理 3=教室 4=質問 5=原理 6=次回へ 7=次回）
 */
import { notFound } from "next/navigation";
import "../../learn/learn.css";
import { LearnHarness } from "./LearnHarness";

export const dynamic = "force-dynamic";

export default async function DevLearnPage({ searchParams }: { searchParams: Promise<{ part?: string; ep?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const episodeKey = /^(ep1|ep2|ep3|ep4|ep5|ep6|ep7|ep8|ep9|ep10)$/.test(sp.ep ?? "")
    ? sp.ep as "ep1" | "ep2" | "ep3" | "ep4" | "ep5" | "ep6" | "ep7" | "ep8" | "ep9" | "ep10"
    : "ep1";
  return <LearnHarness part={Number(sp.part ?? 0) || 0} episodeKey={episodeKey} />;
}
