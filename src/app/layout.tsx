import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SWRegister } from "./sw-register";
import { TimerProvider } from "@/components/TimerContext";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";

// アプリ名は「Singa World」で全部そろえる。
// Google の OAuth 審査では、同意画面のアプリ名とホームページのアプリ名が
// 一致していないと差し戻される（2026-07-31 の指摘がこれ）。
// 同意画面側にも、まったく同じ綴りで "Singa World" を設定すること。
export const APP_NAME = "Singa World";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "内側で掴んだものを、現実に落としていく。インナーワールド × リアルバース",
  applicationName: APP_NAME,
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    url: "https://singaworld.rinq-systeme.jp",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png", // ホーム画面に追加したときのアイコン（iOS）
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#7a6dd6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">
        {/* アプリ名を機械が読める形でも置いておく（同意画面の名前と一致させるため） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: APP_NAME,
            url: "https://singaworld.rinq-systeme.jp",
            applicationCategory: "ProductivityApplication",
            operatingSystem: "Web",
          }) }}
        />
        <SWRegister />
        <TimerProvider>
          {children}
          <PwaInstallBanner />
        </TimerProvider>
      </body>
    </html>
  );
}
