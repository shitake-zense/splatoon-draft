'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers/load-app');
const app=loadApp();
const pool=Array.from(app.STAGES_DATA).slice(0,12);
function create(over={}){
  return app.createInitialDraftState({an:'A',bn:'B',ts:1,bc:0,ft:'alpha',po:'alt',rm:'random',sm:'random',
    seriesEnabled:true,seriesMode:'bo3',stagePool:pool,pickMode:'team',banMode:'representative',...over},false);
}
function choose(S,stage,extra={}){
  const d=app.stageDraftOf(S),turn=app.stageDraftTurn(d);
  return app.applyStageDraftAction(S,{token:d.token,index:turn.index,team:turn.team,stage,...extra},()=>0);
}

for(const [format,n] of [['bo3',3],['bo5',5],['bo7',7],['bo9',9]]){
  test(`${format}: 先取数・候補数・BAN/PICK順と最終戦の抽選`,()=>{
    const S=create({seriesMode:format,stageMode:'banpick',stagePool:pool.slice(0,n+2)});
    const d=app.stageDraftOf(S);
    assert.equal(S.series.target,(n+1)/2);
    assert.equal(app.requiredStageCount('banpick',n),n+2);
    for(let i=0;i<n+1;i++){
      const turn=app.stageDraftTurn(d);
      assert.equal(turn.team,i%2?'bravo':'alpha');
      assert.equal(turn.kind,i<2?'BAN':'PICK');
      assert.equal(choose(S,pool[i]),true);
    }
    assert.equal(app.stageDraftPending(S),false);
    assert.deepEqual(Array.from(d.games),pool.slice(2,n+2));
    assert.equal(new Set(d.games).size,n);
    assert.equal(S.stageJa,pool[2]);
  });
  test(`${format}: ロストとカウンターの候補は最大試合数が最低必要`,()=>{
    for(const mode of ['loss','counter']){
      assert.equal(app.requiredStageCount(mode,n),n);
      assert.equal(app.validStagePool(pool.slice(0,n-1),n),false);
      assert.equal(app.validStagePool(pool.slice(0,n),n),true);
    }
  });
}
test('BO1: 2 BANの後に先攻が1ステージをPICK',()=>{
  const S=create({seriesEnabled:false,stageMode:'banpick',stagePool:pool.slice(0,3),ft:'bravo'});
  assert.equal(S.series,null);
  assert.equal(app.requiredStageCount('banpick',1),3);
  assert.equal(app.stageDraftTurn(S.stageDraft).team,'bravo');
  assert.equal(choose(S,pool[0]),true);
  assert.equal(app.stageDraftTurn(S.stageDraft).team,'alpha');
  assert.equal(choose(S,pool[1]),true);
  assert.equal(app.stageDraftTurn(S.stageDraft).team,'bravo');
  assert.equal(choose(S,pool[2]),true);
  assert.equal(S.stageJa,pool[2]);
  assert.deepEqual(Array.from(S.stageDraft.games),[pool[2]]);
});
test('BO1マルチ: 武器BANなしでも両チームの代表者を決める',()=>{
  const S=app.createInitialDraftState({an:'A',bn:'B',ts:1,bc:0,ft:'alpha',po:'alt',rm:'random',sm:'random',
    seriesEnabled:false,stageMode:'banpick',stagePool:pool.slice(0,3),pickMode:'team',
    members:{a:{team:'alpha',joinedAt:1},b:{team:'bravo',joinedAt:2}}},true);
  assert.equal(S.representativeAlpha,'a'); assert.equal(S.representativeBravo,'b');
});
test('おまかせロスト: 未使用のみ選び、履歴の状態を変更しない',()=>{
  const S=create({stageMode:'loss',stagePool:pool.slice(0,3)}), sr=S.series;
  assert.equal(app.stageDraftPending(S),false);
  assert.equal(sr.stageDraft.games.length,1);
  const next=app.prepareNextStageDraft(sr,()=>0);
  assert.equal(sr.stageDraft.games.length,1);
  assert.equal(next.games.length,2);
  assert.notEqual(next.games[0],next.games[1]);
  const nextState=create({...sr.config,seriesEnabled:true,series:{...sr,game:2,stageDraft:next}});
  assert.equal(nextState.stageJa,next.games[1]);
});
test('カウンター: 前試合の敗者が使用済み以外を選び、次戦に保持される',()=>{
  const S=create({stageMode:'counter',stagePool:pool.slice(0,3)}), sr=S.series;
  sr.history=[{winner:'alpha',stageJa:S.stageJa}];
  const d=app.prepareNextStageDraft(sr);
  assert.equal(d.pending,true); assert.equal(d.chooser,'bravo'); assert.equal(d.gameTarget,2);
  const next=create({...sr.config,seriesEnabled:true,series:{...sr,game:2,stageDraft:d}});
  assert.equal(next.stageJa,'選択中'); assert.equal(app.stageDraftPending(next),true);
  assert.equal(choose(next,d.games[0]),false);
  const unused=d.pool.find(name=>name!==d.games[0]);
  assert.equal(choose(next,unused,{team:'alpha'}),false);
  assert.equal(choose(next,unused,{token:'古い操作'}),false);
  assert.equal(choose(next,unused),true);
  assert.equal(next.stageJa,unused); assert.equal(app.stageDraftPending(next),false);
  assert.equal(next.series.stageDraft.games[1],unused);
  assert.equal(choose(next,d.pool[2]),false);
});
test('カウンター: ブラボーが勝った次はアルファが選ぶ',()=>{
  const S=create({stageMode:'counter'});
  S.series.history=[{winner:'bravo'}];
  assert.equal(app.prepareNextStageDraft(S.series).chooser,'alpha');
});
test('ランダム選出は除外済みを避け、候補がなければnull',()=>{
  assert.equal(app.randomUnusedStage(pool.slice(0,3),[pool[0],pool[1]],()=>0),pool[2]);
  assert.equal(app.randomUnusedStage(pool.slice(0,2),pool.slice(0,2),()=>0),null);
});
test('BO3ロストは最終戦まで選択済みを除外し続ける',()=>{
  const S=create({stageMode:'loss',stagePool:pool.slice(0,3)});
  let sr=S.series;
  for(let game=2;game<=3;game++){
    const stageDraft=app.prepareNextStageDraft(sr,()=>0);
    sr={...sr,game,stageDraft};
    assert.equal(stageDraft.games.length,game);
    assert.equal(new Set(stageDraft.games).size,game);
  }
  assert.deepEqual(Array.from(sr.stageDraft.games).sort(),pool.slice(0,3).sort());
});
test('BO3カウンターは前戦の敗者が交替し、同一ステージの再選択を拒否',()=>{
  let S=create({stageMode:'counter',stagePool:pool.slice(0,3)});
  S.series.history=[{winner:'alpha'}];
  let d=app.prepareNextStageDraft(S.series);
  S=create({...S.series.config,series:{...S.series,game:2,stageDraft:d}});
  assert.equal(d.chooser,'bravo');
  assert.equal(choose(S,d.pool.find(x=>!d.games.includes(x))),true);
  S.series.history.push({winner:'bravo'});
  d=app.prepareNextStageDraft(S.series);
  S=create({...S.series.config,series:{...S.series,game:3,stageDraft:d}});
  assert.equal(d.chooser,'alpha');
  for(const used of d.games) assert.equal(choose(S,used),false);
  assert.equal(choose(S,d.pool.find(x=>!d.games.includes(x))),true);
  assert.equal(new Set(d.games).size,3);
});
test('BO7とBO9は設定で許される最大試合数に応じて不足を検出',()=>{
  for(const n of [7,9]){
    assert.equal(app.validStagePool(pool.slice(0,n+1),app.requiredStageCount('banpick',n)),false);
    assert.equal(app.validStagePool(pool.slice(0,n+2),app.requiredStageCount('banpick',n)),true);
  }
});
test('全候補のうち指定済み以外は乱数の端でも選出可能',()=>{
  assert.equal(app.randomUnusedStage(pool.slice(0,3),[pool[1]],()=>0),pool[0]);
  assert.equal(app.randomUnusedStage(pool.slice(0,3),[pool[1]],()=>0.999),pool[2]);
});
test('従来のBAN/PICK設定と選択済みシリーズを復元できる',()=>{
  const S=create({stageDraftEnabled:true,stageMode:undefined,stagePool:pool.slice(0,5)});
  assert.equal(app.stageDraftPending(S),true);
  assert.equal(S.series.stageDraft.mode,'banpick');
  const old={series:{stageDraft:{pool:pool.slice(0,5),first:'alpha',token:'old',actions:[]}}};
  assert.equal(app.stageDraftPending(old),true);
  assert.equal(choose(old,pool[0]),true);
});
test('各ステージの画像URLは同梱の相対パスで、不明名を拒否',()=>{
  assert.match(app.stageImgUrl(pool[0]),/^images\/sendou-stages\/\d+\.avif$/);
  assert.equal(app.stageImgUrl('存在しない'), '');
});
test('ガチャは同じドラフトの配布だけを受け入れ、前試合の確定状態を混ぜない',()=>{
  const first=create({stageMode:'counter',pickMode:'gacha'});
  const second=create({...first.series.config,series:{...first.series,game:2},pickMode:'gacha'});
  assert.notEqual(first.draftId,second.draftId);
  assert.equal(app.gachaMatchesDraft(first,{draftId:first.draftId}),true);
  assert.equal(app.gachaMatchesDraft(second,{draftId:first.draftId}),false);
  assert.equal(app.gachaMatchesDraft(second,{}),false);
  assert.equal(app.gachaMatchesDraft({},{}),true);
  assert.equal(app.gachaMatchesDraft({},{draftId:first.draftId}),false);
});
