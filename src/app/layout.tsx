import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SWRegister } from "./sw-register";
import { TimerProvider } from "@/components/TimerContext";
import { TimerBadge } from "@/components/TimerBadge";

export const metadata: Metadata = {
  title: "秘書AI 清瀬リンク",
  description: "朝夜に話しかける秘書AI＋タスクボード",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "清瀬リンク",
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
      <head>
        {/* HTML キャッシュを Chrome にも二重で禁止 (middleware の Cache-Control と合わせて念押し)。
            過去にデプロイのたびに古い HTML が残って「This page couldn't load」になる事象があった。 */}
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className="min-h-full flex flex-col">
        <SWRegister />
        <TimerProvider>
          {children}
          <TimerBadge />
        </TimerProvider>
      </body>
    </html>
  );
}
