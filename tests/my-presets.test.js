'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers/load-app');
const app=loadApp();

test('ロビーのルールを保存し、参加者や部屋固有の情報を除外する',()=>{
  const settings={...app.buildRoomPresetSettings('stage-bo3'),an:'チーム A',bn:'チーム B',ts:3,bc:0,
    roomId:'SECRET',members:{member:{name:'名前'}},pickOrderAlpha:['member'],pickOrderBravo:['other']};
  const saved=app.normalizePresetSettings(settings);
  assert.equal(saved.stageMode,'banpick');assert.equal(saved.seriesMode,'bo3');
  assert.equal(saved.ts,3);assert.equal(saved.bc,0);assert.equal(saved.an,'チーム A');
  for(const key of ['roomId','members','pickOrderAlpha','pickOrderBravo']) assert.equal(Object.hasOwn(saved,key),false);
  assert.equal(saved.stagePool.length,app.STAGES_DATA.length);
});
test('名前は前後の空白を除き、空欄と長すぎる名前を拒否する',()=>{
  assert.equal(app.normalizeMyPresetName('  大会用  '),'大会用');
  for(const value of ['', '  ', 'あ'.repeat(41),null]) assert.throws(()=>app.normalizeMyPresetName(value));
});
test('書き出したデータは読み込み時にルールを保持し、IDを含めない',()=>{
  const source=[{id:'privateid',name:'友達用',settings:{...app.buildRoomPresetSettings('gacha'),excludeFilter:{cats:['シューター'],subs:[],specials:[]}}}];
  const doc=app.presetFileDocument(source);
  assert.equal(doc.format,'splatoon-draft-presets');assert.equal(doc.version,1);
  assert.equal(Object.hasOwn(doc.presets[0],'id'),false);
  const restored=app.decodePresetFile(JSON.parse(JSON.stringify(doc)));
  assert.equal(restored[0].name,'友達用');assert.equal(restored[0].settings.bc,0);
  assert.equal(restored[0].settings.pickMode,'gacha');
  assert.deepEqual(Array.from(restored[0].settings.excludeFilter.cats),['シューター']);
});
test('対応外・破損・過大件数のファイルは読み込まない',()=>{
  for(const doc of [null,{}, {format:'splatoon-draft-presets',version:2,presets:[]},
    {format:'splatoon-draft-presets',version:1,presets:[{name:'',settings:{}}]},
    {format:'splatoon-draft-presets',version:1,presets:Array(51).fill({name:'a',settings:{}})}]){
    assert.throws(()=>app.decodePresetFile(doc));
  }
});
test('不正な設定値や不足したステージプールを拒否する',()=>{
  for(const raw of [{ts:9},{bc:-1},{timeLimitSec:101},{pickMode:'unknown'},
    {seriesEnabled:'true'},{stagePool:['存在しない']},{excludeFilter:{cats:'bad',subs:[],specials:[]}},
    {stageMode:'banpick',seriesEnabled:true,seriesMode:'bo5',stagePool:Array.from(app.STAGES_DATA).slice(0,6)}]){
    assert.throws(()=>app.normalizePresetSettings(raw));
  }
});
test('元の設定オブジェクトを変更せず保存データを作る',()=>{
  const raw=app.buildRoomPresetSettings('standard');
  const saved=app.normalizePresetSettings(raw);
  saved.stagePool.pop(); saved.banGenres.cat=4; saved.excludeFilter.cats.push('シューター');
  assert.equal(raw.stagePool.length,app.STAGES_DATA.length);assert.equal(raw.banGenres.cat,0);assert.equal(raw.excludeFilter.cats.length,0);
});
