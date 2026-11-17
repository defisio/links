import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {Script} from 'node:vm';
import {resolve,dirname} from 'node:path';
import ts from 'typescript';
const require=createRequire(import.meta.url), cache=new Map();
function load(file){
 if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const local=name=>name.startsWith('./')?load(resolve(dirname(file),name+'.ts')):require(name);
 new Script(`(function(require,module,exports){${source}\n})`,{filename:file}).runInThisContext()(local,module,module.exports);
 return module.exports;
}
const base=resolve(new URL('../lib/tabata',import.meta.url).pathname);
const storage=load(resolve(base,'storage.ts')), library=load(resolve(base,'library.ts'));
const {CLASSIC,begin}=load(resolve(base,'engine.ts'));
const {addFolder,renameFolder,deleteFolder,movePreset,reorderPreset,reorderFolder,folderNameError}=library;
function sample(){
 return {...storage.emptyData(),folders:[{id:'a',name:'Treino A'},{id:'b',name:'Mobilidade'}],presets:[
  ['a1','a'],['u1',null],['b1','b'],['a2','a'],['u2',null],['b2','b'],
 ].map(([id,folderId])=>({id,folderId,workout:{...CLASSIC,name:id,exercises:[]}})),executions:[begin(CLASSIC,1000,'active')]};
}
const group=(data,id)=>data.presets.filter(p=>p.folderId===id).map(p=>p.id);
const values=new Map();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}});

test('existing v1 data gains optional folders without changing workouts or active execution',()=>{
 const old=sample();delete old.folders;old.presets=old.presets.map(({folderId,...preset})=>preset);
 const raw=JSON.stringify(old);values.set(storage.STORAGE_KEY,raw);
 const loaded=storage.readData();assert.equal(loaded.error,undefined);
 assert.deepEqual(loaded.data.folders,[]);assert.ok(loaded.data.presets.every(p=>p.folderId===null));
 assert.deepEqual(loaded.data.presets.map(p=>p.workout),old.presets.map(p=>p.workout));
 assert.deepEqual(loaded.data.executions,old.executions);assert.equal(values.get(storage.STORAGE_KEY),raw);
});
test('folder names are free text, trimmed, renameable and unique without case differences',()=>{
 const data=sample(),next=addFolder(data,{id:'c',name:'  Semana 1  '});
 assert.equal(next.folders.at(-1).name,'Semana 1');assert.equal(data.folders.length,2);
 assert.equal(folderNameError(next,'semana 1'),'Já existe uma pasta com esse nome.');
 assert.equal(addFolder(next,{id:'d',name:'  SEMANA 1 '}),next);
 assert.equal(renameFolder(next,'c','Recuperação').folders.at(-1).name,'Recuperação');
 assert.equal(renameFolder(next,'c','Mobilidade'),next);
 assert.ok(folderNameError(next,''));assert.ok(folderNameError(next,'x'.repeat(81)));
});
test('moving appends a workout to the target folder and preserves the saved configuration and execution',()=>{
 const data=sample(),next=movePreset(data,'a1','b');
 assert.deepEqual(group(next,'a'),['a2']);assert.deepEqual(group(next,'b'),['b1','b2','a1']);
 assert.equal(next.presets.at(-1).workout,data.presets[0].workout);assert.equal(next.executions,data.executions);
 assert.equal(data.presets[0].folderId,'a');assert.equal(movePreset(data,'a1','missing'),data);
 assert.deepEqual(group(movePreset(next,'a1',null),null),['u1','u2','a1']);
});
test('manual workout order changes only the selected group, including unfiled workouts',()=>{
 const data=sample(),next=reorderPreset(data,'a2',-1);
 assert.deepEqual(group(next,'a'),['a2','a1']);assert.deepEqual(group(next,'b'),['b1','b2']);
 assert.deepEqual(group(next,null),['u1','u2']);assert.equal(reorderPreset(next,'a2',-1),next);
 assert.deepEqual(group(reorderPreset(next,'u1',1),null),['u2','u1']);
 assert.equal(reorderPreset(data,'missing',1),data);assert.equal(reorderPreset(data,'b2',1),data);
});
test('deleting a folder preserves all its workouts and appends them to unfiled in their current order',()=>{
 const data=reorderPreset(sample(),'a2',-1),next=deleteFolder(data,'a');
 assert.deepEqual(next.folders.map(f=>f.id),['b']);assert.deepEqual(group(next,null),['u1','u2','a2','a1']);
 assert.equal(next.presets.length,data.presets.length);assert.equal(next.executions,data.executions);
 assert.deepEqual(group(next,'b'),['b1','b2']);assert.equal(deleteFolder(data,'missing'),data);
});
test('folder order, memberships and workout order survive storage round trips; orphan folders become unfiled',()=>{
 let data=reorderFolder(sample(),'b',-1);data=reorderPreset(data,'a2',-1);data=movePreset(data,'b1','a');
 storage.writeData(data);const loaded=storage.readData();assert.equal(loaded.error,undefined);assert.deepEqual(loaded.data,data);
 assert.deepEqual(loaded.data.folders.map(f=>f.id),['b','a']);assert.deepEqual(group(loaded.data,'a'),['a2','a1','b1']);
 data.presets[0].folderId='deleted';values.set(storage.STORAGE_KEY,JSON.stringify(data));
 assert.equal(storage.readData().data.presets[0].folderId,null);
 assert.equal(reorderFolder(data,'b',-1),data);
});
