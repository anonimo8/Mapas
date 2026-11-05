import { DurableObject } from 'cloudflare:workers';

const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff', ...headers }
});
const error = (message, status=400) => json({error:message}, status);
const isCoord = (lat,lng) => Number.isFinite(lat) && Number.isFinite(lng) && lat>=-18.5 && lat<=0 && lng>=-82.5 && lng<=-68;
const CATEGORIES = new Set(['referencia','acceso','servicio','otro']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    try {
      if (url.pathname === '/api/health' && method === 'GET') {
        if (!env.PUBLIC_DB) return json({ok:false, database:'Falta el binding PUBLIC_DB'},503);
        try {
          await env.PUBLIC_DB.prepare('SELECT id FROM territories LIMIT 1').first();
          await env.PUBLIC_DB.prepare('SELECT id FROM points LIMIT 1').first();
        } catch (_) {
          return json({ok:false, database:'Faltan tablas: ejecuta database/schema.sql en D1'},503);
        }
        return json({ok:true, database:'conectada', live:!!env.LIVE, contributions:!!(env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET)});
      }
      if (url.pathname === '/api/config' && method === 'GET') {
        return json({turnstileSiteKey: env.TURNSTILE_SITE_KEY || '', coverage: ['Lambayeque','Mochumí','Túcume','Íllimo','Pacora','Mórrope']});
      }
      if (url.pathname === '/api/data' && method === 'GET') {
        const [t,p] = await Promise.all([
          env.PUBLIC_DB.prepare('SELECT id,locality,number,geometry,updated_at FROM territories WHERE published=1 ORDER BY locality,number LIMIT 1000').all(),
          env.PUBLIC_DB.prepare("SELECT id,lat,lng,title,category,description,updated_at FROM points WHERE status='approved' ORDER BY created_at DESC LIMIT 1000").all()
        ]);
        return json({
          territories: (t.results||[]).map(x=>({...x,geometry:JSON.parse(x.geometry)})),
          points: p.results||[]
        });
      }
      if (url.pathname === '/api/live' && method === 'GET') {
        if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return error('Se requiere WebSocket.',426);
        return env.LIVE.getByName('mapa-publico').fetch(request);
      }
      if (url.pathname === '/api/geocode' && method === 'GET') {
        const q=(url.searchParams.get('q')||'').trim();
        if(q.length<4 || q.length>120) return error('La búsqueda debe contener entre 4 y 120 caracteres.');
        const inner = new Request(new URL('/geocode?q='+encodeURIComponent(q), url.origin),{headers:{'referer':url.origin+'/', 'x-app-name':'TerritoriosLambayeque'}});
        return env.LIVE.getByName('mapa-publico').fetch(inner);
      }
      if (url.pathname === '/api/proposals' && method === 'POST') {
        if (!env.TURNSTILE_SECRET || !env.TURNSTILE_SITE_KEY) return error('Aportes no habilitados: falta configurar Turnstile.',503);
        if (!(request.headers.get('content-type')||'').includes('application/json')) return error('Se requiere JSON.',415);
        if (Number(request.headers.get('content-length')||0)>10000) return error('Solicitud demasiado grande.',413);
        const body = await request.json();
        const lat=Number(body.lat),lng=Number(body.lng);
        const title=typeof body.title==='string' ? body.title.trim() : '';
        const description=typeof body.description==='string' ? body.description.trim() : '';
        if(!isCoord(lat,lng)) return error('Coordenadas fuera de Perú.');
        if(title.length<3 || title.length>90 || description.length>300 || !CATEGORIES.has(body.category)) return error('Datos no válidos.');
        if(!body.turnstileToken || typeof body.turnstileToken!=='string') return error('Se requiere verificación anti-bots.');
        const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
          method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:body.turnstileToken})
        });
        const validation=await verify.json();
        if(!validation.success) return error('Verificación anti-bots inválida o vencida.',403);
        if(env.EXPECTED_HOSTNAME && validation.hostname !== env.EXPECTED_HOSTNAME) return error('Dominio de verificación inválido.',403);
        const id=crypto.randomUUID();
        await env.PUBLIC_DB.prepare("INSERT INTO points(id,lat,lng,title,category,description,status) VALUES (?,?,?,?,?,?,'pending')")
          .bind(id,lat,lng,title,body.category,description).run();
        return json({ok:true,message:'Punto recibido. Quedará visible únicamente si el administrador lo aprueba.'},202);
      }
      if(url.pathname.startsWith('/api/')) return error('Ruta no encontrada.',404);
      return env.ASSETS.fetch(request);
    } catch (e) {
      // Nunca registrar solicitudes con direcciones o datos personales.
      return error('No se pudo completar la operación. Intenta nuevamente.',500);
    }
  }
};

export class TerritoryLive extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.queue = Promise.resolve();
  }
  async fetch(request){
    const url = new URL(request.url);
    if(url.pathname === '/api/live' && request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
      const pair=new WebSocketPair();
      const [client,server]=Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({type:'connected'}));
      return new Response(null,{status:101,webSocket:client});
    }
    if(url.pathname === '/broadcast' && request.method === 'POST') {
      const msg=JSON.stringify({type:'updated',at:Date.now()});
      for (const socket of this.ctx.getWebSockets()){
        try {socket.send(msg);} catch (_) {try{socket.close();}catch(__){}}
      }
      return json({ok:true});
    }
    if(url.pathname === '/geocode' && request.method === 'GET'){
      const query=(url.searchParams.get('q')||'').trim();
      if(query.length<4 || query.length>120) return error('Búsqueda inválida.');
      const key='geo:'+query.toLocaleLowerCase('es');
      const cached=await this.ctx.storage.get(key);
      if(cached && cached.expires > Date.now()) return json(cached.results);
      const job = this.queue.then(async()=>{
        const repeat=await this.ctx.storage.get(key);
        if(repeat && repeat.expires>Date.now()) return repeat.results;
        const last=await this.ctx.storage.get('geocoder-last')||0;
        const wait=Math.max(0,1250-(Date.now()-last));
        if(wait) await new Promise(r=>setTimeout(r,wait));
        await this.ctx.storage.put('geocoder-last',Date.now());
        const target=new URL('https://nominatim.openstreetmap.org/search');
        target.searchParams.set('q',query+' Perú');
        target.searchParams.set('format','jsonv2');
        target.searchParams.set('limit','6');
        target.searchParams.set('countrycodes','pe');
        target.searchParams.set('addressdetails','0');
        const response=await fetch(target.toString(),{headers:{
          'user-agent':'TerritoriosLambayequeMapa/1.0',
          'referer':request.headers.get('referer')||'https://territorios.example/',
          'accept':'application/json'
        }});
        if(!response.ok) throw new Error('Nominatim no disponible');
        const raw=await response.json();
        const results=(Array.isArray(raw)?raw:[]).slice(0,6).map(x=>({
          label:String(x.display_name||'').slice(0,180),
          lat:Number(x.lat),lng:Number(x.lon)
        })).filter(x=>isCoord(x.lat,x.lng));
        await this.ctx.storage.put(key,{expires:Date.now()+7*86400000,results});
        return results;
      });
      this.queue=job.catch(()=>{});
      try{return json(await job);}catch(_){return error('Buscador de direcciones temporalmente no disponible.',503);}
    }
    return error('No encontrado',404);
  }
  webSocketMessage(ws,message){
    // Los clientes solo reciben avisos de cambios. No pueden emitir cambios.
    if(typeof message==='string' && message==='ping') try{ws.send('pong');}catch(_){}
  }
  webSocketClose(ws,code,reason){try{ws.close(code,reason);}catch(_){}}
}
