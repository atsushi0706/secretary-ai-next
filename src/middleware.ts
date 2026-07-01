import { NextResponse, type NextRequest } from "next/server";

/**
 * HTML ドキュメント (Accept: text/html を含むリクエスト) にだけ
 * Cache-Control: no-store を強制する middleware。
 *
 * 目的: 過去に Service Worker が古い HTML を掴んで「This page couldn't load」が頻発した。
 * デプロイのたびにブラウザ側で古い HTML/JSON がキャッシュされて壊れないよう、
 * HTML 応答だけは常に no-store で新しく取得させる。
 *
 * 静的アセット (/_next/static/hash.js, .png, .css 等) はハッシュ付きなので長期キャッシュ OK。
 * matcher でそれらは除外している。
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    res.headers.set("Cache-Control", "no-store, must-revalidate");
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
