import { redirect } from "next/navigation";
import { RealmNav } from "@/components/RealmNav";

/**
 * シンガワールド共通レイアウト。
 * 認証ガードと最上位ナビ（リアルバース / シンガワールド）をここで一括して持つ。
 * ルートページ (/) と同じく、auth() が壊れても白画面にならないようガードする。
 */
export default async function ShingaLayout({ children }: { children: React.ReactNode }) {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user) redirect("/login");
  } catch (e: any) {
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    console.error("[ShingaLayout] auth failed:", e);
    redirect("/reset");
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-3 sm:py-5">
        <RealmNav active="shinga" />
        {/* ここから内側は「心の宝の地図」の世界（羊皮紙＋明朝） */}
        <div className="singa-world">{children}</div>
      </div>
    </main>
  );
}
