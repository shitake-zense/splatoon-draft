'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadApp} = require('./helpers/load-app');

test('退出時はすべての購読を一度だけ解除する', () => {
  const app=loadApp();
  const calls=[];
  const names=['fbLobbyUnsub','fbUnsub','fbBanUnsub','fbSimPickUnsub',
    'fbIndividualBanUnsub','fbGachaUnsub','fbTradeUnsub','fbSeriesUnsub','fbStageDraftUnsub'];
  app.__set(Object.fromEntries(names.map(name=>[name,()=>calls.push(name)])));
  app.unsubscribeRoomListeners(true);
  app.unsubscribeRoomListeners(true);
  assert.deepEqual(calls,names);
});

test('ロビーに戻る際はドラフト監視を先に解除する', () => {
  const app=loadApp();
  const calls=[];
  app.__set({fbLobbyUnsub:()=>calls.push('lobby'),fbUnsub:()=>calls.push('draft')});
  app.unsubscribeRoomListeners();
  assert.deepEqual(calls,['draft','lobby']);
});

test('ドラフトの初期化ではロビー・メンバーを削除しない', async () => {
  const app=loadApp();
  app.__removedPaths.length=0;
  await app.clearDraftRoomData('ROOM42');
  const paths=app.__removedPaths;
  assert.equal(paths.length,10);
  assert.ok(paths.includes('rooms/ROOM42/state'));
  assert.ok(paths.includes('rooms/ROOM42/pending_bans'));
  assert.ok(paths.includes('rooms/ROOM42/pending_trade'));
  assert.ok(paths.includes('rooms/ROOM42/series_rule'));
  assert.ok(paths.includes('rooms/ROOM42/stage_draft_action'));
  assert.ok(paths.every(path=>path.startsWith('rooms/ROOM42/')&&!path.includes('/lobby')));
});
