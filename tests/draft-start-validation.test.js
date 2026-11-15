'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,fixtureWeapons}=require('./helpers/load-app');
const app=loadApp();
const stages=Array.from(app.STAGES_DATA);
const members={a:{team:'alpha'},b:{team:'bravo'},c:{team:'alpha'},d:{team:'bravo'}};
const check=(over={})=>Array.from(app.draftStartIssues({multi:true,members,ts:2,weaponCount:20,...over}));

test('全ピックモード共通で各チームの人数不足・超過とキック済みを検出',()=>{
  assert.deepEqual(check(),[]);
  for(const team of ['alpha','bravo']){
    const reduced=Object.fromEntries(Object.entries(members).filter(([,m])=>m.team!==team || m!==members[team==='alpha'?'a':'b']));
    assert.match(check({members:reduced})[0],/人数/);
    assert.match(check({members:{...members,x:{team}}})[0],/人数/);
  }
  assert.match(check({members:{...members,a:{team:'alpha',kicked:true}}})[0],/人数/);
  assert.deepEqual(check({members:{...members,x:{team:'unassigned'}}}),[]);
});

test('メンバードラフトは1v1不可、両代表と必要人数を確認',()=>{
  const caps={a:{team:'alpha'},b:{team:'bravo'},c:{team:'unassigned'},d:{team:'unassigned'}};
  assert.deepEqual(check({members:caps,memberDraftEnabled:true}),[]);
  assert.match(check({ts:1,members:caps,memberDraftEnabled:true}).join(),/2v2/);
  assert.match(check({members:{a:caps.a,b:caps.b,c:caps.c},memberDraftEnabled:true}).join(),/メンバー不足/);
  assert.match(check({members,memberDraftEnabled:true}).join(),/キャプテン/);
  assert.deepEqual(check({members:{...caps,e:{team:'unassigned'}},memberDraftEnabled:true}),[]);
  assert.match(check({members:{...caps,e:{team:'unassigned'}},memberDraftEnabled:true,memberDraftTiming:'after'}).join(),/参加者を4人/);
  assert.deepEqual(check({members,memberDraftEnabled:true,memberDraftDone:true}),[]);
});

for(const games of [1,3,5,7,9]) for(const mode of ['loss','counter','banpick']){
  test(`${mode} ${games}試合: ステージ候補の必要数を確認`,()=>{
    const min=app.requiredStageCount(mode,games);
    const base={multi:false,weaponCount:20,maxGames:games,stageMode:mode};
    assert.match(Array.from(app.draftStartIssues({...base,stagePool:stages.slice(0,min-1)})).join(),/ステージ候補/);
    assert.deepEqual(Array.from(app.draftStartIssues({...base,stagePool:stages.slice(0,min)})),[]);
  });
}
test('全員武器ピック方式では連戦・特殊ステージと候補不足を防ぐ',()=>{
  const opts={memberDraftEnabled:true,memberDraftTiming:'after',members:{a:{team:'alpha'},b:{team:'bravo'},c:{team:'unassigned'},d:{team:'unassigned'}}};
  assert.match(check({...opts,seriesEnabled:true}).join(),/連戦/);
  assert.match(check({...opts,stageMode:'loss',stagePool:stages}).join(),/ステージ方式/);
  assert.match(check({...opts,weaponCount:3}).join(),/武器候補/);
  assert.deepEqual(check({...opts,weaponCount:4}),[]);
  assert.match(check({weaponCount:0}).join(),/武器候補/);
});

test('ソロ画面の条件変更でボタンと理由が更新され、条件不足では開始できない',()=>{
  const els={};
  const el=id=>els[id] ||= {style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},value:'',checked:false,disabled:false,textContent:''};
  el('solo-stage-mode').value='banpick';
  let selected=stages.slice(0,2);
  const document={getElementById:el,querySelectorAll(selector){
    if(selector.includes('solo-stage-pool')) return selected.map(name=>({dataset:{stageIndex:String(stages.indexOf(name))}}));
    return [];
  }};
  app.__set({document,WEAPONS:fixtureWeapons(),state:null});
  app.updateSoloStartButton();
  assert.equal(el('btn-start-solo').disabled,true);
  assert.match(el('solo-start-info').textContent,/2\/3/);
  app.__window.startSoloDraft();
  assert.equal(app.__get().state,null);
  selected=stages.slice(0,3);
  app.__window.onStageSettingsChange('solo-');
  assert.equal(el('btn-start-solo').disabled,false);
  assert.equal(el('solo-start-info').textContent,'');
});

test('ホスト画面は参加者・ステージ変更と直接開始呼び出しを検証',()=>{
  const els={};
  const el=id=>els[id] ||= {style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},value:'',checked:false,disabled:false,textContent:''};
  el('sz').value='2'; el('stage-mode').value='loss';
  let selected=[];
  const document={getElementById:el,querySelectorAll(selector){
    if(selector.includes('stage-pool')) return selected.map(name=>({dataset:{stageIndex:String(stages.indexOf(name))}}));
    return [];
  }};
  app.__set({document,WEAPONS:fixtureWeapons(),state:null,isHost:true,roomId:'TEST',lobbyMembers:{a:members.a},lobbyMemberDraft:null});
  app.updateStartButton();
  assert.equal(el('btn-start-draft').disabled,true);
  assert.match(el('start-btn-info').textContent,/人数/);
  assert.match(el('start-btn-info').textContent,/ステージ/);
  app.__window.startDraft();
  assert.equal(app.__get().state,null);
  selected=stages.slice(0,1);
  app.__set({lobbyMembers:members});
  app.updateStartButton();
  assert.equal(el('btn-start-draft').disabled,false);
  app.__set({lobbyMembers:{a:members.a}});
  app.updateStartButton();
  assert.equal(el('btn-start-draft').disabled,true);
});
