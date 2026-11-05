import {strict as assert} from 'node:assert';
import {normalizePrivatePoint,pointInPolygon} from '../admin-worker/src/private-points.js';
import admin from '../admin-worker/src/index.js';
const polygon={type:'Polygon',coordinates:[[[-79.909,-6.700],[-79.907,-6.700],[-79.907,-6.702],[-79.909,-6.702],[-79.909,-6.700]]]};
const tid='11111111-1111-4111-8111-111111111111';
assert.equal(pointInPolygon(-79.908,-6.701,polygon),true);
assert.equal(pointInPolygon(-79.900,-6.701,polygon),false);
assert.equal(pointInPolygon(-79.909,-6.701,polygon),true);
assert.equal(normalizePrivatePoint({sex:'mujer',lat:-6.701,lng:-79.908}).sex,'mujer');
assert.throws(()=>normalizePrivatePoint({sex:'other',lat:-6.701,lng:-79.908}),/hombre o mujer/);
const saved=new Map();
function publicPrepare(sql){return {bind(...args){return {first:async()=>sql.includes('SELECT id,geometry FROM territories')?{id:tid,geometry:JSON.stringify(polygon)}:null,run:async()=>({success:true}),all:async()=>({results:[]})};},all:async()=>({results:[]}),first:async()=>null};}
function privatePrepare(sql){return {bind(...args){return {
   first:async()=>sql.startsWith('SELECT COUNT')?{n:[...saved.values()].filter(p=>p.territory_id===args[0]&&p.id!==args[1]).length}:
     sql.startsWith('SELECT id FROM')?{id:args[0]}:null,
   run:async()=>{
    if(sql.startsWith('INSERT'))saved.set(args[0],{id:args[0],territory_id:args[1],lat:args[2],lng:args[3],sex:args[4],note:args[5]});
    if(sql.startsWith('UPDATE private_person_points SET territory_id=')){
      const p=saved.get(args[5]);if(p)Object.assign(p,{territory_id:args[0],lat:args[1],lng:args[2],sex:args[3],note:args[4]});
    }
    if(sql.startsWith('DELETE'))saved.delete(args[0]);return {success:true};},
   all:async()=>({results:[...saved.values()]})
  };},all:async()=>({results:[...saved.values()]})};}
const env={PUBLIC_DB:{prepare:publicPrepare},PRIVATE_DB:{prepare:privatePrepare},LIVE:{getByName(){return {fetch:async()=>new Response('{}')}}},ADMIN_EMAIL:'owner@example.com'};
const owner={access:{getIdentity:async()=>({email:'owner@example.com'})}};
const req=(path,method='GET',payload)=>new Request('https://admin.example'+path,{method,headers:method!=='GET'?{'origin':'https://admin.example',...(payload?{'content-type':'application/json'}:{})}:undefined,body:payload?JSON.stringify(payload):undefined});
let r=await admin.fetch(req('/api/admin/private/points'),env,{});assert.equal(r.status,403);
r=await admin.fetch(req('/api/admin/private/points'),env,owner);assert.equal(r.status,200);
const payload={sex:'hombre',lat:-6.701,lng:-79.908,territory_id:tid,note:'referencia 01'};
for(let i=0;i<6;i++){
  r=await admin.fetch(req('/api/admin/private/points','POST',payload),env,owner);
  assert.equal(r.status,201);
}
r=await admin.fetch(req('/api/admin/private/points','POST',payload),env,owner);
assert.equal(r.status,409);assert.match((await r.json()).error,/seis/);
r=await admin.fetch(req('/api/admin/private/points','POST',{...payload,lat:-6.71}),env,owner);
assert.equal(r.status,400);
r=await admin.fetch(req('/api/admin/private/points'),env,owner);
assert.equal((await r.json()).points.length,6);
const first=[...saved.keys()][0];
r=await admin.fetch(req('/api/admin/private/points/'+first,'PUT',{...payload,sex:'mujer'}),env,owner);
assert.equal(r.status,200);assert.equal(saved.get(first).sex,'mujer');
r=await admin.fetch(req('/api/admin/private/points/'+first,'DELETE'),env,owner);
assert.equal(r.status,200);assert.equal(saved.size,5);
console.log('PASS: D1 privada, autenticación, creación/edición/eliminación, contorno, límite de 6.');
