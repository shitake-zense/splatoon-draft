'use strict';
// 「誰が操作できるか」の判定テスト（代表者BAN／連戦の敗者ルール選択／ガチャ／トレード）。
// 回帰: ホストがブラボー所属だと、旧実装ではブラボーに代表者が2人・アルファに0人となり、
//       ブラボー全員が「自分が担当」と誤認したり、アルファは誰も操作できなくなっていた。
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./helpers/load-app');

const app = loadApp();

// ホストが「ブラボー」所属の 2v2。代表者は各チームのピック順の先頭。
function hostOnBravoState(){
  const members = {
    h1:{name:'ホスト', team:'bravo', isHost:true,  joinedAt:100},
    b2:{name:'B2',     team:'bravo', isHost:false, joinedAt:200},
    a1:{name:'A1',     team:'alpha', isHost:false, joinedAt:150},
    a2:{name:'A2',     team:'alpha', isHost:false, joinedAt:250},
  };
  return {
    an:'アルファ', bn:'ブラボー', ts:2, bc:2,
    members,
    pickOrderAlpha:['a1','a2'], pickOrderBravo:['h1','b2'],
    representativeAlpha:'a1', representativeBravo:'h1',
    pickMode:'individual', banMode:'representative',
    bans:{alpha:[],bravo:[]}, picks:{alpha:[],bravo:[]}, seq:[], idx:0,
  };
}

function asClient(memberId, isHost, S){
  app.__set({ isMulti:true, isHost, myMemberId:memberId, state:S });
}

test('代表者BAN: 各チームの1ピック目だけが操作できる', () => {
  const S = hostOnBravoState();
  const can = id => { asClient(id, id==='h1', S); return app.isRepBanRepresentative(S); };
  assert.equal(can('a1'), true,  'アルファの1ピック目');
  assert.equal(can('a2'), false, 'アルファの2ピック目');
  assert.equal(can('h1'), true,  'ブラボーの1ピック目（＝ホスト）');
  assert.equal(can('b2'), false, 'ブラボーの2ピック目');
});

test('代表者BAN: 代表者はちょうど各チーム1人ずつ（回帰）', () => {
  const S = hostOnBravoState();
  const reps = ['a1','a2','h1','b2'].filter(id => {
    asClient(id, id==='h1', S);
    return app.isRepBanRepresentative(S);
  });
  assert.deepEqual(reps, ['a1','h1']);
  assert.equal(reps.length, 2);
});

test('myTeamOf: members のチームが真実（ホスト＝アルファと決めつけない）', () => {
  const S = hostOnBravoState();
  asClient('h1', true, S);  assert.equal(app.myTeamOf(S), 'bravo');
  asClient('a1', false, S); assert.equal(app.myTeamOf(S), 'alpha');
  asClient('b2', false, S); assert.equal(app.myTeamOf(S), 'bravo');
});

test('myTeamOf: members に自分がいない観戦者は従来どおりホスト判定へフォールバック', () => {
  const S = hostOnBravoState();
  asClient('unknown', false, S); assert.equal(app.myTeamOf(S), 'bravo');
  asClient('unknown', true,  S); assert.equal(app.myTeamOf(S), 'alpha');
});

test('連戦・敗者ルール選択: 敗者チームの代表者だけが担当（ホストでなくても担当になれる）', () => {
  const S = hostOnBravoState();
  S.series = { mode:'bo3', target:2, game:1, scoreA:0, scoreB:1, history:[], done:false,
               loserSetsRules:true, awaitingRule:true, ruleChooser:'alpha', nextRule:null };
  const can = id => { asClient(id, id==='h1', S); return app.isSeriesChooserOperator(S.series); };
  assert.equal(can('a1'), true,  'アルファ（敗者）の代表者');
  assert.equal(can('a2'), false);
  assert.equal(can('h1'), false, 'ホストでも敗者チームの代表者でなければ担当ではない');
  assert.equal(can('b2'), false);
});

test('連戦・敗者ルール選択: 敗者がブラボー（ホスト側）なら担当はホスト', () => {
  const S = hostOnBravoState();
  S.series = { mode:'bo3', target:2, game:1, scoreA:1, scoreB:0, history:[], done:false,
               loserSetsRules:true, awaitingRule:true, ruleChooser:'bravo', nextRule:null };
  const can = id => { asClient(id, id==='h1', S); return app.isSeriesChooserOperator(S.series); };
  assert.equal(can('h1'), true);
  assert.equal(can('b2'), false);
  assert.equal(can('a1'), false);
});

test('連戦・敗者ルール選択: awaitingRule でなければ誰も担当ではない', () => {
  const S = hostOnBravoState();
  asClient('a1', false, S);
  assert.equal(app.isSeriesChooserOperator(null), false);
  assert.equal(app.isSeriesChooserOperator({ruleChooser:null}), false);
});

test('ガチャ/トレード: 操作できるのは各チームの代表者のみ', () => {
  const S = hostOnBravoState();
  const gacha = (id, team) => { asClient(id, id==='h1', S); return app.gachaCanOperate(S, team); };
  assert.equal(gacha('a1','alpha'), true);
  assert.equal(gacha('a2','alpha'), false);
  assert.equal(gacha('h1','bravo'), true);
  assert.equal(gacha('h1','alpha'), false, 'ホストでも他チームは操作できない');

  const trade = (id, team) => { asClient(id, id==='h1', S); return app.isTradeOperator(team); };
  assert.equal(trade('a1','alpha'), true);
  assert.equal(trade('b2','bravo'), false);
});

test('ソロ（マルチでない）ときは常に操作可', () => {
  const S = hostOnBravoState();
  app.__set({ isMulti:false, isHost:true, myMemberId:null, state:S });
  assert.equal(app.isRepBanRepresentative(S), true);
  assert.equal(app.gachaCanOperate(S,'alpha'), true);
  assert.equal(app.isTradeOperator('bravo'), true);
  assert.equal(app.isSeriesChooserOperator({ruleChooser:'alpha'}), true);
});

test('個人ピック×個人BANでは全員がBAN操作可（代表者制ではない）', () => {
  const S = hostOnBravoState();
  S.banMode = 'individual';
  ['a1','a2','h1','b2'].forEach(id => {
    asClient(id, id==='h1', S);
    assert.equal(app.isRepBanRepresentative(S), true, id);
  });
});
