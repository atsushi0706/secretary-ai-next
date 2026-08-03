# Chrome Web Store 申請用素材ガイド

## 必要な画像一覧

| 種別 | サイズ | 必須 | 用途 |
|---|---|---|---|
| アイコン | 16/48/128px (256も推奨) | ✅ | manifest + Web Store メイン |
| 小プロモーションタイル | 440×280 | ✅ | 検索結果 |
| 大プロモーションタイル | 920×680 | 任意 | 特集ページ |
| マーキー | 1400×560 | 任意 | トップ特集 |
| スクリーンショット | 1280×800 | ✅(最低1枚, 最大5枚) | 詳細ページ |

## 生成方法

1. このフォルダの `assets/generate-png.html` を **Chrome で直接開く**
   （ダブルクリック / または `file:///` で開く）
2. ページが表示される（プレビュー付き）
3. 上部の緑色「**📥 全部一括ダウンロード**」ボタンを押す
4. ダウンロードフォルダに以下のPNGが保存される:
   - `icon-16-16x16.png`
   - `icon-48-48x48.png`
   - `icon-128-128x128.png`
   - `icon-256-256x256.png`
   - `promo-small-440x280.png`
   - `promo-large-920x680.png`
   - `promo-marquee-1400x560.png`

## アイコンを拡張機能本体に反映する

ダウンロードした `icon-128-128x128.png` を `chrome-extension/icons/icon128.png`
に上書きすれば、Chrome ツールバーやサイドパネルのアイコンも新ロゴになります。

```powershell
copy icon-128-128x128.png ..\icons\icon128.png
```

## スクリーンショット（淳くんが撮影）

`generate-png.html` で生成できないので、実際の動作画面を撮ってください。

### 推奨5枚

1. **メインダッシュボード** - 朝の挨拶+時間割が出てる状態
2. **サイドパネル + メインタブ** - 別サイトを見ながら秘書UIが右にある状態
3. **フローティングタイマー** - 集中モードON、ピピッ音つきポモドーロ動作中
4. **ブロック画面** - X や YouTube を開こうとして紫の「集中タイム中」が出てる状態
5. **設定画面** - 秘書のカスタマイズ＋Gemini キー欄

### 撮影方法

1. Chrome の Window サイズを 1280×800 に
   - F12 → Device toolbar → "Responsive" → 1280×800 にセット → "Capture screenshot"
2. または Windows の Snipping Tool で範囲指定
3. PNG 形式で保存

### 画像ファイル命名

```
screenshot-1-dashboard.png
screenshot-2-quest.png
screenshot-3-floating-timer.png
screenshot-4-blocked.png
screenshot-5-settings.png
```

## Chrome Web Store 申請の流れ

1. https://chrome.google.com/webstore/devconsole/ にアクセス
2. Google ログイン → デベロッパー登録（**$5 一回のみ**）
3. 「New item」をクリック
4. `chrome-extension/package-zip.ps1` で生成した `focus-secretary-extension.zip` をアップロード
5. 各項目を入力:
   - **アイコン**: `icon-128-128x128.png`
   - **小プロモーションタイル**: `promo-small-440x280.png`
   - **スクリーンショット**: 上で撮った 1280×800 のPNG x 1〜5枚
   - **詳細説明**: 下記テンプレを参照
   - **カテゴリ**: 「仕事効率化」
   - **言語**: 日本語
   - **プライバシーポリシー**: GitHub の `chrome-extension/PRIVACY.md` の Raw URL
6. レビュー申請 → 数日〜2週間で承認

## 詳細説明テンプレート

```
仕事中に X / YouTube / Threads などを見ちゃう…そんな自分を物理的に止める拡張機能。

【主な機能】
🎯 集中モード: ボタン1つで指定サイトをブロック
🍅 自動ポモドーロ: 30分集中 → 5分休憩を自動ループ、開始時に音で知らせる
⏰ 常駐タイマー: どのタブを開いても画面右下に残り時間が見える
📑 タブ上限: 開きすぎを自動で防ぐ
📌 サイドパネル: 秘書AIアプリを Chrome の横に常駐表示
✋ 時間割表示: 今何をやる時間かを画面上に常時表示

【秘書AI連動】
secretary-ai-next.vercel.app で会話して組んだ時間割を、ワンクリックで
拡張機能に同期できます。秘書AIと一緒に使うと真価を発揮します。

【プライバシー】
すべてのデータはあなたのブラウザ内のみで管理されます。
外部サーバーには一切送信されません(詳細はプライバシーポリシー参照)。
```
