/**
 * AIラーニングの実験台。**本番では開かない**（notFound）。
 * ログイン無しで LearnPlayer を動かし、Playwright で画面を測るために使う。
 *   ?part=N … N番目のパートから始める（0=漫画 1=体験 2=教室 3=質問 4=原理 5=次回へ 6=次回）
 */
import { notFound } from "next/navigation";
import "../../learn/learn.css";
import { LearnHarness } from "./LearnHarness";

export const dynamic = "force-dynamic";

export default async function DevLearnPage({ searchParams }: { searchParams: Promise<{ part?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  return <LearnHarness part={Number(sp.part ?? 0) || 0} />;
}
