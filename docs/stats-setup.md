# 武器統計（匿名集計）のセットアップ

マルチプレイのドラフトが完了すると、ホストのクライアントが以下を Realtime Database の `stats/` に集計します（[`database.rules.json`](../database.rules.json) の適用が必要）。

## 収集する内容（これだけ・すべて匿名）

| パス | 内容 |
|---|---|
| `stats/weapons/{武器key}/picks` | その武器がPICKされた累計回数 |
| `stats/weapons/{武器key}/bans` | その武器がBANされた累計回数 |
| `stats/genreBans/{種別}/{名前}` | ジャンルBAN（cat/sub/special）の累計回数 |
| `stats/meta/drafts` | 完了したドラフトの累計数 |

- ルームID・プレイヤー名・チーム名・日時は**送りません**。
- ソロモードは対象外（試行が多くノイズになるため）。
- 連戦（シリーズ）は試合ごとに1回カウント。二重計上は `state.statsRecorded` で防止。
- **Rules 未適用でも壊れません**: 書き込みが permission_denied になるだけで、アプリの動作・結果表示には影響しません（エラーは握りつぶします）。

## Rules の適用手順（手動・1回だけ）

`stats/` への書き込みを許可するため、Database Rules の更新が必要です。

1. [Firebase コンソール](https://console.firebase.google.com/) → プロジェクト `splatoon-draft-54bf8` → **Realtime Database → ルール** を開く
2. **現在のルールを控えておく**（万一のロールバック用にコピペ保存）
3. リポジトリの [`database.rules.json`](../database.rules.json) の内容と現行ルールを見比べる
   - `rooms` 部分が現行と同等であることを確認（このファイルは README 記載の仕様「認証済み＋6文字英数字ID」を再現した想定形です。現行ルールに独自の追加があればそちらを残してください）
   - `stats` 部分を追記する形でもOK
4. 貼り付けて「公開」

> Firebase CLI を使う場合: `firebase deploy --only database`（`firebase.json` に `"database": {"rules": "database.rules.json"}` を追加した上で）。

## 集計データの見方

- 手軽に見る: Firebase コンソール → Realtime Database → データ → `stats` を展開
- エクスポート: `stats` ノードの「JSONをエクスポート」
- 集計期間をリセットしたいとき: コンソールで `stats` ノードを削除するだけ（次のドラフト完了から再カウント）

## 将来の拡張メモ

- アプリ内の統計ビューア（ピック率ランキング画面）は `stats` の `.read: auth != null` で読めるため、クライアント追加のみで実装可能。
- 日別推移を取りたくなったら `stats/daily/{YYYYMMDD}/drafts` を増やす（Rules に同型の validate を追加）。
