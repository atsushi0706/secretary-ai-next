/**
 * AIラーニング（学びのピッコマ）。
 * いまは淳くん（管理者）だけ。鍵はかけず、管理者以外は地図に戻す。
 */
import "./learn.css";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "AIラーニング — SINGA WORLD" };

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) redirect("/login");
  if (!isAdmin(userId)) redirect("/");
  return <>{children}</>;
}
