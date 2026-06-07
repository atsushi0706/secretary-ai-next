# 秘書AI 清瀬リンク (Next.js 版)

朝夜に話しかけてくる秘書AI + タスクボード + 月間カレンダー。
Next.js 16 + Vercel + Supabase + Google OAuth + Gemini API。

## 受取人のセットアップ（無料SaaS版）

1. このアプリのURLにアクセス
2. **Google アカウントでログイン**（Calendar / Tasks / Gmail / Drive に接続）
3. 設定画面で **Gemini APIキー** を入力（[Google AI Studio で無料発行](https://aistudio.google.com/apikey)・1,000回/日まで無料）
4. 自分のカレンダー/タスクが読み込まれて秘書AIが起動

## 主な機能

- 🗂️ **タスクボード**: 4カテゴリ（🔴 今すぐ / 🟡 重要だが後で / 🟢 自分時間 / 🔵 作業時間別）
- 💬 **チャット**: 秘書AI「清瀬リンク」と会話、時刻バッジ付き時間割
- 📅 **月間カレンダー**: Google カレンダーを月単位で表示
- 📎 **画像→タスク**: メールスクショ等をアップ → Gemini Vision で自動抽出
- 🤖 **自動判別**: 朝/夜モードを時刻で自動切替
- 🗣 **入れといて自動追加**: 「これ入れといて」と言うとGoogleタスクに自動追加
- 📲 **PWA対応**: ホーム画面に追加してアプリ化

## 運営者向けセットアップ（このサービスをホストする側）

### 1. Supabase プロジェクト作成
- https://supabase.com → New project
- Project URL と service_role キーをメモ
- SQL Editor で `supabase/schema.sql` を実行

### 2. Google Cloud で OAuth クライアント作成
- https://console.cloud.google.com → APIとサービス → 認証情報
- OAuth 2.0 クライアント ID（種類: ウェブアプリ）
- 承認済みリダイレクト URI: `https://<your-app>.vercel.app/api/auth/callback/google`
- Client ID と Secret をメモ
- 必要な API を有効化: Calendar / Tasks / Gmail / Drive

### 3. Vercel デプロイ
- このリポを GitHub に push → Vercel で Import
- 環境変数を設定（`.env.example` 参照）：
  - `AUTH_SECRET` ← `openssl rand -base64 32`
  - `NEXTAUTH_URL` ← Vercel のURL
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY` ← 任意（個人ユーザーはBYO）

## ローカル開発

```bash
npm install
cp .env.example .env.local
# .env.local を編集
npm run dev
```

## アーキテクチャ

```
[ブラウザ/スマホ PWA]
     ↓
[Next.js App on Vercel]
     ↓
[Supabase (Postgres)] ← ユーザー設定/会話履歴/タスクラベル
[Google APIs] ← 各ユーザーの認証で
[Gemini API] ← 各ユーザーのAPIキーで
[ntfy.sh] ← 通知（任意）
```

