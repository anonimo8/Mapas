from pathlib import Path
root=Path('/mnt/data/mapa_ux_workspace')
p=root/'public/index.html'
s=p.read_text()
a=s.index('      <div id="searchResults"')
b=s.index('\n    </section>',a)
s=s[:b]+'''
      <section id="destinationPanel" class="destination-panel" aria-label="Destino seleccionado" hidden>
        <div class="destination-topline">
          <div class="destination-body">
            <span class="destination-kicker">DESTINO ENCONTRADO</span>
            <strong id="destinationTitle"></strong>
            <small id="destinationHint"></small>
          </div>
          <button id="clearDestination" type="button" class="clear-destination" aria-label="Quitar destino" title="Quitar destino">×</button>
        </div>
        <button id="routeButton" type="button" class="route-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17h4l4-10 5 10h5"/><circle cx="4" cy="17" r="2"/><path d="m14 8 3-3 3 3"/></svg>
          Cómo llegar
        </button>
      </section>'''+s[b:]
a=s.index('    <section id="destinationPanel"',s.index('<button id="locateButton"'))
b=s.index('    <a class="admin-entry"',a)
s=s[:a]+'''    <section id="routePanel" class="route-panel" aria-label="Indicaciones de ruta" hidden>
      <div class="route-head">
        <div><span class="route-kicker">RUTA EN EL MAPA</span><strong>Cómo llegar</strong></div>
        <button id="closeRoute" class="route-close" type="button" aria-label="Cerrar indicaciones">×</button>
      </div>
      <p id="routeStatus" class="route-status" role="status" aria-live="polite">Detectando tu ubicación…</p>
      <button id="retryRoute" class="route-retry" type="button" hidden>Reintentar recorrido</button>
      <div id="routeOriginFallback" class="route-origin-fallback" hidden>
        <p class="origin-explain">¿Desde dónde sales? Escribe tu dirección o un lugar cercano.</p>
        <form id="routeOriginForm" class="route-origin-form" autocomplete="off">
          <label class="visually-hidden" for="routeOriginInput">Lugar de partida</label>
          <div class="route-origin-search">
            <input id="routeOriginInput" type="search" minlength="4" maxlength="120" placeholder="Tu dirección o lugar de partida" aria-label="Lugar de partida">
            <button type="submit">Buscar</button>
          </div>
        </form>
        <div id="routeOriginResults" class="route-origin-results" aria-label="Elige tu punto de partida" hidden></div>
        <div class="route-alternatives">
          <button id="routeGPS" type="button" class="route-origin-btn">⌖ Reintentar GPS</button>
          <button id="routePick" type="button" class="route-origin-btn route-origin-secondary">◎ Elegir en el mapa</button>
        </div>
      </div>
      <div id="routeDetails" class="route-details" hidden>
        <div class="route-summary"><strong id="routeDistance"></strong><span id="routeDuration"></span></div>
        <details id="routeStepsDisclosure" class="route-disclosure">
          <summary>Ver indicaciones paso a paso</summary>
          <ol id="routeSteps" class="route-steps"></ol>
        </details>
        <details id="routeOptions" class="route-disclosure route-options">
          <summary>Opciones de recorrido</summary>
          <label class="route-mode-label" for="routeMode">Tipo de recorrido</label>
          <select id="routeMode" class="route-mode"><option value="walking">A pie</option><option value="driving">En auto</option></select>
          <button id="changeOrigin" type="button" class="route-change-origin">Cambiar lugar de partida</button>
          <button id="clearRoute" type="button" class="route-clear">Quitar recorrido del mapa</button>
          <p class="route-advice">Ruta orientativa sobre OpenStreetMap; comprueba los accesos. En los territorios el destino es un punto aproximado del área, no una puerta exacta.</p>
          <small class="route-provider">Rutas: Valhalla / OpenStreetMap</small>
        </details>
      </div>
    </section>

'''+s[b:]
s=s.replace('MAPA_PUBLICO_V4_2026-11-06_R3','MAPA_PUBLICO_V4_2026-11-06_R4_UX')
s=s.replace('style.css?v=20261106r3','style.css?v=20261106r4').replace('app.js?v=20261106r3','app.js?v=20261106r4')
p.write_text(s)

p=root/'public/app.js'
s=p.read_text()
s=s.replace('let routeOrigin=null,routeOriginSource=null,choosingStart=false,routeAbort=null,routeRequestId=0;', 'let routeOrigin=null,routeOriginSource=null,choosingStart=false,routeAbort=null,routeRequestId=0,gpsRouteRequestId=0;')
s=s.replace('''function closeRoutePlanner(){
  choosingStart=false;$('routePick').classList.remove('is-active');
  clearRouteDrawing();$('routePanel').hidden=true;
}''', '''function closeRoutePlanner(){
  gpsRouteRequestId++;
  choosingStart=false;$('routePick').classList.remove('is-active');
  clearRouteDrawing();$('routePanel').hidden=true;
  $('routeOriginFallback').hidden=true;$('routeOriginResults').hidden=true;$('retryRoute').hidden=true;
}''')
s=s.replace('''function setOrigin(lat,lng,source,label){
  if(!validCoordinate(lat,lng)){routeStatus('El punto inicial está fuera del área admitida.',true);return;}
  choosingStart=false;$('routePick').classList.remove('is-active');
  routeOrigin={lat,lng};routeOriginSource=source;
  routeStatus(`Origen: ${label}. Calculando ruta…`);
  void calculateRoute();
}''','''function manualOriginPrompt(reason){
  $('routeOriginFallback').hidden=false;
  $('retryRoute').hidden=true;
  routeStatus(reason,true);
}
function setOrigin(lat,lng,source,label){
  if(!validCoordinate(lat,lng)){manualOriginPrompt('El punto de partida está fuera del área cubierta. Prueba con otro lugar.');return;}
  gpsRouteRequestId++;
  choosingStart=false;$('routePick').classList.remove('is-active');
  routeOrigin={lat,lng};routeOriginSource=source;
  $('routeOriginFallback').hidden=true;$('routeOriginResults').hidden=true;$('retryRoute').hidden=true;
  routeStatus(`Salida: ${label}. Calculando recorrido…`);
  void calculateRoute();
}''')
s=s.replace('''  $('routeButton').disabled=true;
  routeStatus(`Calculando recorrido ${mode==='walking'?'a pie':'en auto'} dentro del mapa…`);''','''  $('routeButton').disabled=true;
  $('retryRoute').hidden=true;
  routeStatus(`Calculando recorrido ${mode==='walking'?'a pie':'en auto'}…`);''')
s=s.replace('''    map.fitBounds(line.getBounds(),{paddingTopLeft:[30,150],paddingBottomRight:[30,180],maxZoom:17});''','''    const mobile=window.matchMedia('(max-width:600px)').matches;
    map.fitBounds(line.getBounds(),{paddingTopLeft:mobile?[20,165]:[30,150],
      paddingBottomRight:mobile?[20,Math.min(340,Math.max(200,Math.round(window.innerHeight*.41)))]:[30,180],maxZoom:17});''')
s=s.replace('''    $('routeDetails').hidden=false;
    routeStatus(destination.isApproximate?
      'Recorrido orientativo: el destino es el centro aproximado del territorio.':'Ruta dibujada en el mapa.');
  }catch(err){
    if(id!==routeRequestId||err.name==='AbortError')return;
    routeStatus(err.message||'No se pudo calcular la ruta. Inténtalo otra vez.',true);''','''    $('routeOriginFallback').hidden=true;
    $('routeDetails').hidden=false;
    routeStatus(destination.isApproximate?
      'Ruta lista. El destino señala un punto aproximado del territorio.':'Ruta lista desde tu punto de partida hasta el destino.');
  }catch(err){
    if(id!==routeRequestId||err.name==='AbortError')return;
    $('retryRoute').hidden=false;
    routeStatus(err.message||'No se pudo calcular la ruta. Inténtalo de nuevo.',true);''')
start=s.index("$('routeButton').addEventListener('click',()=>{")
end=s.index("$('routeOriginForm').addEventListener('submit'",start)
s=s[:start]+'''$('routeButton').addEventListener('click',()=>{
  if(!destination)return;
  // Un único botón: pedir GPS y trazar directamente; no mostrar un menú de opciones.
  closeRoutePlanner();
  routeOrigin=null;routeOriginSource=null;
  $('routeMode').value='walking';
  $('routeStepsDisclosure').open=false;$('routeOptions').open=false;
  $('routePanel').hidden=false;
  routeStatus('Buscando tu ubicación para crear la ruta…');
  requestGPS(true);
});
$('closeRoute').addEventListener('click',closeRoutePlanner);
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
'''+s[end:]
# async queries stale prevention after new click/route closed
s=s.replace('''  routeStatus('Buscando puntos de partida…');
  try{''', '''  const destinationAtSearch=destination;
  routeStatus('Buscando puntos de partida…');
  try{''', 1)
s=s.replace('''    const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo consultar la dirección.');
    if(!Array.isArray(data)||!data.length)throw Error('Dirección de partida no encontrada. Intenta con otra calle.');''','''    const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo consultar la dirección.');
    if(destinationAtSearch!==destination||$('routePanel').hidden)return;
    if(!Array.isArray(data)||!data.length)throw Error('Dirección de partida no encontrada. Intenta con otra calle.');''')
s=s.replace('''  // Al cambiar el destino, limpiar cualquier recorrido anterior sin cerrar el panel.
  clearRouteDrawing();
  destination={lat,lng,title,isApproximate};
  if(!$('routePanel').hidden)routeStatus('Destino actualizado. Pulsa «Cómo llegar» para recalcular el recorrido.');''','''  // Una nueva selección anula la ruta y las solicitudes de GPS anteriores.
  closeRoutePlanner();
  routeOrigin=null;routeOriginSource=null;
  destination={lat,lng,title,isApproximate};''')
s=s.replace('''  message('Territorio seleccionado. Pulsa «Cómo llegar» para ver el recorrido en el mapa.');''','''  message('Territorio seleccionado.');''')
s=s.replace('''function clearDestination(){
  closeRoutePlanner();destination=null;destinationMarkers.clearLayers();$('destinationPanel').hidden=true;
}''','''function clearDestination(){
  closeRoutePlanner();destination=null;routeOrigin=null;routeOriginSource=null;
  destinationMarkers.clearLayers();$('destinationPanel').hidden=true;
}''')
s=s.replace('''$('searchType').addEventListener('change',()=>{
  const address=$('searchType').value==='address';''','''$('searchType').addEventListener('change',()=>{
  if(destination)clearDestination();
  const address=$('searchType').value==='address';''')
s=s.replace("$('mapSearch').addEventListener('submit',async event=>{", "$('searchInput').addEventListener('input',()=>{if(destination)clearDestination();message('');$('searchResults').hidden=true;});\n$('mapSearch').addEventListener('submit',async event=>{")
start=s.index('function requestGPS(asRouteOrigin=false){')
end=s.index("$('locateButton').addEventListener",start)
s=s[:start]+'''function requestGPS(asRouteOrigin=false){
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
'''+s[end:]
p.write_text(s)

p=root/'public/version.txt'
p.write_text('MAPA_PUBLICO_V4_2026-11-06_R4_UX\n')
print('HTML and JS updated')
