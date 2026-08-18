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

## 2. B. 旅行一覧画面

## 3. C. 旅行詳細トップ画面

## 4. D. 企画メモ画面

## 5. E. 行き先決め画面

## 6. F. 日程調整画面

## 7. G. 宿泊画面

## 8. H. しおり画面

## 9. 仕上げ
