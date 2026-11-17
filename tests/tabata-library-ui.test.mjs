import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

test('real library UI creates, moves, orders, renames and deletes folders; preserves workouts and restores organization', async () => {
  const dom=new JSDOM('<div id="root"></div>',{url:'https://example.com/links/timer/',pretendToBeVisual:true});
  const original=new Map();
  class Channel {postMessage(){} close(){}}
  const globals={window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,
    HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,BroadcastChannel:Channel,IS_REACT_ACT_ENVIRONMENT:true};
  for(const [key,value] of Object.entries(globals)){
    original.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  }
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  const {act,createElement}=await import('react');
  const {createRoot}=await import('react-dom/client');
  const {loadApp}=await import('./helpers/load-tabata-app.mjs');
  const workout={name:'Meu treino',sets:1,repetitions:8,preparation:10,warmup:0,cooldown:0,exercise:20,rest:10,setRest:60,exercises:[]};
  const now=Date.now();
  const active={id:'active',name:'Pausado',workout:{...workout},startedAt:now-30000,endedAt:null,pausedAt:now-10000,pausedMs:0,skippedMs:0,skippedPhases:0,status:'paused',favorite:false};
  const key='de-fisio.tabata.v1';
  localStorage.setItem(key,JSON.stringify({version:1,draft:workout,presets:['Primeiro','Segundo','Terceiro'].map((name,index)=>({id:`p${index+1}`,workout:{...workout,name}})),executions:[active],preferences:{sound:true,voice:true,vibration:true,keepAwake:true,contrast:false}}));
  let root;
  const data=()=>JSON.parse(localStorage.getItem(key));
  const group=(folderId)=>data().presets.filter(p=>p.folderId===folderId).map(p=>p.workout.name);
  async function click(selector){const node=typeof selector==='string'?document.querySelector(selector):selector;assert.ok(node,String(selector));await act(async()=>node.click());}
  async function text(selector,value){const node=document.querySelector(selector);assert.ok(node,selector);await act(async()=>{
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(node,value);
    node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  });}
  async function select(selector,value){const node=document.querySelector(selector);assert.ok(node,selector);await act(async()=>{node.value=value;node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});}
  const confirm=()=>click('.tt-dialog button[type=submit]');
  const saved=()=>click('.tt-tabs button:nth-child(2)');
  const section=id=>document.querySelector(`.tt-library-group[data-folder-id="${id}"]`);
  try{
    const App=loadApp();root=createRoot(document.getElementById('root'));
    await act(async()=>root.render(createElement(App)));
    await saved();
    assert.equal(document.querySelectorAll('.tt-saved-item').length,3);
    assert.equal(document.querySelectorAll('.tt-folder-heading').length,0,'Unfiled-only users keep the flat library');
    for(const name of ['Treino A','Mobilidade']){
      await click('.tt-new-folder');await text('.tt-dialog input',name);await confirm();
    }
    const a=data().folders.find(f=>f.name==='Treino A').id;
    const b=data().folders.find(f=>f.name==='Mobilidade').id;
    await select('[aria-label="Pasta de Primeiro"]',a);
    await select('[aria-label="Pasta de Segundo"]',a);
    await select('[aria-label="Pasta de Terceiro"]',b);
    assert.deepEqual(group(a),['Primeiro','Segundo']);assert.deepEqual(group(b),['Terceiro']);
    await click('[aria-label="Subir treino Segundo"]');
    assert.deepEqual(group(a),['Segundo','Primeiro']);
    assert.deepEqual([...section(a).querySelectorAll('.tt-order-number')].map(n=>n.textContent.trim()),['1','2']);
    await click('[aria-label="Subir pasta Mobilidade"]');assert.deepEqual(data().folders.map(f=>f.id),[b,a]);
    await click('[aria-label="Renomear pasta Treino A"]');await text('.tt-dialog input','Força');await confirm();
    assert.equal(data().folders.find(f=>f.id===a).name,'Força');
    await click(section(a).querySelector('.tt-folder-toggle'));assert.equal(section(a).querySelector('[id^="tt-folder-"]').hidden,true);
    await click(section(a).querySelector('.tt-folder-toggle'));assert.equal(section(a).querySelector('[id^="tt-folder-"]').hidden,false);
    await click(section(a).querySelector('.tt-folder-add'));
    await click('.tt-save-button');assert.equal(document.querySelector('.tt-dialog select').value,a);
    await text('.tt-dialog input','Novo');await confirm();assert.deepEqual(group(a),['Segundo','Primeiro','Novo']);
    await saved();
    const first=document.querySelector('[data-preset-id="p1"]');
    await click([...first.querySelectorAll('.tt-item-actions button')].find(button=>button.textContent.trim()==='Editar'));
    await click('.tt-save-button');assert.equal(document.querySelector('.tt-dialog select').value,a);
    await select('.tt-dialog select',b);await confirm();assert.deepEqual(group(b),['Terceiro','Primeiro'],'Changing folder during save appends to the destination');
    await saved();await click('[aria-label="Excluir pasta Mobilidade"]');
    assert.match(document.querySelector('.tt-dialog p').textContent,/continuarão salvos/);await confirm();
    assert.equal(data().presets.length,4);assert.deepEqual(group(null),['Terceiro','Primeiro']);
    await select('[aria-label="Pasta de Novo"]','');assert.deepEqual(group(null),['Terceiro','Primeiro','Novo']);
    assert.deepEqual(data().executions,[active],'Organizing models must not change the paused execution');
    await act(async()=>root.unmount());root=createRoot(document.getElementById('root'));
    await act(async()=>root.render(createElement(App)));await saved();
    assert.equal(data().folders[0].name,'Força');
    assert.deepEqual([...section('').querySelectorAll('h3')].map(n=>n.textContent),['Terceiro','Primeiro','Novo']);
    assert.deepEqual([...section(a).querySelectorAll('h3')].map(n=>n.textContent),['Segundo']);
    assert.deepEqual(data().executions,[active]);
  }finally{
    if(root)await act(async()=>root.unmount());dom.window.close();
    for(const [key,descriptor] of original){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
});
