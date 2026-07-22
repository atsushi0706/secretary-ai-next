/**
 * データベースを眠らせないための、軽い問い合わせ。
 *
 * 無料プランの Supabase は「7日間アクセスがない」と一時停止する。
 * 止まるとアプリ全体が動かなくなり、管理画面から手で起こすまで戻らない。
 * 1日1回ここを叩いておけば、その状態にはならない。
 *
 * データは一切扱わないので、外から叩かれても漏れるものがない。
 */
import { NextResponse } from "next/server";
import { touchDatabase } from "@/lib/backup";

export async function GET() {
  const r = await touchDatabase();
  return NextResponse.json(
    { ok: r.ok, detail: r.detail, at: new Date().toISOString() },
    { status: r.ok ? 200 : 500 },
  );
}
