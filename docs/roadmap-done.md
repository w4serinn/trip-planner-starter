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

## 13. 企画メモの単一共有テキスト化
- [x] (M) `planningNotes`サブコレクションを廃止し、`trips/{tripId}.planningNotesText`
      (単一の共有テキストフィールド)に変更。`src/views/notes.js`を、投稿フォーム+
      一覧方式から、旅行1件につき1つの大きな`<textarea>`1つに全面書き換え。入力を
      1200msデバウンスして自動保存(`updateDocument`で`planningNotesText`のみ更新)。
      タブ離脱時(cleanup)にデバウンス待ちの未保存分があれば即座にflush保存し、
      タブをすぐ切り替えても入力が失われないようにした。保存成功時は「保存しました。」
      をcopy-feedback領域に表示。`eslint.config.js`のグローバルに`setTimeout`・
      `clearTimeout`を追加(デバウンス実装に必要)

      Playwrightで2ユーザー(別ブラウザコンテキスト)を使い、Aさんが入力→デバウンス
      保存→Bさんが同じ旅行の企画メモタブを開いて同じ内容を読み込めることを確認。
      Bさんが追記して保存→Aさんがデバウンス完了前(1200ms未満)にタブを離脱した際、
      cleanup内のflush保存によって離脱直前の入力内容が正しく保存されていることを
      Bさん視点での再取得で確認。同時編集時の競合は「後勝ち上書き」を許容する設計
      通りの挙動(docs/screens.md「設計判断」参照)。375px幅でのレイアウトも問題なし。
      console/pageerrorは0件(2026-08-18)。`npm run check`(lint・test)成功。検証で
      作成した旅行ドキュメントは、名前を
      「[検証用/削除不可] evolveの13(企画メモ共有テキスト化)動作確認で作成」に更新し、
      `planningNotesText`を空文字にリセットして共有テストグループ`FMXRZYW7`内に残置

## 14. 雑多メモ機能(新規)
2026-08-18、人間とのチャットで再設計。「雑多メモが一番よく使うメイン機能」という位置づけを
踏まえ、企画メモ(13)と同じく単一共有テキスト化し、振り分けはテキスト選択範囲に対して行う形に
変更した(詳細はdocs/firestore-design.md「雑多メモの振り分け方式の再設計」・docs/screens.md
「雑多メモも単一共有テキスト」参照)。
- [x] (M) `scratchNotes`サブコレクションではなく`trips/{tripId}.scratchText`(単一の共有
      テキストフィールド)として実装 → `src/views/scratch.js`を新規作成し、
      `src/views/notes.js`(企画メモ)と同じ大きな`<textarea>`1つ+1200msデバウンス自動保存
      +タブ離脱時flush保存のパターンを踏襲。`src/app.js`の`TABS`の`scratch`エントリに
      `mount: mountScratch`を登録
- [x] (M) 「→企画メモへ」ボタン → テキストエリアで選択中の範囲を`getDocument`で取得した
      最新の`planningNotesText`の末尾に追記し、`scratchText`側は選択範囲のみを
      `updateDocument`で同時更新して削除(前後のテキストは残す)。未選択時はエラー表示
      のみで何もしない
- [x] (M) 「→しおりへ」ボタン → 選択中の範囲を保持しつつ日付選択のみの簡易フォームを表示し、
      送信時に`itineraryItems`の新規ドキュメントの`title`に選択テキストを設定して作成
      (`time`・`locationUrl`・`note`は空のまま)。作成後`scratchText`側は選択範囲のみを
      削除。未選択時はエラー表示のみで何もしない

      Playwrightで2ユーザー(別ブラウザコンテキスト)を使い、Aさんの入力がデバウンス保存
      される→Bさんが同じ雑多メモを読み込める→Bさんが選択範囲を「→企画メモへ」で移動し、
      雑多メモから該当範囲のみ消え、企画メモタブに反映されることを確認→Aさんが(他タブ
      経由で再取得後)別の選択範囲を「→しおりへ」で移動し、日付選択フォーム経由で
      しおりタブに新規項目が作成されることを確認→未選択時にボタンを押すとエラー表示のみで
      何も起きないことを確認→タブ離脱時(デバウンス完了前)のflush保存をBさん視点の再取得で
      確認。375px幅でのレイアウト(ボタン2つ横並び含む)も問題なし。console/pageerrorは
      0件(2026-08-18)。`npm run check`(lint・test)成功。検証で作成した2件の旅行ドキュメント
      は、名前を「[検証用/削除不可] evolveの14(雑多メモ)動作確認で作成」に更新し、
      `scratchText`・`planningNotesText`を空文字にリセット、作成した`itineraryItems`は
      削除して共有テストグループ`FMXRZYW7`内に残置

## 15. しおりの時間入力UI変更
- [x] (S) `<input type="time">`を、「午前/午後」「時(0〜12)」「分(00/15/30/45)」の
      3つのセレクトボックスに置き換え → `src/views/itinerary.js`の時間目安フィールドを
      3つの`<select>`(`#item-time-ampm`/`#item-time-hour`/`#item-time-minute`)に変更。
      `pages/shared.css`に`select`の基本スタイルと、3つを横並びにする`.time-select-row`
      クラスを追加。保存するデータ形式("HH:MM"の24時間表記文字列)は変えず、
      `buildTimeString(amPm, hour, minute)`で`hour24 = (hourNum % 12) + (amPm==='PM'?12:0)`
      により変換する(午前0時=午前12時=00:00、午後0時=午後12時=12:00をそれぞれ同じ境界
      時刻のエイリアスとして扱う)。3つのうち一部だけ選択した状態での送信はエラー表示のみ
      で弾き、全て未選択の場合は従来通り時間無しとして扱う

      Playwrightで「午後2時15分→14:15」「午前12時00分→00:00(エイリアス確認)」
      「午後12時30分→12:30(エイリアス確認)」「時間未指定→時間無し」の4パターンを追加し、
      日付内で正しく時間順ソート(00:00→12:30→14:15→時間無し)されることを確認。
      「午前/午後のみ選択・時/分は未選択」という部分入力時にエラー表示のみで項目が
      追加されないことも確認。375px幅での3セレクト横並びレイアウトも問題なし。
      console/pageerrorは0件(2026-08-18)。`npm run check`(lint・test)成功。検証で
      作成した6件の旅行ドキュメント(デバッグ時の再実行分含む)は、`itineraryItems`を
      全て削除の上、名前を「[検証用/削除不可] evolveの15(しおり時間UI)動作確認で作成」に
      更新して共有テストグループ`FMXRZYW7`内に残置

## 16. 見た目の刷新
- [x] (S) 割り勘リンクのラベル表記・placeholderを「Walica」(walica.jp)に修正 →
      `src/views/tripOverview.js`の見出し「割り勘リンク(warika)」→「割り勘リンク(Walica)」、
      placeholderを`https://warika.net/...`→`https://walica.jp/...`に修正。内部のHTML id
      (`#warika-url`等)・Firestoreのフィールド名(`warikaUrl`)はデータモデル維持のため
      変更していない(ユーザーに見える表記のみの修正)。`docs/requirements.md`の
      「割り勘リンク（warika）」表記・エンティティ名`(WarikaLink)`も、それぞれ
      「割り勘リンク（Walica）」・`(WalicaLink)`に修正

      Playwrightで旅行作成→C概要タブの割り勘リンクセクションの見出し・placeholder表記を
      確認→実際にURLを保存できること(`warikaUrl`フィールドが引き続き機能すること)を
      実Firestoreで確認。375px幅でのレイアウトも問題なし。console/pageerrorは0件
      (2026-08-18)。`npm run check`(lint・test)成功。検証で作成した旅行ドキュメントは
      名前を「[検証用/削除不可] evolveの16(Walica表記修正)動作確認で作成」に更新し、
      `warikaUrl`を空文字にリセットして共有テストグループ`FMXRZYW7`内に残置
- [x] (M) 全体的なビジュアル刷新 → 参考サイト https://tabiori.com/ (ポップで親しみやすく、
      かつ信頼感のあるデザイン)を踏まえ2026-08-19に人間とのチャットで確定した仕様通り、
      `styles/tokens.css`のデザイントークンを変更した:
      `--color-primary`(深緑`#2f6f4f`→明るい青`#2f80ed`)・`--color-primary-dark`
      (`#1f4d36`→`#1a5fc4`)・`--color-accent`(`#e8a33d`→`#f5a623`)・`--color-bg`
      (クリーム`#faf8f4`→薄グレー寄りの白`#f7f8fa`)・`--radius-sm`(6px→8px)・
      `--radius-md`(12px→16px)・`--shadow-card`(`0 2px 8px rgb(0 0 0 / 8%)`→
      `0 4px 12px rgb(0 0 0 / 10%)`、柔らかく強めに)。`--color-success`はprimaryが青に
      変わったことで意味が伝わりにくくなる懸念があったため、旧primaryと同値の使い回しを
      やめ、独立した緑`#219653`を新たに定義した。さらにセルフレビューで、旧背景(クリーム系)
      に合わせた暖色ベージュの`--color-border`(`#dedad2`)が新しい薄グレー背景・青系
      primaryと合わず浮くと判断し、寒色寄りのグレー`#dfe3e8`に合わせて調整した(ROADMAP上の
      指定にはなかった追加調整。理由をコード内コメントに明記)

      Playwrightでスクリーンショットを撮影し、A(参加)・B(旅行一覧)・C(概要)・雑多メモ・
      企画メモ・行き先決め・日程調整・宿泊・しおりの全画面で新配色が一貫して適用され、
      白背景に対する視認性・ボタンのコントラストに問題が無いことを目視確認。375px幅でも
      全タブで横スクロール発生なし。console/pageerrorは0件(2026-08-19)。
      `npm run check`(lint・test)成功。検証で作成した旅行ドキュメントは、名前を
      「[検証用/削除不可] evolveの16(ビジュアル刷新)動作確認で作成」に更新して共有
      テストグループ`FMXRZYW7`内に残置。

      これで「16. 見た目の刷新」・第2期(UI刷新: 10〜16)が全て完了した。

## 17. 共通基盤の整備
`16`のトークン変更だけでは「安っぽさ」が解消しないとの人間からの評価を受け、
2026-08-19に人間の明示的な指示で、参考サイト https://tabiori.com/ を「修学旅行の
しおり」的なトーンとしてより深く参照し、色・タイポグラフィ・カード/ボタンの質感まで
踏み込んで刷新した。
- [x] (S) `styles/tokens.css`のタイポグラフィスケールを見直す → `--font-weight-heading`
      (700)・`--font-weight-subheading`(600)を新規追加し、`pages/shared.css`の
      h1/h2/h3にそれぞれ明示的に適用(ブラウザデフォルトの太字任せをやめ、見出し間の
      重みの差を意図的に設計)。h1には`letter-spacing: -0.01em`も追加
- [x] (S) 余白・カードの階層にメリハリをつける → `.card`から`border`を廃止し、
      `--shadow-card`(`0 4px 12px rgb(0 0 0 / 10%)`→`0 4px 14px rgb(0 0 0 / 8%)`)の
      影のみでカードを浮かせる質感に変更(tabiori.comの「枠線なし、淡い影のみ」の
      カードスタイルを参考)。配色も、背景を寒色寄りの薄グレー(`#f7f8fa`)から
      「しおり」らしい紙めいた温かみのある白(`#fff8f0`)へ、アクセントをアンバー系
      オレンジ(`#f5a623`)からより親しみやすいコーラルオレンジ(`#ff8c42`)へ、枠線色も
      背景に合わせて暖色寄りのベージュ(`#e8dfd3`)へ再調整。primaryは`#3b82f6`
      (Tailwind blue-500相当)・primary-darkは`#1d4ed8`により正確な明るい青へ微調整
- [x] (S) フォーム展開・タブ切り替え・保存完了表示などへの軽量なCSSトランジション →
      ボタンに専用の角丸(`--radius-button: 12px`)・primaryカラーをにじませた浮遊感の
      ある影(`--shadow-button`)・hover時の濃色化・active時の`scale(0.97)`による
      押下フィードバック・disabled時の`opacity: 0.6`を追加。input/textarea/select/
      date/timeのフォーカス状態を、ブラウザデフォルトの`outline`から柔らかい
      `box-shadow`のフォーカスリングに統一(date/time入力も他のフィールドと統一した
      枠線・角丸スタイルを持つよう新たに対象に追加)

      Playwrightで全画面のスクリーンショットを撮影し、A(参加)・B(旅行一覧)・
      C(概要)・行き先決め(候補追加・投票込み)・日程調整・しおりの各画面で新しい質感が
      一貫して適用され、視認性・カードの浮遊感・ボタンの押下フィードバックに問題が無い
      ことを目視確認。375px幅でも全タブ(雑多メモ・企画メモ・行き先決め・日程調整・
      宿泊・しおり含む)で横スクロール発生なし。console/pageerrorは0件(2026-08-19)。
      `npm run check`(lint・test)成功。検証で作成した旅行ドキュメント・候補地は削除し、
      旅行ドキューメント自体は名前を
      「[検証用/削除不可] evolveの第3期(ビジュアル質感刷新)動作確認で作成」に更新して
      共有テストグループ`FMXRZYW7`内に残置。
- [x] (M) 軽量なSVGアイコンセットの導入 → 外部CDN依存の無い`src/icons.js`を新規作成。
      `icon(body, size)`ヘルパーで`currentColor`ベースのインラインSVG(24×24 viewBox、
      stroke幅2)を生成し、概要・雑多メモ・企画メモ・行き先決め・日程調整・宿泊・しおりの
      7タブ分のアイコン(`overview`/`scratch`/`notes`/`destinations`/`schedule`/
      `lodging`/`itinerary`)、追加ボタン用の`plus`、空状態用の`empty`を定義。
      `src/app.js`のタブバー描画に適用し、`pages/shared.css`の`.tab`をflexレイアウトに
      変更してアイコン+ラベルを横並びに。空状態(`.empty-state`)は
      `src/views/trips.js`・`destinations.js`・`schedule.js`・`lodging.js`(候補・確定
      宿泊の2箇所)・`itinerary.js`の計6箇所に`icons.empty`を追加し、CSSもアイコン+
      テキストを縦に並べるflex columnレイアウトに変更。B(旅行一覧)の「＋ 新しい旅行を
      作る」ボタンにも`icons.plus`を適用(ボタン自体を`display: inline-flex`化し、
      アイコン+テキストを横並びに)
- [x] (S) 「追加フォームを折りたたみ、＋ボタンで展開する」共通パターンの試験実装 →
      `src/views/destinations.js`(E. 行き先決め画面)で実装。フォームは初期状態で
      `hidden`、「＋ 候補地を追加」ボタン(`icons.plus`使用)をタップすると
      フォームが開きボタン自体は隠れる。フォーム内に「キャンセル」ボタンを追加し、
      押すとフォームを閉じて入力値・エラーをリセット。候補地の追加に成功した場合も
      自動的にフォームを閉じ、一覧がすぐ見える状態に戻る

      実装中に発見したバグ: `button`要素へ`display: inline-flex`を明示指定したことで、
      ブラウザが`hidden`属性に対して適用する既定スタイル(`display: none`相当の
      プレゼンテーショナルヒント。属性セレクタより優先度が低い)が上書きされてしまい、
      `hidden`にしたはずのボタンが実際には非表示にならないという不具合を作り込んで
      いた(Playwrightで折りたたみボタンの表示状態を検証中に発覚)。`pages/shared.css`に
      `button[hidden] { display: none; }`を追加して修正。

      Playwrightで、初期状態でフォームが非表示・トグルボタンが表示されていること→
      トグルボタンを押すとフォームが開きトグルボタンが隠れること→キャンセルで
      フォームが閉じてトグルボタンが再表示され入力がクリアされること→実際に候補地を
      追加すると成功後に自動でフォームが閉じてトグルボタンが再表示されることを確認。
      タブバーの全タブアイコン・空状態アイコンの見た目もスクリーンショットで確認し、
      配色と調和していることを確認。375px幅でも折りたたみボタン込みで横スクロール
      発生なし。console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test)成功。
      検証で作成した2件の旅行ドキュメント・候補地は削除し、旅行ドキュメント自体は
      名前を「[検証用/削除不可] evolveの17(アイコン・折りたたみフォーム)動作確認で
      作成」に更新して共有テストグループ`FMXRZYW7`内に残置。

      これで「17. 共通基盤の整備」が全て完了した。

## 18. 画面ごとのレイアウト刷新(進行中。完了分のみここに記載)
- [x] (S) A(参加)画面のレイアウト刷新 → `src/views/join.js`のメインの参加フォームを
      `.card`で囲み、視覚的に主役として浮かせた。「はじめての方」(新規グループ作成)
      セクションはあえてカード化せず、区切り線+`btn-secondary`の控えめな見た目のまま
      にして、参加(主) / 新規作成(副)の優先度の違いを視覚的に表現した。「新しい
      グループを作る」ボタンに`icons.plus`を追加
- [x] (S) B(旅行一覧)画面のレイアウト刷新 → `src/views/trips.js`の各旅行カードに、
      旅行名の下へ`createdAt`から算出した「作成日: YYYY/M/D」のサブタイトルを追加し、
      カード右端に`icons.chevron`(新規追加)を配置して「タップで開ける」ことを示す
      アフォーダンスにした。`pages/shared.css`に`.trip-card`(flexで名前+chevronを
      左右配置)・`.trip-card-chevron`・`.card-link`への`:active`時の軽い縮小
      トランジション(`scale(0.98)`)を追加し、カードのタップ操作に押下フィードバックを
      持たせた

      Playwrightで、A画面のカード化(参加フォームがカードで浮いていること、新規作成
      セクションがカード化されていないこと)・B画面の新規作成した旅行カードに作成日と
      chevronアイコンが表示されることを確認。375px幅でも両画面とも横スクロール発生
      なし。console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test)成功。
      検証で作成した旅行ドキュメントは、名前を
      「[検証用/削除不可] evolveの18(A/B画面レイアウト刷新)動作確認で作成」に更新して
      共有テストグループ`FMXRZYW7`内に残置。
- [x] (M) C(概要タブ)画面のレイアウト刷新 → `src/views/tripOverview.js`の集合情報・
      割り勘リンクを、旅行名編集と同じ「表示モード+編集ボタンで編集フォームを開く」
      パターンに統一。未入力時は「まだ設定されていません。」、入力済みなら集合情報は
      `<dl>`によるラベル:値のサマリー表示(場所/時間/メモ)、割り勘リンクはクリック可能な
      リンク表示に切り替わる。編集ボタンを押すとフォームが開き編集ボタン自体は隠れる。
      各カードの見出しに`src/icons.js`のアイコン(集合情報は`destinations`の地図ピンを
      流用、割り勘リンクは新規追加した`link`アイコン)を付与。`pages/shared.css`に
      `.card-section-header`(アイコン+見出し+編集ボタンの横並び)・`.summary-list`
      (ラベル:値のgridレイアウト)を追加

      実装中に発見したバグ: `.summary-list { display: grid; }`のような、明示的な
      `display`指定を持つクラスへ`.hidden`プロパティで非表示を試みても、`17`で
      `button[hidden]`個別に対症療法したのと同じ理由(hidden属性の既定スタイルは
      優先度最下位のプレゼンテーショナルヒントのため、通常の author スタイルに
      上書きされる)で効かないことが判明。個別のセレクタを都度追加するのは漏れやすい
      ため、`pages/shared.css`冒頭に`[hidden] { display: none !important; }`を追加し、
      今後同種の要素を追加しても確実に効くようにした(併せて、旧`button[hidden]`個別
      ルールは不要になったため削除)

      Playwrightで、初期状態(集合情報・割り勘リンクとも「まだ設定されていません」の
      みが表示されフォームは非表示)→編集ボタンでフォームが開き編集ボタン自体が隠れる→
      集合情報・割り勘リンクをそれぞれ保存すると編集モードが閉じてサマリー/リンク表示に
      切り替わる→キャンセルすると元の値が保持されたまま編集モードが閉じる→タブ往復後も
      値が保持されて再表示されることを実Firestoreで確認。375px幅でもレイアウト崩れなし。
      console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test)成功。検証で
      作成した2件の旅行ドキュメントは、名前を
      「[検証用/削除不可] evolveの18(C画面レイアウト刷新)動作確認で作成」に更新し、
      集合情報・割り勘リンクの値を空文字にリセットして共有テストグループ`FMXRZYW7`内に
      残置。
- [x] (S) 雑多メモ・企画メモ(共有テキスト系)画面のレイアウト刷新 → `src/views/scratch.js`・
      `src/views/notes.js`の`<textarea>`(+関連ボタン・エラー/保存フィードバック)を
      `.card`で囲み、他画面と統一感のある浮いた見た目にした。雑多メモの「→企画メモへ」
      「→しおりへ」ボタンに`icons.notes`・`icons.itinerary`をそれぞれ追加し、ラベルも
      「選択範囲を→企画メモへ」→「→企画メモへ」に短縮(アイコンで文脈を補うため)。
      「→しおりへ」の日付選択フォーム(表示時のみ)にも`.card`クラスを付与し、独立した
      パネルとして浮くようにした
- [x] (S) E(行き先決め)画面: 投票結果のランキング表示を進捗バー等で視覚化 →
      `src/views/destinations.js`の見出しをテキストのみの「1位 花子公園」から、
      `.rank-badge`(角丸の順位バッジ)+候補地名の横並びレイアウトに変更。1位のみ
      `.rank-badge-top`でアクセントカラー背景にして視覚的に強調。平均スコアのテキストの
      下に`.score-bar`(グレー背景トラック)+`.score-bar-fill`(アクセントカラー、
      `avg/5*100%`の幅、`transition: width`)の横棒グラフを追加し、数値を読まなくても
      一目で相対的な人気度がわかるようにした

      Playwrightで、雑多メモ・企画メモタブがカードで囲まれていることを確認。行き先決め
      タブで候補地を2件追加し、それぞれ★5・★2で投票→1位の候補に`rank-badge-top`
      クラスが付与されること、スコアバーの幅が期待通り(100%・40%)になることを確認
      (検証中、2件目の投票の非同期完了を待たずに幅を読んでしまいテスト側が0%を誤検知
      した箇所があったが、待機条件を修正して解消。アプリ自体は正しく動作)。375px幅でも
      3画面ともレイアウト崩れなし。console/pageerrorは0件(2026-08-19)。
      `npm run check`(lint・test)成功。検証で作成した2件の旅行ドキュメントは、
      `destinations`サブコレクションを削除の上、名前を
      「[検証用/削除不可] evolveの18(雑多メモ/企画メモ/E画面刷新)動作確認で作成」に
      更新して共有テストグループ`FMXRZYW7`内に残置。
- [x] (M) F(日程調整)画面のレイアウト刷新: 追加フォームの折りたたみ化 →
      `src/views/schedule.js`に、E(行き先決め)と同じ「追加フォームを折りたたみ、
      ＋ボタンで展開する」パターンを適用。「＋ 候補日を追加」ボタン(`icons.plus`)で
      フォームが開き、キャンセルボタンで閉じる。候補日の追加成功後も自動でフォームを
      閉じ、一覧がすぐ見える状態に戻る

      Playwrightで、初期状態(フォーム非表示・トグルボタン表示)→トグルボタンでフォームが
      開きトグルボタンが隠れる→キャンセルで元に戻る→候補日を実際に追加すると成功後に
      自動でフォームが閉じることを確認。○回答後の見た目(カード内の回答ボタン・回答者
      一覧)も問題なし。375px幅でも横スクロール発生なし。console/pageerrorは0件
      (2026-08-19)。`npm run check`(lint・test)成功。検証で作成した旅行ドキュメント・
      候補日は削除の上、名前を「[検証用/削除不可] evolveの18(F画面レイアウト刷新)
      動作確認で作成」に更新して共有テストグループ`FMXRZYW7`内に残置。
- [x] (M) G(宿泊)画面のレイアウト刷新: 追加フォームの折りたたみ化+候補/確定宿泊の
      視覚的な区別強化 → `src/views/lodging.js`の宿泊候補・確定宿泊、両方の追加
      フォームにE/Fと同じ折りたたみパターンを適用(それぞれ独立したトグル/キャンセル
      ボタン)。両セクションに`icons.lodging`アイコン付きの見出し(宿泊候補は元々
      見出しが無かったため新規追加、確定宿泊は既存の`<h2>`にアイコンを追加)を揃え、
      間に`.divider`(「確定した宿泊」ラベル付き)を挿入して2つのセクションを視覚的に
      分離した。アイコン付き見出しの共通クラス`.icon-heading`を`pages/shared.css`に
      新規追加(h2/h3どちらでも使える汎用ユーティリティ)

      Playwrightで、初期状態(両フォームとも非表示)→宿泊候補・確定宿泊それぞれを
      折りたたみフォームから追加→両方とも成功後に自動でフォームが閉じることを確認。
      キャンセル動作(トグルボタンの再表示)も確認。375px幅でもレイアウト崩れなし。
      console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test)成功。検証で
      作成した旅行ドキュメント・候補・確定宿泊は削除の上、名前を
      「[検証用/削除不可] evolveの18(G画面レイアウト刷新)動作確認で作成」に更新して
      共有テストグループ`FMXRZYW7`内に残置。
- [x] (M) H(しおり)画面のレイアウト刷新: タイムライン風の見た目+追加フォームの
      折りたたみ化 → `src/views/itinerary.js`にE〜Gと同じ折りたたみパターンを適用。
      各日付内の項目一覧を、フラットな`.card`の羅列から`.timeline`(縦線+丸ドットの
      マーカー)でつなぐ表示に変更(データ構造・ソート順は変更せず、見た目のみの変更)。
      各項目は`.timeline-item`(flexレイアウト。左に`.timeline-marker`、右に
      `.timeline-content.card`)として構成し、マーカーの縦線は次の項目との間にのみ
      表示(最後の項目では非表示)。`pages/shared.css`に`.timeline-item`・
      `.timeline-marker`・`.timeline-content`を新規追加

      実装中に発見した見た目の不具合: タイムラインの縦線に`--color-border`
      (`#e8dfd3`)を使ったところ、暖色系の背景色(`--color-bg: #fff8f0`)との明度差が
      小さすぎてスクリーンショット上でほぼ視認できなかった。より明度差の大きい
      `--color-text-muted`(不透明度0.4)に変更して視認性を確保した

      Playwrightで、初期状態(フォーム非表示)→折りたたみフォームで項目を2件追加
      (同日・時間違い)→時間順に正しくソートされてタイムライン表示されること→
      マーカー(丸ドット)の数が項目数と一致することを実Firestoreで確認。追加成功後は
      自動でフォームが閉じることも確認。375px幅でもレイアウト崩れなし。
      console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test)成功。検証で
      作成した2件の旅行ドキュメント・しおり項目は削除の上、名前を
      「[検証用/削除不可] evolveの18(H画面レイアウト刷新)動作確認で作成」に更新して
      共有テストグループ`FMXRZYW7`内に残置。

      これで「18. 画面ごとのレイアウト刷新」・第3期(レイアウト刷新: 17〜18)が
      全て完了した。

## 19. 共通基盤: ブレークポイント・幅の可変化(第4期)
- [x] (S) `pages/shared.css`の`.page`に、画面幅に応じた`max-width`のメディアクエリを
      追加 → 768px未満は従来通り480px、768px以上は700px(パディングも
      `--space-lg`→`--space-xl`に拡大)、1024px以上は960pxに拡大。合わせて、
      カード一覧を広い画面で複数カラムグリッドに切り替える再利用可能な共通クラス
      `.card-grid`(768px以上で2列、1024px以上で3列。グリッド時は`.card`の
      `margin-bottom`を`0`にしgapのみで間隔を取る。空状態は`grid-column: 1/-1`で
      全幅表示)を新設。B(旅行一覧)画面の`#trip-list`に`.card-grid`を適用し、
      動作確認の対象とした(`20`の他画面への展開は別タスク)。stylelint(標準設定)の
      `media-feature-range-notation`ルールに従い、メディアクエリは`(min-width: ...)`
      ではなく`(width >= ...)`のrange記法で記述

      Playwrightで、375px幅では1列(グリッド未適用)・768px幅では2列
      (`grid-template-columns`が2値)・1024px以上では3列になることを、実際に4件の
      旅行を作成して確認。1200px幅でも横スクロール発生なし。`.page`のmax-widthが
      1024px以上で960pxになっていることも確認。console/pageerrorは0件(2026-08-19)。
      `npm run check`(lint・test)成功。検証で作成した4件の旅行ドキュメントは、名前を
      「[検証用/削除不可] evolveの19-20(レスポンシブグリッド)動作確認で作成」に更新して
      共有テストグループ`FMXRZYW7`内に残置(検証中にFirestore接続の一時的なDNSエラーが
      ログに出力されたが、SDKが自動リトライして実際には正常に書き込みが完了していた
      ことを別途`getDoc`で確認済み。実害なし)。

## 20. リスト系画面のグリッド化(第4期)
- [x] (S) E(行き先決め)画面: 候補地カード一覧をグリッド化 →
      `src/views/destinations.js`の`#destination-list`に`.card-grid`を付与
- [x] (S) F(日程調整)画面: 候補日カード一覧をグリッド化 →
      `src/views/schedule.js`の`#schedule-list`に`.card-grid`を付与
- [x] (S) G(宿泊)画面: 宿泊候補・確定宿泊、それぞれのカード一覧をグリッド化 →
      `src/views/lodging.js`の`#candidate-list`・`#stay-list`にそれぞれ`.card-grid`を
      付与(2つのグリッドは独立しており、宿泊候補と確定宿泊が混ざって並ぶことはない)

      Playwrightで、1200px幅において行き先決め(候補地3件、投票★1〜5対応も維持)・
      日程調整(候補日3件)・宿泊(候補2件+確定1件)のいずれも3列グリッドで表示される
      ことを確認。375px幅では全て1列(グリッド未適用)に戻ることも確認。横スクロール
      発生なし。console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test)成功。
      検証で作成した旅行ドキュメント・候補地・候補日・宿泊候補/確定宿泊は削除の上、
      名前を「[検証用/削除不可] evolveの20(E/F/G画面グリッド化)動作確認で作成」に
      更新して共有テストグループ`FMXRZYW7`内に残置。

      これで「20. リスト系画面のグリッド化」が全て完了した。
