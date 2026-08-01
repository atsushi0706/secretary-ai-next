/**
 * 通知まわりの自己診断。
 *
 * 「準備中」と出るのが、鍵が無いせいなのか・別の理由なのかを切り分けるための窓口。
 * 値そのものは絶対に返さない（有無と長さだけ）。ログイン不要にしてあるのは、
 * ログインできない状態でも原因を見られるようにするため。
 */
import { NextResponse } from "next/server";
import { pushConfigured } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase";
import { createECDH, createHash } from "crypto";

const unb64u = (v: string) => Buffer.from(v.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const b64u = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * 秘密鍵から公開鍵を導き出して、設定されている公開鍵と一致するか確かめる。
 * ここが false なら、鍵が「別々のペア」なので送信は必ず失敗する。
 */
function keyPairMatches(pub: string, priv: string): boolean | null {
  try {
    if (!pub || !priv) return null;
    const e = createECDH("prime256v1");
    e.setPrivateKey(unb64u(priv));
    return b64u(e.getPublicKey()) === pub.trim();
  } catch { return false; }
}

export const dynamic = "force-dynamic";   // ビルド時に固めない（実行時の環境変数を見る）

function look(v: string | undefined) {
  if (!v) return { ok: false, len: 0 };
  const t = v.trim();
  return {
    ok: t.length > 0,
    len: t.length,
    // 前後に空白や改行が混ざっていると鍵として使えないので、そこも見る
    hasSpace: t.length !== v.length,
  };
}

export async function GET() {
  // 購読を保存する入れ物があるか（無いと「通知ON」を押しても何も残らない）
  let table: "ok" | "missing" | "unknown" = "unknown";
  let rows = -1;
  try {
    const { count, error } = await supabaseAdmin()
      .from("push_subscriptions").select("id", { count: "exact", head: true });
    if (error) table = /does not exist|schema cache/i.test(error.message) ? "missing" : "unknown";
    else { table = "ok"; rows = count ?? 0; }
  } catch { table = "unknown"; }

  const pub = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
  const priv = (process.env.VAPID_PRIVATE_KEY ?? "").trim();

  return NextResponse.json({
    table, rows,
    keyPairMatches: keyPairMatches(pub, priv),
    // 公開鍵はもともとブラウザに配る公開情報なので、そのまま出して確認に使う
    pubValue: pub,
    // 秘密鍵は出さない。ハッシュの先頭だけ（ここから元の値は復元できない）
    privFingerprint: priv ? createHash("sha256").update(priv).digest("hex").slice(0, 10) : null,
    configured: pushConfigured(),
    pub: look(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    priv: look(process.env.VAPID_PRIVATE_KEY),
    subject: look(process.env.VAPID_SUBJECT),
    cronSecret: look(process.env.CRON_SECRET).ok,
  });
}
