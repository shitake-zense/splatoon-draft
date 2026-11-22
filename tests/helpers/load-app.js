'use strict';
// index.html の <script type="module"> を Node の vm サンドボックスに読み込み、
// 純粋ロジック関数をテストから呼べるようにするハーネス。
// - Firebase SDK の import はスタブ（set/get/onValue 等は no-op）に差し替える
// - document / localStorage / location などブラウザ globals も最小スタブを与える
// - 末尾に __app エクスポートを連結して、同一スコープの関数・状態を取り出す
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeEl(){
  return {
    style:{}, dataset:{}, children:[],
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    appendChild(c){ this.children.push(c); return c; },
    insertAdjacentElement(){}, setAttribute(){}, removeAttribute(){},
    addEventListener(){}, querySelectorAll(){ return []; }, querySelector(){ return makeEl(); },
    textContent:'', innerHTML:'', value:'', checked:false, disabled:false,
  };
}

// テストから参照したい関数・定数（存在しない名前は undefined になるだけで害はない）
const EXPORT_NAMES = [
  'esc','clampTimeLimit','buildPickSeq','pickStoreTeam','pickOwnerId',
  'banIdOf','banTypeOf','banLimitFor','banTotalLimit','banRemainingFor',
  'makeGenreBan','weaponMatchesGenreBan','weaponBannedByGenres','isWeaponExcluded',
  'autoCompleteBanPending','serializeBan','banDispName','getAvailableWeapons',
  'seriesRuleForGame','normalizeState','generateRoomId','evaluateChallenge',
  'resolveRepresentative','repIdOf','repNameOf','myTeamOf',
  'isRepBanRepresentative','isSeriesChooserOperator','gachaCanOperate','isTradeOperator',
  'statKey','buildStatsUpdates','buildStatsRanking',
  'filterWeaponPool','isReplicaWeapon','genreValuesFromPool','weaponGridStatus','canSelectGridWeapon','weaponByKey','catRepImgUrl',
  'startTimer','clearTimer','startMdTimer','stopMdTimer','startWpTimer','stopWpTimer',
  'unsubscribeRoomListeners','clearDraftRoomData',
  'createInitialDraftState',
  'validStagePool','stageDraftPending','stageDraftTurn','applyStageDraftAction','isStageOperator','buildRoomPresetSettings','ROOM_PRESETS',
  'seriesMaxGames','requiredStageCount','stageDraftOf','stageUsedStages','randomUnusedStage','prepareNextStageDraft','stageImgUrl','gachaMatchesDraft',
  'normalizePresetSettings','normalizeMyPresetName','decodePresetFile','presetFileDocument','presetDescription',
  'emptyLocalStats','applyLocalDraftStats','buildStatsCounts','recordLocalDraftStats',
  'draftStartIssues','lobbyStartIssues','soloStartIssues','updateStartButton','updateSoloStartButton',
  'makeBotMembers','uniqueMemberName','shortMemberLabels','nextLockId','LOCK_IDS','stateHasBots','isBotId','splitTeamsWithTags','normalizeTagDefs','tagLabel','nextTagId','TAG_IDS','usesIndividualBan',
  'RULES','CATEGORY_ORDER','CHALLENGES','STAGES_DATA',
];

let cached = null;
function loadApp(){
  if(cached) return cached;
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  if(!m) throw new Error('index.html に <script type="module"> が見つかりません');
  let src = m[1];
  // Firebase SDK の import を除去（機能はサンドボックスのスタブで供給）
  src = src
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]*";?/g, '')
    .replace(/import\s+[\w$]+\s+from\s*"[^"]*";?/g, '');

  const appendix = '\n;globalThis.__app={'
    + EXPORT_NAMES.map(n => `${n}: (typeof ${n}!=="undefined") ? ${n} : undefined`).join(',')
    + ',__set(o){'
    + '  if("WEAPONS" in o) WEAPONS = o.WEAPONS;'
    + '  if("banPending" in o) banPending = o.banPending;'
    + '  if("pendingSelect" in o) pendingSelect = o.pendingSelect;'
    + '  if("state" in o) state = o.state;'
    + '  if("isMulti" in o) isMulti = o.isMulti;'
    + '  if("isHost" in o) isHost = o.isHost;'
    + '  if("myMemberId" in o) myMemberId = o.myMemberId;'
    + '  if("roomId" in o) roomId = o.roomId;'
    + '  if("lobbyMembers" in o) lobbyMembers = o.lobbyMembers;'
    + '  if("lobbyMemberDraft" in o) lobbyMemberDraft = o.lobbyMemberDraft;'
    + '  if("localStorage" in o) localStorage = o.localStorage;'
    + '  if("document" in o) document = o.document;'
    + '  if("banActiveTeam" in o) banActiveTeam = o.banActiveTeam;'
    + '  if("myBanSubmitted" in o) myBanSubmitted = o.myBanSubmitted;'
    + '  if("alphaBanSubmitted" in o) alphaBanSubmitted = o.alphaBanSubmitted;'
    + '  if("bravoBanSubmitted" in o) bravoBanSubmitted = o.bravoBanSubmitted;'
    + '  if("alphaPickSubmitted" in o) alphaPickSubmitted = o.alphaPickSubmitted;'
    + '  if("bravoPickSubmitted" in o) bravoPickSubmitted = o.bravoPickSubmitted;'
    + '  if("banPendingIndividual" in o) banPendingIndividual = o.banPendingIndividual;'
    + '  if("simPickPending" in o) simPickPending = o.simPickPending;'
    + '  if("fbLobbyUnsub" in o) fbLobbyUnsub = o.fbLobbyUnsub;'
    + '  if("fbUnsub" in o) fbUnsub = o.fbUnsub;'
    + '  if("fbBanUnsub" in o) fbBanUnsub = o.fbBanUnsub;'
    + '  if("fbSimPickUnsub" in o) fbSimPickUnsub = o.fbSimPickUnsub;'
    + '  if("fbIndividualBanUnsub" in o) fbIndividualBanUnsub = o.fbIndividualBanUnsub;'
    + '  if("fbGachaUnsub" in o) fbGachaUnsub = o.fbGachaUnsub;'
    + '  if("fbTradeUnsub" in o) fbTradeUnsub = o.fbTradeUnsub;'
    + '  if("fbSeriesUnsub" in o) fbSeriesUnsub = o.fbSeriesUnsub;'
    + '  if("fbStageDraftUnsub" in o) fbStageDraftUnsub = o.fbStageDraftUnsub;'
    + '}'
    + ',__get(){ return { WEAPONS, banPending, pendingSelect, state, isMulti, isHost, myMemberId, timerIntervalId, timerDeadline:startTimer._deadline, mdTimerInterval, wpTimerInterval }; }'
    + '};';

  const removedPaths=[];
  const sandbox = {
    console, setTimeout, setInterval, clearTimeout, clearInterval,
    URLSearchParams, Promise, Math, Date, JSON,
    crypto: globalThis.crypto,
    fetch: () => Promise.reject(new Error('fetch is disabled in tests')),
    alert(){}, confirm(){ return true; },
    addEventListener(){}, removeEventListener(){},
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    location: { origin:'http://localhost', pathname:'/', search:'', hash:'', reload(){} },
    navigator: { clipboard: { writeText(){ return Promise.resolve(); } } },
    document: {
      getElementById(){ return makeEl(); },
      createElement(){ return makeEl(); },
      querySelectorAll(){ return []; },
      querySelector(){ return makeEl(); },
      addEventListener(){},
      body: makeEl(),
    },
    Image: function(){ return {}; },
    // ---- Firebase SDK スタブ ----
    initializeApp(){ return {}; },
    getDatabase(){ return {}; },
    getAuth(){ return {}; },
    ref(db, p){ return { path: p }; },
    set(){ return Promise.resolve(); },
    update(){ return Promise.resolve(); },
    remove(reference){ removedPaths.push(reference.path); return Promise.resolve(); },
    get(){ return Promise.resolve({ exists: () => false, val: () => null }); },
    onValue(){ return () => {}; },
    increment(n){ return { __increment: n }; },
    signInAnonymously(){ return Promise.resolve({ user: { uid: 'test-uid' } }); },
  };
  sandbox.window = sandbox;
  sandbox.__removedPaths = removedPaths;
  vm.createContext(sandbox);
  vm.runInContext(src + appendix, sandbox, { filename: 'index-app.js' });
  cached = sandbox.__app;
  cached.__window = sandbox;
  cached.__removedPaths = removedPaths;
  return cached;
}

// テスト用のミニ武器フィクスチャ（cat/sub/special の組合せを意図的に散らしてある）
function fixtureWeapons(){
  return [
    { key:'w1', name:'ブキ1', cat:'シューター',   imgFile:'A_00.png', imgUrl:'x/A_00.png', sub:'スプラッシュボム', special:'ウルトラショット' },
    { key:'w2', name:'ブキ2', cat:'シューター',   imgFile:'A_01.png', imgUrl:'x/A_01.png', sub:'キューバンボム',   special:'グレートバリア' },
    { key:'w3', name:'ブキ3', cat:'ローラー',     imgFile:'B_00.png', imgUrl:'x/B_00.png', sub:'カーリングボム',   special:'ショクワンダー' },
    { key:'w4', name:'ブキ4', cat:'チャージャー', imgFile:'C_00.png', imgUrl:'x/C_00.png', sub:'ラインマーカー',   special:'ウルトラショット' },
    { key:'w5', name:'ブキ5', cat:'スピナー',     imgFile:'D_00.png', imgUrl:'x/D_00.png', sub:'スプラッシュボム', special:'ナイスダマ' },
    { key:'w6', name:'ブキ6', cat:'マニューバー', imgFile:'E_00.png', imgUrl:'x/E_00.png', sub:'トーピード',       special:'カニタンク' },
    { key:'w7', name:'ブキ7', cat:'ブラスター',   imgFile:'F_00.png', imgUrl:'x/F_00.png', sub:'ポイズンミスト',   special:'アメフラシ' },
    { key:'w8', name:'ブキ8', cat:'フデ',         imgFile:'G_01.png', imgUrl:'x/G_01.png', sub:'ポイントセンサー', special:'ホップソナー' },
  ];
}

// ドラフト state の最小フィクスチャ
function fixtureState(over){
  return Object.assign({
    an:'アルファ', bn:'ブラボー', ts:4, bc:2,
    banGenres:{ cat:0, sub:0, special:0 },
    bans:{ alpha:[], bravo:[] },
    picks:{ alpha:[], bravo:[] },
    seq:[], idx:0,
    stdOnly:false, excludeFilter:null,
    pickMode:'team', banMode:'representative',
  }, over || {});
}

module.exports = { loadApp, fixtureWeapons, fixtureState };
