'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function snippet(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a);return html.slice(a,b);}
function setup(){
  const ids=['pick-mode','ban-mode','member-draft-enabled','member-draft-timing','ban-genre-note','ban-genre-cat','ban-genre-sub','ban-genre-special','solo-pick-mode','solo-pick-order-row','solo-pick-order-desc','solo-gacha-row','solo-ban-genre-note','solo-ban-genre-cat','solo-ban-genre-sub','solo-ban-genre-special'];
  const els=Object.fromEntries(ids.map(id=>[id,{value:'0',checked:false,disabled:false,style:{},textContent:''}]));
  els['pick-mode'].value='individual';els['ban-mode'].value='individual';els['member-draft-timing'].value='before';els['solo-pick-mode'].value='team';
  const ctx={applyPickModeUI(){},usesIndividualBan:(pm,bm)=>bm==='individual'&&(pm==='individual'||pm==='banonly'),document:{getElementById:id=>els[id]},updatePickModeHelp(){},window:{}};
  vm.createContext(ctx);
  vm.runInContext(snippet('function renderGenreBanAvailability(', '// ===== 武器絞り込み')+snippet('window.onSoloPickModeChange = function(){','window.onSettingChange = function(){'),ctx);
  return {ctx,els};
}
test('マルチのジャンルBANは使用できない理由を示し設定値を保持する',()=>{
 const {ctx,els}=setup();els['ban-genre-cat'].value='2';
 const check=(pm,bm,md,timing,disabled,note)=>{els['pick-mode'].value=pm;els['ban-mode'].value=bm;els['member-draft-enabled'].checked=md;els['member-draft-timing'].value=timing;ctx.updateBanGenreRowVisibility();for(const type of ['cat','sub','special'])assert.equal(els['ban-genre-'+type].disabled,disabled);assert.match(els['ban-genre-note'].textContent,note);assert.equal(els['ban-genre-cat'].value,'2');};
 check('individual','individual',false,'before',true,/個人BAN/);
 check('individual','representative',false,'before',false,/武器BANとは別/);
 check('team','individual',false,'before',false,/武器BANとは別/);
 check('gacha','individual',false,'before',false,/武器BANとは別/);
 check('enemy','representative',false,'before',true,/相手ピック/);
 check('team','representative',true,'after',true,/BANがない/);
 check('team','representative',false,'after',false,/武器BANとは別/);
 check('banonly','individual',false,'before',true,/個人BAN/);
 check('banonly','representative',false,'before',false,/武器BANとは別/);
});
test('ソロの相手ピックではジャンルBANを無効にし、切り替え後に戻す',()=>{
 const {ctx,els}=setup();els['solo-pick-mode'].value='enemy';ctx.window.onSoloPickModeChange();assert.equal(els['solo-ban-genre-cat'].disabled,true);assert.match(els['solo-ban-genre-note'].textContent,/相手ピック/);
 els['solo-pick-mode'].value='team';ctx.window.onSoloPickModeChange();assert.equal(els['solo-ban-genre-cat'].disabled,false);
});
test('ランダム先攻は両チームを選べ、指定された先攻を維持する',()=>{
 const ctx=vm.createContext({});vm.runInContext(snippet('function resolveFirstTeam(', 'function nextMdTurn('),ctx);
 assert.equal(ctx.resolveFirstTeam('random',()=>0.1),'alpha');assert.equal(ctx.resolveFirstTeam('random',()=>0.9),'bravo');assert.equal(ctx.resolveFirstTeam('bravo',()=>0),'bravo');
 for(const id of ['ft','solo-ft'])assert.match(html,new RegExp(`<select id="${id}"[^>]*>[\\s\\S]*?<option value="random" selected>`));
});
