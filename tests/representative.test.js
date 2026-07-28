'use strict';
// 代表者（BAN/ガチャ/トレード/連戦ルール選択の操作担当）の解決ロジックのテスト。
// 仕様: 各チームの「1ピック目」＝そのチームのピック順の先頭にいるメンバーが代表者。
// ピック順が無いモード（チームピック/ガチャ等）は参加が最も早いメンバーへフォールバック。
// 回帰: 旧実装は「α代表＝ホスト／β代表＝非ホストの最古参」だったため、
//       ホストがブラボー所属だと同じチームに代表者が2人／もう一方が0人になっていた。
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./helpers/load-app');

const app = loadApp();
const R = app.resolveRepresentative;

// ホストがアルファ所属の 4v4（ピック順あり）
function membersHostAlpha(){
  return {
    h1:{name:'ホスト', team:'alpha', isHost:true,  joinedAt:100},
    a2:{name:'A2',     team:'alpha', isHost:false, joinedAt:200},
    a3:{name:'A3',     team:'alpha', isHost:false, joinedAt:300},
    a4:{name:'A4',     team:'alpha', isHost:false, joinedAt:400},
    b1:{name:'B1',     team:'bravo', isHost:false, joinedAt:150},
    b2:{name:'B2',     team:'bravo', isHost:false, joinedAt:250},
    b3:{name:'B3',     team:'bravo', isHost:false, joinedAt:350},
    b4:{name:'B4',     team:'bravo', isHost:false, joinedAt:450},
  };
}
// ホストがブラボー所属の 4v4（旧実装が壊れていたケース）
function membersHostBravo(){
  const m = membersHostAlpha();
  m.h1.team = 'bravo';
  m.b1 = {name:'B1', team:'alpha', isHost:false, joinedAt:150}; // 代わりに1人をアルファへ
  return m;
}

test('ピック順の先頭が代表者になる（1ピック目＝代表者）', () => {
  const m = membersHostAlpha();
  assert.equal(R('alpha', m, ['a3','h1','a2','a4']), 'a3');
  assert.equal(R('bravo', m, ['b2','b1','b3','b4']), 'b2');
});

test('ホストがブラボーでも各チームからちょうど1人ずつ選ばれる（回帰）', () => {
  const m = membersHostBravo();
  const repA = R('alpha', m, ['b1','a2','a3','a4']);   // alpha: b1,a2,a3,a4
  const repB = R('bravo', m, ['h1','b2','b3','b4']);   // bravo: h1(ホスト),b2,b3,b4
  assert.equal(repA, 'b1');
  assert.equal(repB, 'h1');
  assert.notEqual(repA, repB);
  assert.equal(m[repA].team, 'alpha');
  assert.equal(m[repB].team, 'bravo');
});

test('ホストが代表者でなくてもよい（アルファの1ピック目が別人ならその人）', () => {
  const m = membersHostAlpha();
  assert.equal(R('alpha', m, ['a4','h1','a2','a3']), 'a4');
});

test('ピック順が空/未指定なら joinedAt が最も早いメンバー', () => {
  const m = membersHostAlpha();
  assert.equal(R('alpha', m, []), 'h1');       // 100 が最古
  assert.equal(R('alpha', m, null), 'h1');
  assert.equal(R('bravo', m, undefined), 'b1'); // 150 が最古
});

test('ピック順に他チーム/退出済みのIDが混ざっていても自チームの先頭を返す', () => {
  const m = membersHostAlpha();
  // b1(他チーム)・zz(存在しない) はスキップされ a2 が採用される
  assert.equal(R('alpha', m, ['zz','b1','a2','h1']), 'a2');
});

test('チームに誰もいなければ null（未割当のまま開始したケース）', () => {
  const m = { x1:{name:'X', team:'alpha', joinedAt:1} };
  assert.equal(R('bravo', m, ['x1']), null);
  assert.equal(R('bravo', {}, []), null);
  assert.equal(R('alpha', null, null), null);
});

test('joinedAt 未設定は 0 扱いで安定（例外にならない）', () => {
  const m = {
    p1:{name:'P1', team:'alpha'},
    p2:{name:'P2', team:'alpha', joinedAt:50},
  };
  assert.equal(R('alpha', m, []), 'p1');
});

test('同じ members/order なら全クライアントで同じ結果になる（決定性）', () => {
  const m = membersHostBravo();
  const order = ['b1','a2','a3','a4'];
  const first = R('alpha', m, order);
  for(let i=0;i<20;i++) assert.equal(R('alpha', m, order), first);
});

test('repIdOf: state に保存済みの代表者があればそれを優先', () => {
  const S = {
    representativeAlpha:'a3', representativeBravo:'b2',
    members: membersHostAlpha(),
    pickOrderAlpha:['h1','a2','a3','a4'], pickOrderBravo:['b1','b2','b3','b4'],
  };
  assert.equal(app.repIdOf(S,'alpha'), 'a3');
  assert.equal(app.repIdOf(S,'bravo'), 'b2');
});

test('repIdOf: 代表者未設定の古い state はピック順から復元する（後方互換）', () => {
  const S = {
    representativeAlpha:null, representativeBravo:null,
    members: membersHostAlpha(),
    pickOrderAlpha:['a2','h1','a3','a4'], pickOrderBravo:['b3','b1','b2','b4'],
  };
  assert.equal(app.repIdOf(S,'alpha'), 'a2');
  assert.equal(app.repIdOf(S,'bravo'), 'b3');
});

test('repNameOf: 代表者の表示名を返し、解決できなければ「代表者」', () => {
  const S = {
    representativeAlpha:'a2', representativeBravo:null,
    members: membersHostAlpha(),
    pickOrderAlpha:[], pickOrderBravo:[],
  };
  assert.equal(app.repNameOf(S,'alpha'), 'A2');
  assert.equal(app.repNameOf(S,'bravo'), 'B1'); // フォールバック解決
  assert.equal(app.repNameOf({members:{}}, 'alpha'), '代表者');
});
