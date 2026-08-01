import Link from "next/link";
import Image from "next/image";
import { RefCatch } from "./RefCatch";

export const metadata = {
  title: "Singa World — AIとの対話で予定とタスクを整理する秘書アプリ",
  description: "Singa World は、AI秘書との会話で「やること」を整理し、Google カレンダーと Google ToDo リストに自動で振り分けるWebアプリです。",
};

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f5f3fb] via-[#ecf2fb] to-white">
      <RefCatch />
      {/* ヘッダー */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/kiyose.png" alt="" width={32} height={32} className="rounded-full border border-purple-200" />
          <span className="font-bold text-lg text-purple-700" style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: ".03em" }}>Singa World</span>
        </div>
        <Link
          href="/login"
          className="text-sm bg-[var(--accent)] text-white font-bold px-4 py-2 rounded-lg hover:opacity-90"
        >
          ログイン
        </Link>
      </header>

      {/* ヒーロー */}
      <section className="max-w-4xl mx-auto px-6 pt-12 pb-16 text-center">
        <div className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
          Googleログインだけで始められる
        </div>
        {/* アプリ名は h1 で独立させる（説明文と連結すると、確認時に名前が識別されない） */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-3"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: ".04em" }}>
          Singa World
        </h1>
        <p className="text-xl sm:text-2xl font-bold text-gray-800 leading-snug mb-4">
          AIとの対話で1日の予定とタスクを整理する<br className="hidden sm:block" />
          <span className="text-[var(--accent)]">パーソナル秘書アプリ</span>
        </p>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-8">
          <strong>Singa World は、AI秘書との会話で「やること」を整理し、Google カレンダーと Google ToDo リストに
          自動で振り分けるWebアプリです。</strong><br className="hidden sm:block" />
          所要時間と優先度をAIが聞き返しながら、その日に実行できる時間割を一緒に組み立てます。<br />
          作業中はタイマーで進捗を見守り、1日の終わりには振り返りをサポートします。
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="block w-full sm:w-auto bg-[var(--accent)] text-white font-bold py-3 px-8 rounded-xl shadow hover:opacity-90 text-base"
          >
            🚀 Googleで始める（無料）
          </Link>
          <a
            href="#how"
            className="text-sm text-purple-700 hover:underline"
          >
            使い方を見る ↓
          </a>
        </div>
        <div className="mt-6 text-xs text-gray-500">
          ※ Gemini API キー（無料1,000回/日）を別途取得していただきます
        </div>
      </section>

      {/* 3つの特徴 */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Feature
            emoji="🎤"
            title="会話で全部終わる"
            desc="「これ入れといて」「○○消して」「明日10時に新宿で打合せ」と話すだけで、タスク・予定が自動で登録。所要時間も自然に聞き返してくれる。"
          />
          <Feature
            emoji="🎯"
            title="集中モードで物理ブロック"
            desc="Chrome拡張機能をONにすれば、X・YouTube・Threadsなど指定サイトを自動でブロック。30分→5分休憩のポモドーロが自動で走る。"
          />
          <Feature
            emoji="📅"
            title="カレンダー＆タスク連動"
            desc="Googleカレンダー・Googleタスクと双方向に同期。今日の時間割を組むときも固定予定を必ず最初に置いて、空き時間にタスクを差し込む。"
          />
        </div>
      </section>

      {/* 使い方ステップ */}
      <section id="how" className="bg-white border-y border-purple-100 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-10">
            セットアップは <span className="text-[var(--accent)]">5分</span>で終わります
          </h2>
          <ol className="space-y-5">
            <Step n={1} title="Googleでログイン">
              「Googleで始める」ボタンを押す。カレンダー・タスク・Driveの読み取り権限を許可してください。データは個人ごとに完全分離されます。
            </Step>
            <Step n={2} title="呼ばれたい名前を入力">
              「淳くん」「Mike」など、秘書から呼んでほしい名前を1つ。
            </Step>
            <Step n={3} title="Gemini API キーを取得（無料）">
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-purple-700 underline">Google AI Studio</a> で「Create API key」を押すだけ。1日1,000回まで無料、課金デフォルトOFF。
            </Step>
            <Step n={4} title="（任意）Chrome拡張機能を追加">
              集中モード・タブ上限・タイマーが使いたい人向け。配布された zip をデベロッパーモードで読み込むだけ。
            </Step>
            <Step n={5} title="話しかけて始める">
              「おはよう」と言うと秘書が今日の時間割を一緒に組み立て始めます。
            </Step>
          </ol>
          <div className="mt-10 text-center">
            <Link
              href="/login"
              className="inline-block bg-[var(--accent)] text-white font-bold py-3 px-8 rounded-xl shadow hover:opacity-90"
            >
              いま始める →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-8">よくある質問</h2>
        <div className="space-y-4">
          <Faq q="本当に無料で使えますか？">
            アプリ本体は無料です。AIは Gemini の無料枠（1日1,000回）を使うので、普通に使う分には課金されません。
          </Faq>
          <Faq q="データは安全ですか？">
            Googleアカウントごとに完全に分離されています。他のユーザーや運営からあなたのカレンダー・タスク・会話を見ることはできません。Gemini API キーもあなた専用のものを使います。
          </Faq>
          <Faq q="スマホでも使えますか？">
            Webブラウザで動くので iPhone / Android でも開けます。スマホ向けUIも順次最適化中です。
          </Faq>
          <Faq q="秘書の見た目や名前を変えられますか？">
            設定画面で「秘書の名前」「アバター画像（自分でアップロード）」「呼ばれたい名前」を自由にカスタマイズできます。
          </Faq>
          <Faq q="Chrome拡張機能は必須ですか？">
            必須ではありません。ただし「集中モード（指定サイトを物理ブロック）」「タブまたぎフローティングタイマー」が使いたい場合は入れてください。
          </Faq>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-purple-100 py-8 text-center text-xs text-gray-500">
        © Singa World — Powered by Claude &amp; Gemini
        {/* Google OAuth の確認要件：ホームページからプライバシーポリシー／利用規約へのリンクが必要
            （同意画面に設定したURLと完全に一致させる） */}
        <div className="mt-3 flex items-center justify-center gap-4">
          <a href="https://singaworld.rinq-systeme.jp/privacy" className="text-purple-700 hover:underline">
            プライバシーポリシー
          </a>
          <a href="https://singaworld.rinq-systeme.jp/terms" className="text-purple-700 hover:underline">
            利用規約
          </a>
          <Link href="/login" className="text-purple-700 hover:underline">ログイン</Link>
        </div>
      </footer>
    </main>
  );
}

function Feature({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
      <div className="text-3xl mb-2">{emoji}</div>
      <h3 className="font-bold text-base mb-1.5">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--accent)] text-white font-bold flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 pt-1">
        <div className="font-bold text-base mb-1">{title}</div>
        <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
      </div>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="bg-white border border-purple-100 rounded-lg group">
      <summary className="cursor-pointer p-4 font-bold text-sm flex items-center justify-between">
        <span>{q}</span>
        <span className="text-purple-500 group-open:rotate-180 transition">▼</span>
      </summary>
      <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{children}</div>
    </details>
  );
}
