'use strict';
// 同時ピック: 送信ボタンなしで、同じ武器の2タップ目で確定＝送信される。
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
function setup({multi=true}={}){
  const writes=[], reveals=[];
  const s={
    state:{idx:0,seq:[{phase:'pick',team:'both',alphaMemberId:'me',bravoMemberId:'other'}],
      picks:{alpha:[],bravo:[]},bans:{alpha:[],bravo:[]},pickMode:'individual'},
    isMulti:multi,isHost:true,myMemberId:'me',roomId:'test',db:{},
    simPickPending:{alpha:null,bravo:null},alphaPickSubmitted:false,bravoPickSubmitted:false,
    pendingSelect:null,
    sfx:{confirm(){}}, speakWeapon(){}, renderSimPickPanel(){}, renderGrid(){},
    mySimPickTeam(S,step){return step.alphaMemberId===s.myMemberId?'alpha':step.bravoMemberId===s.myMemberId?'bravo':null;},
    showSimRevealOverlay(a,b){reveals.push([a.key,b.key]);},
    ref(db,p){return p;},
    set(ref,value){writes.push({ref,value});return Promise.resolve();},
  };
  s.window=s;
  vm.createContext(s);
  vm.runInContext(part('function pickWeapon(w){','// 仮選択をスロットに仮表示')+
    part('window.confirmSimPick = function(){','function revealSimPick(){'),s);
  return {s,writes,reveals};
}
const weapon=n=>({key:'w'+n,name:'武器'+n,imgUrl:'x',cat:'シューター'});

test('マルチ: 1タップ目は仮選択のみ、同じ武器の2タップ目で自チームの pending に送信', ()=>{
  const {s,writes}=setup();
  s.pickWeapon(weapon(1));
  s.pickWeapon(weapon(2));
  assert.equal(writes.length,0);
  assert.equal(s.pendingSelect.w.key,'w2');
  s.pickWeapon(weapon(2));
  assert.equal(writes.length,1);
  assert.equal(writes[0].ref,'rooms/test/pending_alpha_pick');
  assert.equal(writes[0].value.key,'w2');
  s.pickWeapon(weapon(3)); s.pickWeapon(weapon(3)); // 送信後は変更できない
  assert.equal(writes.length,1);
});

test('マルチ: このラウンドの担当外はタップしても送信されない', ()=>{
  const {s,writes}=setup();
  s.myMemberId='watcher';
  s.pickWeapon(weapon(1)); s.pickWeapon(weapon(1));
  assert.equal(writes.length,0);
});

test('ソロ: アルファ→ブラボーの順に2タップで確定し、揃った時点で公開される', ()=>{
  const {s,writes,reveals}=setup({multi:false});
  s.pickWeapon(weapon(1)); s.pickWeapon(weapon(1));
  assert.equal(reveals.length,0);
  s.pickWeapon(weapon(2)); s.pickWeapon(weapon(2));
  assert.deepEqual(reveals,[['w1','w2']]);
  assert.equal(writes.length,0);
});
