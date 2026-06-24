# ROADMAP.md — 開発方針と進捗（再開用）

> 新機能の開発順・進捗・決定事項を「次に再開しやすい形」でまとめた生きたドキュメント。
> 案出しの元ネタは [draft-ideas.md](./draft-ideas.md)、設計判断の背景は [DEVELOPMENT.md](./DEVELOPMENT.md)。
> このファイルは進捗に合わせて更新する（完了したらチェックを入れ、次フェーズの着手メモを足す）。

## 不可侵の前提（全フェーズ共通）
- **単一 `index.html` / Vanilla JS**。外部ライブラリ・CDN・実行時fetchを増やさない（静的・自己完結）。
- Firebase RTDB 無料枠（同時接続〜50）。スキーマは**追加のみ**で後方互換厳守。既存武器エントリ不変。
- GitHub Pages サブパス配信 → **相対パス**。デプロイは **main へ push**（実機確認＝本番反映）。
- 自動テスト基盤なし。検証は「`node --check` 構文 + 純粋ロジックのnode単体テスト + ローカル配信 + 手動スモーク（`docs/manual-smoke-checklist.md`）」。

## オーナーの方針（draft-ideas.md 各節への判断・2026-06 時点）
- §1 ジャンルBAN: **採用**（代表者BAN限定）。個人BAN対応はしない。
- §2 新ピック: **ガチャ/運命ピック・ドラフト後トレードを採用**。オークション/ブラインド入替は保留、ミラー禁止・カテゴリミラー・カウンター公開・スティールは不採用。
- §3 お題系: **お題カード・縛りルーレットを採用**。ハンデは“あれば程度”。
- §4 連戦: **全部採用**＋「**負けチームがルール設定**できる」を追加。
- §5 共有/履歴: 大半は後回し。**BAN/ピック回数の統計**は将来やってよい。
- §6 グリッド検索/フィルタ: UI様子見で保留（負債が出たら）。
- §7 演出: 後回し。

---

## フェーズ計画と進捗

### ✅ Phase 1 — ジャンルBAN拡張（完了）
コミット: `22df9cc`(画像) → `b3188aa`(本体) → `b833735`(ジャンル別BAN数/表示条件) → `f8d7064`(代表画像)
- [x] サブ/スペシャルのアイコンを leanny から同梱（`images/subspe/` 33枚、`scripts/4_download_subspecial.py`）。`SUBSPE_IMG_MAP`（名前→ファイル）。
- [x] 武器種/サブ/スペシャル単位のBAN。**代表者BAN限定**（個人ピック×個人BANでは無効）。
- [x] BANグリッド上部に粒度タブ `[ブキ][サブ][スペシャル][武器種]`、アイコン付きタイルを2タップ確定（武器BANと同操作）。
- [x] **ジャンル別BAN数**：`banGenres={cat,sub,special}`（件数）。武器BAN(bc)とは**別枠**で各上限独立。総スロット=bc+各ジャンル。
- [x] 設定行の表示制御：代表者BAN/代表者ピック/相手ピックのときだけ表示。
- [x] 武器種タイルの**代表ブキ画像を指定**（`CAT_REP_KEY`：シューター=スプラシューター 等）。
- [x] 除外（グリッド/ピック/タイマー自動補完）・結果画面/結果画像・残り内訳ヒント対応。
- **未決（次回確認候補）**: ジャンルBAN数は現状「**必須数**」（その数だけ必ずBANする）。「**最大N（任意）**」にしたい場合は完了条件の作り直しが要る。相手ピックでも表示している。

### ▶ Phase 2 — お題カード / 縛りルーレット（§3）← 次の本命
- 完全クライアント完結（DB無風）。`cat`/`sub`/`special` で達成判定し○×表示。Phase 1 の判定ヘルパー（`weaponMatchesGenreBan` 等）が流用可。
- 縛りルーレットはお題カードの演出強化版。ハンデは任意で同梱。
- 着手メモ: お題定義の配列＋判定関数を新設。開始時に抽選して `state` に保持（スキーマ追加）。結果表示に○×。

### Phase 3 — ガチャ/運命ピック → ドラフト後トレード（§2）
- ガチャ＝ランダム配布＋リロール（既存 `pickRandom` 流用）。トレード＝ピック後に交換提案→相手承認（`pending_*` 同期パターンの延長）。

### Phase 4 — シリーズ/連戦（§4）★目玉・最後（最大リスク）
- BO3/BO5 フレームを先に → 武器ロックアウト → 勝者ペナルティ/敗者特権 → **負けチームがルール設定** → 戦績ボード。
- 1ルーム複数試合・試合間状態保持で**スキーマと状態ライフサイクルに最も踏み込む**。Phase 1〜3 で設定項目が出揃った後にやると「負けチームのルール設定」が選択肢豊富になる。

### Phase 5 — 後回し（負債が出たら/余裕が出たら）
- §6 グリッド検索・フィルタ（UX）／§5 BAN・ピック回数統計（まず `localStorage` でDB無風に）／§7 演出・SE・TTS。

---

## 再開メモ（次に開く人へ）
- まず `git log --oneline -8` と本ファイルで現在地を確認。`git status` がクリーンか確認。
- ローカル配信: `python -m http.server 8000` → http://localhost:8000/ （`file://` 不可）。Firebaseは本番DBに繋がるのでテスト用ルームIDで。
- 検証の型: `node --check`（構文）→ 純粋ロジックは index.html から関数抽出してnodeで単体テスト → ローカル配信で手動スモーク（`docs/manual-smoke-checklist.md`、ジャンルBANは S13）。
- ジャンルBAN関連コードの居場所（行番号は変動・周辺を読む）:
  - 定数/ヘルパー: `SUBSPE_IMG_MAP` / `CAT_REP_KEY` / `makeGenreBan` / `banIdOf` / `weaponMatchesGenreBan` / `banLimitFor` / `banTotalLimit` / `banRemainingFor` / `enabledBanGrans` / `genreValuesFor` / `autoCompleteBanPending` / `serializeBan` / `banDispName`（`index.html` 1840–2000付近）。
  - グリッド: `renderGrid`（粒度タブ）/ `renderBanGenreTiles`。確定フロー: `pickWeapon` の ban 分岐。集計: `renderBanPanel` / `renderSlots` / `checkBothBansReady`。
  - 設定UI: マルチ `#ban-genre-row`（pick-mode/ban-mode で表示制御 `updateBanGenreRowVisibility`）/ ソロ `#solo-ban-genre-row`。読み書き `readBanGenresFromUI`/`applyBanGenresToUI`/`getLobbySettings`/`buildAndStartDraft`。
- 新機能を足すときの流儀: §0相当の決定→小さく1コミット=1意図→各フェーズで検証→main へ push。仕様が割れたら止めて確認。
