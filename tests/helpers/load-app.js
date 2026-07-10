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
  'statKey','buildStatsUpdates',
  'RULES','CATEGORY_ORDER','CHALLENGES',
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
    + '}'
    + ',__get(){ return { WEAPONS, banPending, pendingSelect, state }; }'
    + '};';

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
    remove(){ return Promise.resolve(); },
    get(){ return Promise.resolve({ exists: () => false, val: () => null }); },
    onValue(){ return () => {}; },
    increment(n){ return { __increment: n }; },
    signInAnonymously(){ return Promise.resolve({ user: { uid: 'test-uid' } }); },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src + appendix, sandbox, { filename: 'index-app.js' });
  cached = sandbox.__app;
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
