# 淳くん専用セットアップガイド（帰宅後の作業）

僕（Claude）は手を出せない3か所だけ、順番に淳くんがやればOKです。
**所要時間：合計30〜45分**。全部Webブラウザ操作のみ。

---

## ✅ Phase 1: Supabase プロジェクト作成（5分）

### 1-1. アカウント作成 & プロジェクト作成
1. 👉 https://supabase.com/dashboard → **「Sign in with GitHub」**
2. **「New project」** ボタン
3. 入力:
   - Name: `secretary-ai`
   - Database Password: 適当に強いやつ生成（コピーしておく、後で使うことはほぼ無いが）
   - Region: **Northeast Asia (Tokyo)** がオススメ
   - Pricing: **Free**
4. 「Create new project」→ プロビジョニング待ち（2〜3分）

### 1-2. URL と service_role キーをメモ
プロジェクト画面 → **Settings → API**:
- **Project URL** （`https://xxxxx.supabase.co`）をメモ → これが `SUPABASE_URL`
- **Project API keys → service_role** の `secret` キーをメモ → これが `SUPABASE_SERVICE_ROLE_KEY`

⚠️ service_role キーは絶対に公開しないこと。

### 1-3. テーブル作成
左メニュー **「SQL Editor」** → 「New query」 → 下記のURLを開いて中身をコピペ → **「Run」**:
👉 https://github.com/atsushi0706/secretary-ai-next/blob/master/supabase/schema.sql

成功すれば「Success. No rows returned」。

---

## ✅ Phase 2: Google Cloud で OAuth 設定（10分）

### 2-1. プロジェクト選択
👉 https://console.cloud.google.com/
- すでに `secretary-ai` Streamlit版で使ってるプロジェクトを選択（同じプロジェクトを使い回せる）

### 2-2. リダイレクトURI追加
**APIとサービス → 認証情報** → 既存の OAuth 2.0 クライアントID（多分1つだけ）をクリック

**「承認済みのリダイレクトURI」** に2つ追加:
```
https://secretary-ai-next.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```
（Vercel URLは Phase 3 後に確定するけど、上記の名前で作る想定。違うURLになったら戻って修正）

**「承認済みのJavaScript生成元」** にも：
```
https://secretary-ai-next.vercel.app
http://localhost:3000
```

**「保存」**

### 2-3. Client ID と Secret をメモ
同じ画面の右上に表示されている：
- **クライアントID** → これが `GOOGLE_CLIENT_ID`
- **クライアントシークレット** → これが `GOOGLE_CLIENT_SECRET`

---

## ✅ Phase 3: Vercel デプロイ（10分）

### 3-1. Vercel に GitHub から import
👉 https://vercel.com/new
- GitHub アカウントでログイン（既にやってると思う）
- **「Import Git Repository」** で `atsushi0706/secretary-ai-next` を選ぶ
- **「Import」** クリック

### 3-2. 環境変数を入力
**「Environment Variables」** セクション展開して、以下を入力：

| Name | Value |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` で生成（または適当な32文字以上ランダム） |
| `NEXTAUTH_URL` | （後で更新するので一旦 `https://secretary-ai-next.vercel.app`） |
| `GOOGLE_CLIENT_ID` | Phase 2-3 のクライアントID |
| `GOOGLE_CLIENT_SECRET` | Phase 2-3 のシークレット |
| `SUPABASE_URL` | Phase 1-2 の Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Phase 1-2 の service_role キー |

### 3-3. デプロイ
**「Deploy」** ボタン → 3〜5分待つ → 完了画面で **公開URL** が出る（例: `https://secretary-ai-next-xxxx.vercel.app`）

### 3-4. URL確定後の調整（重要）
**もし Vercel URLが `secretary-ai-next.vercel.app` 以外だったら**：
1. Vercel ダッシュボード → Settings → Environment Variables → `NEXTAUTH_URL` を実際のURLに修正
2. Google Cloud（Phase 2-2）に戻って、リダイレクトURIに新URLを追加
3. Vercel → Deployments → 最新の「⋯」→ Redeploy

---

## ✅ Phase 4: 動作確認（5分）

1. Vercel の公開URLを開く
2. **「Googleでログイン」** → 自分のアカウントで認証
3. 設定画面に飛ぶ → **Gemini APIキー** を入力（[ここで発行](https://aistudio.google.com/apikey)）
4. 保存 → ホームに戻ると秘書AIが起動

完成🎉

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| ログイン後「redirect_uri_mismatch」 | Google Cloud のリダイレクトURIにVercel URLが入ってるか確認 |
| 「Supabase接続エラー」 | 環境変数 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` の確認 |
| 「Gemini APIエラー」 | 設定画面でAPIキーを再入力 |
| カレンダー/タスクが空 | Google認証時にスコープを全部許可したか確認、必要ならログアウト→再ログイン |

---

## 補足：旧Streamlit版（Render）はどうする？

しばらく**併走**でOK。Next.js版が安定して使えるようになったら、Render のサービスを Suspend or Delete してください。
- Streamlit版URL: `https://secretary-ai-4rc3.onrender.com`
- 旧 GitHub: `https://github.com/atsushi0706/secretary-ai`

