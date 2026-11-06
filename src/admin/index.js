// Editor en la misma aplicación; se invoca únicamente tras validar la sesión del administrador.
import { ADMIN_HTML } from './admin-page.js';
import { TERRITORY_REFERENCE_SEEDS } from './reference-territories.js';
import { EXPORT_PDF_JS } from './export-pdf.js';
import { normalizePrivatePoint, validatePrivateAssignment, pointInPolygon, isUUID } from './private-points.js';
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
  return {number,locality,geometry:JSON.stringify({type:'Polygon',coordinates:[ring]}),published};
}
// Reparar un formato generado por versiones previas: GeoJSON Polygon
// necesita `coordinates: [anillo]`, pero se guardó `coordinates: anillo`.
// Solo cambiamos registros que coincidan exactamente con ese fallo.
function repairLegacyPolygon(raw){
  let old;
  try{old=JSON.parse(raw);}catch(_){return null;}
  if(old?.type!=='Polygon'||!Array.isArray(old.coordinates)||!Array.isArray(old.coordinates[0]))return null;
  const first=old.coordinates[0];
  // Formato incorrecto: cada coordenada es un par [longitud,latitud].
  if(first.length!==2||!first.every(Number.isFinite))return null;
  try{
    return normalizeTerritory({number:1,locality:'Lambayeque',geometry:{type:'Polygon',coordinates:[old.coordinates]},published:false}).geometry;
  }catch(_){return null;}
}
async function repairLegacyTerritories(env){
  const rows=await env.PUBLIC_DB.prepare('SELECT id,geometry,published FROM territories LIMIT 2000').all();
  let repaired=0, publishedRepaired=false;
  for(const t of rows.results||[]){
    const geometry=repairLegacyPolygon(t.geometry);
    if(!geometry)continue;
    await env.PUBLIC_DB.prepare('UPDATE territories SET geometry=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .bind(geometry,t.id).run();
    repaired++;
    if(t.published)publishedRepaired=true;
  }
  if(publishedRepaired)await broadcast(env);
  return repaired;
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
  'content-security-policy':"default-src 'none'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com data: blob:; connect-src 'self' https://tile.openstreetmap.org https://*.tile.openstreetmap.org; font-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};
export default {
  async fetch(request,env,ctx){
    // La verificación de la sesión ocurre antes de entrar aquí, en src/index.js.
    const url=new URL(request.url), method=request.method;
    if(['POST','PUT','PATCH','DELETE'].includes(method)){
      if(request.headers.get('origin')!==url.origin) return fail('Origen no autorizado.',403);
      if(method!=='DELETE' && !(request.headers.get('content-type')||'').includes('application/json')) return fail('Se requiere JSON.',415);
      if(Number(request.headers.get('content-length')||0)>220000) return fail('Solicitud demasiado grande.',413);
    }
    try{
      if(method==='GET'&&(url.pathname==='/editar'||url.pathname==='/admin')) return new Response(ADMIN_HTML,{headers:adminHeaders});
      if(method==='GET' && url.pathname==='/private-export.js') return new Response(EXPORT_PDF_JS,{headers:{
        'content-type':'application/javascript; charset=utf-8','cache-control':'private, no-store',
        'x-content-type-options':'nosniff','referrer-policy':'no-referrer'
      }});
      if(url.pathname==='/api/admin/private/points' && method==='GET'){
        if(!env.PRIVATE_DB) return fail('Falta conectar PRIVATE_DB al Worker privado.',503);
        const result=await env.PRIVATE_DB.prepare('SELECT id,territory_id,lat,lng,sex,note,created_at,updated_at FROM private_person_points ORDER BY created_at ASC LIMIT 2000').all();
        return send({points:result.results||[]});
      }
      if(url.pathname==='/api/admin/private/points' && method==='POST'){
        if(!env.PRIVATE_DB) return fail('Falta conectar PRIVATE_DB.',503);
        let point;
        try{point=normalizePrivatePoint(await request.json());await validatePrivateAssignment(env,point);}
        catch(e){return fail(e.message, e.message.includes('seis puntos')?409:400);}
        const id=crypto.randomUUID();
        await env.PRIVATE_DB.prepare('INSERT INTO private_person_points(id,territory_id,lat,lng,sex,note) VALUES(?,?,?,?,?,?)')
          .bind(id,point.territoryId,point.lat,point.lng,point.sex,point.note).run();
        // Deliberadamente NO se emite evento público. Nada confidencial va a PUBLIC_DB.
        return send({ok:true,id},201);
      }
      let priv=url.pathname.match(/^\/api\/admin\/private\/points\/([^/]+)$/);
      if(priv && isUUID(priv[1]) && method==='PUT'){
        if(!env.PRIVATE_DB) return fail('Falta conectar PRIVATE_DB.',503);
        let point;
        try{point=normalizePrivatePoint(await request.json());await validatePrivateAssignment(env,point,priv[1]);}
        catch(e){return fail(e.message, e.message.includes('seis puntos')?409:400);}
        const existing=await env.PRIVATE_DB.prepare('SELECT id FROM private_person_points WHERE id=?').bind(priv[1]).first();
        if(!existing)return fail('Punto privado no encontrado.',404);
        await env.PRIVATE_DB.prepare('UPDATE private_person_points SET territory_id=?,lat=?,lng=?,sex=?,note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .bind(point.territoryId,point.lat,point.lng,point.sex,point.note,priv[1]).run();
        return send({ok:true});
      }
      if(priv && isUUID(priv[1]) && method==='DELETE'){
        if(!env.PRIVATE_DB) return fail('Falta conectar PRIVATE_DB.',503);
        await env.PRIVATE_DB.prepare('DELETE FROM private_person_points WHERE id=?').bind(priv[1]).run();
        return send({ok:true});
      }

      // Importar referencias geograficas preliminares de las 11 paginas.
      // Solo ejecutable tras autenticar en src/index.js (no existe ruta publica).
      if(url.pathname==='/api/admin/import-lambayeque-11' && method==='POST'){
        if(!env.PUBLIC_DB)return fail('Falta PUBLIC_DB.',503);
        let created=0,existing=0;
        for(const t of TERRITORY_REFERENCE_SEEDS){
          // Respetar cualquier numero existente: no editar ni borrar trabajo del usuario.
          const old=await env.PUBLIC_DB.prepare('SELECT id FROM territories WHERE number=?').bind(t.number).first();
          if(old){existing++;continue;}
          const value=normalizeTerritory(t);
          await env.PUBLIC_DB.prepare('INSERT INTO territories(id,locality,number,geometry,published) VALUES(?,?,?,?,0)')
            .bind(t.id,value.locality,value.number,value.geometry).run();
          created++;
        }
        const repaired=await repairLegacyTerritories(env);
        return send({ok:true,created,existing,repaired,warning:'Se corrigió el formato GeoJSON de los contornos antiguos. Los límites siguen siendo borradores aproximados: revísalos antes de publicarlos.'});
      }
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
        // La edición del contorno no debe dejar puntos privados vinculados fuera.
        if(env.PRIVATE_DB){
          const linked=await env.PRIVATE_DB.prepare('SELECT lat,lng FROM private_person_points WHERE territory_id=?').bind(m[1]).all();
          const newGeometry=JSON.parse(x.geometry);
          if((linked.results||[]).some(p=>!pointInPolygon(p.lng,p.lat,newGeometry)))
            return fail('El nuevo contorno deja puntos privados fuera. Reasigna esos puntos antes de guardar la nueva división.',409);
        }
        await env.PUBLIC_DB.prepare('UPDATE territories SET locality=?,number=?,geometry=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .bind(x.locality,x.number,x.geometry,x.published,m[1]).run();
        if(x.published||before.published) await broadcast(env);
        return send({ok:true});
      }
      if(m&&UUID.test(m[1])&&method==='DELETE'){
        const before=await env.PUBLIC_DB.prepare('SELECT published FROM territories WHERE id=?').bind(m[1]).first();
        if(!before) return fail('Territorio no encontrado.',404);
        // La asociación confidencial es SOLO administrativa y no se copia a PUBLIC_DB.
        // Se conservan las ubicaciones privadas, pero quedan sin territorio al borrar su polígono.
        if(env.PRIVATE_DB) await env.PRIVATE_DB.prepare('UPDATE private_person_points SET territory_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE territory_id=?').bind(m[1]).run();
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
