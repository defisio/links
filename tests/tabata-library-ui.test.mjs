import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

test('real library UI creates, moves, orders, renames and deletes folders; preserves workouts and restores organization', async () => {
  const dom=new JSDOM('<div id="root"></div>',{url:'https://example.com/links/timer/',pretendToBeVisual:true});
  const original=new Map();
  class Channel {postMessage(){} close(){}}
  const globals={window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,
    HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,
    HTMLButtonElement:dom.window.HTMLButtonElement,Element:dom.window.Element,Node:dom.window.Node,NodeFilter:dom.window.NodeFilter,
    CustomEvent:dom.window.CustomEvent,MutationObserver:dom.window.MutationObserver,
    getComputedStyle:dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window),
    BroadcastChannel:Channel,IS_REACT_ACT_ENVIRONMENT:true};
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
  localStorage.setItem(key,JSON.stringify({version:1,draft:workout,presets:['Primeiro','Segundo','Terceiro'].map((name,index)=>({id:`p${index+1}`,workout:{...workout,name,exercise:index===0?300:20}})),executions:[active],preferences:{sound:true,voice:true,vibration:true,keepAwake:true,contrast:false}}));
  let root;
  const data=()=>JSON.parse(localStorage.getItem(key));
  const group=(folderId)=>data().presets.filter(p=>p.folderId===folderId).map(p=>p.workout.name);
  async function click(selector){
    const node=typeof selector==='string'?document.querySelector(selector):selector;assert.ok(node,String(selector));
    await act(async()=>{
      if(node.getAttribute('aria-haspopup')==='menu') node.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
      else node.click();
      await new Promise(resolve=>setTimeout(resolve,0));
    });
  }
  async function menu(trigger,label){
    await click(`button[aria-label="${trigger}"]`);
    const item=[...document.querySelectorAll('[role="menuitem"]')].find(node=>node.textContent.trim()===label);
    assert.ok(item,label);await click(item);
  }
  async function move(name,destination){
    await menu(`Opções do treino ${name}`,'Mover para');
    assert.equal(document.activeElement,document.querySelector('.tt-dialog select'),'Moving focuses the folder selector');
    await select('.tt-dialog select',destination??'');await confirm();
  }
  async function text(selector,value){const node=document.querySelector(selector);assert.ok(node,selector);await act(async()=>{
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(node,value);
    node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  });}
  async function select(selector,value){const node=document.querySelector(selector);assert.ok(node,selector);await act(async()=>{node.value=value;node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});}
  const confirm=()=>click('.tt-dialog button[type=submit]');
  const saved=()=>click('.tt-mobile-nav button:nth-child(2)');
  const section=id=>document.querySelector(`.tt-library-group[data-folder-id="${id}"]`);
  try{
    const App=loadApp();root=createRoot(document.getElementById('root'));
    await act(async()=>root.render(createElement(App)));
    await saved();
    assert.equal(document.querySelectorAll('.tt-saved-item').length,3);
    assert.equal(document.querySelectorAll('.tt-folder-heading').length,0,'Unfiled-only users keep the flat library');
    const newTrigger=document.querySelector('[aria-label="Novo"]');
    await act(async()=>newTrigger.focus());await click(newTrigger);
    assert.equal(document.querySelectorAll('[role="menuitem"]').length,2);
    await act(async()=>{
      document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,5));
    });
    assert.equal(document.querySelector('[role="menu"]'),null);
    assert.equal(document.activeElement,newTrigger,'Escape restores focus to the menu trigger');
    assert.equal(document.querySelector('.tt-tabs'),null,'Only one navigation layer');
    assert.equal(document.querySelector('.tt-order-actions'),null);
    assert.equal(document.querySelector('.tt-library select'),null);
    assert.equal(document.querySelector('[data-preset-id="p1"] [title="Exercício"]').textContent.trim(),'Exercício: 05:00');
    await click('[aria-label="Carregar Primeiro"]');
    assert.equal(data().draft.exercise,300);assert.deepEqual(data().executions,[active],'Loading keeps the review-before-start flow');
    await saved();
    for(const name of ['Treino A','Mobilidade']){
      await menu('Novo','Nova pasta');await text('.tt-dialog input',name);await confirm();
    }
    const a=data().folders.find(f=>f.name==='Treino A').id;
    const b=data().folders.find(f=>f.name==='Mobilidade').id;
    await move('Primeiro',a);
    await move('Segundo',a);
    await move('Terceiro',b);
    assert.deepEqual(group(a),['Primeiro','Segundo']);assert.deepEqual(group(b),['Terceiro']);
    assert.equal(document.querySelector('[aria-label="Subir treino Segundo"]'),null,'Reordering is hidden during normal use');
    await click('.tt-organize-button');
    assert.equal(document.querySelector('.tt-organize-button').textContent.trim(),'Concluir');
    assert.equal(document.querySelector('[aria-label="Carregar Primeiro"]'),null);
    await click('[aria-label="Subir treino Segundo"]');
    assert.deepEqual(group(a),['Segundo','Primeiro']);
    assert.deepEqual([...section(a).querySelectorAll('.tt-order-number')].map(n=>n.textContent.trim()),['1','2']);
    await click('[aria-label="Subir pasta Mobilidade"]');assert.deepEqual(data().folders.map(f=>f.id),[b,a]);
    await click('.tt-organize-button');
    assert.equal(document.querySelector('.tt-order-actions'),null,'Concluding organization removes all reorder controls');
    await menu('Opções da pasta Treino A','Renomear pasta');await text('.tt-dialog input','Força');await confirm();
    assert.equal(data().folders.find(f=>f.id===a).name,'Força');
    await click(section(a).querySelector('.tt-folder-toggle'));assert.equal(section(a).querySelector('[id^="tt-folder-"]').hidden,true);
    await click(section(a).querySelector('.tt-folder-toggle'));assert.equal(section(a).querySelector('[id^="tt-folder-"]').hidden,false);
    await menu('Opções da pasta Força','Novo treino nesta pasta');
    await click('.tt-save-button');assert.equal(document.querySelector('.tt-dialog select').value,a);
    await text('.tt-dialog input','Novo');await confirm();assert.deepEqual(group(a),['Segundo','Primeiro','Novo']);
    await saved();
    await menu('Opções do treino Primeiro','Editar');
    await click('.tt-save-button');assert.equal(document.querySelector('.tt-dialog select').value,a);
    await select('.tt-dialog select',b);await confirm();assert.deepEqual(group(b),['Terceiro','Primeiro'],'Changing folder during save appends to the destination');
    await saved();await menu('Opções da pasta Mobilidade','Excluir pasta');
    assert.match(document.querySelector('.tt-dialog p').textContent,/continuarão salvos/);await confirm();
    assert.equal(data().presets.length,4);assert.deepEqual(group(null),['Terceiro','Primeiro']);
    await move('Novo',null);assert.deepEqual(group(null),['Terceiro','Primeiro','Novo']);
    assert.deepEqual(data().executions,[active],'Organizing models must not change the paused execution');
    await act(async()=>root.unmount());root=createRoot(document.getElementById('root'));
    await act(async()=>root.render(createElement(App)));await saved();
    assert.equal(data().folders[0].name,'Força');
    assert.deepEqual([...section('').querySelectorAll('h3')].map(n=>n.textContent),['Terceiro','Primeiro','Novo']);
    assert.deepEqual([...section(a).querySelectorAll('h3')].map(n=>n.textContent),['Segundo']);
    assert.deepEqual(data().executions,[active]);
    await click('.tt-organize-button');
    for(const name of ['Terceiro','Primeiro','Novo']){
      await menu(`Opções do treino ${name}`,'Excluir');await confirm();
    }
    assert.equal(data().presets.length,1);
    assert.equal(document.querySelector('.tt-organize-button').textContent.trim(),'Concluir','Organization must stay escapable when only one workout remains');
    await click('.tt-organize-button');
    assert.ok(document.querySelector('[aria-label="Carregar Segundo"]'));
    assert.equal(document.querySelector('.tt-order-actions'),null);
    assert.deepEqual(data().executions,[active]);
  }finally{
    if(root)await act(async()=>root.unmount());dom.window.close();
    for(const [key,descriptor] of original){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
});
