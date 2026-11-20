# CLAUDE.md

開発方針・進捗・再開手順の**正は [`ROADMAP.md`](./ROADMAP.md)**。設計背景は [`DEVELOPMENT.md`](./DEVELOPMENT.md)、機能仕様は [`README.md`](./README.md)。新機能の作業前にこれらを読むこと。

## 前提（厳守）
- 単一 `index.html` / Vanilla JS。外部ライブラリ・CDN・実行時fetchを増やさない（静的・自己完結）。
- Firebase RTDB のスキーマは**追加のみ**で後方互換厳守。
- 改行コードは **LF**（`.gitattributes` で強制）。CRLF で全行差分のコミットを作らない。

## 配信と開発フロー
- **本番 = Vercel**（https://splatoon-draft.vercel.app/）。**main へ push＝即本番反映**（`vercel.json` が index.html / manifest.json / data / images を `public/` にコピー）。
- **試験 = GitHub Pages**。試験用ブランチ **`codex/pages-preview`** を Pages で公開し、実機・複数端末の確認に使う。Pages はサブパス配信なので、パスは必ず**相対パス**。
- 流れ: 作業ブランチ → `codex/pages-preview` に push して Pages で確認 → 問題なければ main へ統合して push（本番反映）。
- push 前に検証: `node --check` 構文（CI と同じ抽出方法）＋ `node --test tests/*.test.js` ＋ 手動スモーク `docs/manual-smoke-checklist.md`。CI（`.github/workflows/test.yml`）も push/PR ごとに同じテストを実行する。
- Firebase は本番・試験とも同じ本番DB。試験ではテスト用のルームIDを使う。

## 使い方ガイド（アプリ内 `#s-guide`）— 機能変更時は必ず追従更新すること
- モード選択画面の「📖 使い方」ボタンから開くアプリ内ページ。実体は `index.html` の `<div id="s-guide">`。**ホスト向け／参加者向け／ドラフトの流れ** の3タブ構成。
- **重要**: BAN/PICK の挙動・ピックモード・設定項目・フェーズの流れなど、ユーザー体験に関わる機能を追加/変更したら、**同じコミットでこのガイドの該当タブも更新する**（実装とガイドの乖離を防ぐ）。新フェーズを実装したら「このガイドへの反映」を完了条件に含めること。
- コードの居場所:
  - 画面HTML: `<div id="s-guide">`（タブ＝`.guide-tab`、本文＝`data-gt="host|join|flow"` の `.guide-sec`）。
  - タブ切替: `showGuideTab(t)`（`window` 公開）。スクリーン一覧（`showScreen` 内の配列）に `'guide'` 登録済み。
  - CSS: `.guide-wrap` / `.guide-tabs` / `.guide-tab` / `.guide-sec` / `.guide-card` / `.guide-list` / `.guide-note`。
