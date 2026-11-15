'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('ガイドのタブ切替は表示と選択状態を一緒に更新する',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const start=html.indexOf('function showGuideTab(t){');
  const end=html.indexOf('window.showGuideTab = showGuideTab;',start);
  assert.ok(start>=0 && end>start);
  const make=(gt)=>({dataset:{gt},active:false,pressed:null,
    classList:{toggle(_class,on){ this.owner.active=on; }},
    setAttribute(name,value){ if(name==='aria-pressed') this.pressed=value; }});
  const tabs=['host','join','flow'].map(make),sections=['host','join','flow'].map(make);
  for(const item of [...tabs,...sections]) item.classList.owner=item;
  const ctx=vm.createContext({document:{querySelectorAll(s){return s.endsWith('.guide-tab')?tabs:sections;}}});
  vm.runInContext(html.slice(start,end),ctx);
  for(const selected of ['join','flow','host']){
    ctx.showGuideTab(selected);
    for(let i=0;i<tabs.length;i++){
      assert.equal(tabs[i].active,tabs[i].dataset.gt===selected);
      assert.equal(tabs[i].pressed,String(tabs[i].dataset.gt===selected));
      assert.equal(sections[i].active,sections[i].dataset.gt===selected);
    }
  }
});
