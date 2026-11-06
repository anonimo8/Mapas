/* Vista pública: solo polígonos coloreados, números y un total agregado.
   Ningún dato personal ni punto privado llega a este navegador. */
(()=>{'use strict';
const map=L.map('map', {zoomControl:false, preferCanvas:true, scrollWheelZoom:true})
  .setView([-6.704,-79.908],14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
L.control.zoom({position:'bottomright',zoomInTitle:'Acercar mapa',zoomOutTitle:'Alejar mapa'}).addTo(map);
const shapes=L.featureGroup().addTo(map);
const colorFor=window.TerritoryPalette.territoryColor;
const notice=document.getElementById('mapNotice');
const deafCount=document.getElementById('deafCount');
let initialFit=false;
let lastDataSignature='';

function setNotice(message){notice.textContent=message;notice.hidden=!message;}
function isValidShape(t){
  return t && Number.isFinite(Number(t.number)) && t.geometry &&
    (t.geometry.type==='Polygon'||t.geometry.type==='MultiPolygon') &&
    Array.isArray(t.geometry.coordinates);
}
function renderTerritories(territories){
  const visible=territories.filter(isValidShape);
  const signature=JSON.stringify(visible.map(t=>[t.id,t.number,t.geometry]));
  if(signature===lastDataSignature)return;
  lastDataSignature=signature;
  shapes.clearLayers();
  for(const t of visible){
    const color=colorFor(t);
    const layer=L.geoJSON({type:'Feature',properties:{},geometry:t.geometry},{
      style:{color,weight:2,opacity:.82,fillColor:color,fillOpacity:.13,
        lineCap:'round',lineJoin:'round'},
      onEachFeature(_feature,polygon){
        const badge=document.createElement('span');
        badge.className='territory-label';
        badge.textContent=String(t.number);
        badge.style.setProperty('--territory-color',color);
        polygon.bindTooltip(badge,{
          permanent:true,direction:'center',className:'territory-tooltip',
          opacity:1,interactive:false
        });
      }
    });
    layer.addTo(shapes);
  }
  if(visible.length){
    setNotice('');
    if(!initialFit){
      initialFit=true;
      map.fitBounds(shapes.getBounds(),{
        paddingTopLeft:[25,65],paddingBottomRight:[25,25],maxZoom:15,
        animate:false
      });
    }
  }else setNotice('No hay territorios publicados. Abre Administración para revisar y publicar los contornos guardados.');
}
async function updateTerritories(){
  try{
    const response=await fetch('/api/data',{cache:'no-store'});
    if(!response.ok)throw Error('Sin respuesta');
    const data=await response.json();
    renderTerritories(Array.isArray(data.territories)?data.territories:[]);
  }catch(_){
    if(!initialFit)setNotice('El mapa no está disponible temporalmente.');
  }
}
async function updateCommunityCount(){
  try{
    const response=await fetch('/api/public-summary',{cache:'no-store'});
    if(!response.ok)throw Error('Sin respuesta');
    const summary=await response.json();
    if(summary.status==='ok'&&Number.isSafeInteger(summary.deafRegistered)&&summary.deafRegistered>=0){
      deafCount.textContent=new Intl.NumberFormat('es-PE').format(summary.deafRegistered);
    }else if(summary.status==='limited'){
      deafCount.textContent='Menos de 5';
    }else deafCount.textContent='—';
  }catch(_){deafCount.textContent='—';}
}
function refresh(){void updateTerritories();void updateCommunityCount();}
function connectLive(){
  let socket;
  try{
    socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/live`);
    socket.addEventListener('message',evt=>{
      try{if(JSON.parse(evt.data).type==='updated')refresh();}catch(_){}
    });
    socket.addEventListener('close',()=>setTimeout(connectLive,5000));
    socket.addEventListener('error',()=>socket.close());
  }catch(_){setTimeout(connectLive,6000);}
}
refresh();connectLive();setInterval(refresh,60000);
})();
