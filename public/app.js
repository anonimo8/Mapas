(()=>{'use strict';
const $=id=>document.getElementById(id);
const locations={
  'Lambayeque':[-6.704,-79.908],
  'Mochumí':[-6.54778,-79.865],
  'Túcume':[-6.510152,-79.859588],
  'Íllimo':[-6.474021,-79.855127],
  'Pacora':[-6.428889,-79.838889],
  'Mórrope':[-6.540375,-80.015366]
};
const map=L.map('map',{zoomControl:false,preferCanvas:true}).setView(locations.Lambayeque,14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);
let territories=[],points=[],siteKey='',tokenWidget=null,pickMode=false,selectedLatLng=null,tempMarker=null,liveSocket=null;
const territoryLayers=L.featureGroup().addTo(map), pointLayers=L.layerGroup().addTo(map);
const territoryMap=new Map();
const showHint=(text)=>{$('mapHint').textContent=text;};
const closeMobile=()=>{$('sidebar').classList.remove('open');};
function makeEl(tag,cls,content){const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el;}
function coordStr(ll){return `${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`;}
function fitTerritory(id){const layer=territoryMap.get(id);if(!layer)return;map.fitBounds(layer.getBounds(),{padding:[42,42],maxZoom:18});layer.getLayers()[0]?.openPopup();closeMobile();}
function showPoint(p){map.setView([p.lat,p.lng],17);closeMobile();}
function render(){
  territoryLayers.clearLayers();pointLayers.clearLayers();territoryMap.clear();
  const sel=$('locality').value,cat=$('categoryFilter').value;
  const visibleT=territories.filter(t=>sel==='all'||t.locality===sel);
  const list=$('territoryList');list.replaceChildren();
  $('countTerritories').textContent=String(visibleT.length);
  if(!visibleT.length)list.append(makeEl('p','empty','No hay territorios publicados en esta localidad.'));
  for(const t of visibleT){
    const layer=L.geoJSON({type:'Feature',geometry:t.geometry,properties:{}},{
      style:{color:'#187b60',weight:3,fillColor:'#48a882',fillOpacity:.17},
      onEachFeature:(_,l)=>{
        const popup=makeEl('div');popup.append(makeEl('b','',`Territorio #${t.number}`),makeEl('p','',t.locality));
        const print=makeEl('button','', 'Imprimir vista');print.className='secondary-btn';print.style.cssText='padding:6px 12px;font-size:12px;';
        print.addEventListener('click',()=>{map.fitBounds(l.getBounds(),{padding:[24,24],maxZoom:17});setTimeout(()=>window.print(),400);});
        popup.append(print);l.bindPopup(popup);
        const label=makeEl('span','territory-label',`#${t.number}`);
        l.bindTooltip(label,{permanent:true,direction:'center',className:'territory-tooltip'});
        l.on('click',()=>{if(pickMode)return;});
      }
    }).addTo(territoryLayers);
    territoryMap.set(t.id,layer);
    const b=makeEl('button','territory-item');b.type='button';
    b.append(makeEl('span','territory-number',String(t.number)));
    const d=makeEl('div');d.append(makeEl('b','',`Territorio #${t.number}`),makeEl('small','',t.locality));
    b.append(d,makeEl('span','item-arrow','›'));b.addEventListener('click',()=>fitTerritory(t.id));list.append(b);
  }
  const visibleP=points.filter(p=>(cat==='all'||p.category===cat) && (sel==='all'||Math.hypot(...[p.lat-locations[sel][0],p.lng-locations[sel][1]])<.08));
  // Los puntos se filtran por categoría; la proximidad local es solo un filtro visual aproximado.
  const pointList=$('pointsList');pointList.replaceChildren();$('countPoints').textContent=String(visibleP.length);
  if(!visibleP.length)pointList.append(makeEl('p','empty','No hay puntos aprobados en esta selección.'));
  for(const p of visibleP){
    const marker=L.circleMarker([p.lat,p.lng],{radius:7,color:'#fff',weight:2,fillColor:'#e38b4a',fillOpacity:1}).addTo(pointLayers);
    const info=makeEl('div');info.append(makeEl('b','',p.title),makeEl('p','',p.description||p.category));marker.bindPopup(info);
    const row=makeEl('button','point-item');row.type='button';row.append(makeEl('span','pin-symbol','●'));
    const inner=makeEl('div');inner.append(makeEl('b','',p.title),makeEl('small','',p.category));row.append(inner);
    row.addEventListener('click',()=>{showPoint(p);marker.openPopup();});pointList.append(row);
  }
}
async function loadData(){
  try{
    const response=await fetch('/api/data',{cache:'no-store'});
    if(!response.ok)throw Error('No se pudieron consultar los territorios.');
    const data=await response.json();territories=Array.isArray(data.territories)?data.territories:[];points=Array.isArray(data.points)?data.points:[];
    render();
  }catch(err){showHint('No se pudo actualizar el mapa; reintentando…');}
}
async function initialize(){
  try{const r=await fetch('/api/config');const cfg=await r.json();siteKey=cfg.turnstileSiteKey||'';}
  catch(_){siteKey='';}
  if(!siteKey){$('contributionHelp').textContent='Los aportes quedarán habilitados cuando se configure Turnstile en Cloudflare.';}
  await loadData();connectLive();setInterval(loadData,60000);
}
function connectLive(){
  try{
    const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/live`);liveSocket=socket;
    socket.addEventListener('open',()=>{$('liveStatus').classList.add('online');$('liveStatus').lastChild.textContent=' En vivo';});
    socket.addEventListener('message',(evt)=>{try{if(JSON.parse(evt.data).type==='updated')loadData();}catch(_){}});
    socket.addEventListener('close',()=>{
      if(liveSocket!==socket)return;
      $('liveStatus').classList.remove('online');$('liveStatus').lastChild.textContent=' Reconectando';setTimeout(connectLive,4000);
    });
    socket.addEventListener('error',()=>{socket.close();});
  }catch(_){setTimeout(connectLive,6000);}
}
$('locality').addEventListener('change',()=>{const v=$('locality').value;if(v!=='all')map.setView(locations[v],14);render();closeMobile();});
$('categoryFilter').addEventListener('change',render);
$('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
$('locateBtn').addEventListener('click',()=>map.locate({setView:true,maxZoom:17,enableHighAccuracy:true}));
map.on('locationerror',()=>showHint('No se pudo obtener tu ubicación. Revisa el permiso del navegador.'));
map.on('locationfound',e=>L.circleMarker(e.latlng,{radius:8,color:'#176e54',weight:3,fillColor:'#b5e6cf',fillOpacity:1}).addTo(map).bindPopup('Ubicación aproximada del dispositivo').openPopup());
$('searchBtn').addEventListener('click',searchPlace);
$('search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchPlace();}});
async function searchPlace(){
  const q=$('search').value.trim();if(q.length<4){showHint('Escribe al menos 4 caracteres para buscar.');return;}
  $('searchBtn').disabled=true;$('searchResults').hidden=false;
  $('searchResults').replaceChildren(makeEl('p','empty','Buscando ubicación…'));
  try{
    const r=await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);const data=await r.json();
    if(!r.ok)throw Error(data.error||'No hay resultados.');
    $('searchResults').replaceChildren();
    if(!data.length)$('searchResults').append(makeEl('p','empty','No se encontraron ubicaciones.'));
    data.forEach(x=>{const b=makeEl('button','',x.label);b.type='button';b.addEventListener('click',()=>{map.setView([x.lat,x.lng],17);$('searchResults').hidden=true;closeMobile();});$('searchResults').append(b);});
  }catch(e){$('searchResults').replaceChildren(makeEl('p','empty',e.message));}
  finally{$('searchBtn').disabled=false;}
}
$('addPointBtn').addEventListener('click',()=>{
  if(!siteKey){showHint('Para sugerir puntos, el administrador debe configurar Turnstile.');return;}
  pickMode=true;map.getContainer().style.cursor='crosshair';showHint('Toca la ubicación exacta en el mapa para sugerir un punto');closeMobile();
});
map.on('click',e=>{
  if(!pickMode)return;pickMode=false;map.getContainer().style.cursor='';selectedLatLng=e.latlng;
  if(tempMarker)map.removeLayer(tempMarker);
  tempMarker=L.marker(e.latlng,{draggable:true}).addTo(map);
  tempMarker.on('dragend',()=>{selectedLatLng=tempMarker.getLatLng();$('coordBox').textContent='Coordenadas: '+coordStr(selectedLatLng);});
  $('coordBox').textContent='Coordenadas: '+coordStr(e.latlng);
  $('pointModal').hidden=false;showHint('Ubicación seleccionada · punto pendiente de aprobación');
  ensureTurnstile();
});
function ensureTurnstile(){
  if(!siteKey)return;
  if(window.turnstile){if(tokenWidget===null)tokenWidget=window.turnstile.render('#turnstileMount',{sitekey:siteKey});return;}
  if(document.querySelector('script[data-turnstile]'))return;
  const s=document.createElement('script');s.dataset.turnstile='1';s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;
  s.onload=()=>{if(window.turnstile&&tokenWidget===null)tokenWidget=window.turnstile.render('#turnstileMount',{sitekey:siteKey});};
  document.head.append(s);
}
function closeModal(){
  $('pointModal').hidden=true;$('proposalStatus').textContent='';if(tempMarker){map.removeLayer(tempMarker);tempMarker=null;}selectedLatLng=null;
  if(window.turnstile&&tokenWidget!==null)window.turnstile.reset(tokenWidget);
}
$('closeShade').addEventListener('click',closeModal);$('closeModal').addEventListener('click',closeModal);$('cancelModal').addEventListener('click',closeModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('pointModal').hidden)closeModal();});
$('proposalForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!selectedLatLng)return;
  const token=window.turnstile&&tokenWidget!==null?window.turnstile.getResponse(tokenWidget):'';
  if(!token){$('proposalStatus').textContent='Completa la verificación anti-bots.';return;}
  const payload={lat:selectedLatLng.lat,lng:selectedLatLng.lng,title:$('pointTitle').value.trim(),category:$('pointCategory').value,description:$('pointDescription').value.trim(),turnstileToken:token};
  $('submitPoint').disabled=true;$('proposalStatus').textContent='Enviando sugerencia…';
  try{
    const r=await fetch('/api/proposals',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudo enviar.');
    $('proposalStatus').textContent='¡Gracias! El punto se envió para revisión y todavía no es público.';
    $('proposalForm').reset();setTimeout(closeModal,1600);
  }catch(err){$('proposalStatus').textContent=err.message;if(window.turnstile&&tokenWidget!==null)window.turnstile.reset(tokenWidget);}
  finally{$('submitPoint').disabled=false;}
});
initialize();
})();
