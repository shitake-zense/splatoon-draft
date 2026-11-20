'use strict';
// BANのみモード: PICK ステップを積まず、BAN 完了で結果へ。代表者BAN／個人BANの両方に対応する。
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers/load-app');
const app=loadApp();
const create=app.createInitialDraftState;
const members={a1:{team:'alpha',joinedAt:1},a2:{team:'alpha',joinedAt:2},b1:{team:'bravo',joinedAt:1}};
function options(over={}){
  return {an:'A',bn:'B',ts:4,bc:2,ft:'alpha',po:'snake',rm:'ガチエリア',sm:'ゴンズイ地区',
    pickMode:'banonly',banMode:'representative',banGenres:{cat:0,sub:1,special:0},
    pickOrderAlpha:['a1','a2'],pickOrderBravo:['b1'],members,...over};
}

test('代表者BAN: BAN ステップだけを積み、ジャンルBANと代表者を有効にする',()=>{
  const S=create(options(),true);
  assert.deepEqual(Array.from(S.seq,x=>x.phase),['ban']);
  assert.equal(S.pickMode,'banonly');
  assert.equal(S.banGenres.sub,1);
  assert.equal(S.representativeAlpha,'a1');
  assert.equal(S.representativeBravo,'b1');
  assert.equal(S.bannerIds,null);
});

test('個人BAN: ピック順の上位が担当し、人数が足りなければ繰り返して担当する。ジャンルBANは無効',()=>{
  const S=create(options({banMode:'individual'}),true);
  assert.deepEqual(Array.from(S.seq,x=>x.phase),['ban']);
  assert.deepEqual(Array.from(S.bannerIds.alpha),['a1','a2']);
  assert.deepEqual(Array.from(S.bannerIds.bravo),['b1','b1']);
  assert.equal(S.banGenres.sub,0);
});

test('PICK 前提の機能（お題・トレード・ロックアウト）は無効化する',()=>{
  const S=create(options({challengeEnabled:true,tradeEnabled:true,seriesEnabled:true,seriesMode:'bo3',seriesLockout:true}),true);
  assert.equal(S.challenge,null);
  assert.equal(!!S.tradeEnabled,false);
  assert.equal(S.series.lockout,false);
});

test('開始条件: 各チーム1人以上で開始でき、BANが0なら止める。個人BANではジャンルBANを数えない',()=>{
  const check=(over={})=>Array.from(app.draftStartIssues({multi:true,members,ts:4,weaponCount:20,
    pickMode:'banonly',banMode:'representative',bc:2,banGenres:{cat:0,sub:0,special:0},...over}));
  assert.deepEqual(check(),[]);
  assert.deepEqual(check({banMode:'individual'}),[]);
  assert.match(check({bc:0}).join(),/BANのみ/);
  assert.deepEqual(check({bc:0,banGenres:{cat:1,sub:0,special:0}}),[]);
  assert.match(check({bc:0,banMode:'individual',banGenres:{cat:1,sub:0,special:0}}).join(),/武器BANを1つ以上/);
  assert.match(check({members:{a1:members.a1}}).join(),/1人以上/);
  assert.match(check({memberDraftEnabled:true,memberDraftTiming:'after',
    members:{a1:{team:'alpha'},b1:{team:'bravo'},c:{team:'unassigned'},d:{team:'unassigned'},e:{team:'unassigned'},f:{team:'unassigned'},g:{team:'unassigned'},h:{team:'unassigned'}}}).join(),/BANのみモードを利用できません/);
});

test('ソロのBANのみもBANが0なら開始できない',()=>{
  assert.match(Array.from(app.draftStartIssues({pickMode:'banonly',bc:0,weaponCount:20})).join(),/BANのみ/);
  assert.deepEqual(Array.from(app.draftStartIssues({pickMode:'banonly',bc:1,weaponCount:20})),[]);
});
