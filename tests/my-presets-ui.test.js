'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers/load-app');
const app=loadApp();
const KEY='splatoon-draft-my-presets-v1';
function setup(){
  const data=new Map(),els={};
  const defaults={sz:'4',bc:'0',ft:'alpha','pick-order':'snake',rm:'random',sm:'random',
    'series-mode':'bo3','stage-mode':'normal','member-draft-timing':'before','pick-mode':'team','ban-mode':'representative',
    'time-limit-sec':'30','gacha-rerolls':'2','ban-genre-cat':'0','ban-genre-sub':'0','ban-genre-special':'0'};
  const document={getElementById(id){return els[id]||(els[id]={value:defaults[id]||'',checked:false,style:{},textContent:'',innerHTML:''});},querySelectorAll(){return [];}};
  const storage={getItem(key){return data.has(key)?data.get(key):null;},setItem(key,value){data.set(key,value);},removeItem(key){data.delete(key);}};
  app.__set({document,localStorage:storage});
  return {els,document,storage,data,win:app.__window};
}
test('現在の設定の保存・上書き・名前変更・削除とキャンセル',()=>{
  const {els,document,data,win}=setup();
  document.getElementById('my-preset-save-name').value='練習用';
  win.saveCurrentPreset(false);
  let items=JSON.parse(data.get(KEY));
  assert.equal(items.length,1);assert.equal(items[0].settings.bc,0);assert.equal(items[0].settings.ts,4);
  assert.match(els['my-preset-save-status'].textContent,/保存しました/);
  document.getElementById('sz').value='2';win.saveCurrentPreset(true);
  items=JSON.parse(data.get(KEY));assert.equal(items.length,1);assert.equal(items[0].settings.ts,2);
  document.getElementById('my-preset-rename-'+items[0].id).value='変更後';win.renameMyPreset(items[0].id);
  items=JSON.parse(data.get(KEY));assert.equal(items[0].name,'変更後');
  win.askDeleteMyPreset(items[0].id);assert.match(els['my-preset-list'].innerHTML,/削除を確定/);
  win.cancelDeleteMyPreset();assert.equal(JSON.parse(data.get(KEY)).length,1);
  win.deleteMyPreset(items[0].id);assert.equal(JSON.parse(data.get(KEY)).length,1);
  win.askDeleteMyPreset(items[0].id);win.deleteMyPreset(items[0].id);
  assert.equal(JSON.parse(data.get(KEY)).length,0);
});
test('書き込みに失敗した場合は成功と表示せず既存データを保つ',()=>{
  const {els,document,storage,data,win}=setup();
  document.getElementById('my-preset-save-name').value='最初';win.saveCurrentPreset(false);
  const before=data.get(KEY);storage.setItem=()=>{throw new Error('保存できません');};
  document.getElementById('my-preset-save-name').value='次';win.saveCurrentPreset(false);
  assert.equal(data.get(KEY),before);assert.match(els['my-preset-save-status'].textContent,/保存できませんでした/);
});
test('読み込みは既存を残して追加し、不正なファイルでは一件も変更しない',async()=>{
  const {els,document,data,win}=setup();
  document.getElementById('my-preset-save-name').value='既存';win.saveCurrentPreset(false);
  const valid={format:'splatoon-draft-presets',version:1,presets:[{name:'移行用',settings:app.buildRoomPresetSettings('gacha')}]};
  const input={files:[{size:100,text:async()=>JSON.stringify(valid)}],value:'test.json'};
  await win.importMyPresets(input);
  assert.equal(JSON.parse(data.get(KEY)).length,2);assert.equal(input.value,'');
  assert.match(els['my-preset-import-status'].textContent,/1件を追加/);
  const before=data.get(KEY);
  valid.presets.push({name:'壊れた設定',settings:{ts:99}});
  await win.importMyPresets({files:[{size:200,text:async()=>JSON.stringify(valid)}],value:'broken.json'});
  assert.equal(data.get(KEY),before);assert.match(els['my-preset-import-status'].textContent,/読み込めませんでした/);
});
