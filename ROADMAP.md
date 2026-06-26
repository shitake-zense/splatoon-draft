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
- **未決（次回確認候補）**: ジャンルBAN数は現状「**必須数**」（その数だけ必ずBANする）。「**最大N（任意）**」にしたい場合は完了条件の作り直しが要る。
- **2026-06-26 調整（オーナー指示）**: ①**相手ピック（enemy）ではジャンルBANを廃止**＝設定枠を非表示（マルチ `updateBanGenreRowVisibility` / ソロ `onSoloPickModeChange`）＋`buildAndStartDraft` で enemy は banGenres を 0 強制。②**個人ピック×個人BANで味方の送信済みBANをグリッドにも共有表示**（`renderGrid` の `teammateBanSet`＝自チーム `bannerIds`×`pending_bans` から構築、破線枠＋「味方」バッジ・タップ不可。相手のBANは伏せたまま。`subscribeIndividualBans` がBAN中に `renderGrid` 追加呼び出し）。検証: 単体11件パス（`scratchpad/banshare.test.mjs` 相当）。

### ✅ Phase 2 — お題カード / 縛りルーレット（§3）（完了）
- 決定（2026-06-25 オーナー確認）: **両チーム共通1枚** / **非強制（○×表示のみ）** / **縛りルーレット演出を同梱** / **ON-OFFトグル（既定OFF）**。
- 完全クライアント完結（DB無風）。`state.challenge={id,label,desc}` を**追加のみ**で同期（後方互換）。`normalizeState` に既定 `challenge:null`。
- [x] `CHALLENGES`（8種：全員ちがう武器種/全員ちがうスペシャル/サブ被り禁止/全員サブがボム系/チャージャー入れる/ローラー入れる/シューター禁止/全員おなじ武器種）＋`BOMB_SUBS`、`evaluate(picks)`／`evaluateChallenge(S,team)`／`pickRandomChallenge`／`challengeDefById`（`serializeBan` 直後）。
- [x] 設定UIトグル：マルチ `#challenge-enabled`（`onSettingChange` で lobby 同期）／ソロ `#solo-challenge-enabled`。`getLobbySettings`/`startSoloDraft`/`applyLobbySettingsToForm`/`buildAndStartDraft` に `challengeEnabled` を配線。
- [x] 開始時抽選 → `state.challenge`。ルーレット演出 `maybePlayChallengeRoulette()`（`showDraftUI` 末尾・ホスト/参加者共通入口）、ガード `_challengeRouletteDone`（`resetTransientDraftState` でリセット）。オーバーレイ `#challenge-overlay`、タップで `dismissChallengeRoulette()`。
- [x] 結果画面 `#r-challenge`（`showResult`）＋結果画像のお題バンド（`downloadResultImage` の `chBand`）。各チーム ○/× は `evaluateChallenge` で算出（enemy モードは `picks[team]`＝使うロードアウトで判定）。
- [x] **ドラフト画面（BAN/PICK 中）の常時お題バナー** `#d-challenge`（CSS `.d-challenge` `index.html:331-341`／`renderChallengeBanner()` `:2104-2123`／`renderDraft` 末尾から毎描画呼び出し `:2938`）。お題ラベル＋説明＋各チーム進捗（`選択中… n/ts` → 揃ったら `○達成/×未達成`）をピック進行に合わせライブ更新。非強制は維持（表示のみ）。
- [x] 検証：scriptブロック `node --check` OK／判定ロジック単体 18件パス（`scratchpad/challenge.test.mjs`）／smoke `S14` 追記。
- **未決（次回確認候補）**: 難易度バランス（等確率抽選）。ハンデ（§3「弱い側にBAN+1」等）は未着手。チーム別お題は今回スコープ外（共通1枚で確定）。
- **2026-06-26 拡張（オーナー指示「角度を変えて+20以上」）**: お題を **8種→32種** に拡充（追加24：武器種を入れる/禁止系、武器種2種まで・3種以上・シューター1人まで、全員おなじサブ/スペシャル、ボム系サブ禁止/入れる、スプラッシュボム・シールド・ウルトラショット・グレートバリアを入れる 等）。**重要バグ修正**: picks には `cat` のみで `sub/special` が無く、既存の sub/special 系お題（all_diff_special/no_dup_sub/all_bomb_sub）が実質常に×になっていた → 判定前に `enrichPickForChallenge`（`weaponByKey` で WEAPONS から sub/special 補完）を `evaluateChallenge` に追加して修正。検証: 実データ(weapons.json)で全32種を評価する単体26件パス（`scratchpad/challenges.test.mjs` 相当）。

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

#### ✅ Phase 4a — BO3/BO5 連戦フレーム（完了）
- 決定（2026-06-26 オーナー確認）: **4aを先に実装してpush** → 4b/4c/4d は段階的に。勝敗は**ホストが結果画面で入力**（アプリは試合結果を知らない）。長さは **BO3（先取2）/ BO5（先取3）から選択**。
- 仕様: 各試合はフルドラフト→結果。結果画面でホスト（ソロは操作者）が勝者を選ぶ→**ステージ/ルールを自動ランダム変更**して次戦のドラフトを再構築。先取数到達でシリーズ終了＝勝者と各試合履歴（勝者/ルール/ステージ）を表示。各試合の編成・BANは履歴にスナップショット保存（4d 戦績ボード用の土台）。
- 状態: `state.series = {mode,target,game,scoreA,scoreB,history[],done,config}`（**追加のみ**・`normalizeState` 既定 null）。`config` に次戦再構築用の設定スナップショット。state に `pickOrderAlpha/Bravo` も保存（次戦の seq 再構築＋結果ソートが正しく効くように）。
- 同期: `state.series` を `pushState` で同期。次戦開始＝ホストが `buildAndStartDraft`（series 引き継ぎ）→push→全員が新ゲームへ。シリーズ終了は done を push し全員のリザルト再描画。`subscribeRoom` の「リザルト中の done 更新は showResult のみ」(Phase3b) で終了表示、新ゲーム(idx0)は通常の draft 入場。
- 重要修正: `buildAndStartDraft` の一時リセットを `resetTransientDraftState()` 呼び出しに統一（連戦の次戦で**ガチャ `_gachaFinalized`／トレード／お題ルーレットのフラグも確実にクリア**）。`subscribeRoom` の draft 入場時も同関数で全リセット。
- コードの居場所: `recordSeriesWinnerAndAdvance`／`renderSeriesArea`／`renderSeriesHistory`／`seriesIsOperator`／`window.seriesWinner`。設定 `#series-enabled`/`#series-mode`（マルチ）・`#solo-series-enabled`/`#solo-series-mode`（ソロ）→`onSeriesToggle`/`onSoloSeriesToggle`。`buildAndStartDraft` に `seriesEnabled/seriesMode/series` を配線。結果UI `#series-area`（trade-area の下）。
- 検証: `node --check` OK／スコア・終了判定 単体13件パス／**ローカル実機でソロ BO3 をE2E**（2-0 で第1→第2試合へ自動進行・ステージ自動変更・履歴・終了表示を確認）／使い方ガイド更新済み／smoke `S17` 追記。
- **未決/次**: マルチ2クライアントE2Eは本番要スモーク。次は 4b（武器ロックアウト）。

#### ✅ Phase 4b — 武器ロックアウト（完了）
- 仕様（draft-ideas §4「プール枯渇制」）: 連戦のオプション（トグル既定OFF・連戦ON時のみ表示）。**一度ピックされた武器は同シリーズの次戦以降ずっと使用不可**。両チーム共有でプールが枯れる。対象は**ピックのみ**（BANは各試合リセット）。
- 状態: `state.series.lockout`(bool) と `state.series.lockedKeys`[]（過去試合のピック key 累積・重複排除）を追加のみ。`normalizeState` で既定 false/[]。`buildAndStartDraft` の series 初期化で `lockout/lockedKeys` 設定。`recordSeriesWinnerAndAdvance` で各試合のピック key を `lockedKeys` へ累積→次戦 series に引き継ぎ。
- プール反映: **単一チョークポイント `getAvailableWeapons`** に lockedKeys 除外を追加（グリッド・ガチャ `drawGachaHand`・タイマー自動補完に自動波及）。グリッド表示は `renderGrid` でロック武器を `is-locked`（🔒バッジ・グレー・disabled）化、`pickWeapon` 先頭に防御ガード。
- UI: ドラフト中バナー `#d-lockout`（`renderLockoutBanner`・残ロック数）／結果 series-area にロック数ノート。設定 `#series-lockout`/`#solo-series-lockout`（連戦トグルと連動表示）。
- 検証: `node --check` OK／累積＋除外ロジック 単体7件パス／**ローカル実機でソロ BO3 ロックアウトE2E**（第1試合のピック2種が第2試合で🔒disabled＋バナー「2種」を確認）／使い方ガイド更新済み／smoke `S17` にロックアウト項目追記。
- **未決/次**: プール枯渇でピック不能になる極端ケース（BO5×大量フィルタ）は未ガード（実用上は十分広い）。次は 4c。

#### ✅ Phase 4c — 連戦のガチルール進行＋負けチームがルール設定（完了）
- 決定（2026-06-26 オーナー確認）: **BO3=ガチルール毎回ランダム／BO5=1〜4戦目を固定順(エリア→ヤグラ→ホコ→アサリ)→5戦目ランダム**。**負けチームがルール設定＝トグル方式**（ONで2戦目以降は敗者が次戦ガチルールを選ぶ）。敗者が決めるのは**ガチルールのみ**（ステージは従来どおり毎戦ランダム）。敗者先攻/勝者BAN-1 は次（4c-2）に分離。
- ルール進行: `seriesRuleForGame(sr)` で決定（負けチーム指定 nextRule＞BO5固定順＞ランダム）。`buildAndStartDraft` でルール計算前に series を解決し `rmEff=seriesRuleForGame(seriesObj)` を使用（毎戦の rule を上書き、stage は毎戦ランダム）。`RULES` がそのまま固定順（エリア/ヤグラ/ホコ/アサリ）。
- 負けチーム設定フロー: 勝者入力後、`loserSetsRules` なら `awaitingRule=true`/`ruleChooser=敗者` を立てて push（進行を止める）。結果の series-area に敗者代表（ソロは操作者）向けのガチルール4ボタン。選択で `chooseSeriesRule`→ホスト/ソロは `applyChosenRuleAndAdvance`→`advanceSeries`。マルチで敗者=bravo のときは `rooms/{room}/series_rule` に書き込み→**ホストの `subscribeSeriesRule` が適用**（単一ライター維持）。代表者解決条件に `seriesEnabled` を追加。
- 状態: `state.series` に `loserSetsRules/awaitingRule/ruleChooser/nextRule` を追加のみ（`normalizeState` 既定）。`config` に `seriesLoserRules` 保持。退出/再ドラフトで `fbSeriesUnsub` 解除＋`series_rule` 削除。
- UI: 設定トグル `#series-loser-rules`/`#solo-series-loser-rules`（連戦連動表示）。series-area に awaitingRule 分岐（ルール選択ボタン／待機表示）。
- 検証: `node --check` OK／ルール進行ロジック 単体14件パス（BO3ランダム・BO5固定順・loser-set上書き・不正値フォールバック）。**実機E2Eはオーナーが実施予定**。使い方ガイド更新済み／smoke `S17` にルール進行＋負けチーム設定を追記。
- **未決/次**: マルチ2クライアントの負けチーム=bravo 経路（`series_rule` 同期）は本番要スモーク。**4c-2＝敗者先攻/勝者BAN-1 はオーナー判断で見送り（実装しない）**。

#### ✅ Phase 4d — 戦績ボード / シリーズPNG（完了）
- 決定（2026-06-26 オーナー確認）: 4c-2 は見送り、**4d を実装して push**。履歴スナップショット（`series.history[].picks/bans`）は Phase 4a から保存済みなので**新規DB/スキーマ追加なし**（描画のみ）。
- 仕様: シリーズ終了時、結果の「🔁 連戦シリーズ」欄に**戦績ボード**を表示＝各試合ごとに「第N試合 ／ ルール / ステージ ／ 勝者」＋両チームの**ピック編成一覧**（武器名・勝者に🏆）。下部に**「🖼️ シリーズ画像を保存」**＝全試合を1枚にまとめたPNG（ヘッダーに優勝＋最終スコア＋BO3/BO5、各試合ブロックにルール/ステージ/勝者＋両チームのピックアイコン＋武器名）を端末内生成（外部送信なし）。全員（非ホスト含む）に表示。
- コードの居場所: `renderSeriesBoard(sr,S)`（`renderSeriesHistory` 直後・done 分岐で使用）／`window.downloadSeriesImage`（`downloadResultImage` 直後・canvas、`_wmTruncate`/`_wmRoundRect` 流用）。結果UIのボタン `#btn-save-series`（series-area done 内）。CSS `.series-board`/`.sb-game`/`.sb-ghead`/`.sb-teams`/`.sb-team`/`.sb-picks`/`.series-save`。in-progress 用の一行履歴 `renderSeriesHistory` はそのまま残す。
- 検証: `node --check` OK／`renderSeriesBoard` 単体11件パス（編成結合・空ピック→なし・勝者🏆・XSSエスケープ・空履歴）。**実機E2E（シリーズPNG含む）はオーナーが実施予定**。使い方ガイド（ホスト向け＋流れ）更新済み／smoke `S17` に Phase 4d 項目追記。
- **未決/次**: Phase 4 はこれで完了（4c-2 は見送り）。次は **Phase 5（UX/統計/演出の改善プール・後回し枠）**。

### Phase 5 — UX/統計/演出の改善プール（後回し枠・余裕が出たら）
- 候補: §6 グリッド検索・フィルタ（UX）／§5 BAN・ピック回数統計（まず `localStorage` でDB無風に）。

#### ✅ Phase 5 — メンバードラフト（キャプテン選抜・マルチ専用）（完了）
- 決定（2026-06-26 オーナー確認）: 武器ドラフト前の**チーム分けをキャプテン選抜方式**に。後回し候補のうち**ターンタイマー自動ピックのみ採用**（取り消し/やり直し・キャプテン離脱復旧・ソロ対応・演出は不採用）。**人数不足は開始不可・各チーム代表者1名ずつ選出時のみ開始可能**。
- 位置づけ: **ロビーの「3つ目のチーム割当方式」**。出力は既存と同じ `lobby/members/{id}/team`。**武器ドラフトの `state` スキーマ／状態機械には不可侵**（Phase 4 より低リスク）。同期は `lobby/memberDraft` を**追加ノードのみ**（後方互換）。
- 仕様: トグル `#member-draft-enabled`。チーム割当で各チーム**キャプテン1名ずつ**＋残りは未割当（プール）。開始ゲート＝`alphaCount===1 && bravoCount===1 && total>=2*ts`（**ts>=2 限定**・1v1不可）。開始後は2キャプテンが**交互にプールから指名**（先攻チーム先攻・埋まったチームはスキップ＝`nextMdTurn`）。両チーム ts 到達で `done`。余剰はサブ（未割当）。
- 同期/単一ライター: キャプテンは `lobby/memberDraft/pick` に意図を書く → **ホストが `hostApplyMemberDraft` で `members[].team` 反映＋手番送り**（series_rule/trade と同型・`_mdApplying` ガード）。専用画面 `#s-member-draft` をホスト/参加者共通で表示（`handleMemberDraftPhase` が `subscribeLobby` から画面遷移を制御・`_mdPhaseActive`）。
- タイマー自動ピック: 制限時間ON（既存 `time-limit-*` 設定を流用）時、ターンに `deadline`。ホストの `startMdTimer`/`stopMdTimer` が時間切れでプールからランダム自動指名（多重発火防止に発火後 stop）。残り秒表示は全クライアントの `startMdCountdown`（描画のみ）。
- コードの居場所: 設定 `getLobbySettings`/`applyLobbySettingsToForm` に `memberDraftEnabled`。`updateStartButton`（md分岐＝ラベル/ゲート）／`startDraft`（md未完了なら `startMemberDraft`、完了なら node 削除して武器ドラフト）。`renderTeamAssign`（キャプテン選抜UI切替）。`window.onMemberDraftToggle`/`mdPick`/`abortMemberDraft`、`startMemberDraft`/`nextMdTurn`/`hostApplyMemberDraft`/`handleMemberDraftPhase`/`renderMemberDraftScreen`/`startMd(Timer|Countdown)`。退出/ロビー戻り(`backToLobby`/`leaveLobby`/`goHome`)で node＋タイマー片付け。UI: 画面 `#s-member-draft`、CSS `.md-*`。`showScreen` に `member-draft` 登録。
- 検証: `node --check` OK／手番進行＋開始ゲート＋完了判定の単体15件パス（`scratchpad/memberdraft.test.mjs` 相当）／**ローカル実機でロード健全性＋開始ゲート（4v4人数不足・1v1ガード・リセット）をブラウザ確認**。**2クライアントの選抜E2E（指名・タイマー自動指名・非ホストキャプテン経路）は本番要スモーク**。使い方ガイド（ホスト/流れ）・README・smoke `S19` 更新。
- **未決/次**: 途中参加/キャプテン離脱の整合は v1 未対応（実用上はロビー再構成で回避）。残りは §6 検索・フィルタ／§5 統計。

#### ✅ Phase 5 §7a — 確定演出 / SE / 武器読み上げTTS（完了）
- 決定（2026-06-26 オーナー確認）: §7 のうち **A=確定演出＋SE** と **C=武器読み上げTTS** を採用。B(カウントダウン緊張演出)/D(リザルト祝福)・煽りスタンプ/罰ゲーム/神の手は見送り。全て **DB無風・外部依存ゼロ**（音は Web Audio 自前合成＝音声ファイル同梱なし、読み上げは Web Speech API）。
- 仕様: ドラフト画面右上に `🔊`(確定音・既定ON)/`🗣️`(読み上げ・既定OFF) トグル（localStorage `sd_sfx`/`sd_tts` で端末保持）。PICK/BAN/同時ピック確定の**ユーザー操作タップ時**に SE＋（ON時）武器名読み上げ。スロットには新規確定ぶんだけ**ポップ入場アニメ**（描画差分 `_fxSeen` で1回のみ・タイマー再描画で再生しない・リモート視聴側にも出る）。
- 音声は**確定タップ＝gesture 直後にのみ再生**（自動再生制限に準拠）。読み上げ音声が無い端末でも無音で安全。
- コードの居場所: 設定/状態 `sfxEnabled`/`ttsEnabled`/`_fxSeen`/`_audioCtx`（global let）。エンジン `_audio()`/`_tone()`/`sfx{pick,ban,confirm}`/`speakWeapon()`/`window.toggleSfx`/`window.toggleTts`/`renderFxToggles()`（`resetTransientDraftState` 直後）。フック: `pickWeapon` の各確定分岐（通常ピック push 後／代表BAN push 後／同時ピック lock 後／個人BAN ローカル確定後）。アニメ: `renderSlots`（`is-new` 付与＋seen更新）。UI: `.dh` 内 `#fx-sfx`/`#fx-tts`、CSS `.fx-toggles`/`.fx-btn`/`.ws.is-new`/`@keyframes slotPop`。`showDraftUI` で `renderFxToggles()` 呼び出し。`resetTransientDraftState` で `_fxSeen={}`。
- 検証: `node --check` OK／入場アニメ差分ロジック 単体12件パス（新規1回・再描画で非再生・BAN一括・再入場の既存非アニメ・次戦リセット）。**音/読み上げ/アニメの実機確認はオーナー実施予定**。使い方ガイド（流れタブ）更新済み／smoke `S18` 追記。
- **未決/次**: 残りは §6 グリッド検索・フィルタ／§5 統計（いずれも未着手・任意）。

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
