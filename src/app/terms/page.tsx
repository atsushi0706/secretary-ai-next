import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "利用規約 — Singa World",
  description: "Singa World（秘書AI Web アプリ）の利用規約",
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-purple-800 mt-4 mb-2">利用規約</h1>
        <p className="text-sm text-gray-500 mb-8">最終更新: 2026-07-30</p>

        <section className="bg-white/70 border border-purple-100 rounded-2xl p-6 mb-6 leading-relaxed">
          <p>
            本規約は、Singa World（<code>singaworld.rinq-systeme.jp</code> で提供する秘書AIアプリおよび
            インナーワールド。以下「本サービス」）の利用条件を定めるものです。
            本サービスを利用された方は、本規約に同意したものとみなします。
          </p>
        </section>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">1. 本サービスの内容</h2>
        <p>本サービスは、次の機能を提供します。</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>予定とタスクの整理・時間割の提案（Google カレンダー / Google ToDo リストと連携）</li>
          <li>AI との対話による日々の振り返り・目標整理</li>
          <li>自己理解のためのワーク（インナーワールド）と、その記録の保存・可視化</li>
          <li>音声入力によるテキスト化</li>
          <li>任意のプッシュ通知（朝夜の声かけ等）</li>
        </ul>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">2. Google アカウントとの連携</h2>
        <p>
          本サービスは、ユーザーの明示的な許可のもとで Google アカウントに接続し、
          <strong>Google カレンダーおよび Google ToDo リスト</strong>のみを利用します。
          利用目的は、予定・タスクの読み取りと、ユーザーの指示に基づく登録・更新・削除に限られます。
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Gmail の本文、Google ドライブのファイル、連絡先には一切アクセスしません。</li>
          <li>取得した情報を広告目的で利用したり、第三者に販売・貸与することはありません。</li>
          <li>連携はいつでも <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-purple-700 underline">Google アカウントの権限設定</a> から解除できます。</li>
        </ul>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">3. AI の利用と API キー</h2>
        <p>
          AI 応答の生成には、ユーザー自身が設定した AI の API キー（Gemini 等）、
          または運営が用意した AI サービスを利用します。ユーザーが登録した API キーは、
          そのユーザーの応答生成のためにのみ使用します。
        </p>
        <p className="mt-2">
          AI の出力は参考情報であり、正確性・完全性を保証しません。医療・法律・投資その他の専門的判断は、
          必ず資格を持つ専門家にご相談ください。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">4. 音声入力について</h2>
        <p>
          音声入力は、ユーザーがマイクボタンを押している間のみ録音し、文字化のために AI サービスへ送信します。
          音声データはサーバーに保存せず、処理後に破棄します。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">5. 禁止事項</h2>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>法令または公序良俗に違反する行為</li>
          <li>他者の権利を侵害する行為、他者へのなりすまし</li>
          <li>本サービスの運営を妨害する行為（過度な自動アクセス等）</li>
          <li>本サービスのリバースエンジニアリング、および出力を用いた競合 AI の学習</li>
        </ul>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">6. データの保存と削除</h2>
        <p>
          会話・ワークの記録・設定は、ユーザーごとに分離して保存されます。他のユーザーが閲覧することはできません。
          データの書き出しはアプリ内の「控えを取る」から行えます。
          アカウントおよびデータの削除をご希望の場合は、下記の連絡先までご連絡ください。速やかに削除します。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">7. 免責事項</h2>
        <p>
          本サービスは現状有姿で提供されます。通信環境、外部 API の障害・仕様変更等により、
          一時的に利用できない場合があります。本サービスの利用または利用できないことから生じた損害について、
          運営は責任を負いません。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">8. 規約の変更</h2>
        <p>
          本規約は必要に応じて変更することがあります。重要な変更がある場合は、本ページにて告知します。
        </p>

        <h2 className="text-xl font-bold text-purple-700 mt-8 mb-3">9. 連絡先</h2>
        <p>
          本サービスに関するお問い合わせ：
          <a href="mailto:affection.alice@gmail.com" className="text-purple-700 underline">affection.alice@gmail.com</a>
        </p>

        <div className="mt-10 flex gap-4 text-sm">
          <Link href="/privacy" className="text-purple-700 underline">プライバシーポリシー</Link>
          <Link href="/welcome" className="text-purple-700 underline">トップに戻る</Link>
        </div>
      </article>
    </main>
  );
}
