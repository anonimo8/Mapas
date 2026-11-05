import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import admin from '../admin-worker/src/index.js';
const workerText=await readFile(new URL('../src/index.js',import.meta.url),'utf8');
const adapted=workerText.replace("import { DurableObject } from 'cloudflare:workers';",'class DurableObject {}');
const {default:publicWorker}=await import('data:text/javascript;base64,'+Buffer.from(adapted).toString('base64'));
const prepare=(sql)=>({
  all:async()=>({results:[]}),
  first:async()=>null,
  bind(...values){return {all:async()=>({results:[]}),first:async()=>null,run:async()=>({success:true})};}
});
const env={PUBLIC_DB:{prepare}, ASSETS:{fetch:async()=>new Response('<html>map</html>')}, LIVE:{getByName:()=>({fetch:async()=>new Response('{}')})}};
const req=(path,opts={})=>new Request('https://public.example'+path,opts);
let r=await publicWorker.fetch(req('/api/config'),env);
assert.equal(r.status,200);assert.deepEqual((await r.json()).coverage,['Lambayeque','Mochumí','Túcume','Íllimo','Pacora','Mórrope']);
r=await publicWorker.fetch(req('/api/health'),env);assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
r=await publicWorker.fetch(req('/api/data'),env);
assert.equal(r.status,200);assert.deepEqual(await r.json(),{territories:[],points:[]});
r=await publicWorker.fetch(req('/api/proposals',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),env);
assert.equal(r.status,503); // Sin Turnstile, la colaboración pública queda cerrada.
r=await publicWorker.fetch(req('/api/live'),env);assert.equal(r.status,426);
const ownerCtx={access:{getIdentity:async()=>({email:'owner@example.com'})}};
const adminEnv={...env,ADMIN_EMAIL:'owner@example.com'};
r=await admin.fetch(new Request('https://admin.example/'),adminEnv,{});assert.equal(r.status,403);
r=await admin.fetch(new Request('https://admin.example/'),adminEnv,{access:{getIdentity:async()=>({email:'wrong@example.com'})}});assert.equal(r.status,403);
r=await admin.fetch(new Request('https://admin.example/'),adminEnv,ownerCtx);assert.equal(r.status,200);
r=await admin.fetch(new Request('https://admin.example/api/admin/all'),adminEnv,ownerCtx);assert.equal(r.status,200);
const polygon={type:'Polygon',coordinates:[[[-79.907,-6.7],[-79.908,-6.7],[-79.908,-6.701],[-79.907,-6.7]]]};
const create=(geom=polygon,origin='https://admin.example')=>new Request('https://admin.example/api/admin/territories',{
 method:'POST',headers:{origin,'content-type':'application/json'},
 body:JSON.stringify({number:1,locality:'Lambayeque',geometry:geom,published:false})
});
r=await admin.fetch(create(),adminEnv,ownerCtx);assert.equal(r.status,201);
r=await admin.fetch(create(),adminEnv,{});assert.equal(r.status,403);
r=await admin.fetch(create(polygon,'https://evil.example'),adminEnv,ownerCtx);assert.equal(r.status,403);
r=await admin.fetch(create({type:'Polygon',coordinates:[[[0,0],[1,1],[2,2],[0,0]]]}),adminEnv,ownerCtx);assert.equal(r.status,400);
console.log('PASS: API pública, cierre Turnstile, auth Access, validación de polígonos y CSRF.');
