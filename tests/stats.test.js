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
