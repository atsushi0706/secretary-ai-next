/**
 * 以前ここにあった「データの控え」は、管理画面（/admin）へ移した。
 *
 * 【なぜ移したか】
 * 使う人の目に触れる場所に「無料プランなので控えが取れません／戻す手段がありません」
 * と書いてあった。読んだ人に不安しか渡らないし、そもそも運用の話であって
 * 使う人には関係がない。控えを取るのは管理の仕事なので、管理画面にまとめる。
 *
 * 古いリンクを踏んだ人のために、ここは管理画面へ送るだけにしておく。
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BackupPage() {
  redirect("/admin");
}
