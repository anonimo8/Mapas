/* Indicaciones dentro del mapa público. Ninguna coordenada se guarda ni se registra.
   Servicio de cálculo de rutas: Valhalla público / OpenStreetMap (uso razonable). */
const coordOK = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= -18.5 && lat <= 0 && lon >= -82.5 && lon <= -68;
const kmBetween = (a,b) => {
  const rad = Math.PI/180, dLat=(b.lat-a.lat)*rad, dLon=(b.lng-a.lng)*rad;
  const v=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
  return 6371 * 2 * Math.asin(Math.min(1,Math.sqrt(v)));
};

export async function buildPublicRoute(payload, fetcher=fetch) {
  const {start,end,mode}=payload||{};
  if(!start||!end||!['walking','driving'].includes(mode)) throw Object.assign(new Error('Elige el punto de partida, el destino y el tipo de recorrido.'),{status:400});
  const a={lat:start.lat,lng:start.lng}, b={lat:end.lat,lng:end.lng};
  if(typeof a.lat!=='number'||typeof a.lng!=='number'||typeof b.lat!=='number'||typeof b.lng!=='number'||
    !coordOK(a.lat,a.lng)||!coordOK(b.lat,b.lng)) throw Object.assign(new Error('El origen y el destino deben encontrarse en Perú.'),{status:400});
  const km=kmBetween(a,b);
  if(km>100)throw Object.assign(new Error('Solo se admiten recorridos de hasta 100 km en línea recta.'),{status:400});
  const requestBody={
    locations:[{lat:a.lat,lon:a.lng},{lat:b.lat,lon:b.lng}],
    costing:mode==='walking'?'pedestrian':'auto',
    units:'kilometers', language:'es-ES', directions_options:{language:'es-ES',units:'kilometers'}
  };
  let response;
  try{
    response=await fetcher('https://valhalla1.openstreetmap.de/route',{
      method:'POST',headers:{'content-type':'application/json','accept':'application/json',
        'x-client-id':'mapas.territorios.workers.dev', 'user-agent':'MapaTerritoriosLambayeque/1.0'},
      body:JSON.stringify(requestBody),signal:AbortSignal.timeout(14000)
    });
  }catch(_){throw Object.assign(new Error('El servicio de rutas no responde en este momento. Intenta otra vez.'),{status:503});}
  if(!response.ok) {
    const msg=response.status===429?'El servicio de rutas recibió demasiadas solicitudes. Intenta más tarde.':
      response.status>=500?'Servicio de rutas temporalmente no disponible.':'No se encontró una ruta transitable hasta ese destino.';
    throw Object.assign(new Error(msg),{status:response.status===429?429:503});
  }
  const raw=await response.text();
  if(raw.length>600000)throw Object.assign(new Error('La ruta recibida es demasiado larga.'),{status:502});
  let result;
  try{result=JSON.parse(raw);}catch(_){throw Object.assign(new Error('Respuesta de rutas no válida.'),{status:502});}
  const leg=result?.trip?.legs?.[0], summary=result?.trip?.summary;
  if(typeof leg?.shape!=='string'||!leg.shape.length||leg.shape.length>350000 ||
    !Number.isFinite(summary?.length)||!Number.isFinite(summary?.time)||summary.length<0||summary.time<0)
    throw Object.assign(new Error('No hay un camino válido para los puntos elegidos.'),{status:503});
  return {
    shape:leg.shape, distanceKm:summary.length, durationSeconds:summary.time,
    steps:(leg.maneuvers||[]).slice(0,65).map(m=>({
      text:String(m.instruction||'Continúa por la ruta').slice(0,220),
      lengthKm:Number.isFinite(m.length)?m.length:0
    })), mode, provider:'Valhalla · OpenStreetMap'
  };
}
