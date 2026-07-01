import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // HTML no-store は src/middleware.ts で HTML のみに絞って設定している。
  // ここでは /sw.js を叩きに来た旧クライアント向けの明示ヘッダのみ (安全網)。
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
