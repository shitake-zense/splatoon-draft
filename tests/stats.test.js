'use strict';
// 武器統計（匿名集計）の更新ペイロード生成のテスト。
// increment はハーネスで { __increment: n } にスタブされている。
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, fixtureState } = require('./helpers/load-app');

const app = loadApp();
const inc = v => v && v.__increment;

test('statKey: Firebaseキー禁止文字を除去し、空になれば null', () => {
  assert.equal(app.statKey('sshooter'), 'sshooter');
  assert.equal(app.statKey('スプラッシュボム'), 'スプラッシュボム');
  assert.equal(app.statKey('a/b.c#d$e[f]g'), 'abcdefg');
  assert.equal(app.statKey('###'), null);
  assert.equal(app.statKey(null), null);
  assert.equal(app.statKey(undefined), null);
});

test('buildStatsUpdates: PICK/BAN が武器別に集計され、drafts が加算される', () => {
  const S = fixtureState({
    picks:{ alpha:[{key:'w1'},{key:'w2'}], bravo:[{key:'w3'}] },
    bans:{ alpha:[{key:'w4'}], bravo:[{key:'w5'}] },
  });
  const u = app.buildStatsUpdates(S);
  assert.equal(inc(u['stats/weapons/w1/picks']), 1);
  assert.equal(inc(u['stats/weapons/w2/picks']), 1);
  assert.equal(inc(u['stats/weapons/w3/picks']), 1);
  assert.equal(inc(u['stats/weapons/w4/bans']), 1);
  assert.equal(inc(u['stats/weapons/w5/bans']), 1);
  assert.equal(inc(u['stats/meta/drafts']), 1);
});

test('buildStatsUpdates: 同一武器の複数回PICK（同時ピック被り）は件数が合算される', () => {
  const S = fixtureState({
    picks:{ alpha:[{key:'w1'}], bravo:[{key:'w1'}] },
  });
  const u = app.buildStatsUpdates(S);
  assert.equal(inc(u['stats/weapons/w1/picks']), 2);
});

test('buildStatsUpdates: ジャンルBANは stats/genreBans/{type}/{value} に集計される', () => {
  const S = fixtureState({
    bans:{ alpha:[{banType:'sub', value:'スプラッシュボム', name:'スプラッシュボム'}], bravo:[] },
  });
  const u = app.buildStatsUpdates(S);
  assert.equal(inc(u['stats/genreBans/sub/スプラッシュボム']), 1);
});

test('buildStatsUpdates: key欠損・禁止文字のみのエントリはスキップされる（パス注入防止）', () => {
  const S = fixtureState({
    picks:{ alpha:[{name:'keyなし'}, {key:'w1/../../rooms'}], bravo:[] },
    bans:{ alpha:[{key:'###'}], bravo:[] },
  });
  const u = app.buildStatsUpdates(S);
  const paths = Object.keys(u);
  // 禁止文字はstatKeyで除去され安全なキーに正規化される
  assert.ok(paths.includes('stats/weapons/w1rooms/picks'));
  // key が無い・除去後に空になるものは含まれない
  assert.equal(paths.filter(p=>p.includes('undefined')||p.includes('null')).length, 0);
  assert.equal(paths.length, 2, 'w1rooms/picks と meta/drafts のみ');
});

test('buildStatsUpdates: 空のドラフトでも drafts カウンタだけは更新される', () => {
  const u = app.buildStatsUpdates(fixtureState());
  assert.deepEqual(Object.keys(u), ['stats/meta/drafts']);
});

// ===== ビューア側: buildStatsRanking =====

const sampleStats = {
  meta: { drafts: 10 },
  weapons: {
    w1: { picks: 5, bans: 1 },
    w2: { picks: 8 },
    w3: { bans: 4 },
    w4: { picks: 'x', bans: null },   // 不正書き込み（数値以外）
    w5: { picks: 0 },
  },
  genreBans: {
    sub: { 'スプラッシュボム': 3, 'トーピード': 1 },
    cat: { 'チャージャー': 2 },
    special: { 'ダメ': 'x' },          // 不正書き込み
  },
};

test('buildStatsRanking(picks): 回数の降順に並び、0件・非数値は除外', () => {
  const r = app.buildStatsRanking(sampleStats, 'picks');
  assert.deepEqual(r.map(e=>[e.key, e.count]), [['w2',8],['w1',5]]);
});

test('buildStatsRanking(bans): BAN回数で独立に集計される', () => {
  const r = app.buildStatsRanking(sampleStats, 'bans');
  assert.deepEqual(r.map(e=>[e.key, e.count]), [['w3',4],['w1',1]]);
});

test('buildStatsRanking(genres): 種別ラベル付きで降順、非数値は除外', () => {
  const r = app.buildStatsRanking(sampleStats, 'genres');
  assert.deepEqual(r.map(e=>[e.name, e.count]), [
    ['サブ：スプラッシュボム', 3],
    ['武器種：チャージャー', 2],
    ['サブ：トーピード', 1],
  ]);
});

test('buildStatsRanking: データなし・空データでは空配列', () => {
  assert.deepEqual(app.buildStatsRanking(null, 'picks'), []);
  assert.deepEqual(app.buildStatsRanking({}, 'picks'), []);
  assert.deepEqual(app.buildStatsRanking({}, 'genres'), []);
});

test('buildStatsRanking: 同数のときはキー/名前順で安定', () => {
  const s = { weapons: { b:{picks:2}, a:{picks:2}, c:{picks:3} } };
  assert.deepEqual(app.buildStatsRanking(s,'picks').map(e=>e.key), ['c','a','b']);
});
