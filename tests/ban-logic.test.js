'use strict';
// BAN ロジック（上限計算・ジャンルBAN・自動補完）のテスト。
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadApp, fixtureWeapons, fixtureState } = require('./helpers/load-app');

const app = loadApp();

beforeEach(() => {
  app.__set({
    WEAPONS: fixtureWeapons(),
    banPending: { alpha: [], bravo: [] },
    pendingSelect: null,
  });
});

test('banTotalLimit: 武器BAN数＋各ジャンルBAN数の合計', () => {
  assert.equal(app.banTotalLimit(fixtureState({ bc:4 })), 4);
  assert.equal(app.banTotalLimit(fixtureState({ bc:2, banGenres:{cat:1,sub:2,special:1} })), 6);
  assert.equal(app.banTotalLimit(fixtureState({ bc:0, banGenres:{} })), 0);
});

test('banTypeOf / banIdOf: 武器とジャンルを区別して一意IDを振る', () => {
  const w = { key:'w1', name:'ブキ1' };
  const g = { banType:'sub', value:'スプラッシュボム', name:'スプラッシュボム' };
  assert.equal(app.banTypeOf(w), 'weapon');
  assert.equal(app.banTypeOf(g), 'sub');
  assert.equal(app.banIdOf(w), 'w:w1');
  assert.equal(app.banIdOf(g), 'sub:スプラッシュボム');
});

test('weaponMatchesGenreBan: cat/sub/special それぞれで判定される', () => {
  const w = fixtureWeapons()[0]; // シューター / スプラッシュボム / ウルトラショット
  assert.equal(app.weaponMatchesGenreBan(w, app.makeGenreBan('cat','シューター')), true);
  assert.equal(app.weaponMatchesGenreBan(w, app.makeGenreBan('cat','ローラー')), false);
  assert.equal(app.weaponMatchesGenreBan(w, app.makeGenreBan('sub','スプラッシュボム')), true);
  assert.equal(app.weaponMatchesGenreBan(w, app.makeGenreBan('special','ウルトラショット')), true);
  assert.equal(app.weaponMatchesGenreBan(w, null), false);
});

test('isWeaponExcluded: 絞り込みフィルタのいずれかに該当すれば除外', () => {
  const w = fixtureWeapons()[0];
  assert.equal(app.isWeaponExcluded(w, null), false);
  assert.equal(app.isWeaponExcluded(w, { cats:['シューター'] }), true);
  assert.equal(app.isWeaponExcluded(w, { subs:['スプラッシュボム'] }), true);
  assert.equal(app.isWeaponExcluded(w, { specials:['ウルトラショット'] }), true);
  assert.equal(app.isWeaponExcluded(w, { cats:['ローラー'], subs:[], specials:[] }), false);
});

test('getAvailableWeapons: BAN済み・PICK済み・ジャンルBAN・ロックアウトを除外', () => {
  const S = fixtureState({
    bans:{ alpha:[{key:'w1'}], bravo:[ app.makeGenreBan('cat','ローラー') ] }, // w1 と ローラー(w3)
    picks:{ alpha:[{key:'w2'}], bravo:[] },                                    // w2
    series:{ lockout:true, lockedKeys:['w4'] },                                // w4
  });
  const keys = app.getAvailableWeapons(S).map(w=>w.key);
  assert.deepEqual(keys, ['w5','w6','w7','w8']);
});

test('getAvailableWeapons: stdOnly は imgFile が _00. の武器のみ', () => {
  const S = fixtureState({ stdOnly:true });
  const keys = app.getAvailableWeapons(S).map(w=>w.key);
  // フィクスチャで _00. でないのは w2(A_01), w8(G_01)
  assert.deepEqual(keys, ['w1','w3','w4','w5','w6','w7']);
});

test('banRemainingFor: 確定済み＋送信予定を差し引いた残数', () => {
  const S = fixtureState({ bc:3, banGenres:{sub:1} });
  S.bans.alpha = [{key:'w1'}];
  app.__set({ banPending:{ alpha:[{key:'w2'}], bravo:[] } });
  assert.equal(app.banRemainingFor(S, 'alpha', 'weapon'), 1);
  assert.equal(app.banRemainingFor(S, 'alpha', 'sub'), 1);
  assert.equal(app.banRemainingFor(S, 'bravo', 'weapon'), 3);
});

test('autoCompleteBanPending: 武器BANを上限まで重複なしで補完する', () => {
  const S = fixtureState({ bc:2 });
  app.autoCompleteBanPending(S, 'alpha');
  const { banPending } = app.__get();
  assert.equal(banPending.alpha.length, 2);
  const keys = banPending.alpha.map(b=>b.key);
  assert.equal(new Set(keys).size, 2, '重複なし');
  // 2回目の呼び出しでは追加されない（冪等）
  app.autoCompleteBanPending(S, 'alpha');
  assert.equal(app.__get().banPending.alpha.length, 2);
});

test('autoCompleteBanPending: 仮選択(pendingSelect)が最優先で採用される', () => {
  const S = fixtureState({ bc:1 });
  const w = fixtureWeapons()[5]; // w6
  app.__set({ pendingSelect:{ w, team:'alpha', phase:'ban' } });
  app.autoCompleteBanPending(S, 'alpha');
  const { banPending, pendingSelect } = app.__get();
  assert.equal(banPending.alpha[0].key, 'w6');
  assert.equal(banPending.alpha.length, 1);
  assert.equal(pendingSelect, null, '消費後はクリアされる');
});

test('autoCompleteBanPending: 相手チームのBANと重複しない', () => {
  const S = fixtureState({ bc:3 });
  S.bans.bravo = [{key:'w1'},{key:'w2'},{key:'w3'}];
  app.autoCompleteBanPending(S, 'alpha');
  const keys = app.__get().banPending.alpha.map(b=>b.key);
  assert.equal(keys.length, 3);
  for(const k of keys) assert.ok(!['w1','w2','w3'].includes(k), `${k} は相手BANと重複`);
});

test('autoCompleteBanPending: ジャンルBANも種別ごとの上限まで補完される', () => {
  const S = fixtureState({ bc:0, banGenres:{cat:1, sub:2, special:0} });
  app.autoCompleteBanPending(S, 'alpha');
  const pend = app.__get().banPending.alpha;
  assert.equal(pend.filter(b=>b.banType==='cat').length, 1);
  assert.equal(pend.filter(b=>b.banType==='sub').length, 2);
  assert.equal(pend.filter(b=>b.banType==='special').length, 0);
});

test('serializeBan: undefined を含まない送信用オブジェクトに整形', () => {
  const w = fixtureWeapons()[0];
  assert.deepEqual(app.serializeBan(w), { key:'w1', name:'ブキ1', imgUrl:'x/A_00.png', cat:'シューター' });
  const g = { banType:'sub', value:'トーピード', name:'トーピード' }; // imgUrl なし
  assert.deepEqual(app.serializeBan(g), { banType:'sub', value:'トーピード', name:'トーピード', imgUrl:'' });
});

test('banDispName: ジャンルBANは種別を前置して表示', () => {
  assert.equal(app.banDispName({ key:'w1', name:'ブキ1' }), 'ブキ1');
  assert.equal(app.banDispName({ banType:'cat', name:'ローラー' }), '武器種：ローラー');
  assert.equal(app.banDispName({ banType:'sub', name:'トーピード' }), 'サブ：トーピード');
  assert.equal(app.banDispName({ banType:'special', name:'ナイスダマ' }), 'スペ：ナイスダマ');
  assert.equal(app.banDispName(null), '');
});
