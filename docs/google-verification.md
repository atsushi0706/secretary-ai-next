# Google OAuth 審査（確認）の出しかた

このアプリが実際に要求しているものと、審査で出すものを、コードから確かめて書いた。
推測は入れていない（スコープは `src/auth.ts` の `SCOPES`、使い道は `src/lib/google.ts` から）。

---

## 1. 取るのは、この2つだけ

| スコープ | 種類 | CASA（有料の外部監査） |
|---|---|---|
| `https://www.googleapis.com/auth/calendar` | **機密（Sensitive）** | **不要** |
| `https://www.googleapis.com/auth/tasks` | **機密（Sensitive）** | **不要** |

そのほかに `openid` / `email` / `profile` を取っているが、これは
**申請の対象外**（誰でも使える基本のもの。審査で説明する必要はない）。

### CASA は要らない
Gmail の中身を読むスコープ（`gmail.readonly` など）は「制限付き（Restricted）」で、
CASA という有料の外部監査（数十万円）が要る。
**このアプリは Gmail を1つも使っていない。**
`src/auth.ts` にも「将来 Gmail を実装するなら CASA が必要になる」と注意書きが残っている。
だから今回は **動画と説明文だけで通る**。

---

## 2. 出す前に、揃っているか（ぜんぶ確認ずみ）

| 要るもの | いまの状態 |
|---|---|
| ホームページ（ログイン無しで見られる） | ○ `https://singaworld.rinq-systeme.jp/welcome`（未ログインは自動でここへ） |
| プライバシーポリシー（ログイン無しで見られる） | ○ `https://singaworld.rinq-systeme.jp/privacy` |
| 利用規約 | ○ `https://singaworld.rinq-systeme.jp/terms` |
| Limited Use の明記 | ○ プライバシーポリシーに記載あり |
| ドメインの所有権 | **要確認**（下の 3-2） |
| デモ動画 | **これから撮る**（下の 5） |

> Google は「ホームページがログイン画面だけ」だと落とす。
> このアプリは未ログインだと `/welcome` に行くようにしてあるので、そこは満たしている。

---

## 3. Google Cloud Console でやること

### 3-1. OAuth 同意画面
`https://console.cloud.google.com/auth/branding`

- アプリ名：**SINGA WORLD**
- ユーザーサポートメール：affection.alice@gmail.com
- アプリのロゴ：正方形の画像（120×120 以上）
- アプリのホームページ：`https://singaworld.rinq-systeme.jp/welcome`
- プライバシーポリシー：`https://singaworld.rinq-systeme.jp/privacy`
- 利用規約：`https://singaworld.rinq-systeme.jp/terms`
- 承認済みドメイン：`rinq-systeme.jp`
- デベロッパーの連絡先：affection.alice@gmail.com

### 3-2. ドメインの所有権（ここで止まる人が多い）
`https://search.google.com/search-console` で `rinq-systeme.jp` を登録して確認する。
**Console と同じ Google アカウントで**やること。違うアカウントだと承認済みドメインに追加できない。

### 3-3. スコープを選ぶ
`https://console.cloud.google.com/auth/scopes` →「スコープを追加または削除」

チェックするのは **この2つだけ**：
- [x] `.../auth/calendar`　（Google Calendar API / See, edit, share, and permanently delete all the calendars）
- [x] `.../auth/tasks`　（Tasks API / Create, edit, organize, and delete all your tasks）

`openid` `email` `profile` は既に入っている（触らなくていい）。
**それ以外は1つもチェックしない。**余計なものを入れると、その説明も求められて審査が長引く。

### 3-4. 審査に出す
`https://console.cloud.google.com/auth/verification` →「確認のために送信」

---

## 4. 貼りつける説明文

### 4-1. アプリの説明（App description）

**日本語**
> SINGA WORLD は、日々の内省と行動を結びつける個人向けのセルフコーチング Web アプリです。
> 対話を通して「今日やる一手」を決め、それを Google ToDo リストに登録し、
> 使える時間を Google カレンダーの予定から判断して、無理のない一日の組み立てを提案します。

**English**
> SINGA WORLD is a personal self-coaching web app that connects daily reflection with real action.
> Through a guided conversation, the user decides one concrete step for the day. The app saves that
> step to their Google Tasks list, and reads their Google Calendar to see how much time they
> actually have, so it can suggest a realistic plan for the day.

### 4-2. `auth/calendar` の理由（Scope justification）

**English（そのまま貼る）**
> Our app helps users turn their intentions into a realistic daily schedule.
>
> **Read:** We read the user's calendar events for the current and next few days to know how much
> free time they actually have. Without this, the app cannot tell whether a plan fits into their day,
> and every suggestion would be guesswork.
>
> **Write:** When the user explicitly asks (for example, "put a 30-minute focus block at 10am"),
> the app creates that event on their calendar. The user always states the request in their own words
> first; we never create events automatically or in the background.
>
> **Delete:** The user can ask to remove an event the app created (for example, "cancel that focus
> block"). This is only performed on direct user instruction.
>
> We only access the user's own calendars. We do not share calendar data with any third party,
> and we do not use it for advertising or for training AI models.
> The narrower `calendar.readonly` scope is not sufficient because creating and removing schedule
> blocks on request is a core feature of the app.

**日本語（Console が日本語表示のとき用）**
> 本アプリは、ユーザーが決めた「今日の一手」を現実的な一日の予定に落とし込むことを目的としています。
> **読み取り**：当日と数日先の予定を読み、実際に空いている時間を把握します。これが無いと、
> 提案がその人の一日に収まるかどうかを判断できません。
> **書き込み**：ユーザーが自分の言葉で依頼したとき（例「10時に30分の集中時間を入れて」）にだけ、
> 予定を作成します。自動・バックグラウンドでの作成は行いません。
> **削除**：アプリが作成した予定を、ユーザーの指示があったときにだけ削除します。
> 取得するのは本人のカレンダーのみです。第三者への提供、広告利用、AIの学習利用は一切行いません。
> 予定の作成・削除が中核機能のため、`calendar.readonly` では要件を満たせません。

### 4-3. `auth/tasks` の理由（Scope justification）

**English（そのまま貼る）**
> The core outcome of our app is that the user leaves with one concrete next action.
>
> **Write:** When the user confirms a step (for example, "add: call the clinic"), we create it in
> their Google Tasks list so it appears in the tools they already use. Tasks are only created after
> the user picks them from a list of candidates — we never create tasks automatically.
>
> **Read:** We read their task list to show what is still open, and to avoid suggesting something
> they have already written down.
>
> **Update / Delete:** The user can mark a task done, reopen it, or delete it from within our app.
> These are performed only on direct user action.
>
> We only access the user's own task lists. We do not share this data with any third party,
> and we do not use it for advertising or for training AI models.
> A read-only scope is not sufficient because writing the decided step back into the user's own
> task list is the whole point of the app.

**日本語**
> 本アプリの成果は「次にやる具体的な一手が決まって終わること」です。
> **書き込み**：ユーザーが確定した一手を、普段使っている Google ToDo リストに登録します。
> 候補を提示し、**ユーザーが選んだものだけ**を登録します。自動登録は行いません。
> **読み取り**：未完了のタスクを表示し、すでに書いてあることを重ねて提案しないために読みます。
> **更新・削除**：アプリ内から完了・未完了に戻す・削除ができます。いずれも本人の操作時のみです。
> 取得するのは本人のリストのみ。第三者提供・広告利用・AI学習利用は行いません。
> 決めた一手を本人のリストに書き戻すことが目的そのものなので、読み取り専用では成立しません。

---

## 5. デモ動画（ここが審査の山）

YouTube に**限定公開**（Unlisted）で上げて、そのURLを貼る。
5分以内。声は無くていい（字幕や画面の文字で伝わればよい）。

### 撮る順番（この順でないと落ちる）

1. **ブラウザのアドレスバーに `singaworld.rinq-systeme.jp` が映っている状態から始める**
   → 「申請したアプリと同じものだ」と分かるように。URLは常に見えるようにしておく
2. **ログアウトした状態**でトップを開く（`/welcome` が出る）
3. 「Googleでログイン」を押す
4. **Google の同意画面を、途中で切らずに全部映す**
   - アプリ名が出ているところ
   - **「カレンダー」と「ToDo リスト」の権限が並んでいるところをはっきり映す**（ここが一番大事）
   - 「続行」を押すところまで
5. **カレンダーを読むところ**：今日の予定が画面に出ているのを映す
6. **カレンダーに書くところ**：「◯時に◯◯を入れて」と話しかけ → 予定ができる →
   **Google カレンダー側を開いて、実際に入っていることを見せる**
7. **ToDo を書くところ**：一手を決めて登録 →
   **Google ToDo リスト側を開いて、実際に入っていることを見せる**
8. **ToDo を読む・完了するところ**：アプリ内で完了にする
9. **消せることを見せる**：設定画面で連携を解除できる／データを消せるところを映す

### 撮り方
スマホでもパソコンでもいい。パソコンなら Windows の `Win + Alt + R` で画面録画できる。
**Google のログイン操作は自動化できない**（Googleが自動操作を弾く）ので、
ここは淳くんが手で操作して録るしかない。

---

## 6. 落ちる原因、上位3つ

1. **同意画面の権限一覧が動画に映っていない** … いちばん多い。必ず全部映す
2. **ホームページがログイン画面だけ** … これは対応ずみ（`/welcome`）
3. **申請したスコープを使う場面が動画に無い** … カレンダーとToDoの**両方**、
   しかも**読み・書き**の両方を映す

---

## 7. 待ち時間

機密スコープだけなら、だいたい **2〜6週間**。
返信が来たら、たいてい追加質問が1回来る。そこで止まらず返せば通る。
審査の間も、**テストユーザーに登録した人（最大100人）はこれまで通り使える。**
いま使ってくれている人が止まることはない。
