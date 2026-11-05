import {strict as assert} from 'node:assert';
import {hasAdminSession,handleAuthRoute} from '../src/auth.js';
const db=new Map();
const privateDB={prepare(sql){return {bind(...args){return {
  first:async()=>db.get(args[0])||null,
  run:async()=>{
    if(sql.startsWith('INSERT'))db.set(args[0],{failed:1,window_start:args[1]});
    else if(sql.startsWith('UPDATE'))db.get(args[0]).failed++;
    else if(sql.startsWith('DELETE'))db.delete(args[0]);
    return {success:true};
  }
};}}}};
const env={PRIVATE_DB:privateDB,ADMIN_PASSWORD:'EstaEsUnaContrasenaLargaYPrivada123!!',ADMIN_SESSION_SECRET:'secret_aleatorio_mas_de_32_bytes_no_visible_en_repo_2026'};
const base='https://mapas.example';
function req(path,method='GET',payload,cookie){return new Request(base+path,{method,headers:{...(method!=='GET'?{origin:base,'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),'cf-connecting-ip':'203.0.113.32'},body:payload?JSON.stringify(payload):undefined});}
let r=await handleAuthRoute(req('/acceso'),env);assert.equal(r.status,200);assert.match(await r.text(),/Contraseña de administración/);
r=await handleAuthRoute(req('/api/auth/login','POST',{password:'incorrectaclave'}),env);assert.equal(r.status,401);
const correct=()=>req('/api/auth/login','POST',{password:env.ADMIN_PASSWORD});
r=await handleAuthRoute(correct(),env);assert.equal(r.status,200);
const header=r.headers.get('set-cookie');assert.match(header,/HttpOnly; Secure; SameSite=Strict/);
const c=header.split(';')[0];assert.equal(await hasAdminSession(req('/editar','GET',null,c),env),true);
assert.equal(await hasAdminSession(req('/editar','GET',null,c.slice(0,-1)+'x'),env),false);
assert.equal(await hasAdminSession(req('/editar'),env),false);
r=await handleAuthRoute(req('/api/auth/logout','POST',null,c),env);assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
for(let i=0;i<5;i++)await handleAuthRoute(req('/api/auth/login','POST',{password:'otraClaveErronea!!'}),env);
r=await handleAuthRoute(correct(),env);assert.equal(r.status,429);
assert.match((await r.json()).error,/Demasiados intentos/);
console.log('PASS: login, cookie HttpOnly firmada, detección de alteración, cierre y bloqueo de intentos.');
