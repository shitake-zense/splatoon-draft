'use strict';
// botテスト部屋: bot メンバーの生成と、統計除外の判定
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers/load-app');
const app=loadApp();
const plain=o=>JSON.parse(JSON.stringify(o));

test('ホスト1人の4v4に7体足すと、交互に割り当てて4人ずつになる',()=>{
  const host={h:{name:'あなた',team:'alpha',isHost:true}};
  const bots=plain(app.makeBotMembers(7,host,4,1000));
  const all={...host,...bots};
  assert.equal(Object.keys(bots).length,7);
  assert.ok(Object.keys(bots).every(id=>id.startsWith('bot_')));
  assert.equal(Object.values(all).filter(m=>m.team==='alpha').length,4);
  assert.equal(Object.values(all).filter(m=>m.team==='bravo').length,4);
  assert.ok(Object.values(bots).every(m=>m.bot===true && m.isHost===false && m.name.startsWith('🤖bot')));
});

test('枠が埋まっていれば未割り当てにし、既存の bot ID とは重ならない',()=>{
  const existing={h:{team:'alpha'},bot_1:{team:'bravo',bot:true},bot_2:{team:'alpha',bot:true}};
  const bots=plain(app.makeBotMembers(2,existing,1,1000));
  assert.deepEqual(Object.keys(bots).sort(),['bot_3','bot_4']);
  assert.ok(Object.values(bots).every(m=>m.team==='unassigned'));
});

test('bot が入ったドラフトは統計対象外と判定する',()=>{
  assert.equal(app.stateHasBots({members:{h:{},bot_1:{}}}),true);
  assert.equal(app.stateHasBots({members:{h:{},m2:{}}}),false);
  assert.equal(app.stateHasBots(null),false);
  assert.equal(app.isBotId('bot_3'),true);
  assert.equal(app.isBotId('robot'),false);
});
