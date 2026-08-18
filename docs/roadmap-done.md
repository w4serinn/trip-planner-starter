# 完了タスク一覧

`docs/ROADMAP.md` で `[x]` になったサブタスクを、画面/機能の見出しごとにここへ退避する。
(evolve-SKILL.md 5節の手順に従い、完了した行単位で移動する。書き戻しはしない)

## 0. 基盤
- [x] (S) Firestoreセキュリティルール実装（`docs/firestore-design.md`のセキュリティ方針
      通り: get許可・list禁止、App Check有効化）→ `firestore.rules`/`firebase.json`/
      `firestore.indexes.json`。実プロジェクト未作成のためデプロイ自体は未実施(上記blocked参照)
- [x] (S) 合言葉生成ロジック(6〜8文字のランダム文字列、紛らわしい文字を除外) → `src/passphrase.js`
- [x] (S) デザイントークン仮決定(配色・フォント。`styles/tokens.css`にCSS変数として定義)
- [x] (M) 画面シェル実装: A(参加)→B(旅行一覧)→C(旅行詳細トップ)の骨組みと画面遷移 →
      `pages/index.html`(A)・`pages/trips.html`(B)・`pages/trip.html`(C)・
      `pages/shared.css`・`src/session.js`(名前・合言葉のセッション保持)。
      Firestore接続はまだ行わず、localStorageベースの画面遷移のみ(2026-08-17)
- [x] (S) Firestore読み書き用の共通モジュール(`src/firestore.js`)を作成。
      パスベースの汎用CRUD(`getDocument`/`setDocument`/`updateDocument`/
      `addDocument`/`listCollection`)を提供し、以降の機能タスクはこれを経由して
      Firestoreにアクセスする(2026-08-17)
- [x] (S) App Check初期化コード → `src/firebase-config.js`に`initializeAppCheck`+
      `ReCaptchaV3Provider`(サイトキー: 6LcCmIotAAAAAFWN5pOZSWxDizlmBj_FQzA-elwW)を追加。
      人間の指示により実装(2026-08-17)
- [x] (M) Vite導入(軽量バンドラー) → `npm install -D vite`、`package.json`に
      `dev`/`build`スクリプト追加、`vite.config.js`(A/B/C画面をマルチページ登録、
      GitHub Pages向け`base: '/trip-planner-starter/'`)を追加。ブラウザでの
      `firebase/app`等のbare import解決を確認。人間の指示により実装(2026-08-17)
- [x] (S) Firebaseプロジェクト作成・Firestore有効化(2026-08-18解消)。当初blockedの原因
      (App CheckがFirestoreアクセスを一律拒否)を追ったところ、真因は`firestore.rules`でも
      `src/firebase-config.js`でもなく、Firebase Console「App Check」→「APIs」→
      Cloud Firestoreの**「適用(Enforce)」**設定(`firestore.rules`の`isAppCheckValid()`とは
      独立したプラットフォーム層のゲート)だったと判明。App Check自体は
      `docs/firestore-design.md`「App Check導入の見送り」の通り撤回・Enforce解除し、
      Firestoreへの読み書きが成功することを確認済み(詳細は「1. A. 参加画面」参照)
- [x] (S) 自動テスト実行環境(vitest)を導入 → `npm install -D vitest`、`package.json`に
      `test`スクリプト追加・`check`に組み込み。`src/passphrase.js`に対する
      `src/passphrase.test.js`(文字数・文字種・範囲外エラーの5テスト)を追加(2026-08-18)

## 1. A. 参加画面
- [x] (S) 名前＋合言葉の入力フォーム
- [x] (S) 新規グループ作成(合言葉を発行して表示・コピー機能) → `pages/index.js`
      `issueUnusedGroupCode`(衝突チェック付き)＋コピー用UI(`#copy-code`)
- [x] (S) 既存グループへの参加(`groups/{code}`のget、members配列への追記) →
      `src/firestore.js`に`addToArray`(arrayUnionラッパー)を追加、`pages/index.js`の
      `join-form`から利用。同名での再参加でも`arrayUnion`により状態が壊れない
- [x] (S) 該当グループが存在しない場合のエラー表示 → `getDocument`が`null`を返した場合に
      `#error-text`へ表示

      実機能確認まで完了(2026-08-18)。原因調査の過程でApp Checkは
      `docs/firestore-design.md`「App Check導入の見送り」の通り撤回し、`firestore.rules`から
      `isAppCheckValid()`を削除してデプロイ済み(list禁止・合言葉6〜8文字の2層で運用)。

      **判明した真因**: `firestore.rules`の内容やコード側は終始正常だった。実際の原因は
      Firebase Console「App Check」→「APIs」→Cloud Firestoreの**「適用(Enforce)」**設定
      であり、これは`firestore.rules`の`isAppCheckValid()`(＝`request.app`をルール内で見る仕組み)
      とは全く別の、プラットフォーム層で独立して動くゲートだった。このEnforceが有効な間は、
      有効なApp Checkトークンを付けても(curl直叩き・実ブラウザSDKいずれでも)一律403で拒否され、
      ルールの内容を`if true`に変えても無関係に拒否され続けていた。人間がこのEnforceを解除した
      ところ、即座にトークン無しでの読み書きが成功するようになった。
      (もし将来App Checkを再導入する場合、`isAppCheckValid()`をルールに戻すだけでなく、
      このEnforce設定も合わせて有効化する必要がある点に注意)

      Playwright(ヘッドレスChromium)で新規作成→合言葉コピー→旅行一覧遷移、既存グループへの
      参加、同名での再参加(冪等性)、存在しないコードでのエラー表示の4パターンを実際に
      Firestoreへ読み書きした上で確認した。`npm run check`(lint)も成功。
- [x] (S) 新規グループ作成フォームに「作成用合言葉」入力欄(`#creator-secret`)を追加し、
      送信データに`creatorSecret`フィールドとして含めるよう変更(2026-08-18 設計変更対応)。
      `docs/firestore-design.md`「グループ作成方法の方針」の通り、作成用合言葉は
      コードに埋め込まず`firestore.rules`の`get()`で`config/adminSecret`ドキュメントと
      照合する方式に変更(`allow create: if request.resource.data.creatorSecret == get(...)`)。
      `config/adminSecret`自体はget/list/write全て禁止のままクライアントから直接読めない。
      不一致時は`permission-denied`エラーを検知し「作成用合言葉が正しくありません。」と表示。
      Playwrightで誤った合言葉での作成拒否・参加フロー継続動作を確認。正しい合言葉での
      作成成功も人間が実機で確認済み(`config/adminSecret`を誤って`groups`配下の
      サブコレクションとして作成していたのが最初の不具合原因。ルート直下に作り直して解消)。
      `npm run check`成功。

## 2. B. 旅行一覧画面
- [x] (S) グループ内の旅行一覧をカード表示(過去分含む) → `pages/trips.js`で
      `listCollection`を使い実装(createdAt降順ソート)
- [x] (S) 新規旅行の作成(`trips`サブコレクションへの追加) → `addDocument`で
      `name: '新しい旅行'`のトリップを作成しC画面へ遷移
- [x] (S) 旅行カードタップでC(旅行詳細トップ)へ遷移 → `trip.html?id={tripId}`への
      リンクとして実装

      検証用グループコードの提供を人間から受け、Playwrightで実機能確認まで完了(2026-08-18)。
      参加→旅行一覧(空状態表示)→新規旅行作成→C画面遷移(`新しい旅行`表示)→一覧に複数件
      カード表示→カードタップでC画面へ正しく遷移、の一連を実Firestoreで確認。`npm run check`
      (lint・test)成功。

## 3. C. 旅行詳細トップ画面
- [x] (S) 旅行名の表示・編集 → `pages/trip.js`でURLの`?id=`から`groups/{code}/trips/{id}`を
      取得・表示。「編集」ボタンでインライン編集フォームに切り替え、`updateDocument`で
      `name`フィールドを保存。空文字はバリデーションで拒否、キャンセルボタンで編集破棄。
      Playwrightで初期表示・編集保存・リロード後の永続化・空名前バリデーション・
      キャンセル動作を実Firestoreで確認(2026-08-18)。`npm run check`(lint・test)成功。
- [x] (S) 集合場所・時間の直接編集欄（Should） → `pages/trip.js`の`meeting-form`で
      `meetingPlace`・`meetingTime`・`meetingNote`をまとめて`updateDocument`で保存
- [x] (S) 割り勘リンク(warika)の直接編集欄（Should） → `pages/trip.js`の`warika-form`で
      `warikaUrl`を`updateDocument`で保存

      いずれも常時編集可能なフォーム(トグル無し)として`.card`セクションに実装。
      保存成功時は`.copy-feedback`スタイルで「保存しました。」を表示。Playwrightで
      入力→保存→リロード後の値の永続化を実Firestoreで確認(2026-08-18)。
      `npm run check`(lint・test)成功。
- [x] (S) D〜Hの各機能画面へのカードリンク → `pages/trip.js`の`featureLinks`配列に、
      4〜8章の各画面実装サイクルで対応するものから順に追加していき、H(しおり)の
      実装完了(2026-08-18)をもって全5画面(企画メモ・行き先決め・日程調整・宿泊・しおり)
      分のカードリンクが揃った。各カードは`{画面}.html?tripId={tripId}`へのリンクで、
      各画面の「戻る」で`trip.html?id={tripId}`に復帰する

## 4. D. 企画メモ画面
- [x] (S) メモの追加(投稿者名・本文・日時) → `pages/notes.html`・`notes.js`を新規作成し
      `vite.config.js`に登録。`groups/{code}/trips/{tripId}/planningNotes`へ
      `author`・`content`・`createdAt`(serverTimestamp)を`addDocument`
- [x] (S) メモの一覧表示(新しい順) → `listCollection`取得後にcreatedAt降順ソートして表示

      C画面(`trip.js`)に`featureLinks`配列でカードリンクを追加し
      `notes.html?tripId={tripId}`へ遷移、D画面の「戻る」で`trip.html?id={tripId}`に復帰。
      投稿直後は再取得(`listCollection`)せずローカルの一覧に楽観的に追加する実装にした
      (初回一覧取得の応答が投稿後の更新より遅れて届くと一覧が巻き戻る競合を
      Playwrightのテストで検出したため、初回取得完了まで投稿ボタンを無効化しつつ
      再取得自体をやめる設計に変更)。Playwrightで参加→旅行作成→カードリンクから
      D画面へ遷移→2件追加(新しい順で表示)→空メモのバリデーション→戻るリンク→
      リロード後の永続化を実Firestoreで確認(2026-08-18)。`npm run check`(lint・test)成功。

## 5. E. 行き先決め画面
- [x] (S) 候補地の追加(名前・メモ) → `pages/destinations.html`・`destinations.js`を
      新規作成し`vite.config.js`に登録。`groups/{code}/trips/{tripId}/destinations`へ
      `name`・`note`・`addedBy`・`addedAt`・`votes: {}`を`addDocument`
- [x] (M) ★1〜5の投票UI・自分の投票状態の表示 → 候補地ごとに★ボタン5個を表示し、
      クリックで`updateDocument`により`votes.{sanitizeMapKey(名前)}`を更新。
      自分の投票値まで★を塗って表示
- [x] (S) 平均スコアによる自動ランキング表示 → `votes`の値の平均で降順ソートし
      「n位」を付けて表示。未投票は平均0扱いで下位
- [x] (S) 投票者一覧の表示(誰が何点か) → `votes`のエントリを「名前: ★点数」で列挙

      名前をマップキーに使う際は`src/firestore.js`に追加した`sanitizeMapKey`で
      `.`/`/`等を置換(evolve SKILL.mdの注意事項に対応)。候補地追加・投票とも
      D画面と同様、初回取得完了まで投稿ボタンを無効化しつつ再取得せず楽観的に
      ローカル更新する設計。C画面(`trip.js`)の`featureLinks`に「行き先決め」を追加。
      Playwrightで2ユーザー(たろう・はなこ)による複数候補地への投票・平均スコアの
      再計算・ランキング入れ替わり・投票者一覧・リロード後の永続化・戻るリンクを
      実Firestoreで確認(2026-08-18)。`npm run check`(lint・test)成功。

## 6. F. 日程調整画面
- [x] (M) 日付ごとの○×△入力UI(カレンダー形式) → `pages/schedule.html`・`schedule.js`を
      新規作成し`vite.config.js`に登録。`<input type="date">`で候補日を追加し
      (`groups/{code}/trips/{tripId}/scheduleEntries/{date}`をドキュメントID=日付で作成)、
      各候補日に○/△/×の3ボタンで自分の回答を`responses.{sanitizeMapKey(名前)}`に保存
- [x] (S) メンバーごとの回答一覧表示 → `responses`のエントリを「名前: 記号」で列挙
- [x] (S) 全員の回答が揃った日をハイライトする等の見やすさ対応 →
      `groups/{code}`の`members.length`と回答者数を比較し、全員回答済みなら
      `.schedule-complete`(左ボーダー強調)＋「全員回答済み」バッジを表示

      候補日の重複追加はチェックして拒否。ドキュメント作成には`src/firestore.js`に
      追加した`setDocumentMerged`(`setDoc`+`merge:true`)を使用し、
      docs/firestore-design.md「日程調整(scheduleEntries)」の設計判断
      (複数人の同時書き込みに強いマージ書き込み)通りに実装。C画面(`trip.js`)の
      `featureLinks`に「日程調整」を追加。Playwrightで実際に8名(グループの全メンバー数)
      が同一候補日に順に回答し、全員回答済みハイライトが表示されることを実Firestoreで
      確認(2026-08-18)。`npm run check`(lint・test)成功。

## 7. G. 宿泊画面
- [x] (S) 宿泊候補の追加(URL・メモ)（Must） → `pages/lodging.html`・`lodging.js`を
      新規作成し`vite.config.js`に登録。`groups/{code}/trips/{tripId}/lodgingCandidates`へ
      `url`・`note`・`addedBy`・`addedAt`を`addDocument`
- [x] (S) 宿泊候補の一覧表示（Must） → `listCollection`取得後addedAt降順で表示。
      URLはクリック可能なリンク(`target="_blank"`)として表示し、投票UIは持たない
      (docs/requirements.md 7-3「投票機能を持たない」の通り)

      候補追加はD/E/F画面と同様、初回取得完了まで投稿ボタンを無効化しつつ再取得せず
      楽観的にローカル更新する設計。C画面(`trip.js`)の`featureLinks`に「宿泊」を追加。
      Playwrightで参加→旅行作成→カードリンク遷移→候補2件追加(リンク・メモ表示)→
      空URLバリデーション→リロード後の永続化→戻るリンクを実Firestoreで確認(2026-08-18)。
      `npm run check`(lint・test)成功。
- [x] (M) 確定宿泊の追加(URL・メモ・チェックイン/アウト日)、複数件・飛び飛びの日程に対応
      （Should） → 同じ`pages/lodging.html`・`lodging.js`に「確定宿泊」セクションを追加。
      `groups/{code}/trips/{tripId}/confirmedStays`へ`url`・`note`・`checkIn`・`checkOut`・
      `addedBy`を`addDocument`。チェックアウト＜チェックインはバリデーションで拒否
- [x] (S) 確定宿泊の一覧表示(期間順)（Should） → `checkIn`昇順でソートして表示

      Playwrightで日程が飛び飛びの確定宿泊2件を追加し、期間順(チェックインの早い順)で
      正しく並ぶこと、宿泊候補セクションと共存して動作すること、リロード後の永続化を
      実Firestoreで確認(2026-08-18)。`npm run check`(lint・test)成功。

## 8. H. しおり画面
- [x] (S) 項目の追加(やること名・日付・時間目安(任意)・場所リンク(任意)) →
      `pages/itinerary.html`・`itinerary.js`を新規作成し`vite.config.js`に登録。
      `groups/{code}/trips/{tripId}/itineraryItems`へ`title`・`date`・`time`・
      `locationUrl`・`note`・`addedBy`を`addDocument`(`note`はfirestore-design.md
      スキーマ通り追加。やること名・日付のみ必須)
- [x] (M) 日付グルーピング＋各日内での時間順自動ソート表示 → 取得した項目を`date`で
      グルーピングし、日付キーを昇順ソート。各日内は`time`昇順(未入力は番兵値で
      最後尾)でソートして表示

      C画面(`trip.js`)の`featureLinks`に「しおり」を追加(これでD〜H全カードが揃った)。
      Playwrightで時間が前後する順で項目を追加しても表示時は時刻順に並び替わること、
      日付グループが日付順に並ぶこと、時間未入力項目の扱い、場所リンク、必須項目
      バリデーション、リロード後の永続化、戻るリンクを実Firestoreで確認(2026-08-18)。
      `npm run check`(lint・test)成功。


## 9. 仕上げ
- [x] (S) レスポンシブ確認(モバイル中心) → Playwrightで375px幅ビューポートを使い、
      A〜H全8画面(参加・旅行一覧・旅行詳細トップ・企画メモ・行き先決め・日程調整・
      宿泊・しおり)で`document.documentElement.scrollWidth`が`window.innerWidth`を
      超えないこと(横スクロール発生無し)を確認(2026-08-18)
- [x] (S) 受け入れ条件(`docs/requirements.md` 10章)の一連の流れを通しで確認 →
      Playwrightで2名(たろう・はなこ)がそれぞれ操作し、要件10.2の一連の流れ
      (グループに参加→旅行を新規作成→企画メモを書く→行き先に投票する→
      日程に○×△で回答する→宿泊候補を並べて比較する→確定宿泊を複数登録する)を実施。
      たろうの入力(企画メモ・行き先投票・日程回答・宿泊候補・確定宿泊2件)がはなこの
      画面から見えること、はなこの追加投票がたろうの画面にリロード後反映され
      平均スコアが再計算されること(4.0→4.5)を実Firestoreで確認(2026-08-18)
- [x] (S) `src/firebase-config.js`から未使用の`initializeAppCheck`(reCAPTCHA v3)関連
      コードを削除。`initializeAppCheck`・`ReCaptchaV3Provider`のimport、サイトキー、
      Debug Provider初期化コード、`appCheck`のexportを全て削除(他に参照箇所が無いことを
      grepで確認済み)。あわせて`eslint.config.js`から未使用になった`self`グローバルも削除。
      削除後、ブラウザconsoleにApp Check由来の403エラー・デバッグトークンログが
      一切出なくなったことを確認(2026-08-18)。`npm run check`(lint・test)成功
- [x] (M) GitHub Pagesへのデプロイ設定・GitHub Actions自動デプロイ →
      `.github/workflows/deploy.yml`を追加。mainブランチへのpushをトリガーに
      `npm run check`→`npm run build`→GitHub Pagesへデプロイする(evolveはmainへ
      直接pushしないため、実際のデプロイは人間がマージした時点で発火する)。
      `public/index.html`を追加し、`pages/`配下のマルチページ構成のため存在しなかった
      ルート(`dist/index.html`)から`pages/index.html`へリダイレクトするようにした。
      GitHubリポジトリのPages設定を`build_type=workflow`で有効化済み(公開URL:
      `https://w4serinn.github.io/trip-planner-starter/`)。`vite preview`でビルド
      成果物を`/trip-planner-starter/`のパスで実際に配信し、ルートからのリダイレクト・
      アセット読み込み・参加フォーム表示までPlaywrightで確認(2026-08-18)。
      `npm run check`(lint・test)成功。

**2026-08-18時点で`0. 基盤`〜`9. 仕上げ`まで、ROADMAP上のタスクはすべて完了。**

---

## 第2期: UI刷新

### 10. 基盤(SPA化)
- [x] (M) ルーター基盤の実装 → `src/router.js`(ハッシュベース、`:param`動的セグメント対応、
      マウント関数がクリーンアップ関数を返せるmount/unmountライフサイクル)を新規作成。
      `src/app.js`で`#/`(A)・`#/trips`(B)・`#/trips/:tripId`(C概要)・
      `#/trips/:tripId/{scratch|notes|destinations|schedule|lodging|itinerary}`
      (雑多メモ・D〜H)のルートを仮実装(骨組みのみ。各ビューの実ロジックは11・12で実装)。
      タブバー(`#tabbar`)は旅行コンテキスト配下でのみ表示し、アクティブタブをハイライト
- [x] (M) SPAシェルの追加 → `app.html`(+`src/app.js`)を新規作成し`vite.config.js`に
      追加登録。当初案(旧pages/*.html・public/index.htmlの削除)から変更し、11・12で
      旧MPA版D〜Hのタブ移行が完了するまでは、既存の`pages/*.html`をユーザーが引き続き
      使える状態に保つため、`app.html`を「並行稼働する新エントリ」として追加するに留めた。
      旧ページ群の削除・`app.html`のルート昇格は、12完了後の新タスク(12.3)に切り出した

      Playwrightで`#/`・`#/trips`・タブ付き`#/trips/:tripId`系ルートの表示、タブリンク
      クリックでのフルリロード無し切り替え、ブラウザの戻るボタンでのハッシュ履歴、
      未知ルートのフォールバック、375px幅でのレイアウト崩れ無しを確認。旧MPA版
      (`pages/index.html`)が引き続き独立して動作することも確認(2026-08-18)。
      `npm run check`(lint・test)成功。

### 11. A・B画面のSPA移行
- [x] (S) A(参加)画面をルーター配下のビューに移行 → `src/views/join.js`を新規作成し
      `pages/index.js`のロジック(既存グループ参加・新規グループ作成・合言葉コピー)を
      移植。`saveSession`後は`window.location.href`ではなく`navigate()`でフルリロード
      無しに`#/trips`へ遷移。セッションが既にある場合は`#/trips`へ自動遷移する
      (docs/screens.md「画面遷移」の通り、旧MPA版には無かった新しい挙動)
- [x] (S) B(旅行一覧)画面をルーター配下のビューに移行 → `src/views/trips.js`を新規作成し
      `pages/trips.js`のロジック(旅行一覧取得・新規旅行作成)を移植。カードリンクは
      `trip.html?id=`ではなく`#/trips/{tripId}`(Cタブ)へ。セッションが無い場合は
      `#/`へ自動遷移

      `src/app.js`の`#/`・`#/trips`ルートに上記2ビューを登録。Playwrightで参加
      (存在しないコードのエラー・誤った作成用合言葉のエラー含む)→旅行一覧→新規旅行作成
      →タブ付きC画面(準備中)への遷移→旅行一覧への復帰(カード件数増加確認)→リロード後の
      セッション永続化→`#/`⇄`#/trips`の自動リダイレクト(参加済み/未参加それぞれ)を
      実Firestoreで確認。375px幅でのレイアウト崩れも無し(2026-08-18)。
      `npm run check`(lint・test)成功。

### 12. C画面(旅行詳細)のタブ構造化(完了)
- [x] (M) C画面を「概要」タブ(旅行名編集・集合情報・割り勘リンク)としてタブバー付き
      レイアウトに移行 → `src/views/tripOverview.js`を新規作成し`pages/trip.js`の
      ロジック(旅行名の表示・編集、集合情報・割り勘リンクの保存)を移植。D〜Hへの
      カードリンクナビ(旧`#feature-links`)はタブバーに置き換わったため廃止。
      旅行コンテキスト配下でのみ表示する「← 旅行一覧」リンクを`app.html`のヘッダーに
      追加し、タブバーと連動して表示/非表示を切り替える

      Playwrightで旅行作成→C概要タブ表示→旅行名編集→集合情報保存→割り勘リンク保存→
      他タブへ移動後に戻っても値が保持されていること→「戻る」リンクでの旅行一覧への
      復帰を実Firestoreで確認。375px幅でのレイアウトも問題なし(2026-08-18)。
      `npm run check`(lint・test)成功。
- [x] (S) D(企画メモ)タブへの移行 → `src/views/notes.js`を新規作成し`pages/notes.js`の
      ロジック(投稿フォーム・新しい順一覧・楽観的更新)をそのまま移植。`src/app.js`の
      `TABS`に`mount: mountNotes`を登録
- [x] (S) E(行き先決め)タブへの移行 → `src/views/destinations.js`を新規作成し
      `pages/destinations.js`のロジック(候補地追加・★1〜5投票・平均スコア順位表示・
      投票者一覧)をそのまま移植。`src/app.js`の`TABS`に`mount: mountDestinations`を登録

      Playwrightで参加→旅行作成→企画メモタブでメモ投稿→行き先決めタブで候補地追加・
      投票(3点)→平均スコア表示確認→概要タブ経由での企画メモタブ再訪問後もメモが
      保持されていることを実Firestoreで確認。375px幅でのレイアウトも問題なし
      (2026-08-18)。`npm run check`(lint・test)成功。検証で作成したFirestoreドキュメントは
      サブコレクション分を削除済み。旅行ドキュメント自体はセキュリティ方針上delete不可の
      ため、名前を「[検証用/削除不可] evolveのD・E画面SPA動作確認で作成」に更新して
      残置(共有テスト用グループ`FMXRZYW7`内)
- [x] (S) F(日程調整)タブへの移行 → `src/views/schedule.js`を新規作成し`pages/schedule.js`の
      ロジック(候補日追加・○△×回答・全員回答済みハイライト)をそのまま移植。
      `src/app.js`の`TABS`に`mount: mountSchedule`を登録
- [x] (S) G(宿泊)タブへの移行 → `src/views/lodging.js`を新規作成し`pages/lodging.js`の
      ロジック(宿泊候補の追加・一覧、確定宿泊の追加・期間順一覧)をそのまま移植。
      `src/app.js`の`TABS`に`mount: mountLodging`を登録

      Playwrightで参加→旅行作成→日程調整タブで候補日追加・○回答→宿泊タブで候補追加・
      確定宿泊追加(チェックイン/アウト)→概要タブ経由での日程調整タブ再訪問後も回答が
      保持されていることを実Firestoreで確認。375px幅でのレイアウトも問題なし(宿泊タブの
      フォーム密度が高いため特に確認、2026-08-18)。`npm run check`(lint・test)成功。
      検証で作成したFirestoreドキュメントはサブコレクション分を削除済み。旅行ドキュメント
      自体はセキュリティ方針上delete不可のため、名前を
      「[検証用/削除不可] evolveのF・G画面SPA動作確認で作成」に更新して残置
      (共有テスト用グループ`FMXRZYW7`内)
- [x] (S) H(しおり)タブへの移行 → `src/views/itinerary.js`を新規作成し`pages/itinerary.js`の
      ロジック(項目追加・日付グルーピング・各日内時間順ソート)をそのまま移植。時間入力の
      3セレクトボックス化(docs/ROADMAP.md「15」)は別タスクのため`<input type="time">`の
      まま移植した。`src/app.js`の`TABS`に`mount: mountItinerary`を登録。
      これでD〜Hの全タブ移行が完了した(残るは12.3の旧ファイル削除のみ)

      Playwrightで参加→旅行作成→しおりタブで項目追加(時間・場所リンク・メモ含む)→
      同日でより早い時間の項目を追加して時間順ソートを確認→タブ往復後も項目数が
      保持されることを実Firestoreで確認。未実装の雑多メモタブが引き続き「準備中」
      プレースホルダーのまま正しく表示されることも確認(検証中に一度「しおりの
      subtitleが表示され続けている」ように見えたが、これはテストスクリプト側が
      hashchange後のDOM更新を待ちきれていなかったタイミングの問題で、待機条件を
      修正した再検証で正しく表示されることを確認済み。アプリ自体は正しく動作)。
      375px幅でのレイアウトも問題なし(2026-08-18)。`npm run check`(lint・test)成功。
      検証で作成したFirestoreドキュメントはサブコレクション分を削除済み。旅行ドキュメント
      自体はセキュリティ方針上delete不可のため、名前を
      「[検証用/削除不可] evolveのH画面SPA動作確認で作成」に更新して残置
      (共有テスト用グループ`FMXRZYW7`内)
- [x] (S) 12.3: 旧MPA版8画面(`pages/index.html`〜`pages/itinerary.html`とその`.js`)・
      `public/index.html`(ルートリダイレクトスタブ)を削除。`app.html`を`git mv`で
      プロジェクトルートの`index.html`へ改名し、GitHub Pagesのルートで直接SPAシェルが
      配信されるようにした(旧リダイレクトスタブは不要になったため削除)。
      `vite.config.js`の`rollupOptions.input`(A〜H+appの9エントリ)を削除し、
      Viteのデフォルト(ルート`index.html`単一エントリ)に一本化。`package.json`の
      `lint`スクリプトから、JSファイルが無くなった`pages`を除外(`eslint src pages`→
      `eslint src`。`pages/shared.css`は`lint:css`側で引き続き対象)

      `npm run build`でdist/index.htmlのみが出力される(旧pages/*・publicの重複無し)
      ことを確認。Playwrightでルートベースパス(`http://localhost:5173/trip-planner-starter/`、
      app.html等のサフィックス無し)からA画面(参加)→B(旅行一覧)→旅行作成→C概要+D〜Hの
      全タブ遷移→リロード後もセッション・C画面が保持されることを実Firestoreで確認。
      375px幅でのレイアウトも問題なし。console/pageerror/HTTPエラーは0件(2026-08-18)。
      `npm run check`(lint・test)成功
