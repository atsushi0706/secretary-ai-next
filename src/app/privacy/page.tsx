import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "プライバシーポリシー — Singa World",
  description: "Singa World（Chrome 拡張機能 + 秘書AI Web アプリ）のプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f5f3fb] via-[#ecf2fb] to-white">
      <header className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/welcome" className="flex items-center gap-2">
          <Image src="/kiyose.png" alt="" width={32} height={32} className="rounded-full border border-purple-200" />
          <span className="font-bold text-lg text-purple-700" style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: ".03em" }}>Singa World</span>
        </Link>
        <Link href="/welcome" className="text-sm text-purple-700 underline">← トップに戻る</Link>
      </header>

      <article className="max-w-3xl mx-auto px-6 pb-20 prose prose-purple">
        <h1 className="text-3xl font-bold text-purple-800 mt-4 mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-gray-500 mb-8">最終更新: 2026-08-03</p>

        <section className="bg-white/70 border border-purple-100 rounded-2xl p-6 mb-6 leading-relaxed">
          <p>
            Singa World（Chrome 拡張機能および <code>singaworld.rinq-systeme.jp</code> の秘書AIアプリ。以下「本サービス」）は、
            ユーザーのプライバシーを最大限尊重します。本ページでは取り扱うデータと、その範囲・送信先を明記します。
          </p>
        </section>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">1. Chrome 拡張機能が扱うデータ</h2>
        <p>本拡張機能は以下のデータを <strong>ユーザーのブラウザ内（chrome.storage.local）のみに保存</strong> します。外部サーバーに送信することはありません。</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>集中モード ON/OFF 状態</li>
          <li>タブ上限値</li>
          <li>ブロックリスト（ユーザーが入力したドメイン名）</li>
          <li>タイマーのモードと状態・設定（集中時間・休憩時間・退治する時間）</li>
          <li>今日の集中時間累積と、退治した数</li>
          <li>「いま何をする時間か」の一言、退治する対象の名前（ユーザーが入力）</li>
          <li>時間割テキスト（任意・ユーザーが入力）</li>
          <li>秘書名・アバター画像URL（秘書アプリと連携時のみ取得）</li>
        </ul>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">2. 秘書AI Web アプリが扱うデータ</h2>
        <p>本アプリは Google ログイン経由で以下の情報にアクセスします。</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Google Calendar</strong>: 今日の予定の表示・登録</li>
          <li><strong>Google Tasks</strong>: タスクの作成・更新・削除</li>
        </ul>
        <p className="mt-3">取得した情報は AI 秘書の応答生成にのみ使用し、第三者には提供しません。会話履歴は Supabase に保存され、ユーザー本人のみがアクセスできます。</p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">2-1. Google ユーザーデータの限定的使用（Limited Use）</h2>
        <p>
          本サービスによる Google API から取得した情報の使用および他アプリへの移送は、
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer"
             className="text-purple-700 underline">Google API Services User Data Policy</a>
          （<strong>Limited Use requirements</strong> を含む）に準拠します。具体的には次のとおりです。
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>取得したカレンダー・タスクの情報は、<strong>ユーザー本人に機能を提供する目的にのみ</strong>使用します。</li>
          <li>広告目的で使用・販売することは<strong>一切ありません</strong>。</li>
          <li>人間が内容を読むことはありません。ただし、ユーザー本人の明示的な許可を得た場合、
              セキュリティ上必要な場合、法令上必要な場合、および集計・匿名化して内部の運用に用いる場合を除きます。</li>
          <li>AI モデルの学習には使用しません。</li>
          <li>第三者に譲渡・提供しません。</li>
        </ul>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">2-2. なぜこの権限が必要か</h2>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Google Calendar</strong>（閲覧・編集）… 今日の空き時間を読んで一日の組み立てを提案し、
              ユーザーが決めた予定をその場で登録するため。読み取りだけでは登録ができないため、編集権限が必要です。</li>
          <li><strong>Google Tasks</strong>（閲覧・編集）… 会話から出てきたやることをタスクとして作成し、
              完了・削除を反映するため。</li>
        </ul>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">3. AI 応答の生成</h2>
        <p>
          ユーザーが Gemini API キーを設定した場合、その API キーは暗号化して保存され、
          ユーザー自身の応答生成（Google Gemini API）にのみ使用します。
          API キーの内容を第三者に開示することはありません。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">4. 秘書アプリとの連携（拡張機能）</h2>
        <p>
          <code>singaworld.rinq-systeme.jp</code> ドメインを開いている時のみ、本拡張機能はそのアプリの
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

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">8. 連携の解除とデータの削除</h2>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>
            <strong>Google 連携の解除</strong>：
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer"
               className="text-purple-700 underline">Google アカウントの「サードパーティ製アプリとサービス」</a>
            から、いつでも本サービスのアクセス権を取り消せます。取り消した後は、カレンダー・タスクへ一切アクセスできなくなります。
          </li>
          <li>
            <strong>アプリ内データの削除</strong>：アプリの
            <Link href="/reset" className="text-purple-700 underline">リセット</Link>
            から、保存された会話・記録を削除できます。全件の削除をご希望の場合は、下記の連絡先までご連絡いただければ対応します。
          </li>
          <li>
            <strong>拡張機能のデータ削除</strong>：拡張機能をアンインストールすると、
            ブラウザ内（chrome.storage.local）に保存されたデータはすべて削除されます。
          </li>
        </ul>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">9. お問い合わせ</h2>
        <p>
          本ポリシーに関するご質問、データ削除のご依頼、不具合のご報告は、
          <a href="mailto:affection.alice@gmail.com" className="text-purple-700 underline">affection.alice@gmail.com</a>
          までご連絡ください。
        </p>

        <div className="text-center mt-12">
          <Link href="/welcome" className="text-sm text-purple-700 underline">← トップへ戻る</Link>
        </div>
      </article>
    </main>
  );
}
