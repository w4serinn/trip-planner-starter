# 旅行計画アプリ

固定の友人グループで、旅行のたびに「行き先決め」「日程調整」「宿泊候補」「しおり」などを
継続的に管理するためのWebアプリ。

## 設計ドキュメント
- [`docs/requirements.md`](docs/requirements.md) … 要件定義
- [`docs/screens.md`](docs/screens.md) … 画面構成・情報設計
- [`docs/firestore-design.md`](docs/firestore-design.md) … Firestoreスキーマ・セキュリティ方針
- [`docs/ROADMAP.md`](docs/ROADMAP.md) … 実装タスクの一覧・進行状況

## 技術構成
- 静的サイト(HTML / CSS / JS) + Firebase(Firestore)
- ホスティング: GitHub Pages
- 開発は`.claude/skills/evolve/SKILL.md`の手順に沿ったloop engineeringで進める

## セットアップ（開発者向け）
```bash
npm install
```
Firebaseプロジェクトの設定値は `src/firebase-config.js`（未作成の場合は各自作成）に記載する。

## 開発方針
このリポジトリでの作業方針は [`CLAUDE.md`](CLAUDE.md) を参照。
