/* Mapa público: territorios, geocodificación, ubicación del visitante y enlaces
   voluntarios de navegación. Nunca recibe coordenadas ni fichas privadas. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const map=L.map('map',{zoomControl:false,preferCanvas:true,scrollWheelZoom:true})
  .setView([-6.704,-79.908],14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
L.control.zoom({position:'bottomright',zoomInTitle:'Acercar mapa',zoomOutTitle:'Alejar mapa'}).addTo(map);
const shapes=L.featureGroup().addTo(map);
const destinationMarkers=L.featureGroup().addTo(map);
const colorFor=window.TerritoryPalette.territoryColor;
let territories=[],territorySource='';
let counts=new Map(),statsAvailable=false,initialFit=false,lastSignature='';
let currentLocation=null,userMarker=null,accuracyCircle=null,destination=null;
let lastSearchId=0;
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
function statsText(t){const s=normalizedStats(t);return `H ${displayCount(s.men)} · M ${displayCount(s.women)}`;}
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
        polygon.on('click',()=>selectTerritory(t,polygon));
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
      const icon=L.divIcon({className:'territory-stats-icon',iconSize:[80,21],iconAnchor:[80,0],
        html:`<span class="territory-stats" style="--territory-color:${color}" title="Hombres y mujeres. Los recuentos de 1 a 4 se ocultan por privacidad"><span><b>H</b> ${displayCount(safe.men)}</span><span><b>M</b> ${displayCount(safe.women)}</span></span>`});
      L.marker([badgeLat,badgeLng],{icon,interactive:false,keyboard:false}).addTo(shapes);
    }
  }
  sourceNotice();
  if(visible.length&&!initialFit){
    initialFit=true;
    map.fitBounds(shapes.getBounds(),{paddingTopLeft:[25,95],paddingBottomRight:[25,25],maxZoom:15,animate:false});
  }else if(previousBounds && territorySource==='published' && !previousBounds.equals(shapes.getBounds()) && !destination){
    // No recentrar al actualizar estadísticas ni interrumpir el GPS o la búsqueda.
  }
}
function showDestination(lat,lng,title,hint,isApproximate=false){
  if(!validCoordinate(lat,lng)){message('No se pudo determinar un destino válido.',true);return;}
  destination={lat,lng,title,isApproximate};
  $('destinationTitle').textContent=title;
  $('destinationHint').textContent=hint;
  $('destinationPanel').hidden=false;
}
function selectTerritory(t,polygon){
  const center=polygon.getBounds().getCenter();
  if(!validCoordinate(center.lat,center.lng))return;
  showDestination(center.lat,center.lng,`Territorio #${t.number} · ${t.locality||'Lambayeque'}`,
    `${statsText(t)} · Ruta aproximada al centro del territorio`,true);
  message('Territorio seleccionado. Pulsa «Cómo llegar» para abrir la navegación.');
}
function clearDestination(){
  destination=null;destinationMarkers.clearLayers();$('destinationPanel').hidden=true;
}
$('clearDestination').addEventListener('click',()=>{clearDestination();message('');});
$('routeButton').addEventListener('click',()=>{
  if(!destination)return;
  const qs=new URLSearchParams({api:'1',destination:`${destination.lat},${destination.lng}`,travelmode:'walking'});
  // Las coordenadas GPS solo se comparten con Google Maps tras pulsar este botón.
  if(currentLocation)qs.set('origin',`${currentLocation.lat},${currentLocation.lng}`);
  const url=`https://www.google.com/maps/dir/?${qs.toString()}`;
  const opened=window.open(url,'_blank','noopener,noreferrer');
  if(!opened)location.href=url;
});
function zoomToTerritory(t){
  const found=shapes.getLayers().filter(l=>l instanceof L.GeoJSON).flatMap(l=>l.getLayers()).find(l=>{
    // Identificar por pertenencia al polígono original (geometría es la misma en GeoJSON).
    return JSON.stringify(l.feature?.geometry)===JSON.stringify(t.geometry);
  });
  const layer=found||L.geoJSON({type:'Feature',geometry:t.geometry,properties:{}});
  if(layer.getBounds().isValid())map.fitBounds(layer.getBounds(),{paddingTopLeft:[40,145],paddingBottomRight:[40,75],maxZoom:17,animate:true});
  const center=layer.getBounds().getCenter();
  showDestination(center.lat,center.lng,`Territorio #${t.number} · ${t.locality||'Lambayeque'}`,
    `${statsText(t)} · Ruta aproximada al centro del territorio`,true);
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
  const address=$('searchType').value==='address';
  $('searchInput').placeholder=address?'Calle, número, urbanización…':'Ej. territorio 4';
  $('searchInput').inputMode=address?'text':'numeric';
  $('searchResults').hidden=true;message('');
});
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
$('locateButton').addEventListener('click',()=>{
  if(!navigator.geolocation){message('Este dispositivo no ofrece ubicación GPS.',true);return;}
  if(!window.isSecureContext){message('La ubicación requiere HTTPS o localhost.',true);return;}
  const btn=$('locateButton');btn.disabled=true;message('Solicitando permiso para conocer tu ubicación…');
  navigator.geolocation.getCurrentPosition(pos=>{
    btn.disabled=false;
    const lat=Number(pos.coords.latitude),lng=Number(pos.coords.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)){message('El dispositivo no devolvió coordenadas válidas.',true);return;}
    currentLocation={lat,lng};
    if(userMarker)map.removeLayer(userMarker);
    if(accuracyCircle)map.removeLayer(accuracyCircle);
    const accuracy=Number(pos.coords.accuracy);
    userMarker=L.marker([lat,lng],{
      icon:L.divIcon({className:'location-icon',html:'<div class="location-dot"></div>',iconSize:[20,20],iconAnchor:[10,10]}),
      title:'Mi ubicación GPS',zIndexOffset:1200
    }).addTo(map);
    if(Number.isFinite(accuracy)&&accuracy>0){accuracyCircle=L.circle([lat,lng],{radius:accuracy,color:'#3289bb',fillColor:'#57b7eb',fillOpacity:.12,weight:1}).addTo(map);}
    map.setView([lat,lng],Math.max(map.getZoom(),16),{animate:true});
    message(Number.isFinite(accuracy)&&accuracy>0?
      `Ubicación detectada (precisión estimada: ±${Math.round(accuracy)} m).`:'Ubicación detectada.');
  },error=>{
    btn.disabled=false;
    const txt=error.code===1?'Permiso de ubicación denegado. Puedes buscar una dirección manualmente.':
      error.code===3?'No se obtuvo el GPS a tiempo. Inténtalo de nuevo.':'No se pudo obtener tu ubicación.';
    message(txt,true);
  },{enableHighAccuracy:true,timeout:18000,maximumAge:12000});
});
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
