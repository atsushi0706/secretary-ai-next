/**
 * 素の 200 応答を返すだけのヘルスチェックページ。
 * リダイレクトなし、認証なし、外部呼び出しなし、React state なし。
 *
 * 「Chrome がドメイン自体を拒否してるか、それとも redirect 系だけコケてるか」の切り分け用。
 * ここが開くなら、他のページの failure は redirect/auth 周りの問題。
 * ここも開かないなら、ドメイン全体が Chrome 側でブロックされてる。
 */
export const dynamic = "force-dynamic";

export default function HealthPage() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
      <h1>✅ OK</h1>
      <p>secretary-ai-next.vercel.app は正常に応答しています。</p>
      <p style={{ color: "#666" }}>{new Date().toISOString()}</p>
      <hr />
      <p>
        <a href="/welcome">→ /welcome</a><br />
        <a href="/login">→ /login</a><br />
        <a href="/reset">→ /reset (セッションクリア)</a>
      </p>
    </main>
  );
}
