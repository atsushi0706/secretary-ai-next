import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: ".04em" }}>SINGA WORLD</h1>
        <p className="text-xs text-gray-400 mb-3" style={{ letterSpacing: ".22em" }}>インナーワールド × リアルバース</p>
        <p className="text-sm text-gray-500 mb-6">
          Googleアカウントでログインしてください。
          <br />Googleカレンダー / ToDo リスト（タスク）に接続します。
        </p>
        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
          <button
            type="submit"
            className="w-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] text-white font-bold py-3 rounded-xl shadow hover:opacity-90 transition"
          >
            Googleでログイン
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-6">
          ログイン後、Gemini APIキーの設定画面に進みます。
        </p>
        <p className="text-xs text-gray-400 mt-3">
          続行すると{" "}
          <a href="/terms" className="underline text-[var(--accent)]">利用規約</a>
          {" "}と{" "}
          <a href="/privacy" className="underline text-[var(--accent)]">プライバシーポリシー</a>
          {" "}に同意したものとみなされます。
        </p>
      </div>
    </main>
  );
}
