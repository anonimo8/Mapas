import {readFile} from 'node:fs/promises';
import {strict as assert} from 'node:assert';
import vm from 'node:vm';

const html=await readFile(new URL('../src/admin/original-admin.html',import.meta.url),'utf8');
const compiled=await readFile(new URL('../src/admin/admin-page.js',import.meta.url),'utf8');
assert.ok(compiled.includes('function startTerritoryDrag(layer,event)'), 'Editor publicado con arrastre');
assert.ok(compiled.includes('function snapshotEditingHandles(layer)'), 'Controles editables conectados al arrastre');
const head=html.indexOf('function canDragTerritory(layer)');
const tail=html.indexOf('const layerFor=(t)=>{',head);
assert.ok(head>0&&tail>head,'Se halló la interacción de arrastre');
const functions=html.slice(head,tail);

function makeScenario({editing=true,globalEdit=false,rectangle=false}={}){
 let historyCalls=0,status='',editEvents=0;
 const events=new Map();
 const doc={addEventListener(name,cb){events.set(name,cb)},removeEventListener(name){events.delete(name)}};
 const win={addEventListener(){},removeEventListener(){}};
 const classes=new Set();
 const path={
  _territoryDragBound:false,
  classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),toggle(v,on){on?classes.add(v):classes.delete(v)}},
  setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){},addEventListener(){}
 };
 const original=[[{lat:1,lng:2},{lat:1,lng:4},{lat:3,lng:4},{lat:3,lng:2}]];
 let shape=original;
 let disabled=0,enabled=0,relinks=0;
 let dragEnabled=true,editIsEnabled=editing;
 const vertexPoints=original[0].map(p=>({...p}));
 const middlePoints=[{lat:1,lng:3},{lat:2,lng:4},{lat:3,lng:3},{lat:2,lng:2}];
 const makeMarker=point=>{
  let position={...point};
  return {getLatLng(){return position},setLatLng(value){position={...value}}};
 };
 const handles=[...vertexPoints,...middlePoints].map(makeMarker);
 const editor={
  enabled:()=>editIsEnabled,
  disable:()=>{disabled++;editIsEnabled=false},
  enable:()=>{enabled++;editIsEnabled=true},
  latlngs:[original],
  _updateLatLngs({layer}){this.latlngs=[layer.getLatLngs()];relinks++}
 };
 if(rectangle){
  editor._markerGroup={eachLayer(cb){for(const marker of handles)cb(marker)}};
  editor._moveMarker=handles[0];
  editor._resizeMarkers=handles.slice(1,5);
 }else{
  editor._verticesHandlers=[{_markerGroup:{eachLayer(cb){for(const marker of handles)cb(marker)}}}];
 }
 const layer={
  getElement(){return path},
  getLatLngs(){return shape},
  setLatLngs(value){shape=value},
  getBounds(){return {getCenter(){return {lat:2,lng:3}}}},
  editing:editor,
  fire(type){if(type==='edit')editEvents++},
  on(){}
 };
 const context={
  console,Date,Math,document:doc,window:win,L:{point:(x,y)=>({x,y})},
  map:{
   on(){},
   latLngToLayerPoint:ll=>({x:ll.lng*100,y:ll.lat*100}),
   layerPointToLatLng:p=>({lat:p.y/100,lng:p.x/100}),
   dragging:{enabled:()=>dragEnabled,disable:()=>{dragEnabled=false},enable:()=>{dragEnabled=true}}
  },
  fg:{eachLayer(cb){cb(layer)}},
  draw:{_toolbars:globalEdit?{edit:{_modes:{edit:{handler:{enabled:()=>true}}}}}:{}},
  placingPoint:false,privatePlacing:false,editingLayer:editing&&!globalEdit?layer:null,
  recordHistory:()=>{historyCalls++},setStatus:value=>{status=value},suppressTerritoryClickUntil:0
 };
 vm.runInNewContext(functions+'\nglobalThis.start=startTerritoryDrag;',context);
 const stats=()=>({historyCalls,status,editEvents,disabled,enabled,relinks,dragEnabled});
 return {context,events,layer,path,original,shape:()=>shape,handles,classes,stats};
}
const pointerDown=(scene,id=15)=>scene.context.start(scene.layer,{
 button:0,isPrimary:true,pointerId:id,clientX:30,clientY:50,preventDefault(){},stopPropagation(){}
});
const move=(scene,id=15,dx=20,dy=-10)=>scene.events.get('pointermove')({
 pointerId:id,clientX:30+dx,clientY:50+dy,preventDefault(){}
});
const up=(scene,id=15,dx=20,dy=-10)=>scene.events.get('pointerup')({pointerId:id,clientX:30+dx,clientY:50+dy});

const drag=makeScenario();
pointerDown(drag);
assert.equal(drag.stats().dragEnabled,false,'Se suspende el paneo sólo durante el arrastre');
move(drag);
assert.equal(drag.shape()[0][0].lng,2.2);
assert.equal(drag.shape()[0][0].lat,0.9);
assert.equal(drag.handles[0].getLatLng().lng,2.2,'Primer vértice se mueve EN VIVO con el contorno');
assert.equal(drag.handles[0].getLatLng().lat,0.9,'Primer vértice acompaña el desplazamiento vertical');
assert.equal(drag.handles[4].getLatLng().lng,3.2,'Marcador intermedio acompaña el contorno');
assert.equal(drag.handles[4].getLatLng().lat,0.9);
assert.equal(drag.handles[7].getLatLng().lng,2.2,'Los 8 controles mantienen la misma traslación');
assert.deepEqual(drag.original[0][0],{lat:1,lng:2},'No se altera el estado inicial de la geometría');
up(drag);
assert.equal(drag.stats().historyCalls,1,'Se registra un cambio deshacible');
assert.equal(drag.stats().editEvents,1,'Se marca el territorio como editado');
assert.equal(drag.stats().dragEnabled,true,'Se restaura el paneo');
assert.equal(drag.stats().disabled,1,'Se refrescan controles en Leaflet.Draw');
assert.equal(drag.stats().enabled,1);
assert.equal(drag.stats().relinks,1,'CRÍTICO: Leaflet.Draw recibe las NUEVAS coordenadas de los vértices');
assert.equal(drag.layer.editing.latlngs[0],drag.shape(),'Las siguientes ediciones de vértices usan la figura desplazada');
assert.match(drag.stats().status,/Guardar territorio/);
assert.equal(drag.events.size,0,'Se retiran listeners temporales');

const rect=makeScenario({rectangle:true});
pointerDown(rect);move(rect,15,-70,35);
assert.equal(rect.handles[0].getLatLng().lng,1.3,'Control central de rectángulo también se mueve');
assert.equal(rect.handles[1].getLatLng().lng,3.3,'Control de esquina acompaña el rectángulo');
up(rect,15,-70,35);
assert.equal(rect.stats().historyCalls,1);

const global=makeScenario({editing:true,globalEdit:true});
pointerDown(global);move(global);up(global);
assert.equal(global.stats().relinks,1,'Edición global mantiene vinculados los tiradores');

const cancel=makeScenario();
pointerDown(cancel,9);move(cancel,9,45,10);
assert.notEqual(cancel.handles[0].getLatLng().lng,2);
cancel.events.get('pointercancel')({pointerId:9});
assert.equal(cancel.shape(),cancel.original,'Al cancelar se restaura la geometría anterior');
assert.equal(cancel.layer.editing.latlngs[0],cancel.original,'Al cancelar los controles recuperan la geometría original');
assert.equal(cancel.stats().historyCalls,0,'Cancelar no crea un paso de historial');

const nonEditing=makeScenario({editing:false});
pointerDown(nonEditing,8);
assert.equal(nonEditing.events.size,0,'Sin modo Editar, el arrastre no afecta al territorio');
console.log('PASS: el polígono, sus vértices, puntos intermedios, controles de rectángulo, edición global, cancelación e historial se mantienen sincronizados.');
