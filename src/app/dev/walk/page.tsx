/**
 * 開発用の実験台。**本番では開かない**（notFound）。
 *
 * 「返事が来たあと、チャットの表示だけ消える」を、手元で再現するために作った。
 * 通信は全部この画面の中で偽物に差し替えて、本物の ShingaWorld を動かす。
 * こうしないと、推測でしか原因を語れない。
 */
import { notFound } from "next/navigation";
import { WalkHarness } from "./WalkHarness";

export const dynamic = "force-dynamic";

export default function DevWalkPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <WalkHarness />;
}
