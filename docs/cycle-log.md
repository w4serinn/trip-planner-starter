# サイクルログ

evolveスキルの各サイクル終了時に、実施内容をここに追記していく(新しいものを下に追記)。

<!-- 例:
## 2026-08-17 10:00
- 実装: Firebaseプロジェクト作成・Firestore有効化
- 動作確認: OK
- レビュー: OK
- 次回予定: セキュリティルール実装
- blocked / partial: なし
-->

## 2026-08-17 21:40
- 実装: 0.基盤のうち3項目。(1) 合言葉生成ロジック(`src/passphrase.js`、6〜8文字・
  紛らわしい文字除外)、(2) デザイントークン仮決定(`styles/tokens.css`)、
  (3) Firestoreセキュリティルール(`firestore.rules`/`firebase.json`/
  `firestore.indexes.json`、get許可・list禁止・App Check必須・delete一律禁止)。
  あわせて`npm run lint`/`check`を機能させるため`eslint.config.js`・
  `.stylelintrc.json`を追加。
- 動作確認: OK。`node`で`generatePassphrase()`を複数回呼び出し6/8文字・文字種を目視確認、
  範囲外(5, 9)でRangeErrorになることを確認。`npx eslint src`・
  `npx stylelint "styles/**/*.css"`はいずれも成功。
  ※`npm run lint`(pages含む)は`pages/`未作成のため現状失敗するが、これは画面シェル
  実装(次回タスク)で解消される想定であり今回のバグではない。
  ※firestore.rulesは実Firebaseプロジェクトが無くデプロイ・emulatorでの検証は未実施。
- レビュー: OK(データモデル・セキュリティ方針からの逸脱なし。UI未実装のため
  レスポンシブ確認は対象外)。
- 次回予定: 画面シェル実装(A→B→C、Mサイズ)に着手。
- blocked / partial: 「Firebaseプロジェクト作成・Firestore有効化」をblockedとして
  ROADMAPに記載(Firebaseコンソールでの人間の操作が必要なため)。解消手順は
  ROADMAP該当項目に記載済み。

## 2026-08-17 22:20
- 実装:
  1. **バグ修正(最優先)**: サイクル開始時、`firestore.rules`が
     `docs/firestore-design.md`のセキュリティ方針(get許可・list禁止・App Check必須・
     delete一律禁止)から逸脱した状態(App Checkチェック削除、trips配下でlist許可、
     サブコレクションでdelete許可)でコミット済みだったため、設計書通りの内容に復元した。
  2. **0.基盤 - 画面シェル実装(M)**: `pages/index.html`(A参加画面)・
     `pages/trips.html`(B旅行一覧画面)・`pages/trip.html`(C旅行詳細トップ画面)・
     共通スタイル`pages/shared.css`(tokens.css経由)・セッション保持用
     `src/session.js`(localStorageに名前・合言葉を保存)を追加。
     Firestore接続はまだ行わず、A→B→Cの画面遷移と未参加時のリダイレクトのみ実装。
- 動作確認: OK。`npm run check`(eslint + stylelint)成功。ローカル静的サーバー
  (`http-server`)+ Playwright(ヘッドレスChromium)で実際にフォーム入力→参加→
  旅行一覧→新規旅行作成→旅行詳細→戻る、および未参加状態でのtrip.html直接アクセス時の
  index.htmlへのリダイレクトを操作確認。コンソールエラー無し。375px幅でも表示崩れなし。
- レビュー: OK。`docs/screens.md`の画面構成・遷移(A→B→C、最大2階層)通り。
  色はすべて`styles/tokens.css`の変数経由。
- 次回予定: `src/firestore.js`(共通Firestoreアクセスモジュール)、または
  1.A参加画面の実機能(新規グループ作成・既存グループ参加)に着手。
- blocked / partial:
  - 「Firebaseプロジェクト作成・Firestore有効化」: プロジェクト作成・config取得・
    `.firebaserc`生成は完了(ユーザーの手動作業として確認・コミット済み)。ルールの
    デプロイとApp Check有効化は引き続き人間の作業待ち。
  - **要人間確認**: サイクル中、チャットで「`docs/firestore-design.md`ではtrips配下の
    list許可、サブコレクションのdelete許可が設計方針」との指摘があったが、
    (a) 該当箇所は本サイクル中に(私の編集ではなく)書き換えられていたばかりであり、
    (b) delete許可の根拠として挙げられた記述は文書中に見当たらなかった。
    セキュリティ方針を緩める実装はevolveの禁止事項に該当するため実装せず、
    `docs/ROADMAP.md`「新規タスク・画面提案」に人間確認待ちとして記載した。
    `docs/firestore-design.md`の該当編集自体は未コミットのまま(このコミットに含めていない)。
