/**
 * ブラウザ・プッシュ通知（Web Push / VAPID）。
 * 購読情報は Supabase の push_subscriptions に保存。送信は web-push。
 *
 * 必要な環境変数（Vercel に設定）:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY … 公開鍵（クライアントにも渡すので NEXT_PUBLIC_）
 * - VAPID_PRIVATE_KEY            … 秘密鍵（サーバのみ）
 * - VAPID_SUBJECT               … 連絡先（mailto:... か https://...）
 */
import webpush from "web-push";
import { supabaseAdmin } from "./supabase";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured = false;
/** 環境変数は貼り付けミスで前後に空白や改行が入りがち。鍵として使う前に必ず落とす */
const env = (k: string) => (process.env[k] ?? "").trim();

export function pushConfigured(): boolean {
  return !!(env("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && env("VAPID_PRIVATE_KEY"));
}

function ensureConfigured() {
  if (configured) return;
  if (!pushConfigured()) throw new Error("VAPID 未設定（NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY）");
  webpush.setVapidDetails(
    env("VAPID_SUBJECT") || "mailto:affection.alice@gmail.com",
    env("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    env("VAPID_PRIVATE_KEY"),
  );
  configured = true;
}

type SubRow = { endpoint: string; p256dh: string; auth: string };

export async function saveSubscription(userId: string, sub: any): Promise<void> {
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error("invalid subscription");
  const supa = supabaseAdmin();
  const { error } = await supa.from("push_subscriptions").upsert(
    { user_id: userId, endpoint, p256dh, auth, updated_at: new Date().toISOString() },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function removeSubscription(endpoint: string): Promise<void> {
  if (!endpoint) return;
  const supa = supabaseAdmin();
  await supa.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/**
 * 1ユーザーの全端末に送る。期限切れ(404/410)の購読は自動で掃除。
 *
 * ※ 以前は送信エラーを全部握りつぶしていたため、鍵が合っていなくても
 *   「sent:0」としか分からず、画面には「購読が見つからなかった」と誤った案内が出ていた。
 *   失敗の理由は必ず持ち帰る。
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; removed: number; found: number; errors: string[] }> {
  ensureConfigured();
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw error;
  const subs = (data ?? []) as SubRow[];
  const body = JSON.stringify(payload);
  let sent = 0, removed = 0;
  const errors: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      );
      sent++;
    } catch (e: any) {
      const code = e?.statusCode;
      const detail = String(e?.body ?? e?.message ?? "");
      // 鍵を入れ替えると、古い鍵で作られた購読は二度と使えない（403）。失効と同じ扱いで掃除する。
      const staleKey = code === 403 && /do not correspond|VAPID/i.test(detail);
      if (code === 404 || code === 410 || staleKey) {
        await removeSubscription(s.endpoint); removed++;
        errors.push(staleKey
          ? "403 古い鍵で作られた購読だったので削除した。もう一度ONにし直して"
          : `${code} 端末側の購読が失効していた（削除した）`);
      } else {
        const msg = String(e?.body ?? e?.message ?? e).replace(/\s+/g, " ").slice(0, 160);
        errors.push(`${code ?? "?"} ${msg}`);
      }
    }
  }));
  return { sent, removed, found: subs.length, errors };
}

export async function hasSubscription(userId: string): Promise<boolean> {
  const supa = supabaseAdmin();
  const { count } = await supa
    .from("push_subscriptions")
    .select("endpoint", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}
