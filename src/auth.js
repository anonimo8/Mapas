// Seguridad del editor de la ÚNICA aplicación.
// El mapa público nunca necesita una sesión. Los endpoints /api/admin/* sí.
const encoder = new TextEncoder();
const COOKIE = 'territorios_admin';
const SESSION_MS = 8 * 60 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const js = (data, status=200, extra={}) => new Response(JSON.stringify(data), {
  status, headers: {'content-type':'application/json; charset=utf-8', 'cache-control':'no-store',
    'x-content-type-options':'nosniff', 'referrer-policy':'no-referrer', ...extra}
});
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode64 = (str) => {
  if(!/^[A-Za-z0-9_-]+$/.test(str) || str.length>1400) throw Error('token inválido');
  const s=atob(str.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-str.length%4)%4));
  return Uint8Array.from(s, c => c.charCodeAt(0));
};
const cookie = (request) => {
  const header=request.headers.get('cookie')||'';
  return header.split(';').map(p=>p.trim()).find(p=>p.startsWith(COOKIE+'='))?.slice(COOKIE.length+1) || '';
};
const sessionSecret = env => String(env.ADMIN_SESSION_SECRET||'');
const configured = env => Boolean(env.PRIVATE_DB && String(env.ADMIN_PASSWORD||'').length >= 12 && sessionSecret(env).length >= 32);
const keyFor = secret => crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
async function hmac(secret,bytes){return new Uint8Array(await crypto.subtle.sign('HMAC',await keyFor(secret),bytes));}
async function issueSession(env) {
  const body = b64url(encoder.encode(JSON.stringify({v:1,exp:Date.now()+SESSION_MS})));
  const sig = b64url(await hmac(sessionSecret(env),encoder.encode('v1.'+body)));
  return 'v1.' + body + '.' + sig;
}
export async function hasAdminSession(request,env){
  if(!configured(env)) return false;
  const token=cookie(request);
  if(token.length>1500) return false;
  const parts=token.split('.');
  if(parts.length!==3 || parts[0]!=='v1') return false;
  try {
    const obj=JSON.parse(new TextDecoder().decode(decode64(parts[1])));
    if(obj.v!==1||!Number.isSafeInteger(obj.exp)||obj.exp<Date.now()||obj.exp>Date.now()+SESSION_MS) return false;
    const signature=decode64(parts[2]);
    if(signature.length!==32) return false;
    return crypto.subtle.verify('HMAC',await keyFor(sessionSecret(env)),signature,encoder.encode('v1.'+parts[1]));
  } catch {return false;}
}
async function compareSecret(input,expected){
  const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(input)),crypto.subtle.digest('SHA-256',encoder.encode(expected))]);
  const x=new Uint8Array(a),y=new Uint8Array(b); let diff=0;
  for(let i=0;i<x.length;i++) diff|=x[i]^y[i];
  return diff===0;
}
async function ipKey(req,env){
  const ip=req.headers.get('cf-connecting-ip')||'unknown';
  const bytes=await hmac(sessionSecret(env),encoder.encode('login:'+ip));
  return b64url(bytes);
}
async function rateRecord(env,k){
  return env.PRIVATE_DB.prepare('SELECT failed,window_start FROM admin_login_limits WHERE k=?').bind(k).first();
}
async function addFailure(env,k,record,now){
  if(!record||now-Number(record.window_start)>=BLOCK_MS){
    await env.PRIVATE_DB.prepare('INSERT INTO admin_login_limits(k,failed,window_start) VALUES(?,1,?) ON CONFLICT(k) DO UPDATE SET failed=1,window_start=excluded.window_start').bind(k,now).run();
  }else{
    await env.PRIVATE_DB.prepare('UPDATE admin_login_limits SET failed=failed+1 WHERE k=?').bind(k).run();
  }
}
const originOK = req => req.headers.get('origin')===new URL(req.url).origin;
const authHeader={'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','x-frame-options':'DENY',
  'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'"};
const loginHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Editar territorios | Lambayeque</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font:15px system-ui,sans-serif;background:linear-gradient(145deg,#eef5ef,#fdfdfb);color:#183d32}.shell{max-width:440px;width:calc(100% - 28px);background:#fff;box-shadow:0 14px 45px #24463717;border:1px solid #e2e9e3;padding:34px;border-radius:22px}h1{font-size:27px;margin:0 0 8px}p{color:#607b6c;line-height:1.6}.mark{font-size:13px;color:#16835d;letter-spacing:.1em;font-weight:800;margin-bottom:20px}label{font-size:13px;font-weight:750;display:block;margin:26px 0 8px}input{display:block;width:100%;padding:14px;border:1px solid #bfcfc4;border-radius:10px;font:inherit}button{margin-top:17px;width:100%;border:0;border-radius:10px;background:#136d53;color:#fff;font:inherit;font-weight:750;padding:15px;cursor:pointer}button:disabled{opacity:.65}a{display:inline-block;margin-top:22px;color:#185c47;text-decoration:none;font-size:13px}small{color:#8a4a2c;display:block;min-height:20px;margin-top:12px;line-height:1.5}</style></head><body><main class="shell"><div class="mark">TERRITORIOS · LAMBAYEQUE</div><h1>Editar territorios</h1><p>El mapa es público. Para guardar puntos H/M y descargar fichas privadas, introduce la contraseña de edición.</p><form id="login"><label for="password">Contraseña de administración</label><input id="password" type="password" autocomplete="current-password" minlength="12" required autofocus><button id="submit" type="submit">Entrar al editor</button><small id="message" role="status"></small></form><a href="/">← Volver al mapa público</a></main><script>
document.getElementById('login').addEventListener('submit',async e=>{e.preventDefault();const b=document.getElementById('submit'),m=document.getElementById('message');b.disabled=true;m.textContent='Comprobando acceso…';try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:document.getElementById('password').value}),cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudo iniciar sesión.');const territory=new URLSearchParams(location.search).get('territorio');location.replace('/editar'+(territory&&/^[a-f0-9-]{36}$/i.test(territory)?'?territorio='+encodeURIComponent(territory):''));}catch(err){m.textContent=err.message;document.getElementById('password').value='';}finally{b.disabled=false;}});
</script></body></html>`;
export async function handleAuthRoute(request,env){
  const url=new URL(request.url),method=request.method,p=url.pathname;
  if(p==='/acceso'&&method==='GET'){
    if(!configured(env)) return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><h1>Falta configurar el editor</h1><p>Configura PRIVATE_DB, ADMIN_PASSWORD y ADMIN_SESSION_SECRET en Cloudflare. Revisa INSTALACION_UNICA.md.</p><a href="/">Volver al mapa</a></html>',{status:503,headers:authHeader});
    if(await hasAdminSession(request,env)) return Response.redirect(url.origin+'/editar'+(url.searchParams.has('territorio')?'?territorio='+encodeURIComponent(url.searchParams.get('territorio')):''),302);
    return new Response(loginHtml,{headers:authHeader});
  }
  if(p==='/api/auth/status'&&method==='GET')return js({authenticated:await hasAdminSession(request,env),configured:configured(env)});
  if(p==='/api/auth/logout'&&method==='POST'){
    if(!originOK(request))return js({error:'Origen no autorizado'},403);
    return js({ok:true},200,{'set-cookie':COOKIE+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'});
  }
  if(p==='/api/auth/login'&&method==='POST'){
    if(!originOK(request))return js({error:'Origen no autorizado'},403);
    if(!configured(env))return js({error:'Configura primero la base D1 privada y las dos variables secretas.'},503);
    if(!(request.headers.get('content-type')||'').includes('application/json'))return js({error:'Envía datos JSON.'},415);
    if(Number(request.headers.get('content-length')||0)>2000)return js({error:'Solicitud muy grande.'},413);
    let data;try{data=await request.json();}catch{return js({error:'Solicitud inválida.'},400);}
    const ip=await ipKey(request,env),now=Date.now();
    let record;try{record=await rateRecord(env,ip);}catch{return js({error:'La base D1 privada no tiene la tabla admin_login_limits. Ejecuta database/private_schema.sql.'},503);}
    if(record && now-Number(record.window_start)<BLOCK_MS && Number(record.failed)>=MAX_FAILURES)
      return js({error:'Demasiados intentos. Intenta más tarde.'},429,{'retry-after':'900'});
    const input=typeof data?.password==='string'?data.password:'';
    if(input.length<12||input.length>256||!await compareSecret(input,String(env.ADMIN_PASSWORD))){
      await addFailure(env,ip,record,now);
      return js({error:'Contraseña incorrecta.'},401);
    }
    await env.PRIVATE_DB.prepare('DELETE FROM admin_login_limits WHERE k=?').bind(ip).run();
    const token=await issueSession(env);
    return js({ok:true},200,{'set-cookie':COOKIE+'='+token+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age='+Math.floor(SESSION_MS/1000)});
  }
  if(p.startsWith('/api/auth/'))return js({error:'Ruta no encontrada.'},404);
  return null;
}
