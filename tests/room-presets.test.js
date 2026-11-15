'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers/load-app');
const {ROOM_PRESETS,buildRoomPresetSettings,STAGES_DATA}=loadApp();

test('5種類のプリセットは重複しないIDと説明を持つ',()=>{
  assert.equal(ROOM_PRESETS.length,5);
  assert.equal(new Set(ROOM_PRESETS.map(p=>p.id)).size,5);
  for(const preset of ROOM_PRESETS){
    assert.ok(preset.title && preset.description);
    const s=buildRoomPresetSettings(preset.id);
    assert.equal(s.ts,4);
    assert.equal(s.po,preset.settings.po||'snake');
    assert.equal(s.bc,preset.settings.bc);
    assert.equal(s.pickMode,preset.settings.pickMode);
    assert.equal(s.banMode,preset.settings.banMode);
    assert.equal(s.stagePool.length,STAGES_DATA.length);
    assert.equal(s.memberDraftEnabled,false);
  }
});
test('BO3、同時ピック、ガチャはそれぞれ説明した設定になる',()=>{
  const bo3=buildRoomPresetSettings('stage-bo3');
  assert.equal(bo3.seriesEnabled,true); assert.equal(bo3.seriesMode,'bo3'); assert.equal(bo3.stageDraftEnabled,true);
  assert.equal(buildRoomPresetSettings('simultaneous').po,'sim');
  const gacha=buildRoomPresetSettings('gacha');
  assert.equal(gacha.bc,0); assert.equal(gacha.challengeEnabled,true);
  assert.equal(buildRoomPresetSettings('unknown'),null);
});
test('設定は毎回新たに構築し、前の部屋の変更を持ち越さない',()=>{
  const first=buildRoomPresetSettings('stage-bo3');
  first.stagePool.pop(); first.excludeFilter.cats.push('シューター'); first.banGenres.cat=3;
  const next=buildRoomPresetSettings('stage-bo3');
  assert.equal(next.stagePool.length,STAGES_DATA.length);
  assert.equal(next.excludeFilter.cats.length,0);
  assert.equal(next.banGenres.cat,0);
  assert.equal(buildRoomPresetSettings('custom').seriesEnabled,false);
});
