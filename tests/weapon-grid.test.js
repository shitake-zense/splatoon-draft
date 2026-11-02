'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadApp, fixtureWeapons, fixtureState} = require('./helpers/load-app');

const app = loadApp();
const weapon = fixtureWeapons()[0];
function context(overrides={}){
  return {bannedKeys:new Set(), pickedKeys:new Set(), lockedKeys:new Set(),
    teammateBanKeys:new Set(), genreBans:[], ...overrides};
}
function reset(overrides={}){
  app.__set({isMulti:false, isHost:true, myMemberId:'me', banActiveTeam:'alpha',
    pendingSelect:null, banPending:{alpha:[],bravo:[]}, banPendingIndividual:{},
    myBanSubmitted:false, alphaBanSubmitted:false, bravoBanSubmitted:false,
    alphaPickSubmitted:false, bravoPickSubmitted:false,
    simPickPending:{alpha:null,bravo:null}, ...overrides});
}

test('共通の候補プールは標準武器と除外条件を同時に適用する', () => {
  const result=app.filterWeaponPool(fixtureWeapons(), true, {cats:['ローラー'], subs:['ラインマーカー']});
  assert.deepEqual(Array.from(result,w=>w.key), ['w1','w5','w6','w7']);
});

test('ジャンル候補は重複を除き、武器種は決められた順序を保つ', () => {
  const weapons=fixtureWeapons();
  assert.deepEqual(Array.from(app.genreValuesFromPool(weapons,'cat')), ['シューター','ローラー','チャージャー','スピナー','マニューバー','ブラスター','フデ']);
  const subs=Array.from(app.genreValuesFromPool(weapons,'sub'));
  assert.equal(subs.filter(x=>x==='スプラッシュボム').length,1);
  assert.equal(subs.length,7);
});

test('候補はBAN、取得、ロック、味方BANを判定し、BANを優先表示する', () => {
  const status=app.weaponGridStatus(weapon,context({
    bannedKeys:new Set(['w1']), pickedKeys:new Set(['w1']),
    lockedKeys:new Set(['w1']), teammateBanKeys:new Set(['w1'])
  }));
  assert.equal(status.unavailable,true);
  assert.equal(status.reason.label,'BAN済み');
  assert.equal(status.teammate,false);
});

test('ジャンルBAN、味方BAN、連戦ロックの表示を区別する', () => {
  assert.equal(app.weaponGridStatus(weapon,context({genreBans:[{banType:'cat',value:'シューター'}]})).reason.label,'BAN済み');
  assert.equal(app.weaponGridStatus(weapon,context({teammateBanKeys:new Set(['w1'])})).reason.label,'味方がBAN');
  assert.equal(app.weaponGridStatus(weapon,context({lockedKeys:new Set(['w1'])})).reason.label,'🔒 連戦ロック');
  assert.equal(app.weaponGridStatus(weapon,context()).unavailable,false);
});

test('ソロBANは残り枠と仮選択の状態で操作可否を判断する', () => {
  reset();
  const S=fixtureState({bc:1});
  const step={phase:'ban'};
  assert.equal(app.canSelectGridWeapon(S,step),true);
  app.__set({banPending:{alpha:[weapon],bravo:[]}});
  assert.equal(app.canSelectGridWeapon(S,step),false);
  app.__set({banPending:{alpha:[],bravo:[]},pendingSelect:{w:weapon,phase:'ban',team:'alpha'}});
  assert.equal(app.canSelectGridWeapon(S,step),true);
});

test('個人BANは担当者のみ選択でき、送信済みなら操作できない', () => {
  reset({isMulti:true});
  const S=fixtureState({pickMode:'individual',banMode:'individual',members:{me:{team:'alpha'}},bannerIds:{alpha:['me'],bravo:[]}});
  assert.equal(app.canSelectGridWeapon(S,{phase:'ban'}),true);
  app.__set({myBanSubmitted:true});
  assert.equal(app.canSelectGridWeapon(S,{phase:'ban'}),false);
});

test('代表者BANは所属チームの代表者だけが操作できる', () => {
  reset({isMulti:true});
  const S=fixtureState({pickMode:'team',banMode:'representative',members:{me:{team:'bravo'},other:{team:'bravo'}},representativeBravo:'other'});
  assert.equal(app.canSelectGridWeapon(S,{phase:'ban'}),false);
  S.representativeBravo='me';
  assert.equal(app.canSelectGridWeapon(S,{phase:'ban'}),true);
  app.__set({bravoBanSubmitted:true});
  assert.equal(app.canSelectGridWeapon(S,{phase:'ban'}),false);
});

test('同時ピックと個人ピックは担当者以外を操作不可にする', () => {
  reset({isMulti:true});
  const S=fixtureState({pickMode:'individual',members:{me:{team:'alpha'}}});
  const simultaneous={phase:'pick',team:'both',alphaMemberId:'me',bravoMemberId:'other'};
  assert.equal(app.canSelectGridWeapon(S,simultaneous),true);
  app.__set({alphaPickSubmitted:true});
  assert.equal(app.canSelectGridWeapon(S,simultaneous),false);
  assert.equal(app.canSelectGridWeapon(S,{phase:'pick',team:'alpha',memberId:'other'}),false);
  assert.equal(app.canSelectGridWeapon(S,{phase:'pick',team:'alpha',memberId:'me'}),true);
  assert.equal(app.canSelectGridWeapon(S,null),false);
});
