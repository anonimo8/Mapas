import {readFile} from 'node:fs/promises';
import {strict as assert} from 'node:assert';
import vm from 'node:vm';

const html=await readFile(new URL('../src/admin/original-admin.html',import.meta.url),'utf8');
const compiled=await readFile(new URL('../src/admin/admin-page.js',import.meta.url),'utf8');
assert.ok(compiled.includes('function startTerritoryDrag(layer,event)'), 'Editor publicado con arrastre');
const head=html.indexOf('function canDragTerritory(layer)');
const tail=html.indexOf('const layerFor=(t)=>{',head);
assert.ok(head>0&&tail>head,'Se halló la interacción de arrastre');
const functions=html.slice(head,tail);

function makeScenario(editing=true){
 let historyCalls=0,status='',editEvents=0,selectedLayer;
 const events=new Map();
 const doc={
  addEventListener(name,cb){events.set(name,cb)},
  removeEventListener(name){events.delete(name)}
 };
 const win={addEventListener(){},removeEventListener(){}};
 const classes=new Set();
 const path={
  _territoryDragBound:false,
  classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),toggle(v,on){on?classes.add(v):classes.delete(v)}},
  setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){},
  addEventListener(){}
 };
 const original=[[{lat:1,lng:2},{lat:1,lng:4},{lat:3,lng:4},{lat:3,lng:2}]];
 let shape=original;
 let disabled=0,enabled=0;
 let dragEnabled=true;
 const layer={
  getElement(){return path},
  getLatLngs(){return shape},
  setLatLngs(value){shape=value},
  getBounds(){return {getCenter(){return {lat:2,lng:3}}}},
  editing:{enabled:()=>editing,disable:()=>{disabled++},enable:()=>{enabled++},_moveMarker:{setLatLng(){}},_repositionCornerMarkers(){}},
  fire(type){if(type==='edit')editEvents++},
  on(){}
 };
 selectedLayer=layer;
 const context={
  console,Date,Math,document:doc,window:win,
  L:{point:(x,y)=>({x,y})},
  map:{
   on(){},
   latLngToLayerPoint:ll=>({x:ll.lng*100,y:ll.lat*100}),
   layerPointToLatLng:p=>({lat:p.y/100,lng:p.x/100}),
   dragging:{enabled:()=>dragEnabled,disable:()=>{dragEnabled=false},enable:()=>{dragEnabled=true}}
  },
  fg:{eachLayer(cb){cb(layer)}},draw:{_toolbars:{}},
  placingPoint:false,privatePlacing:false,editingLayer:editing?layer:null,
  recordHistory:()=>{historyCalls++},setStatus:value=>{status=value},suppressTerritoryClickUntil:0,
 };
 vm.runInNewContext(functions+'\nglobalThis.start=startTerritoryDrag;',context);
 return {context,events,layer,path,original,shape:()=>shape,classes,stats:()=>({historyCalls,status,editEvents,disabled,enabled,dragEnabled})};
}
const drag=makeScenario();
drag.context.start(drag.layer,{button:0,isPrimary:true,pointerId:15,clientX:30,clientY:50,preventDefault(){},stopPropagation(){}});
assert.equal(drag.stats().dragEnabled,false,'Desactiva paneo durante el arrastre');
drag.events.get('pointermove')({pointerId:15,clientX:50,clientY:40,preventDefault(){}});
assert.equal(drag.shape()[0][0].lng,2.2);
assert.equal(drag.shape()[0][0].lat,0.9);
assert.deepEqual(drag.original[0][0],{lat:1,lng:2},'No altera las coordenadas originales en memoria');
drag.events.get('pointerup')({pointerId:15,clientX:50,clientY:40});
assert.equal(drag.stats().historyCalls,1,'Registra un cambio deshacible');
assert.equal(drag.stats().editEvents,1,'Marca el territorio como editado');
assert.equal(drag.stats().dragEnabled,true,'Restaura el paneo');
assert.equal(drag.stats().disabled,1,'Recoloca tiradores de Leaflet.Draw');
assert.equal(drag.stats().enabled,1);
assert.match(drag.stats().status,/Guardar territorio/);
assert.equal(drag.events.size,0,'Retira eventos temporales');

const cancel=makeScenario();
cancel.context.start(cancel.layer,{button:0,isPrimary:true,pointerId:9,clientX:0,clientY:0,preventDefault(){},stopPropagation(){}});
cancel.events.get('pointermove')({pointerId:9,clientX:45,clientY:10,preventDefault(){}});
cancel.events.get('pointercancel')({pointerId:9});
assert.equal(cancel.shape(),cancel.original,'Cancelar devuelve la geometría anterior');
assert.equal(cancel.stats().historyCalls,0,'No registra un movimiento cancelado');

const nonEditing=makeScenario(false);
nonEditing.context.start(nonEditing.layer,{button:0,isPrimary:true,pointerId:8,clientX:0,clientY:0,preventDefault(){},stopPropagation(){}});
assert.equal(nonEditing.events.size,0,'Mover el mapa no cambia un territorio si Editar está inactivo');
console.log('PASS: arrastrar figura completa, actualizar tiradores, conservar datos, cancelar e historial.');
