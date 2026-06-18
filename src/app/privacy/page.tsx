import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "プライバシーポリシー — Focus Secretary",
  description: "Focus Secretary（Chrome 拡張機能 + 秘書AI Web アプリ）のプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f5f3fb] via-[#ecf2fb] to-white">
      <header className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/welcome" className="flex items-center gap-2">
          <Image src="/kiyose.png" alt="" width={32} height={32} className="rounded-full border border-purple-200" />
          <span className="font-bold text-lg text-purple-700">Focus Secretary</span>
        </Link>
        <Link href="/welcome" className="text-sm text-purple-700 underline">← トップに戻る</Link>
      </header>

      <article className="max-w-3xl mx-auto px-6 pb-20 prose prose-purple">
        <h1 className="text-3xl font-bold text-purple-800 mt-4 mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-gray-500 mb-8">最終更新: 2026-06-18</p>

        <section className="bg-white/70 border border-purple-100 rounded-2xl p-6 mb-6 leading-relaxed">
          <p>
            Focus Secretary（Chrome 拡張機能および <code>secretary-ai-next.vercel.app</code> の秘書AIアプリ。以下「本サービス」）は、
            ユーザーのプライバシーを最大限尊重します。本ページでは取り扱うデータと、その範囲・送信先を明記します。
          </p>
        </section>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">1. Chrome 拡張機能が扱うデータ</h2>
        <p>本拡張機能は以下のデータを <strong>ユーザーのブラウザ内（chrome.storage.local）のみに保存</strong> します。外部サーバーに送信することはありません。</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>集中モード ON/OFF 状態</li>
          <li>タブ上限値</li>
          <li>ブロックリスト（ユーザーが入力したドメイン名）</li>
          <li>ポモドーロ状態と設定（集中時間・休憩時間）</li>
          <li>今日の集中時間累積</li>
          <li>今日の時間割テキスト（ユーザーが入力）</li>
          <li>秘書名・アバター画像URL（秘書アプリと連携時のみ取得）</li>
        </ul>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">2. 秘書AI Web アプリが扱うデータ</h2>
        <p>本アプリは Google ログイン経由で以下の情報にアクセスします。</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Google Calendar</strong>: 今日の予定の表示・登録</li>
          <li><strong>Google Tasks</strong>: タスクの作成・更新・削除</li>
          <li><strong>Google Drive</strong>（読み取り専用）: 任意の参照</li>
          <li><strong>Gmail</strong>（読み取り専用）: 任意の要約</li>
        </ul>
        <p className="mt-3">取得した情報は AI 秘書の応答生成にのみ使用し、第三者には提供しません。会話履歴は Supabase に保存され、ユーザー本人のみがアクセスできます。</p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">3. AI 応答の生成</h2>
        <p>
          ユーザーが Gemini API キーを設定した場合、その API キーは暗号化して保存され、
          ユーザー自身の応答生成（Google Gemini API）にのみ使用します。
          API キーの内容を第三者に開示することはありません。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">4. 秘書アプリとの連携（拡張機能）</h2>
        <p>
          <code>secretary-ai-next.vercel.app</code> ドメインを開いている時のみ、本拡張機能はそのアプリの
          <code>/api/settings</code> から <strong>ユーザー自身のログインセッション</strong> を使って秘書名・アバターURLを取得します。
          これはユーザー自身がブラウザで開いた秘書アプリの設定を、拡張機能のUIに反映するための処理です。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">5. 第三者への提供</h2>
        <p>ユーザーのデータを第三者に提供することは <strong>一切ありません</strong>。広告目的でデータを使用することもありません。</p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">6. 通知（任意機能）</h2>
        <p>
          スマホ通知に ntfy.sh を使用する場合、ユーザーが設定した「トピック名」宛にメッセージが送信されます。
          このトピック名は ntfy.sh のサーバーを経由して、ユーザーがインストールしたスマホアプリに届きます。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">7. サイトのブロック判定（拡張機能）</h2>
        <p>
          拡張機能はユーザーが現在開いているタブの URL を読み取り、ブロックリストに該当するかを <strong>ローカルで判定</strong> します。
          URL 情報を外部に送信することはありません。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">8. データの削除</h2>
        <p>
          拡張機能のアンインストールにより、ブラウザ内に保存されたデータはすべて削除されます。
          秘書AI Web アプリの会話履歴・タスク等を削除したい場合は、お問い合わせください。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">9. お問い合わせ</h2>
        <p>本ポリシーに関するご質問・不具合報告は、提供元（運営者）までご連絡ください。</p>

        <div className="text-center mt-12">
          <Link href="/welcome" className="text-sm text-purple-700 underline">← トップへ戻る</Link>
        </div>
      </article>
    </main>
  );
}
