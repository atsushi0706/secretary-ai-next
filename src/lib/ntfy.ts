/**
 * ntfy.sh への push 通知ヘルパー。
 * トピック名だけで動く（プッシュサーバ側に登録不要）。
 */

export async function sendNtfy(
  topic: string,
  message: string,
  opts: { title?: string; priority?: 1 | 2 | 3 | 4 | 5; tags?: string[] } = {},
): Promise<{ ok: boolean; status: number; error?: string }> {
  if (!topic) return { ok: false, status: 0, error: "no topic" };

  // ntfy ヘッダーは ASCII のみ。日本語タイトルはBase64+RFC2047エンコードする。
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
  };
  if (opts.title) {
    // 日本語OKにするため =?utf-8?B?...?= 形式でエンコード
    const b64 = Buffer.from(opts.title, "utf-8").toString("base64");
    headers["Title"] = `=?utf-8?B?${b64}?=`;
  }
  if (opts.priority) headers["Priority"] = String(opts.priority);
  if (opts.tags && opts.tags.length > 0) headers["Tags"] = opts.tags.join(",");

  try {
    const r = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers,
      body: message,
    });
    return { ok: r.ok, status: r.status };
  } catch (e: any) {
    return { ok: false, status: 0, error: String(e?.message ?? e) };
  }
}
