// El HTML de administracion se inserta durante el empaquetado en admin-page.js.
import { ADMIN_HTML } from './admin-page.js';
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(message,status=400)=>send({error:message},status);
const isCoord=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-18.5&&lat<=0&&lng>=-82.5&&lng<=-68;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categories=new Set(['referencia','acceso','servicio','otro']);
function normalizeTerritory(body){
  const number=Number(body.number);
  const locality=typeof body.locality==='string'?body.locality.trim():'';
  const geometry=body.geometry;
  if(!Number.isInteger(number)||number<1||number>999999||locality.length<2||locality.length>70) throw Error('Número o localidad inválidos.');
  if(!geometry||geometry.type!=='Polygon'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length!==1) throw Error('Se requiere un polígono simple.');
  const ring=geometry.coordinates[0];
  if(!Array.isArray(ring)||ring.length<4||ring.length>2500) throw Error('Polígono inválido: mínimo tres vértices.');
  if(!ring.every(x=>Array.isArray(x)&&x.length===2&&isCoord(Number(x[1]),Number(x[0])))) throw Error('Coordenadas inválidas o fuera de Perú.');
  if(ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1]) throw Error('El contorno debe estar cerrado.');
  if(new Set(ring.slice(0,-1).map(x=>x.join(','))).size<3) throw Error('El polígono debe tener tres vértices diferentes.');
  const published=body.published===true?1:0;
  return {number,locality,geometry:JSON.stringify({type:'Polygon',coordinates:ring}),published};
}
async function broadcast(env){
  try{await env.LIVE.getByName('mapa-publico').fetch('https://internal/broadcast',{method:'POST'});}catch(_){/* Permite reintento mediante recarga del mapa. */}
}
const adminHeaders={
  'content-type':'text/html; charset=utf-8',
  'cache-control':'no-store, private',
  'x-content-type-options':'nosniff',
  'x-frame-options':'DENY',
  'referrer-policy':'strict-origin-when-cross-origin',
  'content-security-policy':"default-src 'none'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' https://*.tile.openstreetmap.org https://unpkg.com data: blob:; connect-src 'self' https://*.tile.openstreetmap.org; font-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};
export default {
  async fetch(request,env,ctx){
    // Este Worker NO tiene Static Assets: ctx.access sí está disponible en la invocación directa.
    if(!env.ADMIN_EMAIL || !ctx.access) return fail('Acceso denegado: configure Cloudflare Access.',403);
    let identity;
    try{identity=await ctx.access.getIdentity();}catch(_){return fail('No se pudo validar la sesión.',403);}
    if((identity?.email||'').toLowerCase()!==String(env.ADMIN_EMAIL).trim().toLowerCase()) return fail('Usuario no autorizado.',403);
    const url=new URL(request.url), method=request.method;
    if(['POST','PUT','PATCH','DELETE'].includes(method)){
      if(request.headers.get('origin')!==url.origin) return fail('Origen no autorizado.',403);
      if(method!=='DELETE' && !(request.headers.get('content-type')||'').includes('application/json')) return fail('Se requiere JSON.',415);
      if(Number(request.headers.get('content-length')||0)>220000) return fail('Solicitud demasiado grande.',413);
    }
    try{
      if(method==='GET'&&(url.pathname==='/'||url.pathname==='/admin')) return new Response(ADMIN_HTML,{headers:adminHeaders});
      if(url.pathname==='/api/admin/all'&&method==='GET'){
        const [t,p]=await Promise.all([
          env.PUBLIC_DB.prepare('SELECT id,locality,number,geometry,published,updated_at FROM territories ORDER BY locality,number LIMIT 2000').all(),
          env.PUBLIC_DB.prepare('SELECT id,lat,lng,title,category,description,status,created_at FROM points ORDER BY created_at DESC LIMIT 2000').all()
        ]);
        return send({territories:(t.results||[]).map(x=>({...x,geometry:JSON.parse(x.geometry)})),points:p.results||[]});
      }
      if(url.pathname==='/api/admin/territories'&&method==='POST'){
        const x=normalizeTerritory(await request.json());
        const id=crypto.randomUUID();
        await env.PUBLIC_DB.prepare('INSERT INTO territories(id,locality,number,geometry,published) VALUES(?,?,?,?,?)').bind(id,x.locality,x.number,x.geometry,x.published).run();
        if(x.published)await broadcast(env);
        return send({ok:true,id},201);
      }
      let m=url.pathname.match(/^\/api\/admin\/territories\/([^/]+)$/);
      if(m&&UUID.test(m[1])&&method==='PUT'){
        const x=normalizeTerritory(await request.json());
        const before=await env.PUBLIC_DB.prepare('SELECT published FROM territories WHERE id=?').bind(m[1]).first();
        if(!before) return fail('Territorio no encontrado.',404);
        await env.PUBLIC_DB.prepare('UPDATE territories SET locality=?,number=?,geometry=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .bind(x.locality,x.number,x.geometry,x.published,m[1]).run();
        if(x.published||before.published) await broadcast(env);
        return send({ok:true});
      }
      if(m&&UUID.test(m[1])&&method==='DELETE'){
        const before=await env.PUBLIC_DB.prepare('SELECT published FROM territories WHERE id=?').bind(m[1]).first();
        if(!before) return fail('Territorio no encontrado.',404);
        await env.PUBLIC_DB.prepare('DELETE FROM territories WHERE id=?').bind(m[1]).run();
        if(before.published) await broadcast(env);
        return send({ok:true});
      }
      m=url.pathname.match(/^\/api\/admin\/points\/([^/]+)$/);
      if(m&&UUID.test(m[1])&&method==='PUT'){
        const b=await request.json();
        const lat=Number(b.lat),lng=Number(b.lng);
        const title=typeof b.title==='string'?b.title.trim():'';
        const description=typeof b.description==='string'?b.description.trim():'';
        if(!isCoord(lat,lng)||title.length<3||title.length>90||description.length>300||!categories.has(b.category)||!['pending','approved','rejected'].includes(b.status)) return fail('Datos no válidos.');
        const before=await env.PUBLIC_DB.prepare('SELECT status FROM points WHERE id=?').bind(m[1]).first();
        if(!before) return fail('Punto no encontrado.',404);
        await env.PUBLIC_DB.prepare('UPDATE points SET lat=?,lng=?,title=?,category=?,description=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .bind(lat,lng,title,b.category,description,b.status,m[1]).run();
        if(before.status==='approved'||b.status==='approved') await broadcast(env);
        return send({ok:true});
      }
      if(m&&UUID.test(m[1])&&method==='DELETE'){
        const before=await env.PUBLIC_DB.prepare('SELECT status FROM points WHERE id=?').bind(m[1]).first();
        if(!before) return fail('Punto no encontrado.',404);
        await env.PUBLIC_DB.prepare('DELETE FROM points WHERE id=?').bind(m[1]).run();
        if(before.status==='approved') await broadcast(env);
        return send({ok:true});
      }
      if(url.pathname==='/api/admin/new-point'&&method==='POST'){
        const b=await request.json(), lat=Number(b.lat),lng=Number(b.lng);
        const title=typeof b.title==='string'?b.title.trim():'';
        const description=typeof b.description==='string'?b.description.trim():'';
        if(!isCoord(lat,lng)||title.length<3||title.length>90||description.length>300||!categories.has(b.category)) return fail('Datos inválidos.');
        const id=crypto.randomUUID();
        await env.PUBLIC_DB.prepare("INSERT INTO points(id,lat,lng,title,description,category,status) VALUES(?,?,?,?,?,?,'approved')")
          .bind(id,lat,lng,title,description,b.category).run();
        await broadcast(env);
        return send({ok:true,id},201);
      }
      return fail('Ruta no encontrada.',404);
    }catch(e){
      if(e?.message?.startsWith('Número')||e?.message?.startsWith('Se requiere un polígono')||e?.message?.startsWith('Polígono')||e?.message?.startsWith('Coordenadas')||e?.message?.startsWith('El contorno')||e?.message?.startsWith('El polígono')) return fail(e.message,400);
      if(String(e?.message||'').includes('UNIQUE constraint failed'))return fail('Ya existe un territorio con ese número.',409);
      return fail('No se pudo guardar. Revisa los datos e inténtalo otra vez.',500);
    }
  }
};
