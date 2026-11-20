'use strict';
// BAN は1回目で候補、2回目で確定し、追加操作なしで送信・進行する。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function part(start, end){
  const a=html.indexOf(start), b=html.indexOf(end,a);
  assert.ok(a>=0 && b>a, `missing ${start}`);
  return html.slice(a,b);
}
function setup({multi=false, individual=false, fail=false}={}){
  const writes=[], alerts=[];
  const s={
    state:{idx:0,seq:[{phase:'ban'},{phase:'pick'}],bc:2,
      banGenres:{cat:0,sub:0,special:0},bans:{alpha:[],bravo:[]},
      pickMode:individual?'individual':'team',banMode:individual?'individual':'representative',
      bannerIds:{alpha:['me','me'],bravo:['other','other']}},
    isMulti:multi,isHost:true,myMemberId:'me',roomId:'test',db:{},
    banPending:{alpha:[],bravo:[]},banPendingIndividual:{},banActiveTeam:'alpha',
    alphaBanSubmitted:false,bravoBanSubmitted:false,myBanSubmitted:false,
    myConfirmedBan:null,individualBanSending:false,pendingSelect:null,
    sfx:{ban(){}}, renderBanPanel(){},renderGrid(){},
    soloAdvance(){s.state.idx++;},
    myTeamOf(){return 'alpha';},isRepBanRepresentative(){return true;},
    usesIndividualBan(pm,bm){return bm==='individual' && (pm==='individual'||pm==='banonly');},
    banTypeOf(w){return w.banType||'weapon';},
    banIdOf(w){return w.banType?`${w.banType}:${w.value}`:`w:${w.key}`;},
    banTotalLimit(S){return S.bc+Object.values(S.banGenres).reduce((a,b)=>a+b,0);},
    banRemainingFor(S,team,type){return (type==='weapon'?S.bc:S.banGenres[type])-
      s.banPending[team].filter(x=>s.banTypeOf(x)===type).length;},
    serializeBan(w){return {...w};},ref(db,p){return p;},
    set(ref,value){writes.push({ref,value});return fail?Promise.reject(Error('offline')):Promise.resolve();},
    alert(message){alerts.push(message);},
  };
  s.window=s;
  vm.createContext(s);
  vm.runInContext(part('function getMyBannerInfo(', '// ===== 代表者（操作担当）')+
    part('window.confirmBans = function(){','// 個人BAN全員分揃ったか確認')+
    part('function pickWeapon(w){','// 仮選択をスロットに仮表示'),s);
  return {s,writes,alerts};
}
const weapon=n=>({key:'w'+n,name:'武器'+n,imgUrl:'x',cat:'シューター'});

test('ソロ: 仮選択を変更でき、両チームの最後の2タップ目で自動進行',()=>{
  const {s,writes}=setup();
  const w=[1,2,3,4,5].map(weapon);
  s.pickWeapon(w[0]); s.pickWeapon(w[1]);
  assert.equal(s.pendingSelect.w.key,'w2');
  assert.equal(s.banPending.alpha.length,0);
  s.pickWeapon(w[1]);
  for(const x of w.slice(2)){s.pickWeapon(x);s.pickWeapon(x);}
  assert.equal(s.state.idx,1);
  assert.deepEqual(Array.from(s.state.bans.alpha,x=>x.key),['w2','w3']);
  assert.deepEqual(Array.from(s.state.bans.bravo,x=>x.key),['w4','w5']);
  assert.equal(writes.length,0);
});

test('代表者BAN: 必要数が揃うまで送信せず最後の確定でチーム分を自動送信',()=>{
  const {s,writes}=setup({multi:true});
  const a=weapon(1),b=weapon(2);
  s.pickWeapon(a); s.pickWeapon(a);
  assert.equal(writes.length,0);
  s.pickWeapon(b); s.pickWeapon(b);
  assert.equal(writes.length,1);
  assert.equal(writes[0].ref,'rooms/test/pending_alpha_bans');
  assert.deepEqual(Array.from(writes[0].value,x=>x.key),['w1','w2']);
  assert.equal(s.alphaBanSubmitted,true);
});

test('非ホスト代表者は送信後も自分が選んだBANを表示できる',()=>{
  const {s,writes}=setup({multi:true});
  s.isHost=false;
  const a=weapon(1),b=weapon(2);
  s.pickWeapon(a);s.pickWeapon(a);s.pickWeapon(b);s.pickWeapon(b);
  assert.equal(writes.length,1);
  assert.deepEqual(Array.from(s.banPending.alpha,x=>x.key),['w1','w2']);
});

test('参加者の最初のフェーズ移行で送信済みBANなどの一時状態を消す',()=>{
  let listener, onDraft=false;
  const s={usesIndividualBan:(pm,bm)=>bm==='individual'&&(pm==='individual'||pm==='banonly'),isHost:false,roomId:'test',db:{},fbUnsub:null,fbLobbyUnsub:null,
    state:null,_lastPushedIdx:-1,banPending:{alpha:[],bravo:[]},
    alphaBanSubmitted:false,bravoBanSubmitted:false,
    ref:(db,p)=>p,onValue(ref,callback){listener=callback;return ()=>{};},
    document:{getElementById:id=>({classList:{contains:()=>id==='s-draft'&&onDraft}})},
    normalizeState:x=>x,stageDraftPending:()=>false,resetTransientDraftState(){},
    subscribePendingBravoBans(){},subscribeSimPick(){},
    showDraftUI(){onDraft=true;},renderDraft(){},
  };
  vm.createContext(s);
  vm.runInContext(part('function subscribeRoom(){','function subscribePendingBravoBans(){'),s);
  s.subscribeRoom();
  const snapshot=idx=>({exists:()=>true,val:()=>({idx,seq:[{phase:'ban'},{phase:'pick'}],pickMode:'team'})});
  listener(snapshot(0));
  s.banPending.alpha.push(weapon(1));s.alphaBanSubmitted=true;
  listener(snapshot(1));
  assert.equal(s.banPending.alpha.length,0);
  assert.equal(s.alphaBanSubmitted,false);
});

test('代表者BAN: 武器種などのジャンルBANも最後の確定で送信する',()=>{
  const {s,writes}=setup({multi:true});
  s.state.bc=0; s.state.banGenres.cat=1;
  const genre={banType:'cat',value:'ローラー',name:'ローラー'};
  s.pickWeapon(genre);s.pickWeapon(genre);
  assert.equal(writes.length,1);
  assert.equal(writes[0].value[0].value,'ローラー');
});

test('個人BAN: 2回目で送信し、同じ担当者の次スロットを選べる',async()=>{
  const {s,writes}=setup({multi:true,individual:true});
  const a=weapon(1),b=weapon(2);
  s.pickWeapon(a);assert.equal(writes.length,0);s.pickWeapon(a);
  assert.equal(writes[0].ref,'rooms/test/pending_bans/me_0');
  assert.equal(s.myBanSubmitted,false);
  assert.equal(s.individualBanSending,true);
  s.pickWeapon(b);
  assert.equal(s.pendingSelect,null, '前の送信中は次の候補を選ばない');
  await new Promise(resolve=>setImmediate(resolve));
  s.pickWeapon(b);s.pickWeapon(b);
  assert.equal(writes[1].ref,'rooms/test/pending_bans/me_1');
  assert.equal(s.myBanSubmitted,true);
});

test('送信失敗時は直前の候補に戻して再送可能にする',async()=>{
  for(const individual of [false,true]){
    const {s,alerts}=setup({multi:true,individual,fail:true});
    if(!individual) s.state.bc=1;
    const a=weapon(1); s.pickWeapon(a); s.pickWeapon(a);
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(alerts.length,1);
    assert.equal(s.pendingSelect.w.key,'w1');
    assert.equal(s.myBanSubmitted,false);
    assert.equal(s.alphaBanSubmitted,false);
    assert.equal(s.banPending.alpha.length,0);
  }
});
