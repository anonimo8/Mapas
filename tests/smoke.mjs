import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import admin from '../src/admin/index.js';
import {TERRITORY_REFERENCE_SEEDS} from '../src/admin/reference-territories.js';
import {handleAuthRoute,hasAdminSession} from '../src/auth.js';
import {buildPublicRoute} from '../src/routing.js';
const workerText=await readFile(new URL('../src/index.js',import.meta.url),'utf8');
const adapted=workerText.replace("import { DurableObject } from 'cloudflare:workers';",'class DurableObject {}')
  .replace("import adminHandler from './admin/index.js';",'')
  .replace("import {TERRITORY_REFERENCE_SEEDS} from './admin/reference-territories.js';",'const TERRITORY_REFERENCE_SEEDS=globalThis._territoryReferenceSeeds;')
  .replace("import {handleAuthRoute,hasAdminSession} from './auth.js';",'const adminHandler=globalThis._adminHandler; const handleAuthRoute=globalThis._handleAuthRoute;const hasAdminSession=globalThis._hasAdminSession;')
  .replace("import {buildPublicRoute} from './routing.js';",'const buildPublicRoute=globalThis._buildPublicRoute;');
globalThis._buildPublicRoute=buildPublicRoute;globalThis._territoryReferenceSeeds=TERRITORY_REFERENCE_SEEDS;globalThis._adminHandler=admin;globalThis._handleAuthRoute=handleAuthRoute;globalThis._hasAdminSession=hasAdminSession;
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(adapted).toString('base64'));
const prepare=(sql)=>({
  all:async()=>({results:[]}),first:async()=>null,
  bind(...values){return {all:async()=>({results:[]}),first:async()=>null,run:async()=>({success:true})};}
});
const env={PUBLIC_DB:{prepare},ASSETS:{fetch:async()=>new Response('<html>map</html>')},LIVE:{getByName:()=>({fetch:async()=>new Response('{}')})}};
const req=(path,opts={})=>new Request('https://mapas.example'+path,opts);
let r=await worker.fetch(req('/api/config'),env,{});
assert.equal(r.status,200);assert.deepEqual((await r.json()).coverage,['Lambayeque','Mochumí','Túcume','Íllimo','Pacora','Mórrope']);
r=await worker.fetch(req('/api/health'),env,{});assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
r=await worker.fetch(req('/api/data'),env,{});
assert.equal(r.status,200);const publicData=await r.json();
assert.equal(publicData.territorySource,'reference');
assert.equal(publicData.territories.length,11);
assert.deepEqual(publicData.points,[]);
assert.ok(publicData.territories.every(t=>!('published' in t)&&!('sex' in t)&&!('note' in t)));
// Los territorios guardados pero sin publicar deben verse provisionalmente (sin puntos privados).
const reviewEnv={...env,PUBLIC_DB:{prepare:sql=>({all:async()=>({results:sql.includes('FROM territories')?[{id:'1',locality:'Lambayeque',number:1,geometry:JSON.stringify(TERRITORY_REFERENCE_SEEDS[0].geometry),published:0}]:[]})})}};
r=await worker.fetch(req('/api/data'),reviewEnv,{});
assert.equal((await r.json()).territorySource,'review');
// Recuento público por territorio: solo publicados, sin datos individuales,
// con supresión de 1 a 4 hombres o mujeres por privacidad.
const territoryPublished='11111111-1111-4111-8111-111111111111';
const territoryDraft='22222222-2222-4222-8222-222222222222';
const aggregateEnv={...env,
 PUBLIC_DB:{prepare(sql){
   assert.match(sql,/SELECT id FROM territories WHERE published=1/);
   return {all:async()=>({results:[{id:territoryPublished}]})};
 }},
 PRIVATE_DB:{prepare(sql){
   assert.match(sql,/GROUP BY territory_id,sex/);
   return {all:async()=>({results:[
     {territory_id:territoryPublished,sex:'hombre',n:2},
     {territory_id:territoryPublished,sex:'mujer',n:5},
     {territory_id:territoryDraft,sex:'hombre',n:99}
   ]})};
 }}
};
r=await worker.fetch(req('/api/public-territory-stats'),aggregateEnv,{});
assert.equal(r.status,200);
assert.deepEqual(await r.json(),{status:'ok',counts:[{id:territoryPublished,men:null,women:5}]});
r=await worker.fetch(req('/api/public-territory-stats'),env,{});
assert.equal(r.status,503);assert.deepEqual(await r.json(),{status:'unavailable'});
r=await worker.fetch(req('/api/public-summary'),aggregateEnv,{});
assert.equal(r.status,404,'La antigua ruta del contador público general debe desaparecer');
r=await worker.fetch(req('/api/proposals',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),env,{});
assert.equal(r.status,503);
r=await worker.fetch(req('/api/live'),env,{});assert.equal(r.status,426);
r=await worker.fetch(req('/editar'),env,{});assert.equal(r.status,302);assert.equal(r.headers.get('location'),'https://mapas.example/acceso');
r=await worker.fetch(req('/api/admin/private/points'),env,{});assert.equal(r.status,401);
r=await worker.fetch(req('/acceso'),env,{});assert.equal(r.status,503);
const adminEnv={...env};
r=await admin.fetch(req('/editar'),adminEnv,{});assert.equal(r.status,200);
r=await admin.fetch(req('/api/admin/all'),adminEnv,{});assert.equal(r.status,200);
const polygon={type:'Polygon',coordinates:[[[-79.907,-6.7],[-79.908,-6.7],[-79.908,-6.701],[-79.907,-6.7]]]};
const create=(geom=polygon,origin='https://mapas.example')=>new Request('https://mapas.example/api/admin/territories',{
 method:'POST',headers:{origin,'content-type':'application/json'},
 body:JSON.stringify({number:1,locality:'Lambayeque',geometry:geom,published:false})
});
r=await admin.fetch(create(),adminEnv,{});assert.equal(r.status,201);
r=await admin.fetch(create(polygon,'https://evil.example'),adminEnv,{});assert.equal(r.status,403);
r=await admin.fetch(create({type:'Polygon',coordinates:[[[0,0],[1,1],[2,2],[0,0]]]}),adminEnv,{});assert.equal(r.status,400);
console.log('PASS: único Worker, API pública, editor protegido, rutas de edición, validación y CSRF.');
