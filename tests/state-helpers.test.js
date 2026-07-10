'use strict';
// state まわりのヘルパー（相手ピックの格納先・シリーズ進行・正規化・雑多なユーティリティ）のテスト。
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, fixtureWeapons, fixtureState } = require('./helpers/load-app');

const app = loadApp();

test('esc: HTML特殊文字5種をエスケープし、通常文字はそのまま', () => {
  assert.equal(app.esc(`<img src=x onerror="alert('1')">&`),
    '&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;');
  assert.equal(app.esc('わかばシューター'), 'わかばシューター');
  assert.equal(app.esc(null), '');
  assert.equal(app.esc(undefined), '');
  assert.equal(app.esc(123), '123');
});

test('clampTimeLimit: 5〜100秒にクランプ、不正値は既定30秒', () => {
  assert.equal(app.clampTimeLimit('30'), 30);
  assert.equal(app.clampTimeLimit('1'), 5);
  assert.equal(app.clampTimeLimit('999'), 100);
  assert.equal(app.clampTimeLimit('abc'), 30);
  assert.equal(app.clampTimeLimit(''), 30);
  assert.equal(app.clampTimeLimit(undefined), 30);
});

test('pickStoreTeam: 相手ピック(enemy)のみ格納先チームを反転', () => {
  assert.equal(app.pickStoreTeam({ pickMode:'team' }, 'alpha'), 'alpha');
  assert.equal(app.pickStoreTeam({ pickMode:'individual' }, 'bravo'), 'bravo');
  assert.equal(app.pickStoreTeam({ pickMode:'enemy' }, 'alpha'), 'bravo');
  assert.equal(app.pickStoreTeam({ pickMode:'enemy' }, 'bravo'), 'alpha');
});

test('pickOwnerId: enemy では対象者、それ以外は行動者が所有者', () => {
  const step = { memberId:'m1', targetMemberId:'m2' };
  assert.equal(app.pickOwnerId({ pickMode:'individual' }, step), 'm1');
  assert.equal(app.pickOwnerId({ pickMode:'enemy' }, step), 'm2');
  assert.equal(app.pickOwnerId({ pickMode:'enemy' }, { memberId:'m1' }), null);
  assert.equal(app.pickOwnerId({ pickMode:'team' }, {}), null);
});

test('seriesRuleForGame: BO5 の1〜4戦目は固定ルール順、5戦目はランダム', () => {
  const sr = { mode:'bo5', loserSetsRules:false };
  assert.equal(app.seriesRuleForGame({ ...sr, game:1 }), app.RULES[0]);
  assert.equal(app.seriesRuleForGame({ ...sr, game:2 }), app.RULES[1]);
  assert.equal(app.seriesRuleForGame({ ...sr, game:3 }), app.RULES[2]);
  assert.equal(app.seriesRuleForGame({ ...sr, game:4 }), app.RULES[3]);
  assert.equal(app.seriesRuleForGame({ ...sr, game:5 }), 'random');
});

test('seriesRuleForGame: 敗者指定ルールは2戦目以降のみ有効・不正ルールは無視', () => {
  const base = { mode:'bo3', loserSetsRules:true };
  assert.equal(app.seriesRuleForGame({ ...base, game:2, nextRule:'ガチヤグラ' }), 'ガチヤグラ');
  assert.equal(app.seriesRuleForGame({ ...base, game:1, nextRule:'ガチヤグラ' }), 'random');
  assert.equal(app.seriesRuleForGame({ ...base, game:2, nextRule:'ナワバリ改' }), 'random');
});

test('normalizeState: Firebase で欠落した配列・既定値を補完する', () => {
  // RTDB は空配列・空オブジェクトを保存しないため、受信側の補完が生命線
  const s = app.normalizeState({ an:'A', bn:'B', ts:4, idx:0 });
  assert.deepEqual(s.bans, { alpha:[], bravo:[] });
  assert.deepEqual(s.picks, { alpha:[], bravo:[] });
  assert.deepEqual(s.seq, []);
  assert.equal(s.pickMode, 'team');
  assert.equal(s.banMode, 'representative');
  assert.deepEqual(s.banGenres, { cat:0, sub:0, special:0 });
  assert.equal(s.timeLimitSec, 30);
  assert.equal(app.normalizeState(null), null);
});

test('normalizeState: 既存の値は上書きしない', () => {
  const s = app.normalizeState({
    bans:{ alpha:[{key:'w1'}] }, pickMode:'enemy', timeLimitSec:60,
  });
  assert.equal(s.bans.alpha.length, 1);
  assert.deepEqual(s.bans.bravo, []);
  assert.equal(s.pickMode, 'enemy');
  assert.equal(s.timeLimitSec, 60);
});

test('generateRoomId: 英大文字＋数字の6文字', () => {
  for(let i=0;i<20;i++){
    const id = app.generateRoomId();
    assert.match(id, /^[A-Z0-9]{6}$/);
  }
});

test('evaluateChallenge: 全員ちがう武器種（all_diff_cat）の達成判定', () => {
  app.__set({ WEAPONS: fixtureWeapons() });
  const mk = picks => fixtureState({ challenge:{ id:'all_diff_cat' }, picks:{ alpha:picks, bravo:[] } });
  // cat がすべて異なる → 達成
  assert.equal(app.evaluateChallenge(mk([
    { name:'x', cat:'シューター' }, { name:'y', cat:'ローラー' },
  ]), 'alpha'), true);
  // cat が重複 → 未達成
  assert.equal(app.evaluateChallenge(mk([
    { name:'x', cat:'シューター' }, { name:'y', cat:'シューター' },
  ]), 'alpha'), false);
  // お題なし → null
  assert.equal(app.evaluateChallenge(fixtureState(), 'alpha'), null);
  // 不明な id → null
  assert.equal(app.evaluateChallenge(fixtureState({ challenge:{ id:'unknown_id' } }), 'alpha'), null);
});
