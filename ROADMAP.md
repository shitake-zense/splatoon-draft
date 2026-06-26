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

### ✅ Phase 2 — お題カード / 縛りルーレット（§3）（完了）
- 決定（2026-06-25 オーナー確認）: **両チーム共通1枚** / **非強制（○×表示のみ）** / **縛りルーレット演出を同梱** / **ON-OFFトグル（既定OFF）**。
- 完全クライアント完結（DB無風）。`state.challenge={id,label,desc}` を**追加のみ**で同期（後方互換）。`normalizeState` に既定 `challenge:null`。
- [x] `CHALLENGES`（8種：全員ちがう武器種/全員ちがうスペシャル/サブ被り禁止/全員サブがボム系/チャージャー入れる/ローラー入れる/シューター禁止/全員おなじ武器種）＋`BOMB_SUBS`、`evaluate(picks)`／`evaluateChallenge(S,team)`／`pickRandomChallenge`／`challengeDefById`（`serializeBan` 直後）。
- [x] 設定UIトグル：マルチ `#challenge-enabled`（`onSettingChange` で lobby 同期）／ソロ `#solo-challenge-enabled`。`getLobbySettings`/`startSoloDraft`/`applyLobbySettingsToForm`/`buildAndStartDraft` に `challengeEnabled` を配線。
- [x] 開始時抽選 → `state.challenge`。ルーレット演出 `maybePlayChallengeRoulette()`（`showDraftUI` 末尾・ホスト/参加者共通入口）、ガード `_challengeRouletteDone`（`resetTransientDraftState` でリセット）。オーバーレイ `#challenge-overlay`、タップで `dismissChallengeRoulette()`。
- [x] 結果画面 `#r-challenge`（`showResult`）＋結果画像のお題バンド（`downloadResultImage` の `chBand`）。各チーム ○/× は `evaluateChallenge` で算出（enemy モードは `picks[team]`＝使うロードアウトで判定）。
- [x] **ドラフト画面（BAN/PICK 中）の常時お題バナー** `#d-challenge`（CSS `.d-challenge` `index.html:331-341`／`renderChallengeBanner()` `:2104-2123`／`renderDraft` 末尾から毎描画呼び出し `:2938`）。お題ラベル＋説明＋各チーム進捗（`選択中… n/ts` → 揃ったら `○達成/×未達成`）をピック進行に合わせライブ更新。非強制は維持（表示のみ）。
- [x] 検証：scriptブロック `node --check` OK／判定ロジック単体 18件パス（`scratchpad/challenge.test.mjs`）／smoke `S14` 追記。
- **未決（次回確認候補）**: お題の追加・難易度バランス（現状は固定8種・等確率抽選）。ハンデ（§3「弱い側にBAN+1」等）は未着手。チーム別お題は今回スコープ外（共通1枚で確定）。

#### お題に「強制力」を持たせる場合のコスト分析（2026-06-25・着手判断用メモ）
> 「ピック中にリアルタイムで選べる武器が減る」強制ルール化を将来検討する場合の見積り。結論：◎ではなく **△（高）＝ほぼ1フェーズ規模**。現行は意図的に非強制（○×表示のみ）で確定済み。
- **コスト本体**：`evaluate()` は*完成形*を判定するが、強制力は*1手ごとに「今これを選んでも最後まで達成可能か」*という別物の増分判定が要る（新レイヤ新設）。
- **お題ごとの難易度**：
  - ◎ 静的フィルタ＝シューター禁止／全員サブがボム系（除外フィルタと同型）。
  - ◎〜○ 局所制約＝全員ちがう武器種／〜スペシャル／サブ被り禁止／全員おなじ武器種（既ピックでグリッドを毎ターン絞る）。
  - △ 存在制約（締切付き）＝チャージャー/ローラーを入れる（「残スロット==未達必須数」で強制する先読み予約が必要）。
- **横断的に効く難所**：① タイマー自動補完(ランダム)も合法集合からのみ選ぶよう改修必須／② 相手ピック(enemy)はターゲット反転（αのグリッドをβの蓄積で絞る）で捻れる／③ 同時ピック(被りOK)は「チーム間は被りOK・チーム内は強制」の両立。
- **“ほぼ不可能”なお題はあるか**：述語自体が原理的に不能なお題は現8種には無い。ただし**BAN/人数との組合せで容易に達成不能（デッドロック）化**する（例: チャージャー全BAN下で「チャージャーを入れる」、プール枯渇で「全員サブがボム系」）。→ 強制エンジンには**開始時(BAN確定後)の実現可能性プリチェック＋不能なら自動スキップ/緩和**と、**毎ターン最低1合法手の保証**が必須。これを全モード×BANで正しく作り切るのが最大リスク。
- **推奨スコープ分割**：v1=「個人/代表者ピック限定・局所/静的制約のみ・開始時に実現不能なら自動スキップ」で○（中）。enemy/同時/存在制約は別フェーズに切る。

### Phase 3 — ガチャ/運命ピック → ドラフト後トレード（§2）
- ガチャ＝ランダム配布＋リロール（既存 `pickRandom` 流用）。トレード＝ピック後に交換提案→相手承認（`pending_*` 同期パターンの延長）。

#### ✅ Phase 3a — ガチャ/運命ピック（完了）
- 仕様: BAN後に**各チームへ人数分(ts)の武器をランダム一括配布**。チーム内は重複なし／チーム間ミラー許可。**リロール回数**（既定2・チームごと）まで引き直し可。両チーム「確定」で即リザルト。**非強制**（演出のみ、強制力なし）。
- ピックモード `'gacha'` を追加（マルチ／ソロ両方）。`seq` は BAN のみ積み、ガチャは**BAN後の専用フェーズ**（`gachaPhase = done && pickMode==='gacha' && !gachaAllConfirmed`）。タイマーは `!done` 条件で自動的に無効。
- コードの居場所（行番号は変動・周辺を読む）:
  - ロジック: `drawGachaHand`/`ensureGachaInit`(ソロ)/`finalizeGacha`/`gachaAllConfirmed`/`gachaCanOperate`/`window.gachaReroll`/`window.gachaConfirm`。
  - マルチ同期: `rooms/{room}/gacha`(alpha/bravo={hand,used,confirmed}) を真実の源に `subscribeGacha`/`maybeHostGachaInit`(ホストが初期配布)/`maybeHostGachaFinalize`(両確定で picks反映→`pushState`)。多重発火ガード `_gachaInitInProgress`/`_gachaFinalized`(`resetTransientDraftState` でリセット)。退出系(`backToLobby`/`leaveLobby`/`goHome`)で `fbGachaUnsub` 解除＋gachaノード削除。
  - 代表者: ガチャは BANモード/BAN数に関わらず代表者を解決（`buildAndStartDraft` の `representativeAlpha/Bravo` 算出条件に `pMode==='gacha'` を追加）。操作は代表者のみ（`gachaCanOperate`）。
  - UI: パネル `#gacha-panel`（`renderGachaPanel`）。設定 `#gacha-row`/`#gacha-rerolls`（マルチ）・`#solo-gacha-row`/`#solo-gacha-rerolls`（ソロ）。`gachaRerolls` を `getLobbySettings`/`startDraft`/`buildAndStartDraft`/`normalizeState`/`applyLobbySettingsToForm` に配線。
  - 使い方ガイド更新済み（ピックモード4種・リロール回数・参加者の操作担当・流れ）。
- 検証: `node --check` OK。

#### ✅ Phase 3b — ドラフト後トレード（完了）
- 決定（2026-06-26 オーナー確認）: **トグルで既定OFF** / 操作は**代表者のみ** / 成立**回数は無制限**。仕様は draft-ideas §2「この1枚を相手の1枚と交換しませんか？→相手承認で成立」。
- 仕様: 結果画面で **自チーム武器1枚 ⇄ 相手チーム武器1枚** の交換を提案。マルチは**受け手チームの代表者が承認/拒否**、ソロは即時入替。武器の中身だけ入れ替え、**所有者(memberId)は各スロットに残す**（個人/相手ピックの担当者は変わらない）。
- 同期: 真実の源 `rooms/{room}/pending_trade`（`{from,fromMember,giveIdx,give,wantIdx,want,status,ts}`）。承認後の `picks` 反映は**単一ライターのホスト**が `hostApplyTrade`→`pushState`。bravo代表が承認したら `status='accepted'` を立て、ホストの `subscribeTrade` が検知して適用。整合性チェック（提案時 key と現 picks の一致）＋ `_tradeApplying` ガード。
- リザルト常駐対策: `subscribeRoom` で「**リザルト表示中 かつ done の state 更新**」は `showDraftUI` に戻さず `showResult` のみ再描画（トレード成立を全員へ反映）。
- コードの居場所（行番号変動・周辺を読む）: ロジック `applyTradeSwap`/`isTradeOperator`/`myTradeTeam`/`tradeTeams`/`hostApplyTrade`、同期 `subscribeTrade`、UI `renderTradeArea`/`renderTradePicker`/`renderTradePending`、操作 `window.submitTrade`/`respondTrade`/`cancelTrade`/`toggleTradePanel`/`selectTradeChip`。設定 `#trade-enabled`/`#solo-trade-enabled`→`getLobbySettings`/`startSoloDraft`/`buildAndStartDraft`/`normalizeState`/`applyLobbySettingsToForm`。代表者解決条件に `tradeEnabled` を追加。退出/再ドラフトで `fbTradeUnsub` 解除＋`pending_trade` 削除（再ドラフトの gacha ノード削除漏れも同時修正）。
- 検証: `node --check` OK／`applyTradeSwap` 単体7件パス（`scratchpad/trade.test.mjs` 相当）／ローカル実機でソロ・トレードE2E（.52⇄.96 入替）確認／使い方ガイド更新済み／smoke `S16` 追記。
- **未決/次**: マルチ2クライアントE2Eは本番（GitHub Pages）で要スモーク。Phase 3 はこれで完了 → 次は **Phase 4（シリーズ/連戦）**。

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
