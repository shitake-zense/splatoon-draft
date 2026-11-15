'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers/load-app');
const {createInitialDraftState:create}=loadApp();
function options(overrides={}){
  return {an:'A',bn:'B',ts:2,bc:0,ft:'alpha',po:'alt',rm:'ガチエリア',sm:'ゴンズイ地区',
    pickMode:'team',banMode:'representative',banGenres:{cat:0,sub:0,special:0},
    pickOrderAlpha:['a1','a2'],pickOrderBravo:['b1','b2'],
    members:{a1:{team:'alpha',joinedAt:1},a2:{team:'alpha',joinedAt:2},b1:{team:'bravo',joinedAt:1},b2:{team:'bravo',joinedAt:2}},
    ...overrides};
}

test('BANなしの通常ドラフトはピックから始まり、入力したチーム順を変更しない',()=>{
  const input=options();
  const S=create(input,false);
  assert.equal(S.seq.length,4);
  assert.equal(S.seq[0].phase,'pick');
  assert.equal(S.seq[0].team,'alpha');
  assert.equal(S.rule,'ガチエリア');
  assert.equal(S.stageJa,'ゴンズイ地区');
  assert.equal(S.representativeAlpha,null);
  assert.deepEqual(input.pickOrderAlpha,['a1','a2']);
});

test('武器BANが0でもジャンルBANがあればBANから始まり、両チームの代表者を決める',()=>{
  const S=create(options({banGenres:{cat:1,sub:0,special:0}}),true);
  assert.equal(S.seq[0].phase,'ban');
  assert.equal(S.banGenres.cat,1);
  assert.equal(S.representativeAlpha,'a1');
  assert.equal(S.representativeBravo,'b1');
});

test('相手ピックではジャンルBANを無効化し、選択者と相手を対応させる',()=>{
  const S=create(options({pickMode:'enemy',banGenres:{cat:1,sub:0,special:0}}),true);
  assert.equal(S.banGenres.cat,0);
  assert.equal(S.seq[0].phase,'pick');
  assert.equal(S.seq[0].memberId,'a1');
  assert.equal(S.seq[0].targetMemberId,'b1');
});

test('個人BANで枠数が人数を超える場合は担当者を繰り返す',()=>{
  const S=create(options({bc:3,pickMode:'individual',banMode:'individual',banGenres:{cat:1,sub:0,special:0}}),true);
  assert.deepEqual(Array.from(S.bannerIds.alpha),['a1','a2','a1']);
  assert.deepEqual(Array.from(S.bannerIds.bravo),['b1','b2','b1']);
  assert.equal(S.banGenres.cat,0);
});

test('同時ピックは明示順がなければ参加順にペアを割り当てる',()=>{
  const S=create(options({po:'sim',pickOrderAlpha:[],pickOrderBravo:[]}),true);
  assert.equal(S.seq.length,2);
  assert.equal(S.seq[0].team,'both');
  assert.equal(S.seq[0].alphaMemberId,'a1');
  assert.equal(S.seq[0].bravoMemberId,'b1');
  assert.equal(S.seq[1].alphaMemberId,'a2');
});

test('ガチャは通常のピック順を作らず、連戦の設定を保持する',()=>{
  const S=create(options({bc:1,pickMode:'gacha',gachaRerolls:2,seriesEnabled:true,seriesMode:'bo3',seriesLockout:true}),true);
  assert.equal(S.seq.length,1);
  assert.equal(S.seq[0].phase,'ban');
  assert.equal(S.gachaRerolls,2);
  assert.equal(S.series.target,2);
  assert.equal(S.series.lockout,true);
  assert.equal(S.series.config.pickMode,'gacha');
});
