'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {loadApp, fixtureState} = require('./helpers/load-app');

test('同じ期限の再描画ではタイマーを作り直さず、変更された期限では作り直す', () => {
  const app=loadApp();
  app.__set({state:fixtureState({seq:[]}),isMulti:false});
  const deadline=Date.now()+60000;
  try {
    app.startTimer(deadline,60);
    const first=app.__get().timerIntervalId;
    assert.ok(first);
    app.startTimer(deadline,60);
    assert.equal(app.__get().timerIntervalId,first);
    app.startTimer(deadline+1000,60);
    assert.notEqual(app.__get().timerIntervalId,first);
  } finally { app.clearTimer(); }
});

test('既に期限が過ぎている場合はタイマーを再登録しない', () => {
  const app=loadApp();
  app.__set({state:fixtureState({seq:[]}),isMulti:false});
  try {
    app.startTimer(Date.now()-1000,30);
    assert.equal(app.__get().timerIntervalId,null);
    assert.equal(app.__get().timerDeadline,null);
  } finally { app.clearTimer(); }
});

test('チーム分けと事前武器選択のタイマーも同じ期限なら再利用する', () => {
  const app=loadApp();
  app.__set({isHost:true});
  const phase={active:true,done:false,deadline:Date.now()+60000};
  try {
    app.startMdTimer(phase);
    const memberTimer=app.__get().mdTimerInterval;
    app.startMdTimer({...phase});
    assert.equal(app.__get().mdTimerInterval,memberTimer);
    app.startMdTimer({...phase,deadline:phase.deadline+1000});
    assert.notEqual(app.__get().mdTimerInterval,memberTimer);
    app.startMdTimer({...phase,done:true});
    assert.equal(app.__get().mdTimerInterval,null);

    app.startWpTimer(phase);
    const weaponTimer=app.__get().wpTimerInterval;
    app.startWpTimer({...phase});
    assert.equal(app.__get().wpTimerInterval,weaponTimer);
    app.startWpTimer({...phase,deadline:phase.deadline+1000});
    assert.notEqual(app.__get().wpTimerInterval,weaponTimer);
    app.startWpTimer({...phase,active:false});
    assert.equal(app.__get().wpTimerInterval,null);
  } finally { app.stopMdTimer(); app.stopWpTimer(); }
});
