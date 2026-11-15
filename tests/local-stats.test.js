'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,fixtureState}=require('./helpers/load-app');
const app=loadApp();
function result(id='draft1'){
  return fixtureState({draftId:id,seq:[],idx:0,
    picks:{alpha:[{key:'w1'}],bravo:[{key:'w2'},{key:'w1'}]},
    bans:{alpha:[{key:'w3'},{banType:'sub',value:'スプラッシュボム'}],bravo:[{key:'w4'}]}});
}
test('参加したドラフト両チームのPICK・BAN・ジャンルBANを端末に集計',()=>{
  const stats=app.applyLocalDraftStats(app.emptyLocalStats(),result(),true);
  assert.equal(stats.stats.meta.drafts,1);assert.equal(stats.stats.weapons.w1.picks,2);
  assert.equal(stats.stats.weapons.w2.picks,1);assert.equal(stats.stats.weapons.w3.bans,1);
  assert.equal(stats.stats.weapons.w4.bans,1);assert.equal(stats.stats.genreBans.sub['スプラッシュボム'],1);
});
test('同じ結果を再表示・再参加しても重複せず、別の試合は加算する',()=>{
  const first=app.applyLocalDraftStats(app.emptyLocalStats(),result(),true);
  assert.equal(app.applyLocalDraftStats(first,result(),true),null);
  const next=app.applyLocalDraftStats(first,result('draft2'),true);
  assert.equal(next.stats.meta.drafts,2);assert.equal(next.stats.weapons.w1.picks,4);
  assert.equal(first.stats.meta.drafts,1);
});
test('未参加・未完了・識別子なしは集計しない',()=>{
  assert.equal(app.applyLocalDraftStats(app.emptyLocalStats(),result(),false),null);
  assert.equal(app.applyLocalDraftStats(app.emptyLocalStats(),result(''),true),null);
  const unfinished=result();unfinished.seq=[{phase:'pick'}];
  assert.equal(app.applyLocalDraftStats(app.emptyLocalStats(),unfinished,true),null);
  const stage=result();stage.stageDraft={mode:'banpick',actions:[]};
  assert.equal(app.applyLocalDraftStats(app.emptyLocalStats(),stage,true),null);
});
test('ガチャは両チーム確定前には集計しない',()=>{
  const S=result();S.pickMode='gacha';S.gacha={alpha:{confirmed:true},bravo:{confirmed:false}};
  assert.equal(app.applyLocalDraftStats(app.emptyLocalStats(),S,true),null);
  S.gacha.bravo.confirmed=true;
  assert.equal(app.applyLocalDraftStats(app.emptyLocalStats(),S,true).stats.meta.drafts,1);
});
test('破損した保存データを黙って上書きしない',()=>{
  assert.throws(()=>app.applyLocalDraftStats({version:2,seen:[],stats:{}},result(),true));
  assert.throws(()=>app.applyLocalDraftStats({version:1,seen:[],stats:{}},result(),true));
});
test('危険なキーをオブジェクトのプロトタイプへ書き込まない',()=>{
  const S=result();S.picks.alpha=[{key:'__proto__'}];S.picks.bravo=[];S.bans={alpha:[],bravo:[]};
  const next=app.applyLocalDraftStats(app.emptyLocalStats(),S,true);
  assert.equal(Object.hasOwn(next.stats.weapons,'__proto__'),false);
  assert.equal({}.picks,undefined);
});
test('マルチ参加者はホスト以外でも保存し、観戦者は保存しない',()=>{
  const data=new Map();
  const storage={getItem(k){return data.has(k)?data.get(k):null;},setItem(k,v){data.set(k,v);}};
  const S=result('multi1');S.members={a:{team:'alpha'},b:{team:'bravo'}};S.statsRecorded=true;
  app.__set({localStorage:storage,state:S,isMulti:true,isHost:false,myMemberId:'b'});
  app.recordLocalDraftStats();app.recordLocalDraftStats();
  const key='splatoon-draft-local-stats-v1';
  assert.equal(JSON.parse(data.get(key)).stats.meta.drafts,1);
  app.__set({state:result('multi2'),myMemberId:'spectator'});app.recordLocalDraftStats();
  assert.equal(JSON.parse(data.get(key)).stats.meta.drafts,1);
});
