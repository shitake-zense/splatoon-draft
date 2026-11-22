'use strict';
// 同名の番号付け・ピック順の短縮名・チーム固定つきランダム振り分け
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./helpers/load-app');
const app = loadApp();

test('uniqueMemberName: 同名がいれば (2)(3)… を付け、自分自身とキック済みは数えない', () => {
  const ms = { a:{name:'たなか'}, b:{name:'たなか(2)'}, k:{name:'すずき',kicked:true} };
  assert.equal(app.uniqueMemberName('たなか', ms, 'new'), 'たなか(3)');
  assert.equal(app.uniqueMemberName('さとう', ms, 'new'), 'さとう');
  assert.equal(app.uniqueMemberName('すずき', ms, 'new'), 'すずき');
  assert.equal(app.uniqueMemberName('たなか', ms, 'a'), 'たなか'); // 再参加で自分の名前のまま
});

test('shortMemberLabels: 基本は2文字、被りは3文字、3文字でも被れば番号', () => {
  const ms = {
    m1:{name:'たなか',joinedAt:1}, m2:{name:'たなべ',joinedAt:2},
    m3:{name:'すずき',joinedAt:3}, m4:{name:'すずき(2)',joinedAt:4},
    m5:{name:'Ａ',joinedAt:5}, m6:{name:'🦑イカ',joinedAt:6},
  };
  const l = app.shortMemberLabels(ms);
  assert.equal(l.m1, 'たなか'); assert.equal(l.m2, 'たなべ');
  assert.equal(l.m3, 'すず1'); assert.equal(l.m4, 'すず2');
  assert.equal(l.m5, 'Ａ');
  assert.equal(l.m6, '🦑イ'); // 絵文字を途中で切らない
  assert.equal(new Set(Object.values(l)).size, 6);
});

test('splitTeamsWithTags: 固定メンバーは常に固定先、観戦固定は未割り当て', () => {
  const entries = [
    {id:'a',lock:'alpha'},{id:'b',lock:'bravo'},{id:'s',lock:'spectator'},
    {id:'x'},{id:'y'},{id:'z'},
  ];
  for (let seed=0; seed<30; seed++){
    let r=seed+1; const rnd=()=>{ r=(r*9301+49297)%233280; return r/233280; };
    const res = app.splitTeamsWithTags(entries, {}, 2, rnd);
    assert.ok(res.alpha.includes('a')); assert.ok(res.bravo.includes('b'));
    assert.ok(res.unassigned.includes('s'));
    assert.equal(res.alpha.length, 2); assert.equal(res.bravo.length, 2);
  }
});

test('splitTeamsWithTags: 固定メンバーのタグも均等化・まとめるに数える', () => {
  const defs = { t1:{name:'長射程',mode:'split'}, t2:{name:'友達',mode:'group'} };
  const entries = [
    {id:'a',lock:'alpha',tag:'t1'},{id:'p',tag:'t1'},
    {id:'b',lock:'bravo',tag:'t2'},{id:'q',tag:'t2'},
    {id:'x'},{id:'y'},
  ];
  for (let seed=0; seed<30; seed++){
    let r=seed+7; const rnd=()=>{ r=(r*9301+49297)%233280; return r/233280; };
    const res = app.splitTeamsWithTags(entries, defs, 3, rnd);
    assert.ok(res.bravo.includes('p'), '分けるタグは固定メンバーと別チームへ');
    assert.ok(res.bravo.includes('q'), 'まとめるタグは固定メンバーと同じチームへ');
  }
});

test('splitTeamsWithTags: 固定先が満員なら未割り当てにして警告', () => {
  const res = app.splitTeamsWithTags([{id:'a',lock:'alpha'},{id:'b',lock:'alpha'}], {}, 1, ()=>0.3);
  assert.deepEqual(res.alpha, ['a']); assert.deepEqual(res.unassigned, ['b']);
  assert.ok(res.warnings.length >= 1);
});

test('nextLockId: なし→アルファ→ブラボー→観戦→なし', () => {
  assert.equal(app.nextLockId(null), 'alpha');
  assert.equal(app.nextLockId('alpha'), 'bravo');
  assert.equal(app.nextLockId('bravo'), 'spectator');
  assert.equal(app.nextLockId('spectator'), null);
});
