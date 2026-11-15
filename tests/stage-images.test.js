'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('ステージ名と Sendou.ink の画像 ID が正しく対応し、画像が同梱される', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const match = html.match(/const STAGE_IMAGE_IDS = (\{[\s\S]*?\n\});/);
  assert.ok(match);
  const actual = vm.runInNewContext(`(${match[1]})`);
  // sendou.ink stage-ids.ts と stat.ink 日本語ステージ一覧を照合。
  const names = ['ユノハナ大渓谷','ゴンズイ地区','ヤガラ市場','マテガイ放水路','ナメロウ金属',
    'マサバ海峡大橋','キンメダイ美術館','マヒマヒリゾート＆スパ','海女美術大学','チョウザメ造船',
    'ザトウマーケット','スメーシーワールド','ヒラメが丘団地','クサヤ温泉','マンタマリア号',
    'ナンプラー遺跡','コンブトラック','タラポートショッピングパーク','タカアシ経済特区','オヒョウ海運',
    'ネギトロ炭鉱','バイガイ亭','カジキ空港','リュウグウターミナル','デカライン高架下'];
  assert.equal(Object.keys(actual).length, names.length);
  const stagesMatch = html.match(/const STAGES_DATA\s*=\s*(\[[\s\S]*?\]);/);
  assert.ok(stagesMatch);
  const stageNames = vm.runInNewContext(stagesMatch[1]);
  assert.deepEqual([...stageNames].sort(), [...names].sort());
  names.forEach((name,id) => {
    assert.equal(actual[name], id, name);
    const data = fs.readFileSync(path.join(root, 'images', 'sendou-stages', `${id}.avif`));
    assert.equal(data.subarray(4, 12).toString('ascii'), 'ftypavif', name);
  });
});
