import type { NextConfig } from "next";

/**
 * このアプリの正式なURLは1つだけ： https://singaworld.rinq-systeme.jp
 *
 * 【なぜ旧URLを畳むか】
 * Vercel が自動で付ける https://secretary-ai-next.vercel.app でも、同じ画面が開ける状態だった。
 * すると、同じアプリが2つのURLで存在することになる。
 *  ・Google の OAuth 審査では、承認済みドメインに vercel.app が残っていると、
 *    「secretary-ai-next」という別の名前のドメインからも同じアプリが配られているように見える。
 *    アプリ名（Singa World）とドメイン名が食い違い、ブランドの一致チェックに引っかかる。
 *  ・そもそも *.vercel.app は Vercel が持つドメインなので、こちらでは所有権を証明できない。
 *
 * だから旧URLへ来たアクセスは、全部そのまま正式なURLへ送る（301・恒久）。
 * これで生きている入口が1つになり、審査でも実際の利用でも迷いがなくなる。
 */
const CANONICAL_HOST = "singaworld.rinq-systeme.jp";
const LEGACY_HOST = "secretary-ai-next.vercel.app";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: LEGACY_HOST }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
