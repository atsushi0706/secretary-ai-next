/**
 * データの控えを取るページ。**管理者だけ**。
 *
 * 【なぜ管理者だけにしたか】
 * 以前は「自分の分だけ」なら、ログインしていれば誰でも落とせた。
 * だが、この世界に書くのは内側のことなので、
 * 「持ち出せる」こと自体を配りたくない（淳くんの判断）。
 * 画面もサーバも、管理者以外は通さない。
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { BackupPanel } from "./BackupPanel";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  // ログインしていない／管理者でない人には、この画面を出さない
  if (!userId || !isAdmin(userId)) redirect("/");
  return <BackupPanel />;
}
