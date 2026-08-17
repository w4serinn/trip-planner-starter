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
