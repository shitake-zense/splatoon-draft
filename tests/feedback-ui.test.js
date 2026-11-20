'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const {loadApp}=require('./helpers/load-app');

test('標準武器のみは例示どおり基本形を含みコラボを除外する',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','weapons.json'),'utf8'));
  const selected=loadApp().filterWeaponPool(data,true,null);
  assert.ok(selected.some(w=>w.name==='スプラシューター'));
  assert.ok(!selected.some(w=>w.name==='スプラシューターコラボ'));
  assert.equal((html.match(/スプラシューターコラボ ✕/g)||[]).length,2);
});

test('参加者ロビーは設定・チーム割り当ての変更を表示する',()=>{
  const start=html.indexOf('function subscribeLobby(){');
  const end=html.indexOf('function renderLobbyMembers(',start);
  assert.ok(start>=0 && end>start);
  const elements={
    'lobby-wait-team':{style:{},textContent:''},
    'lobby-wait-settings':{style:{},innerHTML:''},
  };
  let notify;
  const s={fbLobbyUnsub:null,fbUnsub:()=>{},isHost:false,roomId:'test',myMemberId:'me',db:{},
    document:{getElementById:id=>elements[id]},ref:(db,p)=>p,
    onValue(ref,fn){notify=fn;return ()=>{};},renderLobbyMembers(){},
    handleWeaponPickPhase(){return false;},handleMemberDraftPhase(){return false;},
    esc(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;');},
  };
  vm.createContext(s);vm.runInContext(html.slice(start,end),s);s.subscribeLobby();
  const update=(team,settings={})=>notify({exists:()=>true,val:()=>({members:{me:{team}},settings})});
  update('unassigned');
  assert.match(elements['lobby-wait-team'].textContent,/未割り当て.*ホスト/);
  update('unassigned',{memberDraftEnabled:true});
  assert.match(elements['lobby-wait-team'].textContent,/メンバードラフト/);
  update('alpha',{an:'イカチーム'});
  assert.equal(elements['lobby-wait-team'].textContent,'あなたのチーム：イカチーム');
  update('bravo',{bn:'タコチーム'});
  assert.equal(elements['lobby-wait-team'].textContent,'あなたのチーム：タコチーム');
});

test('結果画像のダウンロード開始と生成失敗を画面に知らせる',async()=>{
  const start=html.indexOf('function _wmTruncate(');
  const end=html.indexOf('// ===== シリーズ戦績画像ダウンロード',start);
  assert.ok(start>=0 && end>start);
  for(const fail of [false,true]){
    let clicked=false;
    const button={textContent:'画像を保存',disabled:false};
    const status={textContent:''};
    const ctx={measureText:t=>({width:String(t).length}),createLinearGradient:()=>({addColorStop(){}})};
    for(const key of ['beginPath','moveTo','arcTo','closePath','fillRect','scale','save','rect','clip','drawImage','restore','fillText','fill'])ctx[key]=()=>{};
    const canvas={getContext:()=>ctx,toBlob:cb=>cb(fail?null:{})};
    const anchor={click(){clicked=true;},remove(){}};
    const s={state:{seq:[],an:'A',bn:'B',rule:'エリア',stageJa:'S',ts:1,bc:0,
      bans:{alpha:[],bravo:[]},picks:{alpha:[],bravo:[]}},
      document:{getElementById:id=>id==='btn-save-image'?button:status,
        createElement:tag=>tag==='canvas'?canvas:anchor,body:{appendChild(){}}},
      Image:class {set src(value){this.onerror();}},
      URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
      usesIndividualBan:(pm,bm)=>bm==='individual'&&(pm==='individual'||pm==='banonly'),stageImgUrl:()=>'',banTotalLimit:()=>0,banDispName:x=>x.name,
      setTimeout(){},alert(){},console:{error(){}},
    };
    s.window=s;vm.createContext(s);vm.runInContext(html.slice(start,end),s);
    await s.downloadResultImage();
    assert.equal(clicked,!fail);
    assert.match(status.textContent,fail?/保存できませんでした/:/ダウンロードを開始/);
    assert.equal(button.disabled,false);
  }
});
