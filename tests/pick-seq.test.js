'use strict';
// buildPickSeq（ピック順生成）のテスト。README の7種のピック順仕様と対応。
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./helpers/load-app');

const app = loadApp();
const teams = seq => seq.map(s => s.team);

test('交互(alt): 先攻→後攻を1枚ずつ交互', () => {
  const seq = app.buildPickSeq(4, 'alt', 'alpha', 'bravo');
  assert.deepEqual(teams(seq), ['alpha','bravo','alpha','bravo','alpha','bravo','alpha','bravo']);
});

test('スネーク(snake) 4v4: 1-2-2-1-1-1 のバランス型', () => {
  const seq = app.buildPickSeq(4, 'snake', 'alpha', 'bravo');
  assert.deepEqual(teams(seq), ['alpha','bravo','bravo','alpha','alpha','bravo','alpha','bravo']);
});

test('スネーク(snake) 3v3: 1-(ts-1)-(ts-1)-1 の通常スネーク', () => {
  const seq = app.buildPickSeq(3, 'snake', 'alpha', 'bravo');
  assert.deepEqual(teams(seq), ['alpha','bravo','bravo','alpha','alpha','bravo']);
});

test('クラシックスネーク(snake_classic) 4v4: 1-3-3-1', () => {
  const seq = app.buildPickSeq(4, 'snake_classic', 'alpha', 'bravo');
  assert.deepEqual(teams(seq), ['alpha','bravo','bravo','bravo','alpha','alpha','alpha','bravo']);
});

test('ミドルスネーク(snake_mid) 4v4: 1-2-2-2-1', () => {
  const seq = app.buildPickSeq(4, 'snake_mid', 'alpha', 'bravo');
  assert.deepEqual(teams(seq), ['alpha','bravo','bravo','alpha','alpha','bravo','bravo','alpha']);
});

test('ミドルスネーク(snake_mid) 3v3: 未定義サイズは交互にフォールバック', () => {
  const seq = app.buildPickSeq(3, 'snake_mid', 'alpha', 'bravo');
  assert.deepEqual(teams(seq), ['alpha','bravo','alpha','bravo','alpha','bravo']);
});

test('バランス(a121) 4v4: 先1-2-1 / 後1-2-1 パターン', () => {
  const seq = app.buildPickSeq(4, 'a121', 'alpha', 'bravo');
  assert.deepEqual(teams(seq), ['alpha','bravo','alpha','alpha','bravo','bravo','alpha','bravo']);
});

test('前重ね(a211) 4v4: 先2-1-1 / 後1-2-1 パターン', () => {
  const seq = app.buildPickSeq(4, 'a211', 'alpha', 'bravo');
  assert.deepEqual(teams(seq), ['alpha','alpha','bravo','alpha','bravo','bravo','alpha','bravo']);
});

test('a121/a211 の 2v2 以下は交互にフォールバック', () => {
  for(const po of ['a121','a211']){
    const seq = app.buildPickSeq(2, po, 'alpha', 'bravo');
    assert.deepEqual(teams(seq), ['alpha','bravo','alpha','bravo'], po);
  }
});

test('先攻がブラボーでも first/sec が正しく反映される', () => {
  const seq = app.buildPickSeq(3, 'snake', 'bravo', 'alpha');
  assert.deepEqual(teams(seq), ['bravo','alpha','alpha','bravo','bravo','alpha']);
});

test('全ピック順で総ピック数は ts*2（sim を除く）', () => {
  for(const po of ['alt','snake','snake_classic','snake_mid','a121','a211']){
    for(let ts=1; ts<=4; ts++){
      const seq = app.buildPickSeq(ts, po, 'alpha', 'bravo');
      assert.equal(seq.length, ts*2, `${po} ts=${ts}`);
      assert.equal(seq.filter(s=>s.team==='alpha').length, ts, `${po} ts=${ts} alpha数`);
      assert.ok(seq.every(s=>s.phase==='pick'));
    }
  }
});

test('個人ピック: チーム内の登場順に pickOrder の memberId が割り当たる', () => {
  const seq = app.buildPickSeq(3, 'snake', 'alpha', 'bravo', ['a1','a2','a3'], ['b1','b2','b3']);
  // snake 3v3: A B B A A B → alpha側は a1,a2,a3 / bravo側は b1,b2,b3 の順
  assert.deepEqual(seq.map(s=>s.memberId), ['a1','b1','b2','a2','a3','b3']);
});

test('個人ピック: ピック順の人数が足りない場合は modulo で巡回する', () => {
  const seq = app.buildPickSeq(4, 'alt', 'alpha', 'bravo', ['a1','a2'], ['b1']);
  assert.deepEqual(
    seq.map(s=>s.memberId),
    ['a1','b1','a2','b1','a1','b1','a2','b1']
  );
});

test('相手ピック(enemy): 同じ順番indexの相手選手が targetMemberId になる', () => {
  const seq = app.buildPickSeq(2, 'alt', 'alpha', 'bravo', ['a1','a2'], ['b1','b2'], null, null, true);
  // alt 2v2: A B A B。alphaのi番目の行動者はa_i、対象はb_i（逆も同様）
  assert.deepEqual(
    seq.map(s=>({m:s.memberId, t:s.targetMemberId})),
    [ {m:'a1',t:'b1'}, {m:'b1',t:'a1'}, {m:'a2',t:'b2'}, {m:'b2',t:'a2'} ]
  );
});

test('同時ピック(sim): ラウンド数=ts でペアの担当者が割り当たる', () => {
  const seq = app.buildPickSeq(3, 'sim', 'alpha', 'bravo', null, null, ['a1','a2','a3'], ['b1','b2','b3']);
  assert.equal(seq.length, 3);
  seq.forEach((s,i)=>{
    assert.equal(s.team, 'both');
    assert.equal(s.round, i);
    assert.equal(s.alphaMemberId, 'a'+(i+1));
    assert.equal(s.bravoMemberId, 'b'+(i+1));
  });
});

test('同時ピック(sim): 担当者リストが無ければ memberId なしで進む（後方互換）', () => {
  const seq = app.buildPickSeq(2, 'sim', 'alpha', 'bravo');
  assert.equal(seq.length, 2);
  seq.forEach(s=>{
    assert.equal(s.team, 'both');
    assert.ok(!('alphaMemberId' in s));
    assert.ok(!('bravoMemberId' in s));
  });
});
