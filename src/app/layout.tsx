import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SWRegister } from "./sw-register";
import { TimerProvider } from "@/components/TimerContext";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";

export const metadata: Metadata = {
  title: "SINGA WORLD",
  description: "内側で掴んだものを、現実に落としていく。インナーワールド × リアルバース",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png", // ホーム画面に追加したときのアイコン（iOS）
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SINGA WORLD",
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
        <SWRegister />
        <TimerProvider>
          {children}
          <PwaInstallBanner />
        </TimerProvider>
      </body>
    </html>
  );
}
