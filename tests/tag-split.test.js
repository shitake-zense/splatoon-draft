'use strict';
// タグ付きランダム振り分け（splitTeamsWithTags）の性質を、乱数を変えて繰り返し確認する。
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers/load-app');
const app=loadApp();
const split=(entries,defs,ts,seed)=>{
  let x=seed||1; const rnd=()=>{ x=(x*1103515245+12345)%2147483648; return x/2147483648; };
  const r=app.splitTeamsWithTags(entries,defs,ts,rnd);
  return {alpha:Array.from(r.alpha),bravo:Array.from(r.bravo),unassigned:Array.from(r.unassigned),warnings:Array.from(r.warnings)};
};
const people=(n,tag,prefix)=>Array.from({length:n},(_,i)=>({id:`${prefix||tag||'u'}${i}`,tag:tag||null}));
const countIn=(ids,prefix)=>ids.filter(id=>id.startsWith(prefix)).length;
const SEEDS=Array.from({length:40},(_,i)=>i*7919+3);

test('例: 長射程2人は1人ずつ、つよい4人は2人ずつ、残りはランダムで4v4',()=>{
  const defs={t1:{name:'長射程',mode:'split'},t2:{name:'つよい',mode:'split'}};
  const entries=[...people(2,'t1','long'),...people(4,'t2','strong'),...people(2,null,'u')];
  for(const seed of SEEDS){
    const r=split(entries,defs,4,seed);
    assert.equal(r.alpha.length,4); assert.equal(r.bravo.length,4); assert.equal(r.unassigned.length,0);
    assert.equal(countIn(r.alpha,'long'),1); assert.equal(countIn(r.bravo,'long'),1);
    assert.equal(countIn(r.alpha,'strong'),2); assert.equal(countIn(r.bravo,'strong'),2);
    assert.deepEqual(r.warnings,[]);
  }
});

test('奇数人数の分けるタグは差1以内で、他のタグと合わせて全体も偏らない',()=>{
  const defs={t1:{mode:'split'},t2:{mode:'split'}};
  const entries=[...people(3,'t1','x'),...people(3,'t2','y'),...people(2,null,'u')];
  for(const seed of SEEDS){
    const r=split(entries,defs,4,seed);
    assert.equal(r.alpha.length,4); assert.equal(r.bravo.length,4);
    assert.ok(Math.abs(countIn(r.alpha,'x')-countIn(r.bravo,'x'))<=1);
    assert.ok(Math.abs(countIn(r.alpha,'y')-countIn(r.bravo,'y'))<=1);
  }
});

test('まとめるタグは同じチームに入り、入りきらないときは警告を出す',()=>{
  const defs={t1:{name:'友達',mode:'group'}};
  for(const seed of SEEDS){
    const r=split([...people(3,'t1','f'),...people(5,null,'u')],defs,4,seed);
    assert.ok(countIn(r.alpha,'f')===3 || countIn(r.bravo,'f')===3);
    assert.deepEqual(r.warnings,[]);
  }
  const over=split([...people(5,'t1','f'),...people(1,null,'u')],defs,4,5);
  assert.ok(countIn(over.alpha,'f')===4 || countIn(over.bravo,'f')===4);
  assert.match(over.warnings.join(),/友達.*入りきらない/);
});

test('定員を超える参加者は未割り当てになり、タグの無い人が先に枠外へ回る',()=>{
  const defs={t1:{mode:'split'}};
  for(const seed of SEEDS){
    const r=split([...people(2,'t1','t'),...people(4,null,'u')],defs,2,seed);
    assert.equal(r.alpha.length,2); assert.equal(r.bravo.length,2);
    assert.equal(r.unassigned.length,2);
    assert.ok(r.unassigned.every(id=>id.startsWith('u')));
    assert.equal(countIn(r.alpha,'t'),1);
  }
});

test('人数が定員より少なければ両チームの差は1以内（代表者ピックなどの少人数向け）',()=>{
  for(const seed of SEEDS){
    const r=split(people(3,null,'u'),{},4,seed);
    assert.equal(r.alpha.length+r.bravo.length,3);
    assert.ok(Math.abs(r.alpha.length-r.bravo.length)===1);
  }
});

test('タグ定義の正規化・表示名・切り替え順',()=>{
  const d=app.normalizeTagDefs({t1:{name:'あいうえおかきくけこさしすせそ',mode:'group'},t9:{name:'x'}});
  assert.equal(d.t1.name.length,10); assert.equal(d.t1.mode,'group'); assert.equal(d.t2.mode,'split');
  assert.equal(d.t9,undefined);
  assert.equal(app.tagLabel(d,'t2'),'タグ2');
  assert.equal(app.tagLabel(d,'zz'),'');
  assert.deepEqual([null,'t1','t2','t3','t4'].map(app.nextTagId),['t1','t2','t3','t4',null]);
});
