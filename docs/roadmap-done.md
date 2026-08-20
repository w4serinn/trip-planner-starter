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
