'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,fixtureState}=require('./helpers/load-app');
const app=loadApp();

test('OBSの部屋番号を正規化し、6桁の半角英数字だけ受け付ける',()=>{
  assert.equal(app.obsRoomId(' ab12cd '),'AB12CD');
  for(const value of ['', 'ABC12', 'ABC1234', 'ABC/12', 'ＡＢＣ１２３']) assert.equal(app.obsRoomId(value),null);
  assert.equal(app.obsLink('AB12CD'),'http://localhost/?obs=AB12CD');
});

test('OBSには確定済みのBAN・PICKとプレイヤーを表示し、HTMLをエスケープする',()=>{
  const state=fixtureState({an:'<Alpha>',rule:'エリア',stageJa:'ステージ',seq:[{phase:'pick'}],idx:0,
    members:{p:{name:'<player>'}},bans:{alpha:[{name:'ボム',banType:'sub',imgUrl:'images/subspe/icon.png'}],bravo:[]},
    picks:{alpha:[{name:'武器',imgUrl:'images/weapons/icon.png',memberId:'p'}],bravo:[]},
    pending_alpha_pick:{name:'未公開ピック'},gacha:{alpha:{hand:[{name:'未公開ガチャ'}]}}});
  const html=app.obsMarkup(state);
  assert.match(html,/PICK PHASE/); assert.match(html,/&lt;Alpha&gt;/); assert.match(html,/&lt;player&gt;/);
  assert.match(html,/サブ：ボム/); assert.match(html,/images\/weapons\/icon.png/);
  assert.doesNotMatch(html,/未公開ピック|未公開ガチャ/);
});

test('待機・BAN・ガチャ・完了状態を表示する',()=>{
  assert.match(app.obsMarkup(null),/ドラフト開始を待っています/);
  assert.match(app.obsMarkup(fixtureState({seq:[{phase:'ban'}],idx:0})),/BAN PHASE/);
  assert.match(app.obsMarkup(fixtureState({seq:[],idx:0,pickMode:'gacha',gacha:null})),/GACHA PICK/);
  assert.match(app.obsMarkup(fixtureState({seq:[],idx:0})),/COMPLETE/);
});

test('外部画像や不正な画像パスは出力しない',()=>{
  const state=fixtureState({picks:{alpha:[{name:'a',imgUrl:'https://example.com/a.png'},{name:'b',imgUrl:'images/weapons/../bad.png'}],bravo:[]}});
  assert.doesNotMatch(app.obsMarkup(state),/<img/);
});
