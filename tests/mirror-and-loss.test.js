'use strict';
// 相手と同じ武器もPICK可・おまかせロストの再ドラフト継続
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadApp, fixtureWeapons, fixtureState } = require('./helpers/load-app');
const app = loadApp();
beforeEach(()=>app.__set({ WEAPONS: fixtureWeapons() }));

const keys = ws => ws.map(w=>w.key);

test('通常は相手が取った武器も候補から外れる', () => {
  const S = fixtureState({ seq:[{phase:'pick',team:'bravo'}], picks:{alpha:[{key:'w1'}],bravo:[{key:'w2'}]} });
  const k = keys(app.getAvailableWeapons(S));
  assert.ok(!k.includes('w1')); assert.ok(!k.includes('w2'));
});

test('allowMirror: 相手の武器は選べるが、自チームの武器は選べない', () => {
  const S = fixtureState({ allowMirror:true, seq:[{phase:'pick',team:'bravo'}], picks:{alpha:[{key:'w1'}],bravo:[{key:'w2'}]} });
  const k = keys(app.getAvailableWeapons(S));
  assert.ok(k.includes('w1')); assert.ok(!k.includes('w2'));
});

test('allowMirror×相手ピック: 格納先（相手チーム）のロードアウトで被りを判定', () => {
  // アルファが選ぶ武器はブラボーのロードアウトに入る
  const S = fixtureState({ allowMirror:true, pickMode:'enemy', seq:[{phase:'pick',team:'alpha'}], picks:{alpha:[{key:'w1'}],bravo:[{key:'w2'}]} });
  const k = keys(app.getAvailableWeapons(S));
  assert.ok(k.includes('w1')); assert.ok(!k.includes('w2'));
});

test('allowMirror×同時ピック: チームを渡せばそのチームの分だけ外す。渡さなければ両チーム分', () => {
  const S = fixtureState({ allowMirror:true, seq:[{phase:'pick',team:'both'}], picks:{alpha:[{key:'w1'}],bravo:[{key:'w2'}]} });
  assert.ok(keys(app.getAvailableWeapons(S,'alpha')).includes('w2'));
  assert.ok(!keys(app.getAvailableWeapons(S,'alpha')).includes('w1'));
  const both = keys(app.getAvailableWeapons(S));
  assert.ok(!both.includes('w1') && !both.includes('w2'));
});

function opts(over){
  return {an:'A',bn:'B',ts:1,bc:0,ft:'alpha',po:'alt',rm:'ガチエリア',sm:'random',
    pickMode:'team',banMode:'representative',banGenres:{cat:0,sub:0,special:0},
    members:{a:{team:'alpha'},b:{team:'bravo'}},stageMode:'loss',...over};
}

test('おまかせロスト: 前回までに使ったステージを再ドラフトでも除外し、使い切ったらリセット', () => {
  const pool = app.STAGES_DATA.slice(0,3);
  for (let i=0;i<20;i++){
    const S = app.createInitialDraftState(opts({stagePool:pool, lossUsed:[pool[0],pool[1]]}), false);
    assert.equal(S.stageJa, pool[2]);
    assert.deepEqual(app.lossUsedAfter(S).sort(), [...pool].sort());
  }
  // 全部使い切った → リセットして候補全体から
  const seen = new Set();
  for (let i=0;i<40;i++) seen.add(app.createInitialDraftState(opts({stagePool:pool, lossUsed:pool}), false).stageJa);
  assert.ok(seen.size>1);
});

test('おまかせロスト×連戦: 次戦も再ドラフト前の使用済みを除外する', () => {
  const pool = app.STAGES_DATA.slice(0,5);
  const sr = { stageDraft:{mode:'loss',pool,excluded:[pool[0],pool[1]],games:[pool[2]]}, history:[], game:1 };
  for (let i=0;i<20;i++){
    const next = app.prepareNextStageDraft(sr);
    assert.ok([pool[3],pool[4]].includes(next.games[1]));
  }
});
