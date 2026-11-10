/* Mapa público: territorios, búsqueda, GPS y navegación integrada con Leaflet.
   Coordenadas GPS sólo solicitadas con permiso y para rutas a petición. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const searchPanel=document.querySelector('.search-panel');
const map=L.map('map',{zoomControl:false,preferCanvas:true,scrollWheelZoom:true})
  .setView([-6.704,-79.908],14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
L.control.zoom({position:'bottomright',zoomInTitle:'Acercar mapa',zoomOutTitle:'Alejar mapa'}).addTo(map);
// R7.2: mantener legible el recuento H/M/Total al acercar el mapa.
// Sólo cambia el tamaño de las etiquetas; no altera puntos ni cálculos.
function resizeTerritoryStats(){
  const zoom=map.getZoom();
  const fontSize=Math.max(12,Math.min(18,12+(zoom-14)*1.2));
  map.getContainer().style.setProperty('--territory-stats-font-size',`${fontSize.toFixed(1)}px`);
}
map.on('zoomend',resizeTerritoryStats);
resizeTerritoryStats();
const shapes=L.featureGroup().addTo(map);
const destinationMarkers=L.featureGroup().addTo(map);
const routeLayers=L.featureGroup().addTo(map);
const colorFor=window.TerritoryPalette.territoryColor;
let territories=[],territorySource='';
let counts=new Map(),statsAvailable=false,initialFit=false,lastSignature='';
let currentLocation=null,userMarker=null,accuracyCircle=null,destination=null;
let lastSearchId=0,originSearchId=0;
let routeOrigin=null,routeOriginSource=null,choosingStart=false,routeAbort=null,routeRequestId=0,gpsRouteRequestId=0;
const numberFormat=new Intl.NumberFormat('es-PE');
const validCoordinate=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-18.5&&lat<=0&&lng>=-82.5&&lng<=-68;
const validTerritory=t=>t&&Number.isSafeInteger(Number(t.number))&&t.geometry&&
  ['Polygon','MultiPolygon'].includes(t.geometry.type)&&Array.isArray(t.geometry.coordinates);
function message(text,error=false){const el=$('searchStatus');el.textContent=text||'';el.hidden=!text;el.classList.toggle('is-error',error);}
function notice(text){$('mapNotice').textContent=text;$('mapNotice').hidden=!text;}
function sourceNotice(){
  if(!territories.length)notice('No hay contornos disponibles. Consulta con el administrador.');
  else if(territorySource==='reference')notice('Contornos de referencia aproximados y sin verificar. Confirma los límites antes de navegar.');
  else if(territorySource==='review')notice('Divisiones preliminares sin publicar: navegación orientativa.');
  else notice('');
}
function normalizedStats(t){
  if(territorySource!=='published'||!statsAvailable)return {men:null,women:null};
  return counts.get(String(t.id))||{men:null,women:null};
}
function displayCount(value){return Number.isSafeInteger(value)&&value>=0?numberFormat.format(value):'—';}
function statsText(t){const s=normalizedStats(t);const total=Number.isSafeInteger(s.men)&&Number.isSafeInteger(s.women)?s.men+s.women:null;
  return `H ${displayCount(s.men)} · M ${displayCount(s.women)} · Total ${displayCount(total)}`;
}
function updateSelectedStats(){
  if(!destination?.territoryId)return;
  const selected=territories.find(t=>String(t.id)===destination.territoryId);
  if(!selected)return;
  const s=normalizedStats(selected);
  $('destinationHint').textContent=`${statsText(selected)} · Ruta aproximada al centro del territorio`;
  $('destinationMen').textContent=displayCount(s.men);
  $('destinationWomen').textContent=displayCount(s.women);
  $('destinationTotal').textContent=displayCount(Number.isSafeInteger(s.men)&&Number.isSafeInteger(s.women)?s.men+s.women:null);
}
function render(){
  const visible=territories.filter(validTerritory);
  const signature=JSON.stringify([territorySource,visible.map(t=>[t.id,t.number,t.geometry,normalizedStats(t)])]);
  if(signature===lastSignature){sourceNotice();return;}
  lastSignature=signature;
  const previousBounds=shapes.getLayers().length?shapes.getBounds():null;
  shapes.clearLayers();
  for(const t of visible){
    const color=colorFor(t);
    const geo=L.geoJSON({type:'Feature',properties:{},geometry:t.geometry},{
      style:{color,weight:2,opacity:.82,fillColor:color,fillOpacity:.13,lineCap:'round',lineJoin:'round'},
      onEachFeature(_feature,polygon){
        const badge=document.createElement('span');badge.className='territory-label';badge.textContent=String(t.number);
        badge.style.setProperty('--territory-color',color);
        polygon.bindTooltip(badge,{permanent:true,direction:'center',className:'territory-tooltip',opacity:1,interactive:false});
        polygon.on('click',()=>{if(!choosingStart)selectTerritory(t,polygon);});
      }
    });
    geo.addTo(shapes);
    // Pequeño recuento H/M en una esquina interior aproximada del rectángulo.
    const bounds=geo.getBounds();
    if(bounds.isValid()){
      const ne=bounds.getNorthEast(),sw=bounds.getSouthWest();
      const badgeLat=ne.lat-(ne.lat-sw.lat)*.085;
      const badgeLng=ne.lng-(ne.lng-sw.lng)*.09;
      const safe=normalizedStats(t);
      const total=Number.isSafeInteger(safe.men)&&Number.isSafeInteger(safe.women)?safe.men+safe.women:null;
      const icon=L.divIcon({className:'territory-stats-icon',iconSize:[220,36],iconAnchor:[220,0],
        html:`<span class="territory-stats" style="--territory-color:${color}" title="Hombres, mujeres y total dentro del territorio"><span><b>H</b> ${displayCount(safe.men)}</span><span><b>M</b> ${displayCount(safe.women)}</span><span><b>Total</b> ${displayCount(total)}</span></span>`});
      L.marker([badgeLat,badgeLng],{icon,interactive:false,keyboard:false}).addTo(shapes);
    }
  }
  sourceNotice();
  updateSelectedStats();
  if(visible.length&&!initialFit){
    initialFit=true;
    map.fitBounds(shapes.getBounds(),{paddingTopLeft:[25,95],paddingBottomRight:[25,25],maxZoom:15,animate:false});
  }else if(previousBounds && territorySource==='published' && !previousBounds.equals(shapes.getBounds()) && !destination){
    // No recentrar al actualizar estadísticas ni interrumpir el GPS o la búsqueda.
  }
}
function stopRouteRequest(){
  routeRequestId++;
  if(routeAbort){routeAbort.abort();routeAbort=null;}
  $('routeButton').disabled=false;
}
function setRouteExpanded(expanded){
  $('routePanel').classList.toggle('is-expanded',expanded);
  $('routeMore').hidden=!expanded;
  $('toggleRouteDetails').setAttribute('aria-expanded',String(expanded));
  $('toggleRouteDetails').textContent=expanded?'Ocultar':'Detalles';
  document.querySelector('.public-map').classList.toggle('route-expanded',expanded);
}
function setRouteReady(ready){
  $('routePanel').classList.toggle('is-ready',ready);
  document.querySelector('.public-map').classList.toggle('route-visible',ready);
  if(!ready)setRouteExpanded(false);
}
function clearRouteDrawing(){
  stopRouteRequest();routeLayers.clearLayers();
  $('routeDetails').hidden=true;
  setRouteReady(false);
  $('routeSteps').replaceChildren();
}
function routeStatus(text,isError=false){
  const status=$('routeStatus');status.textContent=text;status.classList.toggle('is-error',isError);
}
function closeRoutePlanner(){
  gpsRouteRequestId++;originSearchId++;
  choosingStart=false;$('routePick').classList.remove('is-active');
  clearRouteDrawing();$('routePanel').hidden=true;searchPanel.classList.remove('is-routing');
  $('routeOriginFallback').hidden=true;$('routeOriginResults').hidden=true;$('retryRoute').hidden=true;
}
function manualOriginPrompt(reason){
  $('routeOriginFallback').hidden=false;
  $('retryRoute').hidden=true;
  routeStatus(reason,true);
}
function setOrigin(lat,lng,source,label){
  if(!validCoordinate(lat,lng)){manualOriginPrompt('El punto de partida está fuera del área cubierta. Prueba con otro lugar.');return;}
  gpsRouteRequestId++;originSearchId++;
  choosingStart=false;$('routePick').classList.remove('is-active');
  routeOrigin={lat,lng};routeOriginSource=source;
  $('routeOriginFallback').hidden=true;$('routeOriginResults').hidden=true;$('retryRoute').hidden=true;
  routeStatus(`Salida: ${label}. Calculando recorrido…`);
  void calculateRoute();
}
function routePolyline6(encoded){
  // Valhalla codifica la geometría de la ruta como polyline con precisión 1e-6.
  let idx=0,lat=0,lng=0;const points=[];
  while(idx<encoded.length&&points.length<20000){
    const values=[];
    for(let k=0;k<2;k++){
      let result=0,shift=0,byte;
      do{
        if(idx>=encoded.length||shift>30)throw Error('Geometría incompleta.');
        byte=encoded.charCodeAt(idx++)-63;
        if(byte<0||byte>63)throw Error('Geometría inválida.');
        result|=(byte&31)<<shift;shift+=5;
      }while(byte>=32);
      values.push((result&1)?~(result>>1):(result>>1));
    }
    lat+=values[0];lng+=values[1];
    const x=lat/1e6,y=lng/1e6;
    if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>90||Math.abs(y)>180)throw Error('Coordenadas de ruta inválidas.');
    points.push([x,y]);
  }
  if(idx!==encoded.length||points.length<2)throw Error('La geometría de la ruta no se pudo dibujar.');
  return points;
}
function niceKm(km){return km<1?`${Math.round(km*1000)} m`:`${km.toLocaleString('es-PE',{maximumFractionDigits:1})} km`;}
function niceTime(seconds){
  const m=Math.max(1,Math.ceil(seconds/60));return m>=60?`${Math.floor(m/60)} h ${m%60?`${m%60} min`:''}`.trim():`${m} min`;
}
async function calculateRoute(){
  if(!destination||!routeOrigin){routeStatus('Primero elige tu ubicación o el punto de partida.');return;}
  clearRouteDrawing();const id=++routeRequestId;
  const abort=new AbortController();routeAbort=abort;
  const mode=$('routeMode').value;
  $('routeButton').disabled=true;
  $('retryRoute').hidden=true;
  routeStatus(`Calculando recorrido ${mode==='walking'?'a pie':'en auto'}…`);
  try{
    const response=await fetch('/api/route',{
      method:'POST',cache:'no-store',signal:abort.signal,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({start:routeOrigin,end:{lat:destination.lat,lng:destination.lng},mode})
    });
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'No se encontró una ruta para estos puntos.');
    const points=routePolyline6(data.shape);
    if(id!==routeRequestId)return;
    const line=L.polyline(points,{color:'#1680c6',weight:6,opacity:.95,lineCap:'round',lineJoin:'round'}).addTo(routeLayers);
    L.circleMarker([routeOrigin.lat,routeOrigin.lng],{radius:7,color:'#fff',weight:2,fillColor:'#1680c6',fillOpacity:1})
      .bindTooltip('Inicio de recorrido').addTo(routeLayers);
    L.circleMarker([destination.lat,destination.lng],{radius:7,color:'#fff',weight:2,fillColor:'#1e754c',fillOpacity:1})
      .bindTooltip(destination.title).addTo(routeLayers);
    const mobile=window.matchMedia('(max-width:600px)').matches;
    map.fitBounds(line.getBounds(),{paddingTopLeft:mobile?[20,165]:[30,150],
      paddingBottomRight:mobile?[20,112]:[30,180],maxZoom:17});
    $('routeDistance').textContent=niceKm(data.distanceKm);
    $('routeDuration').textContent=`≈ ${niceTime(data.durationSeconds)} · ${mode==='walking'?'A pie':'En auto'}`;
    const steps=$('routeSteps');steps.replaceChildren();
    for(const step of (Array.isArray(data.steps)?data.steps:[])){
      const li=document.createElement('li');
      const detail=document.createElement('span');detail.textContent=step.text;
      const km=document.createElement('small');km.textContent=step.lengthKm>0?niceKm(step.lengthKm):'';
      li.append(detail,km);steps.append(li);
    }
    $('routeOriginFallback').hidden=true;
    $('routeDetails').hidden=false;
    $('routeApproxNote').hidden=!destination.isApproximate;
    setRouteExpanded(false);
    setRouteReady(true);
    routeStatus(destination.isApproximate?
      'Ruta lista. El destino señala un punto aproximado del territorio.':'Ruta lista desde tu punto de partida hasta el destino.');
  }catch(err){
    if(id!==routeRequestId||err.name==='AbortError')return;
    $('retryRoute').hidden=false;
    routeStatus(err.message||'No se pudo calcular la ruta. Inténtalo de nuevo.',true);
  }finally{
    if(id===routeRequestId){routeAbort=null;$('routeButton').disabled=false;}
  }
}
$('routeButton').addEventListener('click',()=>{
  if(!destination)return;
  // Un único botón: pedir GPS y trazar directamente; no mostrar un menú de opciones.
  closeRoutePlanner();
  routeOrigin=null;routeOriginSource=null;
  $('routeMode').value='walking';
  $('routeStepsDisclosure').open=false;$('routeOptions').open=false;
  $('routePanel').hidden=false;searchPanel.classList.add('is-routing');
  routeStatus('Buscando tu ubicación para crear la ruta…');
  requestGPS(true);
});
$('closeRoute').addEventListener('click',closeRoutePlanner);
$('closeRouteCompact').addEventListener('click',closeRoutePlanner);
$('toggleRouteDetails').addEventListener('click',()=>{
  setRouteExpanded(!$('routePanel').classList.contains('is-expanded'));
});
$('retryRoute').addEventListener('click',()=>{if(routeOrigin&&destination)void calculateRoute();});
$('clearRoute').addEventListener('click',()=>{
  clearRouteDrawing();
  routeStatus('Recorrido quitado. Puedes indicar otro punto de partida.');
  $('routeOriginFallback').hidden=false;
});
$('changeOrigin').addEventListener('click',()=>{
  gpsRouteRequestId++;
  clearRouteDrawing();routeOrigin=null;routeOriginSource=null;
  $('routeOptions').open=false;
  $('routeOriginFallback').hidden=false;
  routeStatus('Escribe un nuevo lugar de partida o vuelve a utilizar el GPS.');
});
$('routeMode').addEventListener('change',()=>{if(routeOrigin&&destination)void calculateRoute();});
$('routePick').addEventListener('click',()=>{
  gpsRouteRequestId++;
  choosingStart=!choosingStart;$('routePick').classList.toggle('is-active',choosingStart);
  routeStatus(choosingStart?'Toca en el mapa tu punto de partida.':'Selección en el mapa cancelada.');
});
map.on('click',e=>{
  if(!choosingStart)return;
  setOrigin(e.latlng.lat,e.latlng.lng,'mapa','punto marcado en el mapa');
});
$('routeGPS').addEventListener('click',()=>requestGPS(true));
$('routeOriginForm').addEventListener('submit',async e=>{
  e.preventDefault();const q=$('routeOriginInput').value.trim();
  if(q.length<4){routeStatus('Escribe una dirección de partida de al menos cuatro caracteres.',true);return;}
  const list=$('routeOriginResults');list.replaceChildren();list.hidden=true;
  const destinationAtSearch=destination,searchId=++originSearchId;
  routeStatus('Buscando puntos de partida…');
  try{
    const response=await fetch(`/api/geocode?q=${encodeURIComponent(q)}`,{cache:'no-store'});
    const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo consultar la dirección.');
    if(searchId!==originSearchId||destinationAtSearch!==destination||$('routePanel').hidden)return;
    if(!Array.isArray(data)||!data.length)throw Error('Dirección de partida no encontrada. Intenta con otra calle.');
    for(const place of data.filter(v=>validCoordinate(Number(v.lat),Number(v.lng))).slice(0,5)){
      const btn=document.createElement('button');btn.type='button';
      btn.textContent=String(place.label||'Dirección encontrada').slice(0,145);
      btn.addEventListener('click',()=>{list.hidden=true;setOrigin(Number(place.lat),Number(place.lng),'address',String(place.label||'dirección elegida').split(',').slice(0,2).join(','));});
      list.append(btn);
    }
    if(!list.children.length)throw Error('No hay coordenadas válidas para esa dirección.');
    list.hidden=false;routeStatus('Elige la dirección donde iniciarás el recorrido.');
  }catch(err){if(searchId===originSearchId)routeStatus(err.message||'No se encontró el origen.',true);}
});
function showDestination(lat,lng,title,hint,isApproximate=false,territoryId=null){
  if(!validCoordinate(lat,lng)){message('No se pudo determinar un destino válido.',true);return;}
  // Una nueva selección anula la ruta y las solicitudes de GPS anteriores.
  closeRoutePlanner();
  routeOrigin=null;routeOriginSource=null;
  destination={lat,lng,title,isApproximate,territoryId:territoryId==null?null:String(territoryId)};
  $('destinationTitle').textContent=title;
  $('destinationMobileName').textContent=title.startsWith('Territorio #')?title.replace(/^Territorio\s*/, ''):title;
  $('destinationHint').textContent=hint;
  $('destinationDetails').hidden=!territoryId;
  $('destinationDetails').open=false;
  $('destinationPanel').hidden=false;
  updateSelectedStats();
}
function selectTerritory(t,polygon){
  const center=polygon.getBounds().getCenter();
  if(!validCoordinate(center.lat,center.lng))return;
  showDestination(center.lat,center.lng,`Territorio #${t.number} · ${t.locality||'Lambayeque'}`,
    `${statsText(t)} · Ruta aproximada al centro del territorio`,true,t.id);
  message('Territorio seleccionado.');
}
function clearDestination(){
  closeRoutePlanner();destination=null;routeOrigin=null;routeOriginSource=null;
  destinationMarkers.clearLayers();$('destinationPanel').hidden=true;
}
$('clearDestination').addEventListener('click',()=>{clearDestination();message('');});
function zoomToTerritory(t){
  const found=shapes.getLayers().filter(l=>l instanceof L.GeoJSON).flatMap(l=>l.getLayers()).find(l=>{
    // Identificar por pertenencia al polígono original (geometría es la misma en GeoJSON).
    return JSON.stringify(l.feature?.geometry)===JSON.stringify(t.geometry);
  });
  const layer=found||L.geoJSON({type:'Feature',geometry:t.geometry,properties:{}});
  if(layer.getBounds().isValid())map.fitBounds(layer.getBounds(),{paddingTopLeft:[40,145],paddingBottomRight:[40,75],maxZoom:17,animate:true});
  const center=layer.getBounds().getCenter();
  showDestination(center.lat,center.lng,`Territorio #${t.number} · ${t.locality||'Lambayeque'}`,
    `${statsText(t)} · Ruta aproximada al centro del territorio`,true,t.id);
}
function showResultButtons(results,makeLabel,onSelect){
  const list=$('searchResults');list.replaceChildren();
  for(const value of results){
    const btn=document.createElement('button');btn.type='button';btn.className='search-result';
    const labels=makeLabel(value);
    const strong=document.createElement('strong');strong.textContent=labels.title;
    const small=document.createElement('small');small.textContent=labels.subtitle;
    btn.append(strong,small);btn.addEventListener('click',()=>{
      onSelect(value);list.hidden=true;message('Destino seleccionado. Puedes consultar cómo llegar.');
    });list.append(btn);
  }
  list.hidden=!results.length;
}
const territoryQuery=q=>{
  const normalized=q.toLowerCase().replace(/^territorio\s*#?\s*/,'').replace(/^t\s*-?\s*/,'').replace(/^#/,'').trim();
  return territories.filter(t=>String(t.number)===normalized ||
    (normalized.length>=2&&(`${t.number} ${t.locality||''}`).toLowerCase().includes(normalized)))
    .sort((a,b)=>Number(a.number)-Number(b.number)).slice(0,12);
};
$('searchType').addEventListener('change',()=>{
  if(destination)clearDestination();
  const address=$('searchType').value==='address';
  $('searchInput').placeholder=address?'Calle, número, urbanización…':'Ej. territorio 4';
  $('searchInput').inputMode=address?'text':'numeric';
  $('searchResults').hidden=true;message('');
});
$('searchInput').addEventListener('input',()=>{lastSearchId++;if(destination)clearDestination();message('');$('searchResults').hidden=true;});
$('mapSearch').addEventListener('submit',async event=>{
  event.preventDefault();const q=$('searchInput').value.trim();
  $('searchResults').hidden=true;const searchId=++lastSearchId;
  if($('searchType').value==='territory'){
    if(!q){message('Escribe un número de territorio.',true);return;}
    const hits=territoryQuery(q);
    if(!hits.length){message('No se encontró ese territorio en el mapa.',true);return;}
    if(hits.length===1){zoomToTerritory(hits[0]);message(`Territorio #${hits[0].number} encontrado.`);return;}
    showResultButtons(hits,t=>({title:`Territorio #${t.number}`,subtitle:t.locality||'Lambayeque'}),zoomToTerritory);
    message(`${hits.length} territorios encontrados. Selecciona uno.`);return;
  }
  if(q.length<4||q.length>120){message('Escribe una dirección de al menos 4 caracteres.',true);return;}
  message('Buscando direcciones…');
  try{
    const response=await fetch(`/api/geocode?q=${encodeURIComponent(q)}`,{cache:'no-store'});
    const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo buscar la dirección.');
    if(lastSearchId!==searchId)return;
    if(!Array.isArray(data)||!data.length){message('No hay coincidencias. Prueba con calle, número y distrito.',true);return;}
    const found=data.filter(p=>validCoordinate(Number(p.lat),Number(p.lng))).slice(0,6);
    showResultButtons(found,p=>({title:String(p.label||'Ubicación encontrada').split(',').slice(0,2).join(','),subtitle:String(p.label||'')}),p=>{
      const lat=Number(p.lat),lng=Number(p.lng);
      destinationMarkers.clearLayers();
      L.marker([lat,lng],{icon:L.divIcon({className:'search-pin',html:'<span aria-hidden="true">📍</span>',iconSize:[30,35],iconAnchor:[14,30]})}).addTo(destinationMarkers);
      map.setView([lat,lng],17,{animate:true});
      showDestination(lat,lng,String(p.label||'Dirección encontrada').split(',').slice(0,3).join(','),'Dirección encontrada · comprueba el número antes de ir');
    });
    message(`${found.length} coincidencia${found.length===1?'':'s'}. Comprueba la dirección y elige una.`);
  }catch(err){if(lastSearchId===searchId)message(err.message||'El buscador no está disponible temporalmente.',true);}
});
function requestGPS(asRouteOrigin=false){
  const requestId=asRouteOrigin?++gpsRouteRequestId:null;
  const active=()=>!asRouteOrigin||(requestId===gpsRouteRequestId&&!$('routePanel').hidden&&!!destination);
  const errorInfo=text=>{
    if(!active())return;
    if(asRouteOrigin)manualOriginPrompt(text);
    else message(text,true);
  };
  if(!navigator.geolocation){errorInfo('No se puede acceder al GPS. Ingresa tu lugar de partida.');return;}
  if(!window.isSecureContext){errorInfo('El GPS requiere HTTPS. Ingresa tu lugar de partida.');return;}
  const btn=asRouteOrigin?$('routeGPS'):$('locateButton');
  btn.disabled=true;
  if(asRouteOrigin)routeStatus('Permite la ubicación del dispositivo para dibujar la ruta automáticamente…');
  else message('Solicitando permiso para conocer tu ubicación…');
  navigator.geolocation.getCurrentPosition(pos=>{
    btn.disabled=false;
    if(!active())return;
    const lat=Number(pos.coords.latitude),lng=Number(pos.coords.longitude);
    if(!validCoordinate(lat,lng)){
      errorInfo('La ubicación está fuera del área admitida. Escribe un lugar de partida.');return;
    }
    currentLocation={lat,lng};
    if(userMarker)map.removeLayer(userMarker);
    if(accuracyCircle)map.removeLayer(accuracyCircle);
    const accuracy=Number(pos.coords.accuracy);
    userMarker=L.marker([lat,lng],{
      icon:L.divIcon({className:'location-icon',html:'<div class="location-dot"></div>',iconSize:[20,20],iconAnchor:[10,10]}),
      title:'Mi ubicación GPS',zIndexOffset:1200
    }).addTo(map);
    if(Number.isFinite(accuracy)&&accuracy>0){accuracyCircle=L.circle([lat,lng],{radius:accuracy,color:'#3289bb',fillColor:'#57b7eb',fillOpacity:.12,weight:1}).addTo(map);}
    if(asRouteOrigin){setOrigin(lat,lng,'gps',`tu ubicación (±${Math.round(accuracy||0)} m)`);}
    else {map.setView([lat,lng],Math.max(map.getZoom(),16),{animate:true});message(Number.isFinite(accuracy)&&accuracy>0?
      `Ubicación detectada (precisión estimada: ±${Math.round(accuracy)} m).`:'Ubicación detectada.');}
  },err=>{
    btn.disabled=false;
    const txt=err.code===1?'Ubicación desactivada o permiso denegado. Ingresa tu lugar de partida.':
      err.code===3?'No se detectó tu ubicación a tiempo. Ingresa tu lugar de partida o reintenta GPS.':
      'No se pudo detectar tu ubicación. Ingresa tu lugar de partida.';
    errorInfo(txt);
  },{enableHighAccuracy:true,timeout:18000,maximumAge:12000});
}
$('locateButton').addEventListener('click',()=>requestGPS(false));
async function loadTerritories(){
  try{
    const response=await fetch('/api/data',{cache:'no-store'});
    if(!response.ok)throw Error('Sin respuesta');
    const data=await response.json();
    const next=Array.isArray(data.territories)?data.territories:[];
    const src=data.territorySource||'published';
    const sourceChanged=src!==territorySource;
    territories=next;territorySource=src;
    if(sourceChanged){counts=new Map();statsAvailable=false;}
    render();
  }catch(_){if(!initialFit)notice('El mapa no está disponible temporalmente.');}
}
async function loadCounts(){
  if(territorySource!=='published'){counts=new Map();statsAvailable=false;render();return;}
  try{
    const response=await fetch('/api/public-territory-stats',{cache:'no-store'});
    if(!response.ok)throw Error('Sin estadísticas');
    const data=await response.json();
    const next=new Map();
    if(data.status!=='ok'||!Array.isArray(data.counts))throw Error('Datos no disponibles');
    for(const row of data.counts){
      if(typeof row.id==='string')next.set(row.id,{
        men:row.men===null?null:(Number.isSafeInteger(row.men)&&row.men>=0?row.men:null),
        women:row.women===null?null:(Number.isSafeInteger(row.women)&&row.women>=0?row.women:null)
      });
    }
    counts=next;statsAvailable=true;render();
  }catch(_){counts=new Map();statsAvailable=false;render();}
}
async function refresh(){await loadTerritories();await loadCounts();}
function connectLive(){
  try{
    const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/live`);
    socket.addEventListener('message',event=>{try{if(JSON.parse(event.data).type==='updated')void refresh();}catch(_){}});
    socket.addEventListener('close',()=>setTimeout(connectLive,5000));
    socket.addEventListener('error',()=>socket.close());
  }catch(_){setTimeout(connectLive,6000);}
}
void refresh();connectLive();setInterval(()=>{void refresh();},60000);
})();
