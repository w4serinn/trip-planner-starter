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

## 1. A. 参加画面

## 2. B. 旅行一覧画面

## 3. C. 旅行詳細トップ画面

## 4. D. 企画メモ画面

## 5. E. 行き先決め画面

## 6. F. 日程調整画面

## 7. G. 宿泊画面

## 8. H. しおり画面

## 9. 仕上げ
