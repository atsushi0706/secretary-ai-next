import { NextResponse, type NextRequest } from "next/server";

/**
 * HTML ドキュメント (Accept: text/html を含むリクエスト) にだけ
 * Cache-Control: no-store を強制する middleware。
 *
 * 目的:
 * ・過去に Service Worker が古い HTML を掴んで「This page couldn't load」が頻発した
 * ・Vercel の CDN が prerender HTML を Edge にキャッシュして、デプロイ後も古い HTML を返してた
 *
 * 対策 3層:
 * 1. Cache-Control: no-store          → ブラウザにキャッシュさせない
 * 2. CDN-Cache-Control: no-store      → 一般 CDN 向け
 * 3. Vercel-CDN-Cache-Control: no-store → Vercel Edge にキャッシュさせない (これが今回の主犯対策)
 *
 * 静的アセット (/_next/static/hash.js, .png, .css 等) はハッシュ付きなので長期キャッシュ OK。
 * matcher でそれらは除外している。
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const accept = req.headers.get("accept") || "";
  // HTML documents / navigation requests のみ対象
  if (accept.includes("text/html") || accept === "*/*") {
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    res.headers.set("CDN-Cache-Control", "no-store");
    res.headers.set("Vercel-CDN-Cache-Control", "no-store");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
  }
  return res;
}

export const config = {
  matcher: [
    // /_next/static, /_next/image, favicon, 画像等の静的アセットは除外
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|map)).*)",
  ],
};
