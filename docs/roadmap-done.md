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

## 21. その他画面の広い画面での調整(第4期)
- [x] (S) C(概要)・雑多メモ・企画メモ画面: グリッド化はせず、`19`の幅拡大の恩恵を
      受けるのみで良いか確認 → Playwrightで1200px幅の実際の見た目を確認した結果、
      C(概要)は集合情報・割り勘リンクの2枚のカードが単一カラムのまま適切な幅で
      表示され違和感なし、雑多メモ・企画メモの`<textarea>`は幅が広がったことで
      むしろ書き込みやすい見た目になっており、いずれも追加のコード変更は不要と判断
- [x] (S) H(しおり)画面: タイムライン表示は1カラムのままで良いか再確認 →
      Playwrightで1200px幅の実際の見た目を確認した結果、タイムラインの縦線+マーカーが
      時系列の流れを示す構造上、複数カラム化すると意味を失うため1カラム据え置きが
      適切と判断。コード変更は不要

      いずれもコード変更を伴わない確認のみのタスクだったため、今回のサイクルは
      Playwrightでの目視確認のみで完結した。検証で作成した2件の旅行ドキュメント・
      しおり項目は削除の上、名前を
      「[検証用/削除不可] evolveの21(広い画面での調整要否確認)動作確認で作成」に
      更新して共有テストグループ`FMXRZYW7`内に残置。

      これで「21. その他画面の広い画面での調整」・第4期(PCレスポンシブ対応: 19〜21)が
      全て完了した。

## 22. 雑多メモの振り分け先を拡張
現在、雑多メモ(`src/views/scratch.js`)の選択範囲振り分けボタンは「→企画メモへ」
「→しおりへ」の2つのみだった。2026-08-19に人間と相談し、「行き先決め」「宿泊」も対象に
追加(日程調整は自由記述の入れ場所が無いため対象外)。
- [x] (S) 「→行き先決めへ」ボタンを追加 → 選択範囲のテキストをそのまま`destinations`の
      新規ドキュメントの`name`に設定して即座に追加(`note`は空、`votes`は空のマップ)。
      「→企画メモへ」と同じく追加入力を挟まない。作成後`scratchText`側は選択範囲のみ削除
- [x] (S) 「→宿泊へ」ボタンを追加 → `lodgingCandidates`は`url`が必須項目のため、
      「→しおりへ」と同様にURL入力のみの簡易フォームを挟む。選択範囲のテキストは
      新規ドキュメントの`note`に設定する。作成後`scratchText`側は選択範囲のみ削除
- [x] (S) `docs/firestore-design.md`「雑多メモの振り分け方式の再設計」・
      `docs/screens.md`「雑多メモも単一共有テキスト」の記述を更新 → 対象タブが2つ→4つに
      増えたことを反映し、それぞれの振り分けロジック(即時追加/フォーム経由)を明記

      `src/views/scratch.js`に、選択範囲を対象にした4つのボタン(「→企画メモへ」
      「→行き先決めへ」「→しおりへ」「→宿泊へ」)を2行×2列の`.button-row`で配置。
      Playwrightで、選択範囲を「→行き先決めへ」で移動すると即座に候補地が作成され
      雑多メモから該当範囲のみ削除されること、「→宿泊へ」でURL入力フォームを挟んで
      宿泊候補(URLは入力値、メモは選択範囲)が作成されることを、実Firestoreで確認。
      未選択時にボタンを押すとエラー表示のみで何も起きないことも確認。375px幅でも
      4ボタンが2×2で折り返され横スクロール発生なし。console/pageerrorは0件
      (2026-08-19)。`npm run check`(lint・test)成功。検証で作成した候補地・宿泊候補は
      削除の上、旅行ドキュメントは名前を更新し`scratchText`を空文字にリセットして
      共有テストグループ`FMXRZYW7`内に残置。

## 23. デザイントークンの拡充(第5期)
- [x] (S) Google Fontsの「Zen Kaku Gothic New」(400;500;700;900)を
      `styles/tokens.css`に`@import`で追加し、`--font-family-base`をこれに変更
      (フォールバックとして既存の"Hiragino Sans"等は残す)。`--font-weight-heading`を
      700→900、`--font-weight-subheading`を600→700に強化
- [x] (S) `--color-primary-deep: #16234a`(藍のような濃紺)を新規追加。ヘッダー等、
      一部セクションの背景に使う想定(適用は`24`・`26`で行う)
- [x] (S) 差し色として`--color-accent-green: #4d9a7a`(青と調和する落ち着いた緑)を
      新規追加。既存の`--color-success`(意味的な「成功」表現)とは独立させ、
      装飾用の差し色として使う
- [x] (S) `--shadow-card`を、中立グレー系の影から`0 4px 14px rgb(29 78 216 / 10%)`
      (design-library.jpの実例を参考にした青みを帯びた影)に変更
- [x] (S) `--radius-pill: 999px`を新規追加し、`.rank-badge`(E画面の順位バッジ)に適用

      Playwrightで、375px/1200px幅ともにフォント(`Zen Kaku Gothic New`)が
      `getComputedStyle`で正しく適用されていること・横スクロールが発生しないこと・
      console/pageerrorが0件であることを確認。実Firestore(共有テストグループ
      `FMXRZYW7`)上のE(行き先決め)画面に検証用候補地を一時追加し★5投票することで、
      `rank-badge`がピル形状(`--radius-pill`)で表示され、`--shadow-card`の青みを
      帯びた影がカードに反映されていることを目視確認。検証後、候補地はFirestoreから
      削除済み(2026-08-19)。`npm run check`(lint・test)成功。

## 脆弱性対応(2026-08-19、人間との会話での指摘を受けタスク化)
- [x] (S) `src/views/itinerary.js`(しおりの場所URL)・`src/views/lodging.js`
      (宿泊候補・確定宿泊のURL)で、Firestoreの`url`/`locationUrl`をそのまま
      `link.href`に代入していた箇所を修正。新規`src/url.js`の`isSafeUrl()`で
      `http:`/`https:`スキームかどうかを判定し、安全な場合のみ`<a href>`として
      描画、それ以外は`<p class="candidate-link">`のプレーンテキストとして表示する
      (クリックしても何も起きない)ように変更。`<input type="url">`のブラウザ標準
      検証は`javascript:`のようなスキームを弾かない既知の穴のため
- [x] (S) `src/views/join.js`のグループ作成処理で、`groups/{groupCode}`ドキュメントに
      `creatorSecret`を保存したままにしないよう変更。`firestore.rules`の`create`時
      `get()`比較には引き続き必要なため作成リクエスト自体には含めるが、作成成功
      直後に新設の`removeField()`(`src/firestore.js`、`deleteField()`のラッパー)で
      フィールドごと削除する。削除自体が失敗してもグループ作成という主目的の成功
      通知は妨げない(削除失敗時はconsole.errorのみ)

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)上のG(宿泊)・H(しおり)
      画面に`javascript:alert(1)`を仕込んだ候補・しおり項目を一時追加し、
      `<a>`タグにならずプレーンテキスト表示になる(`href`属性が付与されない)ことを
      確認。同時に追加した通常のhttps URLは従来通りクリック可能なリンクとして描画
      されることも確認(正常系への影響なし)。検証で作成したデータはFirestoreから
      削除済み。`removeField()`のフィールド削除自体は、使い捨ての候補地ドキュメントに
      ダミーフィールドを追加→削除する形で別途動作確認し、削除後にフィールドが
      無くなっていることを確認(こちらも検証用ドキュメントは削除済み)。
      グループ作成処理自体(`creatorSecret`一致が必要)は、マスター合言葉をAI側が
      知らないため実機での完全なフロー確認はできていない(2026-08-18時点の記載と
      同じ、既知の制約)。`npm run check`(lint・test)成功。
      あわせて`eslint.config.js`に`URL`グローバルを追加(`src/url.js`の
      `new URL(...)`使用のため、既存のno-undefエラーを解消)。

- [x] (S) `firestore.rules`の`groups/{groupCode}`の`allow update`を`if true`から、
      `members`フィールドの追記・`creatorSecret`フィールドの削除のみに限定。
      Claude Codeの自動モード安全装置により自動デプロイはブロックされたため、
      人間が`npm run firebase:deploy:rules`を手動実行し本番環境(`trip-planner-cd9b7`)へ
      反映(2026-08-19)。デプロイ後、Playwrightで実Firestoreに対し、許可外フィールド
      (例: `evolveVerifyDisallowedField`)へのupdateが`permission-denied`で拒否される
      こと・`members`フィールドへの正規の追記(join.jsの参加フロー経由)は引き続き
      成功することの両方を確認。検証で追加したテスト用メンバー名はmembers配列から
      削除済み。

## 24. ヘッダーのテクスチャ強化(第5期)
- [x] (M) `pages/shared.css`の`.page-header`に、画像を使わないCSSのみの装飾を追加。
      `background-image`に`radial-gradient(circle, rgb(255 255 255 / 14%) 1px,
      transparent 1.5px)`(ドット柄、18px間隔)と`linear-gradient(135deg,
      --color-primary-deep, --color-primary-dark)`(斜めグラデーション)を重ね、
      `.page`の内側に収まるカード状のセクションとして塗った(ページ端まではみ出す
      フルブリードにはしていない)。濃色背景に合わせ、`.page-header h1`・
      `.page-header`内の`.back-link`の文字色を白系(`--color-surface`/半透明白)に
      変更(アプリ全体で唯一の`<h1>`なので、他画面への影響は無い)

      Playwrightで、375px/768px/1200px幅すべてでヘッダーのグラデーション・ドット柄・
      白文字が正しく表示され、横スクロールが発生しないことをスクリーンショットで確認。
      `back-link`(「← 旅行一覧」)が表示される旅行詳細ページ(C画面)でも、タブバー等
      他要素への視覚的な影響が無いことを確認。console/pageerrorは0件(2026-08-19)。
      `npm run check`(lint・test)成功。検証で参加した際に追加されたテスト用メンバー名は
      共有テストグループ`FMXRZYW7`のmembers配列から削除済み。

## 25. しおりタイムラインの装飾強化(第5期)
- [x] (S) H(しおり)画面のタイムラインマーカーを、単なる丸ドット(`.timeline-marker::before`)
      から、その日の何番目の予定かを示す連番バッジ(`.timeline-marker-badge`、
      `--radius-pill`の円形、`--color-primary`背景・白文字)に変更。時刻は既に予定
      タイトル側(`item.time item.title`)に表示済みのため、バッジ側は時刻の重複表示
      ではなく1日の中での連番(表示順のindex+1)にして時系列の見通しを補う形にした。
      `src/views/itinerary.js`の描画ループを`forEach`化し、日付ごとの並び順
      (時刻の早い順、時刻未入力は最後)そのままに連番を振る

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)上に時刻の異なる3件の
      しおり項目(09:00・14:00・時間未入力)を一時追加し、バッジが表示順通りに
      「1」「2」「3」と振られることを確認。375px/1200px幅ともに横スクロール・崩れなし、
      console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test)成功。検証データは
      Firestoreから削除済み(前サイクルの脆弱性検証で削除し忘れていた
      `javascript:alert(1)`テストデータも本サイクルで併せて削除した)。

## 26. コンテンツ内のダーク全面塗りセクション追加(第5期)
- [x] (S) 雑多メモタブ(`src/views/scratch.js`)の`<textarea>`を囲む`.card`に
      `scratch-card`クラスを追加し、`pages/shared.css`側で専用の濃色スタイルを適用。
      ヘッダー(`24`)と同系統の`--color-primary-deep`ベースの斜めグラデーション+
      `radial-gradient`のドット柄(画像不使用)を背景に、`<textarea>`本体は半透明の
      白背景+白文字+半透明白のplaceholderに変更(通常のカードと明確に見た目を
      分け、「一番よく使うメイン機能」に専用のブレインダンプらしい見た目を持たせた)。
      `.btn-secondary`(振り分けボタン)も白系のアウトライン表示に調整。
      `.error-text`/`.copy-feedback`は、既存の`--color-danger`/`--color-success`を
      文字色にすると濃紺背景とのコントラストが不十分になるため、同じトークンを
      背景色として使うチップ表示(白文字)に変更した(新規の色トークンは追加していない)。
      stylelintの`no-descending-specificity`対応のため、`.scratch-card`関連ルールは
      `pages/shared.css`末尾(元となる`.btn-secondary`等の定義より後ろ)に配置

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)上で雑多メモタブを開き、
      グラデーション・ドット柄・白文字のtextareaが表示されること、未選択でボタンを
      押した際のエラーチップが赤背景+白文字で視認性良く表示されることをスクリーンショットで
      確認。375px/1200px幅ともに横スクロール・崩れなし、console/pageerrorは0件
      (2026-08-19)。`npm run check`(lint・test)成功。検証で参加した際に追加された
      テスト用メンバー名は共有テストグループ`FMXRZYW7`のmembers配列から削除済み。

## 27-1. カレンダーピッカーコンポーネントの新規作成(第5期「27」の1つ目のサブタスク)
- [x] (M) 再利用可能なカレンダー日付選択コンポーネント`src/datePicker.js`を新規作成。
      `createDatePicker(container, options)`が月表示グリッドを描画し、
      `options.mode`で**単一選択モード**(既定。クリックで選択/再クリックで解除、
      `getValue()`が`"YYYY-MM-DD"`文字列かnullを返す。既存の`<input type="date">`と
      同じ形)と**複数選択モード**(クリックでトグル選択/解除、`getValue()`が
      日付配列(昇順)を返す)を切り替えられる。前月/翌月への移動ボタン、今日の日付への
      枠線ハイライトを実装。時間帯選択(jicoo.comのようなスロット表示)は今回のスコープに
      含めず日付選択のみとした。日付グリッド生成・月加算等の計算ロジック
      (`buildMonthGrid`/`addMonths`/`toDateString`/`parseDateString`)はDOM非依存の
      純粋関数として切り出し、`src/datePicker.test.js`にvitestの単体テスト(7件)を追加
      (月初の曜日オフセット・年またぎの月送り等を検証)。CSSは`pages/shared.css`に
      `.date-picker`系クラスを追加し、`--radius-pill`の円形ボタンでjicoo.com調査時の
      「格子状のピル型ボタン」パターンを踏襲(既存の色トークンのみ使用、新規色は追加せず)。
      まだどの画面にも組み込んでいない(次のサブタスクでF(日程調整)画面へ適用する)

      まだ画面に組み込んでいないため実Firestoreでの動作確認は対象外。代わりに
      Playwrightで、Vite dev server上の任意ページから`src/datePicker.js`を直接
      動的importし、単一選択モード(選択→同じ日を再選択して解除→別の日を選択)・
      複数選択モード(3件選択→1件解除で2件残る)・月送りナビゲーション(翌月→前月×2で
      年またぎも含め正しくラベルが変わる)・今日のハイライト表示・`destroy()`後に
      コンテナが空になることを、実際のブラウザでのクリック操作とスクリーンショットで
      確認。console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test、
      新規7件含む計12件)成功。Firestoreへの書き込みは発生しないコンポーネントのため
      検証データの後始末は不要。

## 27-2. F(日程調整)画面への複数選択モード適用(第5期「27」の2つ目のサブタスク)
- [x] (M) F(日程調整)画面の「候補日を追加」フォーム(`src/views/schedule.js`)を、
      `src/datePicker.js`の**複数選択モード**に置き換え。`<input type="date">`を
      `#date-picker-container`(datePickerの描画先)と`#selected-dates-chips`
      (選択済み日付のチップ一覧、`pages/shared.css`に新規`.chip`/`.chip-row`を追加)に
      差し替えた。フォームを開くたびに`datePicker.setValue([])`で選択状態をリセットする
      (月の表示状態自体はF画面滞在中維持される)。「追加する」押下時、選択された日付を
      既存の`currentEntries`と突き合わせて重複を除外し、新規分だけ`setDocumentMerged`を
      ループで呼ぶ(既存の重複チェックのロジックは維持しつつ、単一→複数に対応させた)。
      全選択日が重複していた場合のみエラー表示、一部重複は無言でスキップして新規分のみ
      追加する(chip等での重複通知UIは今回追加していない)。保存する
      Firestoreデータ形式(`scheduleEntries/{date}`、1ドキュメント=1日付)自体は不変

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)上で3日分を複数選択し
      チップに正しく表示されることを確認した上で送信し、3件のscheduleEntriesが作成され
      一覧に反映されることを確認。続けて「既存1件+新規1件」を選択して送信すると
      エラー無しで新規1件のみ追加されること(重複は無言スキップ)、「既存日のみ」を
      選択して送信すると「選択した日付はすべてすでに候補にあります。」のエラーが出て
      何も追加されないことを確認。375px/1200px幅ともに横スクロール・崩れなし、
      console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test)成功。検証で
      作成した候補日(scheduleEntries 4件)・テスト用メンバー名はFirestoreから削除済み。

## 27-3. G/Hへの単一選択モード展開(第5期「27」の3つ目・最後のサブタスク)
- [x] (S) F画面での運用実績(複数選択モードの実装・実Firestoreでの検証)を踏まえ、
      G(宿泊)・H(しおり)にも展開すると判断した(コンポーネント自体は単一選択モードを
      既にサポート済みで追加のJSロジックが不要、かつF画面だけ独自の見た目になり他画面の
      ネイティブ`<input type="date">`と混在する方が一貫性を欠くと判断したため)。
      - `src/views/itinerary.js`(H・しおり項目の日付): `<input type="date"
        id="item-date">`を`createDatePicker(container, { mode: 'single' })`に置き換え
      - `src/views/lodging.js`(G・確定宿泊のチェックイン/チェックアウト): 2つの
        `<input type="date">`をそれぞれ独立した単一選択モードのpickerインスタンスに
        置き換え(`stayCheckInPicker`/`stayCheckOutPicker`)
      - どちらも、フォームを開くたびに`picker.setValue(null)`でリセットする既存の
        `closeForm()`パターンを踏襲。アンマウント時に`picker.destroy()`を呼ぶ
      - 保存するFirestoreデータ形式(`itineraryItems.date`・`confirmedStays.checkIn`/
        `checkOut`、いずれも"YYYY-MM-DD"文字列)は不変

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)上で、H画面は日付選択→
      しおり項目作成が成功すること・日付未選択時のバリデーション(「やること名と日付を
      入力してください。」)が引き続き機能することを確認。G画面はチェックイン/
      チェックアウトの2つのpickerが独立して動作し(片方の月送りがもう片方に影響しない)、
      チェックアウトがチェックインより後の日付を選んだ確定宿泊が正しく作成されることを
      確認。375px/1200px幅ともに横スクロール・崩れなし、console/pageerrorは0件
      (2026-08-19)。`npm run check`(lint・test)成功。検証で作成したしおり項目・確定宿泊・
      テスト用メンバー名はFirestoreから削除済み。あわせて、2026-08-19 15:15
      (脆弱性対応サイクル)の動作確認時に削除し忘れていた宿泊候補のテストデータ2件
      (`javascript:alert(1)`のURLを含む「-危険URL」、正常系確認用の「-正常URL」)を
      発見し、本サイクルで併せて削除した(過去2回、動作確認で作成した検証データの削除
      漏れが発生している。原因は毎回`listCollection`で取得した`trips`配列の`[0]`番目を
      対象trip決め打ちにしていたこと。Firestoreの`getDocs`は明示的な`orderBy`が無いと
      返却順序が実行のたびに変わりうるため、削除時に`[0]`が検証時と同じtripを指すとは
      限らない。以降は、対象tripが不明な場合は全trip横断で検索してから削除する、または
      検証直後にその場でtripIdを控えておく運用に切り替える)。

## 28. カレンダーピッカーをコンパクトにする(第6期)
- [x] (S) 人間から「カレンダーデカすぎる」との指摘を受け、`pages/shared.css`の
      `.date-picker`系CSSを調整。`.date-picker`本体に`max-width: 280px`、
      `.date-picker-day`に`max-width: 32px`+`margin: 0 auto`を追加し、7分割グリッドの
      列幅がどれだけ広がっても日付セルは32px×32pxの固定サイズに収まるようにした。
      あわせて月送りボタン(`.date-picker-nav`)を32px→24px、グリッドの`gap`を
      `--space-xs`(4px)→2px、月ラベル・曜日行・日付の文字サイズも一段階小さくし、
      全体のバランスを整えた(色は既存トークンのみ使用、サイズ値は既存コードの慣例
      通り生の数値で指定)。F(候補日を追加)・G(確定宿泊のチェックイン/チェックアウト、
      独立した2つのpickerが並ぶ)・H(しおりの日付)すべてに影響する共通コンポーネントの
      ため、3画面とも確認

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)上のF/G/H画面それぞれで
      フォームを開き、`getBoundingClientRect()`で日付セルが375px/1200px幅どちらでも
      32px×32pxで固定されていることを数値で確認。スクリーンショットで、フォーム内の
      他要素(input・button等)と比べて違和感のないコンパクトさになっていること、
      Gの2つ並んだカレンダーも横スクロールなく収まっていることを目視確認。
      console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test)成功。検証用
      メンバー名は削除済み。

## 29. 雑多メモだけ背景色があり企画メモは無い、という非対称さの見直し(第6期)
- [x] (S) 「雑多メモだけ背景色あって、企画メモとかは何もない」との指摘を受け、
      `26`で雑多メモ専用に導入した`.scratch-card`を、両画面で使える汎用的な
      `.card-dark`に改称(`pages/shared.css`)。`src/views/scratch.js`・
      `src/views/notes.js`双方の`<textarea>`を囲む`.card`に`card-dark`クラスを
      追加し、同じ濃色グラデーション+ドット柄の見た目に揃えた(雑多メモ側の演出を
      控えめにする案もあったが、既に完成済みの雑多メモの見た目を変えず、企画メモを
      合わせる方を選択。企画メモには振り分けボタンが無いため`.card-dark
      .btn-secondary`系のルールは単に適用対象が無いだけで実害なし)

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)上のD(企画メモ)画面が
      雑多メモと同じ濃色グラデーション+ドット柄+白文字で表示されることをスクリーン
      ショットで確認。375px/1200px幅ともに横スクロール・崩れなし、console/pageerrorは
      0件(2026-08-19)。`npm run check`(lint・test)成功。検証用メンバー名は削除済み。
      これで第6期(第5期リリース後の見た目フィードバック対応)は全タスク完了。

## 31-1. サイドバー(768px以上)への刷新(第7期「31」の1つ目のサブタスク)
- [x] (M) `index.html`に`#sidebar`(`.sidebar`)要素を新規追加し、`<main class="page">`
      と並ぶ形にした。`pages/shared.css`で`body`を768px以上のみ`display: flex`にし、
      `.sidebar`(768px未満は非表示、以上で`position: sticky`の縦並びナビゲーション、
      幅220px)+`.page`(`flex: 1`)の2カラムレイアウトに再構成。768px以上では
      `.tabbar`(横タブバー)を`display: none`にして重複表示を防いだ。`src/app.js`の
      `renderTabbar()`を拡張し、既存の`TABS`配列から`#tabbar`用DOMと`#sidebar`用DOM
      (`.sidebar-link`/`.sidebar-link-active`)を同時に描画するようにした
      (`hideTabbar()`も両方を隠すよう対応)。色トークン(`--color-*`)は一切変更して
      いない。`docs/screens.md`「画面遷移」のタブ=ルート対応も不変(ナビゲーションの
      見た目・配置のみの変更)

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)上で、375px幅では
      サイドバー非表示・横タブバー表示、768px/1200px幅ではサイドバー表示(7項目)・
      横タブバー非表示になることを`getComputedStyle`で確認。サイドバーのリンクを
      クリックして実際にE(行き先決め)画面へ遷移できること、現在のタブに
      `sidebar-link-active`が正しく付くことを確認。雑多メモ・企画メモ・E・F・G・Hの
      6画面すべてを1200px幅でスクリーンショット確認し、`.card-dark`(26/29)・
      `.card-grid`(20)・タイムライン(H)等の既存レイアウトがサイドバー導入後も
      崩れていないことを確認。全幅で横スクロールなし、console/pageerrorは0件
      (2026-08-19)。`npm run check`(lint・test)成功。検証用メンバー名は削除済み。
      残りのサブタスク(モバイルのハンバーガーメニュー化、アクセシビリティ確認)は
      次サイクル以降に持ち越し。

## 31-2/31-3. モバイルのハンバーガーメニュー化・アクセシビリティ確認(第7期「31」の
残り2サブタスク、まとめて完了)
- [x] (M) 768px未満の横タブバー(`.tabbar`/`.tab`/`.tab-active`)を完全に撤去し、
      `#sidebar`をハンバーガーボタン(`#menu-toggle`。`icons.js`に`menu`/`close`
      アイコンを新規追加)で開閉するドロワーとして共用する形にした。`index.html`から
      `#tabbar`要素を削除、`pages/shared.css`から`.tabbar`/`.tab`系ルールを削除し、
      代わりに`.sidebar.sidebar-open`(モバイルでの固定ドロワー表示。
      `position: fixed`+スライドイン相当の見た目、`box-shadow`で浮かせる)・
      `.sidebar-backdrop`(半透明の背景オーバーレイ)・`.menu-toggle`(ヘッダー内の
      アイコンボタン、`--color-surface`で白文字)を追加。`src/app.js`に
      `openMenu()`/`closeMenu()`を実装し、ボタンクリック・バックドロップクリックで
      開閉、`renderNav()`(旧`renderTabbar`から改名)実行時(=画面遷移時)に自動で
      閉じるようにした。768px以上では`.sidebar-open`が付与されないため、常設サイドバー
      表示は影響を受けない
- [x] (S) キーボード操作のアクセシビリティを確認・対応。まずEscキーでの
      ドロワークローズを実装。動作確認の過程で、ドロワーを開いた直後にTabキーを押すと
      フォーカスがドロワー内ではなく背景コンテンツ側へ抜けてしまう不具合を発見
      (`#sidebar`がDOM上`<main>`より前にあり、フォーカス中のハンバーガーボタンから
      Tabで進むと`#sidebar`を飛び越えて`<main>`側の要素に移動してしまうため)。
      対応として、(1) `openMenu()`実行時にドロワー内の最初のリンクへ自動フォーカスする、
      (2) モバイルのドロワー表示中(`.sidebar-open`付与時)のみ、`keydown`で独自に
      Tab/Shift+Tabを処理し、ハンバーガーボタン⇔各リンクの範囲でフォーカスを循環させる
      (簡易フォーカストラップ)を実装した。768px以上の常設サイドバー表示時は
      `.sidebar-open`が付かないため、この制御の対象外(通常のTab移動のまま)

      Playwrightで、375px幅でハンバーガーボタンのクリック開閉・バックドロップ
      クリックでの閉じる・Escキーでの閉じる・ドロワー内リンククリックでの画面遷移+
      自動クローズを確認。キーボード操作では、ハンバーガーボタンにフォーカスして
      Enterで開く→自動的にドロワー内の最初のリンクにフォーカスが移る→Tabキーで
      ドロワー内のリンク間のみをフォーカスが循環する(背景コンテンツへ抜けない)→
      Enterキーで該当画面へ遷移しドロワーが自動的に閉じることを確認。また、
      ハンバーガーボタン追加により375px幅でヘッダータイトルが2行に折り返す
      レイアウト崩れを発見し、`.page-header h1`に`text-overflow: ellipsis`
      (`white-space: nowrap`+`min-width: 0`)を追加して1行に収めた(768px以上の
      広い画面ではハンバーガーボタンが無いため省略されず全文表示されることも確認)。
      768px/1200px幅では引き続きサイドバーが`position: sticky`の常設表示のまま、
      ハンバーガーボタンは非表示であることも再確認。console/pageerrorは0件
      (2026-08-19)。`npm run check`(lint・test)成功。検証用メンバー名は削除済み。
      これで「31」(第7期)は全サブタスク完了。

## 第8期-1. Firestore購読用共通関数の追加
- [x] (M) `src/firestore.js`に`subscribeToDocument(path, onData, onError)`・
      `subscribeToCollection(collectionPath, onData, onError)`を新規追加。
      内部でFirebase SDKの`onSnapshot`を使い、ドキュメント/コレクションの変更が
      あるたびに、既存の`getDocument`/`listCollection`と同じデータ形
      (`{ id, ...data }`または`[{ id, ...data }, ...]`)でコールバックを呼ぶ。
      どちらも呼び出し側が保持すべき`unsubscribe`関数を返す(呼び出し側の
      アンマウント時クリーンアップで呼ぶ想定)。既存の`getDocument`/`listCollection`
      (一回きりの取得)はそのまま残し、単発取得が必要な箇所(例: 参加時のグループ
      存在チェック等)では引き続き使う。まだどの画面にも組み込んでいない

      まだ画面に組み込んでいないため、Playwrightで2つの独立したブラウザページ
      (実Firestore・共有テストグループ`FMXRZYW7`内の使い捨てコレクション
      `realtimeTestDocs`を使用)を使い、擬似的に「別ユーザーの操作がリアルタイムに
      届くか」を検証した。ページBで`subscribeToDocument`を購読開始した状態で、
      ページA(別のブラウザページ、リロードなし)がFirestoreへ`updateDocument`で
      書き込むと、ページBのコールバックがリロード無しで新しい値を受信することを確認。
      `unsubscribe()`実行後は、ページAがさらに書き込んでもページBのコールバックが
      呼ばれないことを確認。`subscribeToCollection`も同様に、ページAが
      `addDocument`で新規ドキュメントを追加すると、ページBの購読コールバックが
      件数の変化(1→2)をリロード無しで受信することを確認。console/pageerrorは0件
      (2026-08-19)。`npm run check`(lint・test)成功。検証で使った使い捨て
      コレクション(2ドキュメント)・テスト用メンバー名2件(2ページ分)は、全trip
      横断で検索してFirestoreから削除済み。

## 第8期-2. 雑多メモ・企画メモのリアルタイム化
- [x] (M) `src/views/notes.js`(企画メモ)・`src/views/scratch.js`(雑多メモ)の
      初期読み込みを、`getDocument`(一回きりの取得)から`subscribeToDocument`
      (リアルタイム購読)に置き換えた。購読コールバックは初回スナップショット
      (`isFirstSnapshot`フラグで判定)で従来の初期表示処理(値のセット、
      `textarea.disabled = false`)を行い、2回目以降は「自分が編集中(未保存の
      変更がある=`saveTimer !== null`、またはテキストエリアにフォーカス中)なら
      上書きしない、リモート値が現在の`lastSavedValue`と同じなら何もしない」
      ガードを通してから`textarea.value`と`lastSavedValue`を更新する
      (タスクで要求されていた「自分の入力中に他人の更新が届いた場合の扱い」への
      対応)。雑多メモ側の各振り分けボタン(→企画メモへ、等)は元々
      `updateDocument`後に`lastSavedValue`を明示的に更新しているため、その書き込みが
      購読経由でエコーされてもリモート値と`lastSavedValue`が一致し無視される
      (二重適用・ちらつきなし)。アンマウント時は`unsubscribe()`を呼ぶ

      Playwrightで、2つの独立したブラウザページ(実Firestore・共有テストグループ
      `FMXRZYW7`)を使い、(1) 企画メモ・雑多メモそれぞれで、ページAが入力→デバウンス
      保存すると、ページBの画面がリロード無しで自動的に同じ内容へ更新されること、
      (2) ページBがテキストエリアに未保存の入力を持っている間にページAが更新すると、
      ページBの入力内容が上書きされず保持されること(「自分の未保存分を壊さない」
      ガードの動作)を確認。検証で書き込んだ内容は、検証前に取得しておいた元の
      `scratchText`/`planningNotesText`へ検証後に復元し、値が一致することを確認。
      console/pageerrorは0件(2026-08-19)。`npm run check`(lint・test)成功。
      テスト用メンバー名2件は削除済み。

## 第8期-3. E(行き先決め)・F(日程調整)のリアルタイム化
- [x] (M) `src/views/destinations.js`・`src/views/schedule.js`の一覧取得を、
      `listCollection`(一回きりの取得)から`subscribeToCollection`(リアルタイム購読)に
      置き換えた。あわせて、以前は追加・投票・回答のたびにローカル配列
      (`currentDestinations`/`currentEntries`)を楽観的に更新して即座に再描画していたが、
      購読が自分自身の書き込みも(ローカルキャッシュ経由でほぼ即時に)エコーして
      くるため、二重更新・ちらつきの原因になる。そのため各書き込み処理
      (`onDestinationSubmit`・`castVote`・`onDateSubmit`・`setResponse`)からローカル
      配列の更新・再描画呼び出しを削除し、**購読コールバックによる再描画のみに一本化**
      した。初回スナップショット到達時のみ`submitButton.disabled = false`にする
      (`isFirstSnapshot`フラグ)という、初回ロード完了までフォーム投稿を止める既存の
      挙動は維持。F側は候補日一覧とは別ドキュメントの`groups/{code}`から取得する
      `memberCount`(全員回答済み判定用)を先に一度だけ取得してから購読を開始する形にした
      (`memberCount`取得の失敗時も、候補日一覧自体は表示できるよう0のまま継続する)。
      アンマウント時にそれぞれ`unsubscribe`を呼ぶ

      Playwrightで、2つの独立したブラウザページ(実Firestore・共有テストグループ
      `FMXRZYW7`)を使い、E画面はページAが候補地を追加するとページBの画面にリロード
      無しで表示されること、ページBが★5投票するとページAの画面にスコア・投票者名が
      リロード無しで反映されることを確認。F画面はページAが候補日を追加するとページBに
      表示されること、ページBが○回答するとページAに「(名前): ○」がリロード無しで
      反映されることを確認。console/pageerrorは0件(2026-08-19)。`npm run check`
      (lint・test)成功。検証で作成した候補地1件・候補日1件・テスト用メンバー名2件は
      Firestoreから削除済み。

## 第8期-4. G/H/C/Bへの展開判断・全画面のunsubscribe確認
- [x] (S) G(宿泊)・H(しおり)・C(概要)・B(旅行一覧)への展開要否を判断。
      **G・Hは展開する**(E・Fと同じく複数人が同時に候補を追加・確認する使い方の
      画面のため。第7期のタスク`32`として新規作成)。**C(概要)・B(旅行一覧)は
      見送り**(Cは明示的な「編集」ボタン経由の単発更新で編集頻度が低く、Bは
      一覧を眺めるだけの場面が多く同時編集と衝突しにくいため、リアルタイム化の
      効果が薄いと判断)
- [x] (S) 現在リアルタイム購読を持つ4画面(雑多メモ・企画メモ・行き先決め・
      日程調整)について、`subscribeToDocument`/`subscribeToCollection`の呼び出しと
      対応する`unsubscribe()`呼び出しが、各ビューの`return () => {...}`
      (アンマウント時クリーンアップ)に漏れなく含まれていることをコードで確認
      (`grep`で全ビューを横断確認)。あわせて`src/router.js`を確認し、ルート切り替え
      のたびに新しいビューをマウントする前に必ず前のビューのクリーンアップ関数を
      呼ぶ実装になっている(購読の張りっぱなしが起きない構造)ことも確認した

      Playwrightで、雑多メモ・企画メモ・行き先決め・日程調整の4画面を3周
      (計12回)行き来し、購読の張り直し・解除を繰り返してもconsole/pageerrorが
      発生しないことを実Firestoreで確認(2026-08-19)。`npm run check`(lint・test)
      成功。検証用メンバー名は削除済み。これで第8期の既存4サブタスクは全て完了。
      新たに追加した`32`(G/Hのリアルタイム化)は次サイクル以降に着手する。

## 32. G(宿泊)・H(しおり)のリアルタイム化
- [x] (M) `src/views/lodging.js`の宿泊候補(`lodgingCandidates`)・確定宿泊
      (`confirmedStays`)、2つの独立したコレクションをそれぞれ`subscribeToCollection`
      化した(候補と確定宿泊は別コレクションのため、それぞれ独立した購読・
      `isFirstCandidatesSnapshot`/`isFirstStaysSnapshot`フラグ・`unsubscribe`を持つ)。
      E/Fと同様、追加時の楽観的ローカル配列更新は撤去し、購読による再描画のみに
      一本化した
- [x] (M) `src/views/itinerary.js`の`itineraryItems`コレクションを
      `subscribeToCollection`化した。同様に楽観的ローカル更新を撤去。アンマウント時に
      `unsubscribeItems()`を呼ぶ(既存の`datePicker.destroy()`と並べて配置)

      Playwrightで、2つの独立したブラウザページ(実Firestore・共有テストグループ
      `FMXRZYW7`)を使い、G画面はページAが宿泊候補・確定宿泊をそれぞれ追加すると
      ページBの画面にリロード無しで表示されることを確認。H画面はページAがしおり
      項目を追加するとページBに表示されることを確認。console/pageerrorは0件
      (2026-08-19)。`npm run check`(lint・test)成功。検証で作成した宿泊候補1件・
      確定宿泊1件・しおり項目1件・テスト用メンバー名2件はFirestoreから削除済み。
      これで第8期(リアルタイム同期)は全タスク完了(共有ドキュメント2画面+
      コレクション購読4画面、計6画面がリアルタイム化された。残るC・Bは効果が薄いと
      判断し見送り済み)。

## 33. 雑多メモ・企画メモのリモート更新ガードが過剰(フォーカスのみで反映が止まる)
- [x] (S) `src/views/notes.js`・`src/views/scratch.js`のリモート更新反映条件から
      `isFocused`のチェックを外し、「未保存の変更があるか(`saveTimer !== null`)」
      だけで判定するように修正した。フォーカス中でも未保存の変更が無ければ
      (テキストエリアの中身が`lastSavedValue`と一致していれば)下から書き換わる
      ようになった

      Playwrightで、2つの独立したブラウザページ(実Firestore・共有テストグループ
      `FMXRZYW7`)を使い、雑多メモ・企画メモそれぞれについて、ページBのテキストエリアに
      フォーカスしただけ(未入力)の状態でページAが更新すると、ページBの表示が
      リロード無しで反映されることを確認(2026-08-20)。console/pageerrorは0件。
      `npm run check`(lint・test)成功。検証用テキストはFirestore上で空文字列に
      リセット済み。

## 34. 雑多メモの振り分けを「カット」ではなく「コピー」にする
- [x] (S) `src/views/scratch.js`の4つの振り分けボタン(→企画メモへ・→行き先決めへ・
      →しおりへ・→宿泊へ)すべてで、移動先への追加はそのまま維持しつつ、雑多メモ側の
      テキストを削除する処理(`removeSelectionLocally`の呼び出しと、それに伴う
      `scratchText`の`updateDocument`)を撤去し、選択範囲を雑多メモ側にも残す(コピー)
      ようにした。`docs/firestore-design.md`「雑多メモの振り分け方式の再設計」・
      `docs/screens.md`「雑多メモも単一共有テキスト」もカット→コピーに変更した旨を
      反映して更新した

      Playwrightで、雑多メモに"TESTNOTE TESTDEST TESTITIN TESTLODGE"という
      検証用テキストを入力し、各セグメントを選択して4つの振り分けボタンをそれぞれ
      実行、いずれの操作後も雑多メモの全文が元のまま変化していないこと(完全な
      コピー動作)・企画メモ/行き先決め/しおり/宿泊の各タブに移動先のデータが
      正しく作成されていることを実Firestore(共有テストグループ`FMXRZYW7`)で確認
      (2026-08-20)。console/pageerrorは0件。`npm run check`(lint・test)成功。
      検証で作成した候補地1件・しおり項目1件・宿泊候補1件はFirestoreから削除済み、
      雑多メモ・企画メモのテキストは空文字列にリセット済み。

## 35. 雑多メモ「→しおりへ」の簡易フォームがカスタムカレンダーピッカーになっていない
- [x] (S) `src/views/scratch.js`の`#to-itinerary-date`(ブラウザ標準の
      `input type="date"`)を、`src/datePicker.js`の単一選択モードに置き換えた。
      `src/views/itinerary.js`の`#item-date-picker`と同じ実装パターン(フォーム
      開閉時の`setValue(null)`によるリセット、アンマウント時の`destroy()`)を踏襲

      Playwrightで、「→しおりへ」フォームにネイティブの`input[type="date"]`が
      存在しないこと・代わりにカスタムカレンダーピッカー(`.date-picker`)が
      描画されていること・日付セルをクリックして送信すると、しおりタブに正しい
      日付の項目が作成されることを実Firestore(共有テストグループ`FMXRZYW7`)で確認
      (2026-08-20)。console/pageerrorは0件。`npm run check`(lint・test)成功。
      検証で作成したしおり項目はFirestoreから削除済み。

## 36. ハンバーガーメニューの開閉にアニメーションを追加
- [x] (S) `.sidebar`(モバイルのドロワー状態)を、モバイル幅では常時DOM上に
      `display: flex`で描画したまま、`transform: translateX(-100%)`(閉)⇔
      `translateX(0)`(開)+`transition: transform 0.25s ease`で開閉させる方式に
      変更した。閉状態は`pointer-events: none`にして誤操作を防いでいる。
      `#sidebar-backdrop`も同様に`opacity`のフェード(`sidebar-backdrop-visible`
      クラスのトグル。`src/app.js`のopenMenu/closeMenuが`hidden`属性の代わりに
      このクラスをトグルするよう変更)で開閉させた。768px以上の常設サイドバー
      表示では`transform: none; transition: none;`で上書きし、アニメーションを
      無効化して常時表示のまま維持している。旅行未選択の画面での`sidebar.hidden`
      (nav自体を消す)は、author側の`display: flex`が`[hidden]`属性のUAスタイル
      より優先されてしまうため、`.sidebar[hidden] { display: none; }`を明示的に
      追加して対処した

      Playwrightで、モバイル幅(375px)で①閉状態は`transform`がオフスクリーン
      (`matrix(1, 0, 0, 1, -220, 0)`)・`pointer-events: none`・バックドロップ
      `opacity: 0`であること、②ハンバーガーボタンで開くと`transform`が解除され
      (`matrix(1, 0, 0, 1, 0, 0)`)・`pointer-events: auto`・バックドロップ
      `opacity: 1`になり、実際にサイドバー内リンクがクリックできること、③タブ
      遷移後は自動的に閉状態に戻ること、④バックドロップをクリックしても閉じる
      こと、⑤768px以上では常に`display: flex`・`transform: none`・
      `pointer-events: auto`でハンバーガーボタン自体が非表示になること、⑥旅行
      未選択の画面(旅行一覧)では`#sidebar`が`display: none`のままであること、を
      確認した(2026-08-20)。console/pageerrorは0件。`npm run check`(lint・test)
      成功。

## 37. タブ(画面)遷移にもアニメーションを追加
- [x] (M) `src/router.js`の`render()`で、ビューのマウント直後に`#view`へ
      `view-enter`クラスを付け直す方式(選択肢(a): 全ビュー共通、ビュー側の実装
      変更は不要)を採用した。同じクラスを連続で付け直してもCSSアニメーションは
      再生されないため、一度`classList.remove`してから`offsetWidth`読み取りで
      リフローを強制し、`classList.add`し直している。`pages/shared.css`に
      `@keyframes view-enter`(フェードイン+8pxの`translateY`、0.2s ease)を追加し、
      `prefers-reduced-motion: reduce`環境ではアニメーションを無効化する

      Playwrightで、概要タブ表示直後・企画メモタブへの遷移直後いずれも`#view`に
      `.view-enter`クラスが付与され、`getComputedStyle(view).animationName`が
      `view-enter`になっていることを確認した(2026-08-20)。console/pageerrorは
      0件。`npm run check`(lint・test)成功。これで第9期(運用フィードバック
      その2)は全タスク完了。

## 38. 雑多メモ「→しおりへ」の簡易フォームで日付以外も入力できるようにする
- [x] (S) `src/views/scratch.js`の`#to-itinerary-form`に、`src/views/itinerary.js`と
      同様の時間目安(午前/午後・時・分の3セレクトボックス)・場所リンク(任意)・
      メモ(任意)の入力欄を追加した。時間セレクトの選択肢配列(`HOUR_OPTIONS`・
      `MINUTE_OPTIONS`)と`buildTimeString()`(3セレクト→"HH:MM"文字列への変換)は
      `src/views/itinerary.js`に重複定義されていたため、新規`src/timeSelect.js`に
      切り出し、両ビューから共用する形にした(あわせて編集フォームのプリフィル用に
      `parseTimeString()`("HH:MM"→3セレクトの値への逆変換)も追加。`39`で使用)。
      タイトルは引き続き雑多メモの選択範囲をそのまま使う(編集不可のまま)

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、「→しおりへ」
      フォームに時間目安3セレクト・場所リンク・メモの入力欄が存在すること、それぞれに
      値(19:30・URL・メモ文)を入力して送信すると、しおりタブの該当項目に正しく
      反映されることを確認した(2026-08-20)。console/pageerrorは0件。`npm run check`
      (lint・test)成功。

## 39. しおり項目の編集・削除機能を追加
- [x] (M) `src/views/itinerary.js`にしおり項目のカードごとの「編集」「削除」ボタンを
      追加した。編集は既存の追加フォーム(`#item-form`)を再利用し、`editingItemId`
      (null=新規追加モード)の有無で送信ボタンの文言(「追加する」⇔「保存する」)・
      `addDocument`/`updateDocument`の呼び分けを行う。`openFormForEdit(item)`が
      タイトル・日付(`datePicker.setValue`)・時間目安(`parseTimeString`で逆変換)・
      場所リンク・メモをフォームへ流し込む。編集時は`addedBy`(追加者)を更新ペイロード
      に含めず、元の追加者名を保持する。削除は`window.confirm()`による確認後、
      `src/firestore.js`に新規追加した`deleteDocument(path)`(`deleteDoc`のラッパー)を
      呼ぶ。`firestore.rules`は`{subcollection}/{docId}`の`update`/`delete`をすでに
      `if true`で許可済みのため、ルール変更は無し

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、しおり項目の
      「編集」ボタンを押すとフォームにタイトル・日付・時間・場所リンク・メモが
      正しくプリフィルされ送信ボタンが「保存する」になること、メモを書き換えて
      保存すると一覧に反映されaddedByは元のまま保たれること、通常の「追加」ボタンから
      開くと送信ボタンが「追加する」に戻ること、「削除」ボタン→確認ダイアログでOKする
      と項目が削除され空状態表示になることを確認した(2026-08-20)。console/pageerrorは
      0件。`npm run check`(lint・test)成功。これで第10期は全タスク完了。

## 40. D〜H各機能の件数サマリーカード
- [x] (S) `src/views/tripOverview.js`に、集合情報・割り勘リンクカードの上に
      D〜H各機能(行き先決め・日程調整・宿泊・しおり)の件数サマリーカードを追加した。
      `SUMMARY_TABS`定義に沿って`listCollection`で各サブコレクション
      (`destinations`・`scheduleEntries`・`lodgingCandidates`・`confirmedStays`・
      `itineraryItems`)を一度きり取得し(概要タブ自体は第8期でリアルタイム購読を
      見送り済みのため、他のB画面等と同じ一度きり取得の方針を踏襲)、「候補地○件」
      「候補日○件」「候補 ○件・確定 ○件」「○件」を表示する。各カードは既存の
      `.card`・`.card-link`・`.trip-card`・`.trip-card-chevron`クラスを再利用した
      タップ可能なリンク(該当タブへ遷移)。新規フィールド追加は無し

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、初期状態で
      4枚とも「0件」表示になること、サマリーカードのクリックで該当タブ(行き先決め)へ
      遷移すること、行き先決めタブで候補地を1件追加した後に概要タブへ戻ると
      サマリーが「候補地 1件」に更新されることを確認した(2026-08-20)。
      console/pageerrorは0件。`npm run check`(lint・test)成功。

## 41. 集合情報・割り勘リンクの2カラム化
- [x] (S) `src/views/tripOverview.js`の集合情報・割り勘リンクの2つの`<section
      class="card">`を、既存の`.card-grid`共通クラスを持つ`<div>`で囲んだ。
      768px以上では2カラム、1024px以上では既存の`.card-grid`の仕様通り(このページは
      要素が2つしか無いため実質2カラムのまま)、375px未満(モバイル)では従来通り縦積み。
      新規CSSは追加していない(既存の`.card-grid`ルールをそのまま利用)

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、1024px幅では
      集合情報・割り勘リンクの2カードの上端が揃い割り勘リンクが右側に配置される
      (横並び)こと、375px幅では従来通り縦積みのままであることを確認した
      (2026-08-20)。console/pageerrorは0件。`npm run check`(lint・test)成功。

## 42. 旅行名エリアの装飾強化
- [x] (S) `src/views/tripOverview.js`の`.trip-name-row`に、既存の`.card`・
      `.card-dark`クラスを追加しただけで、`.page-header`と同系統の
      `--color-primary-deep`グラデーション+ドット柄・白文字・`.btn-secondary`の
      コントラスト調整(いずれも`.card-dark`に既存)を適用できた。新規CSSの追加は
      不要だった

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、
      `.trip-name-row`に`card`/`card-dark`クラスが付与されグラデーション背景
      (`background-image`に`gradient`を含む)が適用されていること、旅行名の文字色が
      白(`rgb(255, 255, 255)`)になっていることを確認した(2026-08-20)。
      console/pageerrorは0件。`npm run check`(lint・test)成功。これで第11期
      「C. 概要タブ」の3タスクは全て完了。

## 45. (取り下げ)`.card-dark`内テキストエリアのフォーカス時強調
2026-08-20、実装検討で`pages/shared.css`の`.card-dark textarea:focus`
(`border-color: var(--color-surface); box-shadow: 0 0 0 3px rgb(255 255 255 / 20%);`)
としてすでに実装済みであることが判明したため、追加対応不要と判断し取り下げた。

## 46. (保留)簡易Markdown風装飾
2026-08-20、実装検討で「雑多メモ・企画メモはどちらも常時編集可能な`<textarea>`で
表示しており、特定の行だけをCSSで強調することは技術的に不可能」と判明したため保留
とした。詳細はdocs/ROADMAP.md末尾の検討事項リスト(`65`と統合)参照。

## 48. 雑多メモ・企画メモの視覚的差別化
- [x] (S) `pages/shared.css`に`.card-dark-accent`(既存の`--color-accent-green`と
      `--color-primary-deep`を使ったグラデーション)・`.card-dark .icon-heading`
      (見出しの下マージン)を追加。`src/views/notes.js`の企画メモカードに
      `card-dark-accent`クラスと`${icons.notes}企画メモ`の見出しを、
      `src/views/scratch.js`の雑多メモカードに`${icons.scratch}雑多メモ`の見出しを
      追加した(雑多メモ側は配色そのまま、企画メモ側だけ緑寄りにグラデーションを
      差し替えて視覚的に差別化)。新規の色トークンは追加していない

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、雑多メモ
      タブに「雑多メモ」見出しが表示されデフォルトの`.card-dark`のままであること、
      企画メモタブに「企画メモ」見出しが表示され`.card-dark-accent`クラスが付与
      されグラデーション背景が適用されていることを確認した(2026-08-20)。
      console/pageerrorは0件。`npm run check`(lint・test)成功。

## 53. 自分が未回答の候補日をハイライト
- [x] (S) `src/views/schedule.js`の`renderEntries()`で、自分(`myKey`)がまだ
      回答していない候補日のカードに`.schedule-unanswered`クラス(`--color-accent`
      の左ボーダー)と「あなたは未回答です」バッジ(`.unanswered-badge`)を追加した。
      `pages/shared.css`に既存の`.schedule-complete`/`.complete-badge`と対になる
      `.schedule-unanswered`/`.unanswered-badge`を追加(既存トークンのみ使用)。
      全員回答済み(`isComplete`)なら自分の回答も含まれているはずのため、通常この
      2つの状態は同時には起きない

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、候補日を
      追加した直後は2件とも「あなたは未回答です」バッジと`.schedule-unanswered`が
      付いていることを確認した(2026-08-20)。console/pageerrorは0件。
      `npm run check`(lint・test)成功。

## 54. 候補日全体への一括回答ショートカット
- [x] (S) `src/views/schedule.js`に「全部○にする」「全部△にする」「全部×にする」の
      3ボタン(`#bulk-response-row`)を追加した。既存の`setResponse(date, value)`を
      そのまま流用し、`Promise.all(currentEntries.map(...))`で全候補日に対して
      並列に更新する。候補日が0件のときはボタン行自体を非表示にする
      (`renderEntries()`内で`bulkResponseRow.hidden`をトグル)

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、候補日が
      0件のときはボタンが非表示であること、候補日追加後に表示されること、
      「全部○にする」を押すと全候補日の自分の回答が○になり(`53`の)未回答
      ハイライトが消えることを確認した(2026-08-20)。375px幅でもボタン3つが
      横並びのまま収まり横スクロールが発生しないことをスクリーンショットで確認済み
      (ボタン文言が2行に折り返されるがレイアウト崩れ・はみ出しは無し。軽微のため
      対応不要と判断)。console/pageerrorは0件。`npm run check`(lint・test)成功。
      これで第11期「雑多メモタブ」「雑多メモ・企画メモタブ共通」「日程調整タブ」の
      対応可能な項目は全て完了(`44`は実機確認が必要なため保留、`52`は未着手のまま)。

## 56. 宿泊候補→確定宿泊のワンタップ変換 / 64. 宿泊候補と確定宿泊のつながりの追跡
2つのタスクは1つの機能として一緒に実装した(`64`のROADMAP記載通り)。
- [x] (M) `src/views/lodging.js`の宿泊候補カードに「確定にする」ボタンを追加した。
      押すと既存の「確定宿泊を追加」フォーム(`#stay-form`)を再利用して開き、
      候補の`url`・`note`をあらかじめ入力した状態にする(チェックイン/チェックアウト
      日のみ追加入力すればよい)。フォーム送信時、`pendingSourceCandidateId`
      (「確定にする」ボタン経由の場合のみ設定される)があれば`confirmedStays`
      ドキュメントに`sourceCandidateId`として記録する。通常の「確定宿泊を追加」
      ボタン(候補を経由しない直接追加)ではこのフィールド自体を持たせない
- [x] (M) `confirmedStays`のいずれかから`sourceCandidateId`で参照されている候補には
      「確定済み」バッジ(既存の`.complete-badge`を再利用)を表示する。元の
      `lodgingCandidates`ドキュメントは削除・変更しない(第9期「34」のカット→コピー
      変更と同じ方針で、データを失わない方向を優先)。confirmedStaysの購読
      コールバック内で`renderCandidates(currentCandidates)`も呼び、確定宿泊の変更が
      候補側のバッジにリアルタイムで反映されるようにした。`docs/firestore-design.md`
      に`confirmedStays.sourceCandidateId(optional)`と設計判断のセクションを追記した

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、宿泊候補
      カードに「確定にする」ボタンが表示されること、押すと確定宿泊フォームに
      URL・メモが引き継がれた状態で開くこと、送信すると確定宿泊一覧に反映され
      候補カードに「確定済み」バッジがリアルタイムで表示されること、通常の
      「確定宿泊を追加」ボタンでは空の状態で開き候補一覧に影響しないことを確認した
      (2026-08-20)。console/pageerrorは0件。`npm run check`(lint・test)成功。

## 59. 日付見出しのアコーディオン化
- [x] (S) `src/views/itinerary.js`の日付見出しを、`<h2>`のみから
      `.itinerary-day-heading`(`role="button"` `tabindex="0"`、内部に`<h2>`と
      シェブロンアイコン`icons.chevron`)を持つクリック可能な行に変更した。
      クリック(またはキーボードのEnter/Space)で、その日の`.timeline`要素の
      `hidden`を切り替える。開閉状態は`renderItems()`のスコープ外(`mount()`内)の
      `collapsedDates`(`Set`)で保持するため、リアルタイム更新による再描画をまたいでも
      折りたたみ状態が維持される。`pages/shared.css`に`.itinerary-day-heading`
      (globalな青いピル型`button`スタイルを打ち消して見出しらしい見た目に戻す)・
      `.itinerary-day-chevron`(開閉で90度回転)を追加した

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、初期状態は
      全日程が展開済み(`aria-expanded="true"`)であること、見出しクリックで該当日の
      `.timeline`が非表示になり`aria-expanded`・シェブロンのクラスが切り替わること、
      再クリックで展開に戻ること、キーボード(Enter)でも開閉できること、別の項目を
      追加(リアルタイム再描画)しても既存の折りたたみ状態が維持されることを確認した
      (2026-08-20)。console/pageerrorは0件。`npm run check`(lint・test)成功。

## 60. 「次の予定」の強調表示
- [x] (S) `src/views/itinerary.js`に`findNextItem(items)`を追加し、現在時刻
      (`Date.now()`)以降で最も近い`${item.date}T${item.time || '23:59'}:00`を持つ
      項目を探す(時間目安が未入力の項目は、一覧のソート方式(`NO_TIME_SENTINEL`)と
      同じ考え方で「その日の最後(23:59)」扱いにする)。該当する項目のカードに
      `.timeline-content-next`(`--color-accent`の枠線)クラスと「次の予定」バッジ
      (`.next-badge`)を付与する。データの変更が無くても時間経過だけで「次の予定」が
      変わりうるため、1分ごとに`renderItems(currentItems)`を再実行するタイマーを
      追加した(`setInterval`はeslint設定のグローバル一覧に無いため、既に許可されている
      `setTimeout`の自己再スケジュールで代用し、アンマウント時に`clearTimeout`する)

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、過去の日付・
      明日・明後日の3件を登録し、一番近い未来の予定(明日)にのみ「次の予定」
      ハイライトが付き、過去の予定には付かないことを確認した(2026-08-20)。
      console/pageerrorは0件。`npm run check`(lint・test)成功。これで第11期
      「しおりタブ」の対応可能な項目は全て完了(`58`は承認済みだが未着手のまま)。

## 61. しおり項目への移動手段メモ欄の追加
- [x] (S) `itineraryItems/{id}`に`transportation`(任意の自由記述文字列)を追加した。
      `src/views/itinerary.js`の追加・編集フォームに「移動手段(任意)」の入力欄
      (`#item-transportation`、プレースホルダー「電車で移動、レンタカー等」)を追加し、
      一覧表示では場所リンクとメモの間に「移動手段: ○○」として表示する。編集時は
      `openFormForEdit()`で既存の`transportation`をプリフィルする。
      `docs/firestore-design.md`にスキーマ追加と設計判断の節を、`docs/requirements.md`
      5.1に「交通手段の予約調整機能」のWon't判断とは別物という経緯の追記、9.1の
      ItineraryItemエンティティ説明の更新を行った(いずれも人間の事前承認に基づく)

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、追加フォームに
      移動手段の入力欄が存在すること、入力した移動手段が一覧カードに表示されること、
      編集フォームに正しくプリフィルされ更新も反映されること、移動手段を空のまま
      保存した項目には「移動手段:」の表示自体が出ないこと(任意項目として機能する)を
      確認した(2026-08-20)。console/pageerrorは0件。`npm run check`(lint・test)成功。

## 62. 概要タブの集合情報への地図リンク追加
- [x] (S) `trips/{tripId}`に`meetingLocationUrl`(任意のURL文字列)を追加した。
      `src/views/tripOverview.js`の集合情報編集フォームに「地図リンク(任意)」の
      入力欄(`#meeting-location-url`)を追加し、`meeting-summary`の表示に「地図」行
      (`#meeting-location-display`)を追加した。表示は他のURLフィールド
      (`itineraryItems.locationUrl`等)と同じく`src/url.js`の`isSafeUrl()`で検証し、
      安全なURLのみクリック可能なリンク(`target="_blank"` `rel="noopener
      noreferrer"`)にする(危険なスキームはプレーンテキスト表示のまま)。集合情報の
      「まだ設定されていません」判定(`hasMeeting`)にも`meetingLocationUrl`を含めた。
      `docs/firestore-design.md`にスキーマと設計判断の節を追記した(人間の事前承認に
      基づく)

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、編集フォームに
      地図リンクの入力欄が存在すること、保存後にクリック可能なリンク(正しい`href`・
      `target="_blank"`)として表示されること、編集フォームに正しくプリフィルされる
      こと、危険なURLスキーム(`javascript:`)を入力した場合はリンク化されずプレーン
      テキストのまま表示されることを確認した(2026-08-20)。console/pageerrorは0件。
      `npm run check`(lint・test)成功。これで第11期「実利用シーンからの気づき」の
      承認済みスキーマ変更タスクは`58`を残すのみ。

## 63. 日程調整の○×△内訳サマリー
- [x] (S) `src/views/schedule.js`の`renderEntries()`で、各候補日の`responses`
      マップを`RESPONSE_SYMBOLS`(○/△/×)ごとに集計し、「○3 △1 ×0」のようなサマリー
      (`.subtitle`)を見出しの直後に表示する。1件も回答が無い候補日ではサマリー自体を
      表示しない。既存の回答者名一覧(「たく: ○」等)はそのまま維持し、サマリーは
      その手前に追加する形。新規フィールドは不要(既存の`responses`マップを
      集計するだけ)

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、未回答の
      候補日にはサマリーが表示されないこと、1人が○で回答すると「○1 △0 ×0」に
      なること、回答を△に変更すると「○0 △1 ×0」に正しく更新されることを確認した
      (2026-08-20)。console/pageerrorは0件。`npm run check`(lint・test)成功。

## 65. メモ欄のURLリンク化
- [x] (S) 新規`src/linkify.js`を作成した。テキストをURLセグメントとそれ以外の
      セグメントに分割する`tokenizeLinks(text)`をDOM非依存の純粋関数として切り出し
      (`src/datePicker.js`と同じ設計方針)、`src/linkify.test.js`で検証する。
      `isSafeUrl()`で安全と判定されたURLのみ`<a class="inline-link" target="_blank"
      rel="noopener noreferrer">`に変換する`linkifyToNodes()`・要素に追加する
      `appendLinkifiedText()`を提供する。URL直後の句読点・閉じ括弧
      (`.,;:!?)]}、。」』`)はリンクに含めない。`pages/shared.css`に
      `.inline-link`(既存の`.candidate-link`と異なり`display: block`を持たない
      インライン用)を追加した。`src/views/destinations.js`(候補の`note`)・
      `src/views/lodging.js`(宿泊候補・確定宿泊の`note`)・`src/views/itinerary.js`
      (しおり項目の`note`)・`src/views/tripOverview.js`(`meetingNote`)の
      `note.textContent = ...`をそれぞれ`appendLinkifiedText(note, ...)`に置き換えた

      `src/linkify.test.js`で、URLを含まないテキスト・文中/文頭/文末のURL・複数の
      URL・URL直後の句読点の除外・`new URL()`が失敗する不正なURL文字列
      (`safe: false`になること)・http/https以外のスキーム(そもそも正規表現に
      マッチしないこと)を検証した。Playwrightでは、実Firestore(共有テストグループ
      `FMXRZYW7`)に対し、行き先決め・宿泊候補・しおり項目・概要タブの集合メモの
      4箇所いずれも、メモ内のURLがクリック可能なリンクになること(hrefが末尾の
      空白を含まず正しいこと)、URLを含まないメモにはリンクが生成されないことを
      確認した(2026-08-20)。console/pageerrorは0件。`npm run check`(lint・test)
      成功(vitest 19件全て成功)。雑多メモ・企画メモは`<textarea>`表示のため対象外
      (docs/ROADMAP.md末尾の検討事項参照)。

## 58. しおり項目(時間未設定同士)の並び替え
- [x] (M) `itineraryItems/{id}`に`order`(number、optional)フィールドを追加し
      (2026-08-20、人間の承認済み)、同じ日の中で時間未設定の項目同士を並び替え
      られるようにした。**ROADMAPの原文は「ドラッグ&ドロップ」だったが、
      `docs/requirements.md`の非機能要件「モバイルブラウザ中心」を踏まえ、
      HTML5標準のDrag-and-Drop APIはタッチ操作との相性が悪い(モバイルSafari等で
      追加のpolyfillやタッチイベントの自前実装が必要)ため、実装は▲/▼ボタンに
      変更した。この判断は`src/views/itinerary.js`冒頭のコメント・
      `docs/firestore-design.md`の設計決定セクションにも明記した。**
      `compareItems(a, b)`(時刻→`order`の順で比較する純粋関数)と
      `moveUntimedItem(dayItems, item, direction)`(移動対象の日の時間未設定項目
      だけを取り出し、配列内で1つ入れ替えた上で該当日の全時間未設定項目に
      0,1,2...と`order`を振り直して`updateDocument`で一括保存する非同期関数)を
      追加した。`renderItems()`内で、時間未設定かつ同じ日に2件以上ある場合のみ
      「▲ 上へ」(先頭では無効)・「▼ 下へ」(末尾では無効)ボタンを表示する。
      既存の`.button-row`/`.btn-secondary`を再利用したため新規CSSは不要。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、時間ありの
      項目が常に先頭に来ること、時間未設定の項目が1件しかない日には並び替え
      ボタンが表示されないこと、時間未設定が複数ある日では先頭要素の「▲上へ」・
      末尾要素の「▼下へ」がそれぞれ無効になっていること、「▼下へ」→「▲上へ」の
      連続操作で相対的な入れ替えが正しく行われること、2日目の項目が1日目の並び
      替えの影響を受けないことを確認した(2026-08-20)。console/pageerrorは0件。
      `npm run check`(lint・test、vitest 19件)成功。
      (Firestoreの`onSnapshot`は明示的な`orderBy`が無いと挿入順を保証しないため、
      時間未設定項目同士の初期表示順は不定になりうる。これは本タスクの変更が
      原因ではなくFirestore全体の既存の性質であり、テストでは絶対順ではなく
      「朝食が常に先頭」「並び替え操作の前後での相対的な入れ替え」のみを検証した)

## 57. 確定宿泊のガントチャート風タイムライン表示
- [x] (M) 確定宿泊が2件以上のとき、`src/views/lodging.js`の確定宿泊一覧の上に、
      各宿泊の期間を横棒(バー)で示すガントチャート風のタイムラインを表示する
      ようにした。全確定宿泊のうち最も早いチェックインと最も遅いチェックアウトを
      全体の期間とし、各宿泊のチェックイン〜チェックアウトをその期間に対する
      「左端位置%」「幅%」に変換するDOM非依存の純粋関数
      `buildStayTimelineBars(stays)`を新規`src/stayTimeline.js`に切り出し
      (`src/datePicker.js`・`src/linkify.js`と同じ設計方針)、`src/stayTimeline.test.js`
      (vitest、7ケース)で検証した。同日の宿泊(幅0)には最小幅4%を保証し、
      末尾の宿泊でも`左端%+幅% ≤ 100`になるようクランプする。`src/views/lodging.js`の
      `renderStayTimeline()`が、この計算結果を`.stay-timeline-bar`要素の
      `style.left`/`style.width`に反映する(`src/views/destinations.js`の
      `.score-bar-fill`と同じ「動的な値のみJSでインラインstyle設定する」方針を踏襲)。
      1件のみの場合はタイムラインを表示せず既存のカード一覧のみとし、確定宿泊が
      0件になった場合もタイムラインを消す。新規フィールドの追加は無く
      (`confirmedStays`の既存の`checkIn`/`checkOut`のみを使用)、
      `docs/firestore-design.md`のスキーマ変更は不要だった。

      `src/stayTimeline.test.js`で、空配列・連続する2件(期間比に応じた50%/50%の
      按分)・1件のみ(全体を覆う1本のバー)・チェックイン=チェックアウト(同日)の
      宿泊が最小幅4%になること・末尾の宿泊が右端をはみ出さないようクランプされる
      こと・日程が飛び飛び(間に空白期間)の宿泊の位置づけ・入力順序を並び替えずに
      維持することを検証した。Playwrightでは、実Firestore(共有テストグループ
      `FMXRZYW7`)に対し、確定宿泊が1件のときはタイムラインが表示されないこと、
      2件になるとタイムラインの行が2行表示されること、1件目のバーが左端(0%)から
      始まること、2件目のバーが1件目より右にずれ右端をはみ出さないこと、日付
      ラベルが表示されること、既存のカード一覧(URL・メモ・追加者)も引き続き
      表示されることを確認した(2026-08-20)。console/pageerrorは0件。
      `npm run check`(lint・test、vitest 26件、うち`stayTimeline.test.js`7件が新規)
      成功。

## 66. 色数整理(accent-green廃止)
- [x] (S) 2026-08-20、人間が二人のレビュアーに現在のビジュアルデザインを見てもらった
      結果、「`--color-success`と`--color-accent-green`が近い色相で役割が被って
      見える」と指摘された。人間との会話で「A案(重複解消のみ)」を採用することが
      確定し、状態を表す意味的な色である`--color-success`はそのまま残し、装飾専用の
      `--color-accent-green`(#4d9a7a)を`styles/tokens.css`から廃止した。
      唯一の使用箇所だった`pages/shared.css`の`.card-dark-accent`(企画メモを
      雑多メモと視覚的に区別するためのグラデーション、`48`参照)は、
      `--color-accent-green`と`--color-primary-deep`の組み合わせから、
      `--color-accent`(オレンジ)と`--color-primary-deep`の組み合わせに置き換えた。
      新規の色トークンは追加していない(既存の`--color-accent`を転用)。
      `--color-primary-deep`自体の廃止(レビューのB案=徹底整理)は今回見送った。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、雑多メモの
      `.card-dark`(青→濃紺のグラデーション)・企画メモの`.card-dark-accent`
      (オレンジ→濃紺のグラデーション)がそれぞれ引き続き適用され、両者の
      グラデーションが異なる(視覚的差別化が維持されている)ことを確認した
      (2026-08-20)。スクリーンショットで、タブ遷移フェードインの完了後は
      オレンジ→濃紺の対角グラデーションが正しく表示されることを目視確認した
      (フェードイン完了前に撮影すると一時的に薄く見えるだけで、実装上の不具合では
      ないことを確認済み)。console/pageerrorは0件。`npm run check`(lint・test、
      vitest 26件)成功。検証で作成したFirestore上のトリップ1件は、サブコレクション
      文書を作成していないため追加のクリーンアップ不要で、名前を
      「[検証用/削除不可] evolve cycle5 66検証で作成」に更新済みの状態で共有
      テストグループ`FMXRZYW7`内に残置。

## 67. 見出し用ディスプレイフォントの追加
- [x] (S) 外部レビューで「本文も見出しもZen Kaku Gothic New一本でウェイトだけの
      差別化」と指摘され、見出し(h1〜h3)だけ丸みのある手書き風フォントを足すと
      「しおり」らしいあたたかみが出るとの提案を受けた。人間との会話でレビューの
      候補(Zen Maru Gothic・Kaisei Decol)のうち「Zen Maru Gothic」を採用。
      `styles/tokens.css`のGoogle Fonts importに`family=Zen+Maru+Gothic:wght@700;900`を
      追加し(既存の`Zen+Kaku+Gothic+New`のimportと1つの`@import url()`にまとめた)、
      新規`--font-family-heading: "Zen Maru Gothic", "Zen Kaku Gothic New", ...`
      (フォールバックは既存の`--font-family-base`と同じ並び)を追加。
      `pages/shared.css`の`h1, h2, h3 { font-family: var(--font-family-heading); }`で
      見出し要素にのみ適用した。本文の`--font-family-base`(Zen Kaku Gothic New)は
      変更していない。`.icon-heading`(雑多メモ・企画メモ等の見出し)はh2/h3要素に
      付与されているため、追加の変更なしに自動的に新フォントが適用される。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、h1の
      `font-family`に`Zen Maru Gothic`が含まれること、`body`(本文)は引き続き
      `Zen Kaku Gothic New`のままで`Zen Maru Gothic`を含まないこと、雑多メモの
      `h3.icon-heading`にも`Zen Maru Gothic`が適用されていることを確認した
      (2026-08-20)。スクリーンショットで、概要タブ・雑多メモタブの見出しが
      丸みのある書体で表示され、本文・ボタン等は従来通りであることを目視確認した。
      375px相当(390px)幅でもレイアウト崩れ・折り返し崩れは無し。
      console/pageerrorは0件。`npm run check`(lint・test、vitest 26件)成功。
      検証で作成したFirestore上のトリップ1件はサブコレクションを作成していない
      ため追加クリーンアップ不要、名前を「[検証用/削除不可] evolve cycle5 67検証で
      作成」に更新済みの状態で共有テストグループ`FMXRZYW7`内に残置。

## 68. しおりモチーフの追加
- [x] (M) 外部レビューの「完璧に整列させない揺らぎがしおりらしさを演出する」との
      提案を受け、3点セットで対応した(人間との会話で「マーカーアイコン変更も
      含めて全部」と確定済み)。
      (a) `.divider`(`pages/shared.css`)の左右の線を、`height: 1px`の直線から
      `border-top: 2px dotted var(--color-border)`のミシン目・切り取り線風の
      点線に変更した。
      (b) カードの傾き演出を、テキスト編集を伴わない静的表示のみの2箇所に限定して
      追加した(textareaを含むカードを傾けると読み書きしにくくなるため対象外と
      判断)。概要タブの旅行名カード(`.trip-name-row`)に`rotate(-0.6deg)`、
      参加画面で発行される合言葉表示(`.passphrase`)に`rotate(0.8deg)`を適用し、
      写真を少し傾けて貼ったような遊びを持たせた。
      (c) しおりタブの`.timeline-marker-badge`(連番の数字バッジ)を、
      `src/icons.js`に新規追加した`footprint`(足あと、塗りつぶし表現の楕円+
      3つの丸)・`flag`(旗、ポール+ノッチ付き三角)のインラインSVGアイコンに
      差し替えた。「次の予定」(`60`)に該当する項目だけ`flag`にし、それ以外は
      `footprint`にすることで、道のりの1歩(足あと)とこれから向かう目印(旗)を
      使い分けた。`src/views/itinerary.js`の`dayItems.forEach`から、連番表示のみに
      使っていた未使用の`index`引数を削除した。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、
      `.passphrase`・`.trip-name-row`にそれぞれ`rotate`のtransformが適用されている
      こと(`getComputedStyle().transform`が`none`でないこと)、`.divider`の
      `::before`が`border-top-style: dotted`になっていること、しおりタブの
      `.timeline-marker-badge`内に数字テキストではなくSVGアイコンが描画されて
      いることを確認した(2026-08-20)。アイコン単体をHTMLプレビューで拡大表示し、
      足あと・旗として視覚的に認識できる見た目であることも確認した。
      スクリーンショットで概要・宿泊・しおりタブの見た目を目視確認し、390px幅でも
      崩れは無かった。console/pageerrorは0件。`npm run check`(lint・test、
      vitest 26件)成功。検証で作成したFirestore上のトリップ1件は、
      `itineraryItems`を削除の上、名前を「[検証用/削除不可] evolve cycle5 68検証で
      作成」に更新して共有テストグループ`FMXRZYW7`内に残置。

      **注記**: 本タスクはROADMAP上で「やりすぎるとチープに見えるリスクがあるため
      実装後は特に人間の目で確認すること」と注記されていた。evolveサイクルでの
      Playwright確認・スクリーンショット目視までは実施したが、**人間による実機/
      実画面での最終確認はまだ済んでいない**。違和感があれば次サイクル以降で
      調整・取り消しの対応を行う。

## 69. カードシャドウの調整
- [x] (S) 外部レビューで2件指摘された。(1)「`--shadow-button`の不透明度25%は
      主張が強い」→ 15%前後まで下げ、ぼかし(blur)を10px→16pxに広げて上品な
      浮遊感にする。(2)「`--shadow-card`(`rgb(29 78 216 / 10%)`)が青みを帯びて
      おりSaaSダッシュボードの文法に見える」→ しおりを謳うなら紙が浮いている
      ような暖色寄りの柔らかい黒にすべき。`styles/tokens.css`で両方に対応した。
      `--shadow-card`を`0 4px 14px rgb(29 78 216 / 10%)`から
      `0 4px 16px rgb(42 30 20 / 8%)`(暖色寄りの黒、不透明度も8%まで軽量化)に、
      `--shadow-button`を`0 4px 10px rgb(59 130 246 / 25%)`から
      `0 4px 16px rgb(59 130 246 / 15%)`(色相=primaryの青は維持、不透明度のみ
      軽量化・ぼかしを拡大)に変更した。新規の色トークンは追加していない。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、`.card`の
      `box-shadow`が`rgba(42, 30, 20, 0.08) 0px 4px 16px 0px`になっていること
      (旧来の`rgb(29 78 216)`が含まれないこと)、送信ボタンの`box-shadow`の
      不透明度が15%になっていることを確認した(2026-08-20)。スクリーンショットで
      概要タブの見た目を目視確認し、より柔らかく暖色寄りの浮遊感になっている
      ことを確認した。390px幅でも崩れ無し。console/pageerrorは0件。
      `npm run check`(lint・test、vitest 26件)成功。検証で作成したFirestore上の
      トリップ1件はサブコレクションを作成していないため追加クリーンアップ不要、
      名前を「[検証用/削除不可] evolve cycle5 69検証で作成」に更新済みの状態で
      共有テストグループ`FMXRZYW7`内に残置。

## 70. ヘッダー・暗色カードのドット柄廃止(切手風パーフォレーション採用)
- [x] (M) 外部レビューで「`radial-gradient`の繰り返しによるドット柄は2023〜2024年頃の
      SaaS系LPで擦り倒された表現」と指摘され、`.page-header`・`.card-dark`・
      `.card-dark-accent`のドット柄を廃止した。人間との会話で「紙のグレインノイズ
      (SVG feTurbulence)」「切手の縁のようなパーフォレーション風の縁取り」の
      両方を実装して見た目が良い方を採用することが確定していたため、両方
      実装して比較した。
      **A案(グレインノイズ)**: `feTurbulence`(fractalNoise)+`feColorMatrix`で
      白色・低アルファのノイズテクスチャを生成するSVG data URIを2枚目の
      背景レイヤーとして重ねた。アルファ値は0.06では視認できず、0.14で
      ようやく紙のような質感が見える程度になった。
      **B案(パーフォレーション、採用)**: 各要素の下端に`::after`疑似要素を追加し、
      ページ背景色(`--color-bg`)の小さな半円を`radial-gradient`の繰り返しで
      並べることで「切り取られた」ような見た目を錯視で作った(実際に切り抜いて
      いるわけではない)。`.page-header`・`.card-dark`(`.card-dark-accent`は
      `.card-dark`と併用されるクラスのため`::after`は共有)で共通のスタイルを
      使い、角丸に合わせて`.page-header::after`のみ下端の角丸を追加。
      両案をPlaywrightでスクリーンショット比較した結果、B案は`68`で追加した
      点線`.divider`(ミシン目・切り取り線)と視覚的な一貫性があり、「独自性が
      薄い」というレビューの指摘への対応としてもA案より効果が明確だったため、
      B案を採用した。A案(グレインノイズ)のコードは削除し、コミットには残して
      いない。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、
      `.page-header`・`.card-dark`・`.card-dark-accent`の`background-image`から
      `radial-gradient`(ドット柄)が消え`linear-gradient`のみになっていること、
      `.page-header::after`・`.card-dark::after`にパーフォレーション用の
      `radial-gradient`が適用されていること、375px幅で概要・雑多メモ・企画メモの
      いずれも横スクロールが発生しないことを確認した(2026-08-20)。
      console/pageerrorは0件。`npm run check`(lint・test、vitest 26件)成功。
      検証で作成したFirestore上のトリップ4件(A案・B案比較の試行錯誤分含む)は、
      いずれもサブコレクションを作成していないため追加クリーンアップ不要、
      名前を「[検証用/削除不可] evolve cycle5 70検証で作成」に更新済みの状態で
      共有テストグループ`FMXRZYW7`内に残置。

## 71. ボタン・カードの押下アニメーションに物理的な質感
- [x] (S) 外部レビューで「フェード+`translateY(8px)`、ボタンの`scale(0.97)`は
      モーションデザインの教科書通りで没個性」と指摘され、押下解除時に付箋を
      指で押して離した時のような、わずかに行き過ぎてから戻る(オーバーシュート)
      バウンド系の質感を加えた(タブ切り替え時のページめくり演出は`72`で別途
      対応するため、本タスクではボタン・カードの押下フィードバックのみを対象に
      した)。`pages/shared.css`の`button`・`.card-link`の`transition`について、
      `transform`のタイミング関数を`ease`から`cubic-bezier(0.34, 1.56, 0.64, 1)`
      (いわゆる`back-out`系のイージング。y値が1を超えるため、目標値を一瞬
      超えてから収束するオーバーシュートになる)に変更し、あわせて時間も
      0.1s/0.15s→0.25sへ延ばしてオーバーシュートが視認できる余裕を持たせた。
      `background-color`・`box-shadow`側のタイミング関数は変更していない。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、ボタン・
      `.card-link`の`transitionTimingFunction`(computed style)に
      `cubic-bezier(0.34, 1.56, 0.64, 1)`が含まれていること、CSS変更後も参加・
      旅行作成の各ボタンクリックが引き続き正しく機能すること、375px幅で
      横スクロールが発生しないことを確認した(2026-08-20)。console/pageerrorは
      0件。`npm run check`(lint・test、vitest 26件)成功。検証で作成した
      Firestore上のトリップ1件はサブコレクションを作成していないため追加
      クリーンアップ不要、名前を「[検証用/削除不可] evolve cycle5 71検証で
      作成」に更新済みの状態で共有テストグループ`FMXRZYW7`内に残置。

## 44. 振り分けボタンの画面下部固定表示
- [x] (S) 雑多メモの4つの振り分けボタン(`.button-row`×2)を、モバイル(768px未満)では
      画面下部に`position: fixed`で固定し、長文をスクロールしている間も常に
      アクセスできるようにした。当初案の`position: sticky`ではなく`fixed`を
      採用したのは、このアプリの画面はスクロールコンテナを持たず`body`自体が
      スクロールするため、`sticky`では固定先の基準がなく機能しないため。
      広い画面(768px以上)は元々テキストエリアが画面に収まりやすく恩恵が薄いため
      対象外とし、`.card-dark`内の通常フロー表示のまま変更していない。
      `src/views/scratch.js`でボタン2行を`.scratch-actions`でラップし、末尾に
      高さ調整用の`#scratch-actions-spacer`を追加(固定バー分の高さをJSで
      `offsetHeight`から算出して確保し、末尾のコンテンツがバーに隠れないように
      する)。`.scratch-actions`は`.card-dark`の子要素のまま(DOM構造は変えていない)
      なので、`.card-dark .btn-secondary`の白文字ボタンスタイルがそのまま適用される。
      これを踏まえ、固定時の背景も`.card-dark`と同じ`--color-primary-deep`系
      グラデーションにし、白文字が視認できるようにした(初回実装時に背景を
      `--color-surface`(白)にしてしまい、白文字ボタンが完全に見えなくなる
      不具合を自己レビューで発見・修正した)。
      スマホの入力キーボード表示中はバーとキーボードが重なる問題への対応として、
      `window.visualViewport`の`resize`イベントを監視し、ビューポート高さが
      `window.innerHeight`の75%未満に縮んだ場合(=キーボード表示中とみなす)に
      `.keyboard-open`を付与してバーを画面外へ`translateY(100%)`でスライドさせる。
      `visualViewport`非対応環境ではこの機能を単に使わない(常時バーが
      表示されたままになる)フォールバックとした。

      実機の仮想キーボード表示・iOS Safariのビューポート挙動はPlaywright
      (ヘッドレスChromium)では再現できないため、代わりに(1)`pages/shared.css`を
      読み込んだ静的フィクスチャpage上で、モバイル幅(390px)での固定表示・
      スクロール後も位置が変わらないこと・`.keyboard-open`付与でバーが画面外へ
      隠れること・デスクトップ幅(1024px)では通常フローに戻りスペーサーの高さが
      0になることをbounding boxで確認、(2)実Firestore(共有テストグループ
      `FMXRZYW7`)に対し実際に旅行を1件作成してscratchタブを開き、テキスト入力→
      選択→「→企画メモへ」ボタンのクリックが引き続き正しく動作すること
      (「企画メモへコピーしました。」表示を確認)、モバイル幅でのスクロール前後で
      バーの位置(bounding box)が同一であること、`visualViewport.height`を
      縮小させるとバーが画面外へスライドすることを確認した(2026-08-21)。
      console/pageerrorは0件。`npm run check`(lint・test、vitest 26件)成功。
      検証で作成したFirestore上のトリップ1件はサブコレクションを作成していない
      ため追加クリーンアップ不要、名前を「[検証用/削除不可] evolve cycle5
      44検証で作成」に更新済みの状態で共有テストグループ`FMXRZYW7`内に残置。

      **人間による実機での最終確認がまだ済んでいない**(スマホの入力キーボード
      表示中の挙動・押しやすさは、上記の通りPlaywrightでは検証できないため。
      違和感があれば調整のフィードバックを歓迎する)。

      これで第12期(66〜71)は`72`(しおりらしい構造演出)を残すのみとなった。

## 52. 候補日カレンダー俯瞰ビュー
- [x] (M) F(日程調整)タブに、候補日を月めくりカレンダー上に○×△で色分け表示する
      俯瞰ビューを追加した(現状のカードの縦一覧だけでは候補日が多いと見通しが
      悪いという課題への対応)。`src/datePicker.js`の月グリッド生成ロジック
      (`buildMonthGrid`・`addMonths`・`toDateString`・`parseDateString`、いずれも
      既存のDOM非依存な純粋関数)をそのまま再利用し、新規に`src/scheduleOverview.js`
      (DOM非依存な純粋関数`computeDayStatus`・`buildOverviewCells`、
      `src/stayTimeline.js`と同じ「ロジックを別ファイルに切り出してvitestで検証する」
      方針を踏襲)を追加した。判定ルールは「調整さん」等の既存日程調整サービスの
      表記に準拠: 回答に×が1件でもあれば×(誰か参加不可)、全メンバー回答済みで
      すべて○なら○(全員参加可能)、それ以外で1件以上回答があれば△(検討中・
      一部未回答)、候補日だが誰も回答していない日は無色のまま。`src/views/schedule.js`
      に読み取り専用の月カレンダー(`#schedule-overview`、前月/次月ボタン付き)と
      凡例を追加し、候補日一覧の`subscribeToCollection`購読(第8期)の再描画時に
      あわせて再描画する。初回データ取得時のみ、候補日があればその最も早い候補日の
      月へ自動的に表示を合わせ、以降はユーザーの月送り操作を尊重して勝手に戻さない
      ようにした。Firestoreのスキーマ・書き込み方式は変更していない(`scheduleEntries`
      の既存フィールドを読むだけ)。
      日付セルの表示は、既存の`.date-picker-day`(クリック可能なボタン、hover時に
      背景色が薄く付く)をそのまま流用すると、俯瞰ビューのステータス色がhover時に
      一瞬上書きされてちらつく問題があったため、非インタラクティブな表示専用の
      `.schedule-overview-day`クラスを別途新設した(サイズ・角丸は`.date-picker-day`
      に合わせている)。色は既存トークンのみを使用(○=`--color-success`、
      ×=`--color-danger`、△=`--color-accent`。新規の色トークンは追加していない)。

      `src/scheduleOverview.test.js`を新規作成し、`computeDayStatus`(×優先・
      全員○判定・未回答時の扱い・memberCount取得失敗時のフォールバック)・
      `buildOverviewCells`(月初オフセットのnull埋め・候補日の有無によるstatus)を
      vitestで検証した(9件、全て成功)。`npm run check`(lint・test、vitest
      合計35件)も成功。開発サーバーを起動しPlaywrightで実Firestore(共有テスト
      グループ`FMXRZYW7`)に対し、旅行を1件作成し日程調整タブで候補日を2件追加、
      1件目に○・2件目に×を回答した上で、俯瞰ビューの該当セルにそれぞれ
      `schedule-overview-day-pending`(このグループはテストで蓄積した既存メンバーが
      多く、自分1人の○だけでは全員回答済みにならないため△表示になる、想定通りの
      挙動)・`schedule-overview-day-ng`のクラスが付くこと、前月/次月ボタンで
      月ラベルが正しく切り替わり往復できること、375px幅で横スクロールが発生
      しないことを確認した。console/pageerrorは0件。検証で作成したFirestore上の
      トリップ1件はサブコレクションを作成していないため追加クリーンアップ不要、
      名前を「[検証用/削除不可] evolve cycle5 52検証で作成」に更新済みの状態で
      共有テストグループ`FMXRZYW7`内に残置。

      これで第11期(各タブへの改善アイデア)は、要件との衝突・トレードオフのため
      検討事項として保留した項目を除き、全タスク完了となった。

## 72. しおりらしい構造演出3点セット
- [x] (M) 「タブバー・ルーティング・各タブの情報設計(`docs/screens.md`)は変えず、
      装飾・演出のみで『しおりらしい構造』を感じさせる」という2026-08-20の方針
      決定に基づき、以下3点を`pages/shared.css`のみで実装した(JS・ルーティング側の
      変更は無し)。
      **(a) ページめくり風タブ遷移**: `src/router.jsのrender()`が`#view`へ付け直す
      `.view-enter`クラスの`@keyframes view-enter`を、フェード+`translateY(8px)`
      から`perspective(1000px) rotateY(-6deg) translateY(6px)` → `rotateY(0deg)`へ
      変更した(時間は0.2s→0.25s)。`transform-origin: left center`にすることで、
      (b)の綴じ穴側を軸に回転させ、「ノートのページがめくれて落ち着く」印象にした。
      **(b) 左端の綴じ穴パターン**: `.page::before`に、`--color-border`の小さな円を
      `radial-gradient`で縦方向に繰り返し配置し(直径4px・28px間隔)、リング/
      スパイラルノート風の穴を`.page`の左端に常設した。`70`で確立した「背景色の
      円を重ねて錯視させる」パーフォレーション手法(`.page-header::after`)とは
      逆に、こちらは`--color-border`色の円をそのまま置いて「穴」に見せる方式にした
      (パーフォレーション用の背景色erase方式は塗りつぶされた背景の上でしか
      成立せず、`.page`の素の背景色の上では使えないため)。
      **(c) 左右非対称パディング**: `.page`の左パディングを右より20px広げ
      (`calc(var(--space-md) + 20px)`、768px以上は`calc(var(--space-lg) + 20px)`)、
      その帯の中に(b)の綴じ穴を配置した。「本を開いている」ような綴じ目側の
      余白を表現している。
      実装にあたり、`.page`に`perspective`プロパティを持たせる素朴な実装
      (親要素に`perspective`を置く一般的なCSS 3D手法)は採用しなかった。
      `transform`・`filter`・`perspective`をプロパティとして持つ要素は
      `position: fixed`な子孫要素の包含ブロックになるというCSS仕様上の制約があり、
      `.page`に`perspective`を持たせると`44`で追加した`#scratch-actions`
      (雑多メモの画面下部固定バー)の固定配置が常時壊れてしまうため、代わりに
      `perspective()`を`#view`自身の`transform`内でローカルに使う方式にした
      (影響が`#view`のtransformが有効な間=アニメーション中の一瞬のみに限定される。
      詳細と残課題は`73`参照)。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、旅行を
      1件作成し、(1) `.page`の`padding`が非対称(モバイル: 左36px/右16px、
      768px以上: 左44px/右24px、`position: relative`)になっていること、
      `.page::before`に想定した`radial-gradient`が設定されていること、(2) タブ
      切り替え時に`#view`の`computed style transform`が`perspective`込みの
      `matrix3d(...)`になり、アニメーション終了後(0.25秒後)に`none`へ戻る
      こと、(3) `prefers-reduced-motion: reduce`環境では`transform`が終始`none`の
      ままアニメーションが無効化されること(既存の`@media (prefers-reduced-motion:
      reduce)`ルールがそのまま効く)、(4) 375px幅で全7タブ(概要・雑多メモ・
      企画メモ・行き先決め・日程調整・宿泊・しおり)いずれも横スクロールが
      発生しないこと、(5) 1024px幅でも横スクロールが発生せず`.page`の非対称
      パディングが正しく適用されていること、(6) 雑多メモタブへの切り替え時、
      アニメーション終了(0.25秒)後は`#scratch-actions`が正しく画面下部に固定
      表示されること、をそれぞれ確認した。console/pageerrorは0件。
      `npm run check`(lint・test、vitest 35件)成功。検証で作成したFirestore上の
      トリップ1件はサブコレクションを作成していないため追加クリーンアップ不要、
      名前を「[検証用/削除不可] evolve cycle5 72検証で作成」に更新済みの状態で
      共有テストグループ`FMXRZYW7`内に残置。

      **人間による実機/実画面での最終確認がまだ済んでいない**(`68`・`71`と同様、
      やりすぎるとチープに見えるリスクがある演出のため。違和感があれば調整・
      取り消しのフィードバックを歓迎する)。

      これで第12期(外部レビューを踏まえたデザイン改善)は、`73`(軽微な既知の
      制約、対応は任意)を除き全タスク完了となった。

## 73. ページめくりトランジション中の固定バー消失を修正
- [x] (S) `72`のページめくりトランジション(`#view`への`transform`付与)が有効な
      約0.25秒間だけ、`#scratch-actions`(`44`の雑多メモ画面下部固定バー)の
      `position: fixed`の基準がCSS仕様上`#view`に切り替わり、画面外(下方)へ
      外れて一瞬非表示になる問題を修正した。原因はCSS仕様上の制約(`transform`
      ・`filter`・`perspective`プロパティを持つ要素はposition: fixedな子孫要素の
      包含ブロックになる)そのものであり、`72`実装時に検討した「`.scratch-actions`
      を`document.body`直下へポータルする」対応は、モバイル(768px未満)限定の
      固定表示という`44`の要件と両立させるにはウィンドウ幅の変化に応じて
      DOM上の位置を出し入れする複雑な処理が必要になり、Sサイズの見積もりに
      対して過大なリスクと判断し採用しなかった。
      代わりに、`transform`を使わないビュー専用のフォールバック用トランジション
      `.view-enter-flat`(opacityのみ)を`pages/shared.css`に追加し、
      `src/router.js`の`render()`が、ビューの`mount()`が`outlet.dataset.
      flatTransition = 'true'`を立てた場合にのみ`.view-enter`(3D風、`72`)の
      代わりにこちらを使うようにした(`render()`は毎回ハッシュ切り替えの先頭で
      このdata属性を消してから`mount()`を呼ぶため、各ビューが自分の必要に応じて
      都度立て直す設計)。`src/views/scratch.js`の`mount()`冒頭でこのフラグを
      立てることで、雑多メモタブへの遷移時だけtransformを使わない(=`#view`が
      fixedの包含ブロックにならない)フェードに切り替え、他の6タブは引き続き
      `72`の3D風トランジションを使う。タブ切り替えの仕組み・ルーティング・
      各タブの情報設計には触れていない。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し旅行を
      1件作成し、概要タブから雑多メモタブへ切り替える際、アニメーション開始から
      終了後(0〜350ms、40msごとに8回)まで一貫して`#scratch-actions`が
      正しい固定位置(画面右下、`x:0, y:594, width:390, height:106`@390×700
      ビューポート)を維持すること(修正前は0〜250msの間ずっと画面外の
      `y:723〜729`にずれていたことを前回サイクルで確認済み)、雑多メモタブでは
      `#view`のクラスが`view-enter-flat`になること、他タブ(企画メモ)では
      引き続き`view-enter`(`transform: matrix3d(...)`)になることを確認した。
      `prefers-reduced-motion: reduce`環境では、雑多メモタブ・他タブいずれも
      `transform: none`・`opacity: 1`になりアニメーションが無効化されること、
      375px幅で全7タブいずれも横スクロールが発生しないこと(回帰なし)も確認した。
      console/pageerrorは0件。`npm run check`(lint・test、vitest 35件)成功。
      検証で作成したFirestore上のトリップ1件はサブコレクションを作成していない
      ため追加クリーンアップ不要、名前を「[検証用/削除不可] evolve cycle5
      73検証で作成」に更新済みの状態で共有テストグループ`FMXRZYW7`内に残置。

      これで第12期(外部レビューを踏まえたデザイン改善)は全タスク完了となった。

## バグ修正: 76. 雑多メモ固定バーがキーボード表示中に選択後のボタンを塞ぐ不具合
- [x] (S) `44`の画面下部固定バー(`#scratch-actions`)は、当初「仮想キーボード
      表示中は画面外へ隠す」実装だったが、テキスト選択直後(キーボードを
      閉じる前)に振り分けボタンを押すという`44`が想定していた核心的な操作
      フローそのものを塞いでしまっていた(2026-08-21、人間の実機確認で発覚:
      「選択した後、キーボードを閉じないと、ボタンが出てこない」)。
      隠す代わりに、`position: fixed; bottom: 0`のバーがキーボード表示中も
      レイアウトビューポート(見えなくなった部分含む)基準のままなことを
      利用し、`window.visualViewport`との差分(`window.innerHeight -
      visualViewport.height - visualViewport.offsetTop`、キーボードに
      隠れている高さに相当)だけ`translateY`で上へずらし、常にキーボードの
      すぐ上に見える位置へ追従させる方式に変更した(`src/views/scratch.js`の
      `updateKeyboardOffset`)。誤検知防止のため40px未満の差分は無視する。
      `.keyboard-open`クラス・対応する`pages/shared.css`のCSSルールは削除した。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し旅行を
      1件作成し、`visualViewport.height`を700→380(キーボード表示相当)に
      変化させた際、バーが画面外へ隠れず`y座標`がキーボード直上
      (`380-バーの高さ`)へ追従して常に表示され続けること(`isVisible()`が
      `true`のまま)、キーボードが閉じる(`height`が700に戻る)と元の画面下部
      位置(`y: 594`)に戻ることを確認した(2026-08-21)。375px幅で全7タブとも
      横スクロールが発生しないこと(回帰なし)も確認した。console/pageerrorは
      0件。`npm run check`(lint・test、vitest 35件)成功。検証で作成した
      Firestore上のトリップ1件はサブコレクションを作成していないため追加
      クリーンアップ不要、名前を「[検証用/削除不可] evolve cycle5 76検証で
      作成」に更新済みの状態で共有テストグループ`FMXRZYW7`内に残置。

## バグ修正: 81. --shadow-buttonの青み残りを暖色化
- [x] (S) `styles/tokens.css`の`--shadow-button`が、`69`(カードシャドウの
      暖色化)後も`rgb(59 130 246 / 15%)`(`--color-primary`由来の青)のまま
      放置されていた。2026-08-21、外部レビュアーの2巡目レビューで「カードは
      紙、ボタンはSaaSで世界観が割れている」と指摘され、`--shadow-card`と
      同系統の暖色`rgb(42 30 20 / 15%)`に変更した(不透明度15%は維持、色相
      のみ揃えた)。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、
      プライマリボタン(`.btn-secondary`ではない通常ボタン)の`computed
      box-shadow`が`rgba(42, 30, 20, 0.15) 0px 4px 16px 0px`になっている
      ことを確認した(2026-08-21)。`npm run check`(lint・test、vitest 35件)
      成功。

## バグ修正: 82. フォーカスリングのハードコード解消
- [x] (S) `pages/shared.css`の`input[type="text"]:focus`等のフォーカスリング
      (`box-shadow: 0 0 0 3px rgb(59 130 246 / 15%);`)が、`styles/tokens.css`
      冒頭のコメント「すべての画面はこのファイルの変数経由で色を指定し、
      直接カラーコードを書かないこと」に反し、`--color-primary`と同じ値を
      直接カラーコードとして複製していた(2026-08-21、外部レビュアー指摘)。
      新規トークンを追加する代わりに、`color-mix(in srgb, var(--color-primary)
      15%, transparent)`で`--color-primary`から直接導出する形に変更した。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、
      フォーム入力欄にフォーカスした際の`computed box-shadow`が
      `color(srgb 0.231373 0.509804 0.964706 / 0.15) 0px 0px 0px 3px`
      (`--color-primary`=`#3b82f6`と同じRGB値・15%不透明度)になっている
      ことを確認した(2026-08-21)。`npm run check`(lint・test、vitest 35件)
      成功。

## 第13期: 実機/実画面フィードバック対応(その4)

## 74. パーフォレーション廃止(左端の綴じ穴のみ残す)
- [x] (S) `70`で追加したヘッダー(`.page-header::after`)・ダーク系カード
      (`.card-dark::after`)下部のパーフォレーション風ドット柄を廃止した。
      2026-08-21、人間から「旅行計画アプリの下のリング穴とかはいらないな。
      ページ左のものだけ残す形で」とのフィードバックを受け、`72`で追加した
      `.page`左端の綴じ穴装飾(`.page::before`)はそのまま残し、ヘッダー・
      ダーク系カード側の`::after`パーフォレーションのみ削除した。それに伴い
      不要になった付随スタイルも整理: `.page-header`のパーフォレーション用に
      空けていた下端の余分なpadding(`calc(var(--space-md) + 6px)`)を通常の
      `var(--space-md)`に戻し、`.card-dark`のクリッピング用`overflow: hidden`・
      `position: relative`・同様の余分な`padding-bottom`も削除した(`.card`から
      継承する通常のpaddingに戻る)。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し旅行を
      1件作成し、`.page-header::after`・`.card-dark::after`の`content`が
      いずれも`none`(=描画されない)になっていること、`.page-header`の
      `padding`が`16px 24px`(モバイル、対称)になっていること、`.card-dark`の
      `overflow`が`visible`・`position`が`static`に戻っていること、`.page::before`
      (`72`の綴じ穴)の`background-image`は変更なくそのまま残っていることを
      確認した(2026-08-21)。スクリーンショットで概要・雑多メモタブの見た目を
      目視確認し、ヘッダー・ダーク系カードの下端が滑らかになり、左端の綴じ穴
      だけが残っていることを確認した。375px幅で全7タブとも横スクロールが
      発生しないこと(回帰なし)も確認した。console/pageerrorは0件。
      `npm run check`(lint・test、vitest 35件)成功。

## 75. しおりタイムラインバッジの過去/次/未来3アイコン化
- [x] (S) しおりタブの`.timeline-marker-badge`アイコン(`68`(c))を、従来の
      2種類(`footprint`=次の予定以外全部/`flag`=次の予定)から、時系列に
      応じた3種類に分けた。2026-08-21、人間からのフィードバックで仕様確定:
      次の予定→`flag`(現状維持)・過去の予定(すでに終わった)→新規追加の
      `checkmark`アイコン・未来の予定(次の予定より後)→新規追加の`waypoint`
      アイコン(いずれも`footprint`とは別の新規SVGを`src/icons.js`に追加。
      `footprint`は項目間の連結線上の軌跡装飾(`80`)専用として温存する)。
      `src/views/itinerary.js`の`findNextItem`を`(items, now)`のシグネチャに
      変更して`now`を`renderItems`側で1回だけ計算するようにし、各項目の
      日時タイムスタンプ化ロジックを`itemTimestamp(item)`として共通化した上で、
      `isPast`(`!isNext && !Number.isNaN(itemTime) && itemTime < now`)を
      新たに算出してバッジのアイコンを`isNext ? flag : isPast ? checkmark :
      waypoint`で分岐させる。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し旅行を
      1件作成し、しおりタブに過去(2026-08-15)・次の予定になる日
      (2026-08-22)・未来(2026-08-25)の3件を追加した上で、`.timeline-marker-
      badge`の中身(SVGのpath/circle)からそれぞれ`checkmark`・`flag`・
      `waypoint`が正しく描画されていることを確認した(2026-08-21)。
      スクリーンショットで、過去=チェックマーク・次=旗(オレンジ枠のハイライト
      カードと共に)・未来=中抜き円、と3種類のバッジが視覚的に区別できることを
      確認した。console/pageerrorは0件。`npm run check`(lint・test、
      vitest 35件)成功。検証で作成したFirestore上のトリップ1件・しおり項目3件は
      名前を「[検証用/削除不可] evolve cycle5 74-75検証で作成」に更新済みの
      状態で共有テストグループ`FMXRZYW7`内に残置。

## 80. しおりタイムライン連結線をランダムな足あとの小道に変更
- [x] (M) しおりタブのタイムライン連結線(従来は`.timeline-marker::after`の
      `width: 2px`の直線)を、軌跡上に足あとを点々と配置した、ランダムに
      曲がりくねった小道風の線に変更した。2026-08-21、人間からスクリーンショット
      付きで緑色の曲線イメージの共有を受け、追加で「軌跡はある程度ランダム化させて
      同じ軌跡にならないようにすること」との要望も確定した。
      軌跡生成ロジックは`src/stayTimeline.js`・`src/scheduleOverview.js`と同じ
      方針でDOM非依存な純粋関数として`src/footprintTrail.js`に新規切り出しした:
      `createSeededRandom(seed)`(再現可能な擬似乱数生成器、mulberry32。vitestでの
      テスト用)・`buildTrailPoints(random, options)`(始点・終点のxを固定し、
      中間の折れ点をランダムな左右オフセットで生成)・`pointsToPathD(points)`
      (SVG `<path d>`文字列への変換)・`buildFootprintsAlongPath(points, count)`
      (経路の総延長をcount等分した位置に、足あとの座標・回転角(経路の進行方向に
      合わせる)を算出。1つ飛ばしで左右にずらし片足ずつの見た目にする)・
      `createFootprintTrail(random, options)`(上記をまとめて呼ぶ)。
      `src/views/itinerary.js`は各項目の描画時(`dayItems.forEach((item, index))`)、
      その日の最後の項目でなければ(`index < dayItems.length - 1`、日をまたぐ場合は
      従来通り連結線を表示しない)、`createFootprintTrail(Math.random, {
      footprintCount: 3 })`で軌跡を生成し、インラインSVG文字列
      (`<svg class="timeline-trail" viewBox="0 0 22 100"
      preserveAspectRatio="none">` + 経路の`<path>` + 各足あとを`<g
      transform="translate(...) rotate(...) scale(0.15) translate(-12 -14)">`で
      配置した`icons.footprint`と同形のellipse/circle)を`.timeline-marker`へ
      挿入する`buildTrailSvg()`を追加した。呼び出しのたびに`Math.random`で
      軌跡を生成し直すため、再描画のたびに形が変わる。色は緑系の
      `--color-success`(新規トークンは追加していない)。
      `pages/shared.css`の`.timeline-marker::after`(直線)・
      `.timeline-item:last-child .timeline-marker::after`(非表示ルール)は削除し、
      代わりに`.timeline-trail`(`flex: 1; width: 22px; color:
      var(--color-success);`、`preserveAspectRatio="none"`で実際の高さへ伸縮)を
      追加した。

      `src/footprintTrail.test.js`を新規作成し、`createSeededRandom`(同一seedでの
      再現性・異なるseedでの非再現性・0〜1未満の値域)・`buildTrailPoints`
      (始点・終点のx固定とy等分割・wobbleRatioの範囲内に収まること・異なるseedで
      異なる軌跡になること)・`pointsToPathD`(SVGパス文字列の形式)・
      `buildFootprintsAlongPath`(等間隔配置・左右交互のオフセット・ゼロ距離
      セグメントでも例外にならないこと)・`createFootprintTrail`(まとめての
      出力・footprintCountの既定値)を12件のテストで検証した(全て成功)。
      `npm run check`(lint・test、vitest合計47件)も成功。
      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し旅行を
      1件作成し、しおりタブの同じ日に3件の項目を追加した際、`.timeline-trail`が
      2本(3件→連結線2本)生成されること、2本の`pathD`が互いに異なること
      (=ランダム化されていること)、各`.timeline-trail`に3件ずつ足あとの`<g>`が
      含まれること、最後の項目の後ろには連結線が挿入されないことを確認した
      (2026-08-21)。スクリーンショットで、緑色の曲がりくねった小道と足あとが
      バッジ間に視覚的に表示されていることを目視確認した。375px幅で全7タブとも
      横スクロールが発生しないこと(回帰なし)も確認した。console/pageerrorは
      0件。検証で作成したFirestore上のトリップ1件・しおり項目3件は名前を
      「[検証用/削除不可] evolve cycle5 80検証で作成」に更新済みの状態で共有
      テストグループ`FMXRZYW7`内に残置。

      これで第13期の「装飾・見た目」サブセクションのうち`74`・`75`・`80`が
      完了し、`77`(ボタンの見た目)・`83`(グラデーション使い回し)を残すのみと
      なった。

## 77. ボタンの角丸・太さの見直し(ピル型統一)
- [x] (M) ボタン(`button`/`.btn-secondary`)全体の見た目がチープに見えるという、
      2026-08-21の人間からの指摘(「チープに見えるのがボタンだと思う。ボタン
      だけ異様にダサい」)に対応した。`/evolve`は自動サイクルのため、指摘の
      詳細を対話で聞き返すことができず、既存の設計文脈から原因を推定して
      対応した: 第5期の配色調査時(`23`)から「ピル型ボタン(design-library.jp
      参考、`border-radius:50px`)」が良いパターンとして挙がっていたが、
      実際には`.rank-badge`等のバッジ類にしか適用されておらず、ボタン自体は
      専用の`--radius-button`(12px、cardのradius-mdより控えめ)という
      中途半端な角丸のままだった。バッジ・日付ピッカーの日付セル・チップなど、
      他の丸み要素が軒並みピル型(`--radius-pill`)なのにボタンだけ違う丸みだった
      ことが、統一感の無さ=「安っぽさ」の一因と判断し、`button`のベース
      ルールを`--radius-pill`に統一した(`.btn-secondary`はborder-radiusを
      個別指定していないため自動的に追従する)。あわせて、`--font-weight-
      heading`(900、本来はh1見出し用の太さ)をボタンのラベルにまで流用していた
      のを、ボタンには重すぎる(圧が強い)と判断し`--font-weight-subheading`
      (700)に下げた。横paddingも、ピル形状が窮屈に見えないよう`--space-md`
      から`--space-lg`へ広げた。彩度・グラデーション等の色味自体
      (`81`で暖色化した影を含む)は変更していない。使用箇所が無くなった
      `--radius-button`(`styles/tokens.css`)は削除した。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、
      プライマリボタン(`#create-trip`)・`.btn-secondary`(`#edit-name-button`)
      いずれも`computed border-radius`が`999px`(ピル型)・`font-weight`が
      `700`になっていることを確認した(2026-08-21)。スクリーンショットで、
      参加画面の「参加する」「+ 新しいグループを作る」・日程調整タブの
      「追加する」「キャンセル」・概要タブの「編集」等、複数画面のボタンの
      見た目を目視確認し、バッジ・日付ピッカーと統一感のあるピル型になって
      いることを確認した。375px幅で全7タブとも横スクロールが発生しないこと
      (回帰なし)も確認した。console/pageerrorは0件。`npm run check`
      (lint・test、vitest 47件)成功。検証で作成したFirestore上のトリップ1件は
      サブコレクションを作成していないため追加クリーンアップ不要、名前を
      「[検証用/削除不可] evolve cycle5 77検証で作成」に更新済みの状態で
      共有テストグループ`FMXRZYW7`内に残置。

      **人間による実機/実画面での最終確認がまだ済んでいない**(「どこがダサいか」
      を対話で確認できないまま自動サイクルで対応したため、意図とズレている
      可能性がある。違和感があれば具体的にどの点が気になるか教えてほしい)。

## 83. 濃紺グラデーションの角度を役割ごとに変えて使い回し感を解消
- [x] (S) 濃紺グラデーション`linear-gradient(135deg, var(--color-primary-deep),
      var(--color-primary-dark))`が、`.page-header`・`.card-dark`(雑多メモ・
      企画メモ)・`.scratch-actions`(`44`のモバイル固定操作バー)の3箇所で
      完全に同一の見た目のまま使い回されている、との2026-08-21外部レビュアー
      指摘(2巡目)に対応した。「1つの装飾モチーフとしての一貫性」自体は
      評価された指摘だったため、色は一切変更せず、角度だけを役割ごとに変える
      ことで微差をつけた: `.page-header`はアプリ全体の「顔」として最初に
      確立した135degを基準のまま維持し、`.card-dark`(「特別なメモ欄」)は
      少し縦寄りの160deg、`.scratch-actions`(画面下部に水平に張り付く
      「ドック」)はほぼ水平の100degに変更した。`.card-dark-accent`(企画メモの
      配色差別化用、`48`/`66`)も`.card-dark`と同じ「特別なメモ欄」の仲間として
      角度を160degに揃えた(色の組み合わせ自体は変更していない)。
      新規の色トークンは追加していない。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し旅行を
      1件作成し、`.page-header`・`.card-dark`・`.scratch-actions`の
      `computed background-image`がそれぞれ`linear-gradient(135deg, rgb(22,
      35, 74), rgb(29, 78, 216))`・`linear-gradient(160deg, ...)`・
      `linear-gradient(100deg, ...)`(色のrgb値はいずれも同一、角度のみ異なる)
      になっていること、企画メモの`.card-dark-accent`も`160deg`になっている
      ことを確認した(2026-08-21)。スクリーンショットで、3箇所のグラデーション
      の流れる方向がそれぞれ視覚的に区別できることを目視確認した。375px幅で
      全7タブとも横スクロールが発生しないこと(回帰なし)も確認した。
      console/pageerrorは0件。`npm run check`(lint・test、vitest 47件)成功。
      検証で作成したFirestore上のトリップ1件はサブコレクションを作成していない
      ため追加クリーンアップ不要、名前を「[検証用/削除不可] evolve cycle5
      83検証で作成」に更新済みの状態で共有テストグループ`FMXRZYW7`内に残置。

      これで第13期の「装飾・見た目」サブセクション(`74`・`75`・`77`・`80`・
      `83`)は全て完了した。

## 78. しおり並び替え後のハイライト点滅を追加
- [x] (S) しおりタブの並び替え(`58`、▲/▼ボタン)をクリックしても、移動が
      視覚的に分かりにくいという、2026-08-21の人間からのフィードバック
      (「しおりで移動させたとき、なにもエフェクトが無いので変わったことが
      分かりづらい」)に対応した。並び替えは、クリック後Firestoreへの書き込み
      →リアルタイム購読(`32`)による全項目の再描画という流れで反映されるため、
      DOM要素が使い回されず(`renderItems`が`itemList.innerHTML = ''`から
      毎回全項目分のDOM要素を作り直す構造)、位置を滑らかにスライドさせる
      (FLIP)アニメーションの起点が無い。そのため、代わりに「移動した項目
      そのものが一瞬光る」ハイライト点滅で変化に気付かせる方式にした。
      `src/views/itinerary.js`に`justMovedItemId`(直前に▲/▼で並び替えた
      項目ID)を追加し、`moveUntimedItem`が移動操作の開始時にセット、
      `renderItems`が該当項目のカード(`.timeline-content`)を作る際に
      `item.id === justMovedItemId`なら`.item-moved-flash`クラスを付与して
      即座に`justMovedItemId`をnullへ戻す(1回きりの発火。以降の無関係な
      再描画では光らない)。書き込み失敗時も`justMovedItemId`をnullへ戻し、
      失敗した並び替えで後から無関係にハイライトが出ないようにした。
      `pages/shared.css`に`@keyframes item-moved-flash`
      (`--color-success`を25%混ぜた色→`--color-surface`への背景色フェード、
      0.8s)を追加した。色は既存の`--color-success`(緑、他の「完了・成功」系
      表示と同じ意味合い)を再利用し、新規トークンは追加していない。
      実装中に発見・修正した点: 当初`.item-moved-flash`のルールを
      `.timeline-content`の近く(ファイル末尾寄り)に置いていたところ、
      同じ詳細度のCSSは後に書かれた方が勝つという性質により、`@media
      (prefers-reduced-motion: reduce)`側の`animation: none`上書き
      (ファイル冒頭寄りにある`.view-enter`等と同じ場所にまとめている)より
      後ろに来てしまい、reduced-motion環境でもアニメーションが無効化されない
      不具合をPlaywright検証中に発見した。`.item-moved-flash`の定義を
      `.view-enter-flat`の直後・reduced-motionメディアクエリの直前へ移動し、
      他のanimationクラスと同じ並び順にすることで解消した。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し旅行を
      1件作成し、しおりタブに時間未設定の項目を同じ日に2件追加、2件目の
      「▲ 上へ」をクリックした際、MutationObserverで`.item-moved-flash`
      クラスがDOM上に一度でも出現することを確認した(全再描画のため固定
      タイミングでの`classList.contains`チェックでは、複数回の再描画の間に
      入れ替わり見逃すことがあると判明したため、変化を継続監視する方式に
      した)。並び替え自体(`58`)も、クリック前後の表示順・ページリロード後の
      Firestore実データで正しく入れ替わることを確認した。通常モードでは
      `.item-moved-flash`の`computed animationName`が`item-moved-flash`に、
      `prefers-reduced-motion: reduce`環境では`none`になることを確認した
      (上記の並び順修正後)。375px幅で全7タブとも横スクロールが発生しない
      こと(回帰なし)も確認した。console/pageerrorは0件。`npm run check`
      (lint・test、vitest 47件)成功。検証中の試行錯誤(タイミング調査のため
      同じPlaywrightスクリプトを複数回実行)でFirestore上に複数件のトリップを
      作成したが、いずれもスクリプト内で作成直後に名前を「[検証用/削除不可]
      evolve cycle5 78検証で作成」へ更新するようにしていたため、全て命名規則
      通りにリネーム済みの状態で共有テストグループ`FMXRZYW7`内に残置(各
      しおり項目2件程度の空実験データ)。

## 79. ヘッダー/サイドバーの構成見直し
- [x] (M) モバイル(768px未満)のヘッダーでハンバーガーメニューボタンと
      「← 旅行一覧」リンクの位置が近く分かりづらいという2026-08-21の人間
      からのフィードバックを発端に、同日中の会話で構成そのものを見直す方針が
      固まり、対応した。
      **(a) アプリ名・「← 旅行一覧」リンクをサイドバーへ移動**: `index.html`の
      `.page-header`から`<h1>旅行計画アプリ</h1>`・`#back-to-trips`
      (「← 旅行一覧」)を削除し、代わりに`#sidebar`(768px以上は常設、
      768px未満はハンバーガーで開閉するドロワー、`31`)の上部へ
      `.sidebar-brand`(アプリ名`.sidebar-brand-name`+
      `.sidebar-back-link`)として配置した。`#sidebar`のタブリンク一覧側は
      `renderNav()`が繰り返しクリア・再構築する必要があるため、`.sidebar-brand`
      とは別に`#sidebar-links`という子コンテナへ分離し(`src/app.js`の
      `renderNav`は`sidebarLinks.innerHTML = ''`のみをクリアし、
      `.sidebar-brand`側には触れない)、`.sidebar-brand`は常設・不変の
      静的HTMLのままにした。これにより`.page-header`にはハンバーガー
      ボタン(`#menu-toggle`)と`<h1>`の2要素だけが残り、窮屈さが解消された。
      **(b) `.page-header`の`<h1>`が旅行に紐づく画面では旅行名を表示**:
      2026-08-21、人間から「これがカードヘッダー名のおかしくない?ページ全体
      のヘッダーとして置いて、カードヘッダーは旅行名であるべきでは?」との
      指摘を受けた(従来はどのタブでも常に固定の「旅行計画アプリ」という
      汎用アプリ名が表示されており、旅行の文脈が伝わらなかった)。
      `src/app.js`に`subscribeTripName(tripId)`を追加し、`registerTripTab`の
      ルートハンドラ(`renderNav`を呼んでいた箇所)から呼び出す。
      `groups/{groupCode}/trips/{tripId}`を`subscribeToDocument`で購読し、
      `<h1 id="page-title">`のテキストを旅行名(`trip.name`)へリアルタイムに
      更新する(旅行名編集フォーム(`C`)での変更にも即座に追従)。二重購読を
      避けるという着手前の検討事項に対しては、`tripOverview.js`(`C`)が別途
      自前で同じドキュメントを購読している点を許容した上で、ヘッダー専用の
      購読をapp.js側に1本だけ持つ設計にした(`C`タブ表示中のみ同一
      ドキュメントへの購読が2本になるが、範囲・タイミングとも限定的で実害は
      軽微と判断し、`tripOverview.js`側の既存ロジックの改修は見送った)。
      旅行に紐づかない画面(A: 参加、B: 旅行一覧)では、`hideNav()`が購読を
      停止し`<h1>`を「旅行計画アプリ」へ戻す。`docs/screens.md`のタブ=ルート
      対応・画面構成自体は変更していない(ヘッダー・サイドバーの表示内容のみ)。

      Playwrightで、実Firestore(共有テストグループ`FMXRZYW7`)に対し、
      (1) B画面(旅行一覧)ではヘッダーが「旅行計画アプリ」・サイドバーが
      非表示のままであること、(2) 旅行作成直後は暫定名(「新しい旅行」)が
      ヘッダーに表示され、`C`タブで旅行名を編集すると同じ画面を開いたまま
      ヘッダーがリアルタイムに追従すること、(3) 別タブ(しおり)へ移動しても
      旅行名の表示が維持されること、(4) モバイルのハンバーガードロワーを
      開くと、上部に「旅行計画アプリ」+「← 旅行一覧」(下線区切り)、その下に
      7つのタブリンクが表示されること、(5) 「← 旅行一覧」をクリックすると
      `#/trips`へ遷移し、ヘッダーが「旅行計画アプリ」に戻り、サイドバーも
      非表示に戻ること、(6) 未参加状態でA画面を開いてもヘッダー
      「旅行計画アプリ」・サイドバー非表示のままエラーが出ないことを確認した
      (2026-08-21)。(2)(5)の検証時、`page.evaluate`でのタイミング次第で
      遷移直後の1回だけ古い値を読んでしまう(実際のDOM更新自体は同期的で
      正しい)ことがあったが、これはテスト側の観測タイミングの問題であり、
      100ms後には常に正しい値に収束することを複数回の再実行で確認済み
      (アプリ側の不具合ではない)。スクリーンショットで、モバイルヘッダー
      (ハンバーガー+旅行名のみ、窮屈さ解消)・モバイルドロワー・PC常設
      サイドバーいずれも見た目を目視確認した。375px幅で全7タブとも横スクロール
      が発生しないこと(回帰なし)も確認した。console/pageerrorは0件。
      `npm run check`(lint・test、vitest 47件)成功。検証で作成した
      Firestore上のトリップ1件はサブコレクションを作成していないため追加
      クリーンアップ不要、名前を「[検証用/削除不可] evolve cycle5 79検証で
      作成」に更新済みの状態で共有テストグループ`FMXRZYW7`内に残置。

      これで第13期(実機/実画面フィードバック対応(その4))は全サブセクション
      完了となった。
