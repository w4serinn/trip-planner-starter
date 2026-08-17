# Firestore スキーマ設計

要件定義書(requirements.md) 9章のエンティティを、Firestoreの実際のコレクション/ドキュメント構造に落とし込む。

## 全体構造
```
groups/{groupCode}                          … グループ（合言葉がドキュメントID）
  - createdAt
  - members: string[]                        （参加時に名前を追記）

  trips/{tripId}                             … 旅行（自動ID）
    - name
    - createdAt
    - meetingPlace, meetingTime, meetingNote  （集合情報：単一の値なので旅行ドキュメントに直接持たせる）
    - warikaUrl                               （割り勘リンク：同上）

    planningNotes/{noteId}
      - author, content, createdAt

    destinations/{destId}
      - name, note, addedBy, addedAt
      - votes: { [memberName]: number(1-5) }

    scheduleEntries/{date}                    （ドキュメントIDを日付 "YYYY-MM-DD" にする）
      - responses: { [memberName]: "○"|"×"|"△" }

    lodgingCandidates/{id}
      - url, note, addedBy, addedAt

    confirmedStays/{id}
      - url, note, checkIn, checkOut, addedBy

    itineraryItems/{id}
      - title, date, time(optional), locationUrl(optional), note(optional), addedBy
```

## 設計判断
- **集合情報・割り勘リンクはサブコレクションにせず、`trips/{tripId}` ドキュメントに直接フィールドとして持たせる**。
  要件9.3で「単一の置き場」と整理した通り、複数件持つ必要がないため、余計な読み取り回数を増やさない構造にした。
- **企画メモ・行き先候補・宿泊候補・確定宿泊・しおり項目は、それぞれサブコレクションにする**。
  複数件追加され、一覧表示・並び替えが必要なため。
- **日程調整(scheduleEntries)は、日付をそのままドキュメントIDにする**。
  同じ日付への複数人の同時書き込みも `responses` マップのフィールド単位更新になるため、Firestoreの
  マージ書き込み(`set({...}, {merge:true})`)で衝突しにくい。

## セキュリティ方針（確定）
Firebase Authを使わない前提のため完全な認証は導入しないが、以下の対策を組み合わせて
「合言葉を知らない第三者が到達できない」状態を作る。

1. **`groups`コレクション直下でのみ`list`クエリを禁止し、`get`（個別ドキュメント取得）のみ許可する**。
   これにより、正確な合言葉（＝ドキュメントID）を知らない限り、グループを一覧化して
   総当たりする経路そのものを塞げる。コストはほぼゼロで効果が大きいため必須とする。
   なお`groups/{groupCode}`配下（trips以下の各サブコレクション）は、そのパスに到達する
   時点で正しい合言葉をすでに知っている必要があるため、`list`も許可してよい
   （候補地一覧・しおり一覧など、アプリの表示機能そのものがこれに依存するため）。
2. **合言葉は6〜8文字に伸ばす**（当初案の4文字から変更）。
   書き写す手間とのトレードオフだが、現実的な時間での総当たりを困難にする。
3. **Firebase App Checkを導入する**。このアプリ経由の正規リクエストであることを検証し、
   外部スクリプトからの機械的なアクセスを困難にする。無料枠内で完結する。

Cloud Functionsによる本格的な合言葉検証・トークン発行（＋Blazeプラン移行）は、
今回は過剰と判断し見送る。将来的に「本気で個人開発サービス化したい」となった際の
選択肢として保留する。

## 削除権限の方針（確定）
候補地・企画メモ・宿泊候補・確定宿泊・しおり項目など、`groups/{groupCode}/trips/{tripId}`
配下のサブコレクション各ドキュメントは、**合言葉を知っている人なら誰でも削除できる**。

認証を導入しない前提（要件7-1）である以上、「追加した本人だけ削除可」という制限は
技術的に作れない（名前は自己申告であり、他人の名前を騙って操作することも防げないため）。
削除を許可しないか、誰にでも許可するかの二択であり、身内の信頼関係を前提にした
このアプリ全体の設計方針と一貫性を取り、後者を採用する。

対象: `groups/{groupCode}/trips/{tripId}/{subcollection}/{docId}` の `delete`
（`groups`・`trips`自体の削除は対象外。誤操作の影響が大きいため引き続き禁止する）

## ホスティング方針（確定）
GitHub Pages（publicリポジトリ）を使う。

このアプリの安全性は「秘密にすること」に依存しない設計にしてある
（list禁止・十分な桁数の合言葉・App Checkという、公開されても機能する仕組みのため）。
コード自体もブラウザで動く以上デプロイ後はどのみち閲覧可能であり、Firebaseの設定値
(apiKey等)も秘匿情報ではないため、privateリポジトリにする実利は薄いと判断した。
Firestoreのセキュリティはコードやキーの秘匿ではなく、セキュリティルール
(list禁止・App Check等、上記「セキュリティ方針」参照)側で担保する。

## 未確定・要注意点
- **投票・回答のキーに使う「名前」の扱い**：Firestoreのマップキーやドキュメント名には使える文字に制限がある
  （ピリオドやスラッシュ等）。実装時に名前を軽くサニタイズしてキーとして使う処理を挟む必要がある。
