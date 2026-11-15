'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers/load-app');
const app=loadApp();
const pool=Array.from(app.STAGES_DATA).slice(0,6);
function initial(first='alpha'){
  return app.createInitialDraftState({an:'A',bn:'B',ts:1,bc:0,ft:first,po:'alt',rm:'random',sm:'random',
    seriesEnabled:true,seriesMode:'bo3',stageDraftEnabled:true,stagePool:pool,pickMode:'team',banMode:'representative'},false);
}
function act(S,stage,over={}){
  const d=S.series.stageDraft,t=app.stageDraftTurn(d);
  return app.applyStageDraftAction(S,{token:d.token,index:t.index,team:t.team,stage,...over},()=>0);
}
test('候補は実在する異なるステージが5つ以上必要',()=>{
  assert.equal(app.validStagePool(pool.slice(0,4)),false);
  assert.equal(app.validStagePool([pool[0],pool[0],pool[1],pool[2],pool[3]]),false);
  assert.equal(app.validStagePool([...pool.slice(0,5),'存在しない']),false);
  assert.equal(app.validStagePool(pool.slice(0,5)),true);
});
test('後攻指定でもBANとPICKは先攻から交互、3戦目は残りから選ぶ',()=>{
  const S=initial('bravo'),d=S.series.stageDraft;
  assert.equal(S.stageJa,'選択中');
  assert.deepEqual([0,1,2,3].map(i=>{
    const turn=app.stageDraftTurn(d); assert.equal(act(S,pool[i]),true); return turn.team+turn.kind;
  }),['bravoBAN','alphaBAN','bravoPICK','alphaPICK']);
  assert.deepEqual(Array.from(d.games),[pool[2],pool[3],pool[4]]);
  assert.equal(S.stageJa,pool[2]);
  assert.equal(app.stageDraftPending(S),false);
  assert.equal(act(S,pool[5]),false);
});
test('重複、手番違い、別シリーズの古い操作を拒否する',()=>{
  const S=initial();
  assert.equal(act(S,pool[0],{team:'bravo'}),false);
  assert.equal(act(S,pool[0],{token:'old'}),false);
  assert.equal(act(S,pool[0],{index:3}),false);
  assert.equal(act(S,pool[0]),true);
  assert.equal(act(S,pool[0]),false);
  assert.equal(act(S,'存在しない'),false);
  assert.equal(S.series.stageDraft.actions.length,1);
});
test('選んだステージは次の試合を組み立てるときに保持される',()=>{
  const S=initial(); for(let i=0;i<4;i++) act(S,pool[i]);
  const next={...S.series,game:2};
  const nextState=app.createInitialDraftState({...next.config,seriesEnabled:true,series:next,sm:'random'},false);
  assert.equal(nextState.stageJa,pool[3]);
  const finalState=app.createInitialDraftState({...next.config,seriesEnabled:true,series:{...next,game:3},sm:'random'},false);
  assert.equal(finalState.stageJa,pool[4]);
});
test('マルチでは各チームの代表者だけがそのチームを操作できる',()=>{
  const S=initial(); S.representativeAlpha='a'; S.representativeBravo='b';
  app.__set({isMulti:true,isHost:false,myMemberId:'b'});
  assert.equal(app.isStageOperator(S,'alpha'),false);
  assert.equal(app.isStageOperator(S,'bravo'),true);
  app.__set({isMulti:true,isHost:true,myMemberId:'a'});
  assert.equal(app.isStageOperator(S,'alpha'),true);
  assert.equal(app.isStageOperator(S,'bravo'),false);
  app.__set({isMulti:false,isHost:false,myMemberId:null});
});
