# CLAUDE.md

開発方針・進捗・再開手順の**正は [`ROADMAP.md`](./ROADMAP.md)**。設計背景は [`DEVELOPMENT.md`](./DEVELOPMENT.md)、機能仕様は [`README.md`](./README.md)。新機能の作業前にこれらを読むこと。

## 前提（厳守）
- 単一 `index.html` / Vanilla JS。外部ライブラリ・CDN・実行時fetchを増やさない（静的・自己完結）。
- Firebase RTDB のスキーマは**追加のみ**で後方互換厳守。配信は GitHub Pages サブパス→**相対パス**。
- デプロイは **main へ push＝即本番反映**。push 前に検証（`node --check` 構文＋純粋ロジックの node 単体テスト＋手動スモーク `docs/manual-smoke-checklist.md`）。

## 使い方ガイド（アプリ内 `#s-guide`）— 機能変更時は必ず追従更新すること
- モード選択画面の「📖 使い方」ボタンから開くアプリ内ページ。実体は `index.html` の `<div id="s-guide">`。**ホスト向け／参加者向け／ドラフトの流れ** の3タブ構成。
- **重要**: BAN/PICK の挙動・ピックモード・設定項目・フェーズの流れなど、ユーザー体験に関わる機能を追加/変更したら、**同じコミットでこのガイドの該当タブも更新する**（実装とガイドの乖離を防ぐ）。新フェーズを実装したら「このガイドへの反映」を完了条件に含めること。
- コードの居場所:
  - 画面HTML: `<div id="s-guide">`（タブ＝`.guide-tab`、本文＝`data-gt="host|join|flow"` の `.guide-sec`）。
  - タブ切替: `showGuideTab(t)`（`window` 公開）。スクリーン一覧（`showScreen` 内の配列）に `'guide'` 登録済み。
  - CSS: `.guide-wrap` / `.guide-tabs` / `.guide-tab` / `.guide-sec` / `.guide-card` / `.guide-list` / `.guide-note`。
