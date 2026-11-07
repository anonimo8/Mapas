import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildPublicRoute} from '../src/routing.js';
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const worker=await readFile(new URL('../src/index.js',import.meta.url),'utf8');
assert.ok(!app.includes('google.com/maps/dir'),'El botón no debe abrir Google Maps');
assert.ok(!app.includes('window.open('),'El mapa no debe abrir ventanas externas para recorrer');
assert.ok(!app.includes('location.href='),'El mapa no debe cambiar de página');
assert.ok(app.includes("L.polyline(points"),'Debe dibujar ruta sobre Leaflet');
assert.ok(app.includes('routePolyline6('),'Debe decodificar geometría Valhalla');
assert.ok(app.includes("fetch('/api/route'"),'Debe solicitar itinerario a su propia API');
assert.ok(worker.includes("url.pathname === '/api/route'"),'API de rutas en Worker');
for(const id of ['routePanel','routeGPS','routePick','routeOriginInput','routeOriginForm','routeMode','routeSteps','routeDetails','clearRoute','closeRoute'])
  assert.ok(html.includes(`id="${id}"`),'Falta un elemento de ruta: '+id);
const sample={shape:'_p~iF~ps|U_ulLnnqC_mqNvxq`@',summary:{length:2.2,time:1600},maneuvers:[{instruction:'Continúa por la calle',length:2.2}]};
let called=0;
const fetchMock=async(url,opts)=>{
  called++;
  assert.equal(url,'https://valhalla1.openstreetmap.de/route');
  assert.equal(opts.method,'POST');
  const parsed=JSON.parse(opts.body);
  assert.equal(parsed.costing,'pedestrian');
  assert.deepEqual(parsed.locations,[{lat:-6.704,lon:-79.91},{lat:-6.72,lon:-79.92}]);
  return {ok:true,text:async()=>JSON.stringify({trip:{legs:[sample],summary:sample.summary}})};
};
const payload={start:{lat:-6.704,lng:-79.91},end:{lat:-6.72,lng:-79.92},mode:'walking'};
const result=await buildPublicRoute(payload,fetchMock);
assert.equal(called,1);
assert.equal(result.shape,sample.shape);
assert.equal(result.distanceKm,2.2);
assert.equal(result.steps[0].text,'Continúa por la calle');
for(const [b,expected] of [
  [{...payload,mode:'flying'},'Elige el punto'],
  [{...payload,start:{lat:20,lng:30}},'Perú'],
  [{...payload,end:{lat:-8.0,lng:-79.92}},'100 km']
]) await assert.rejects(buildPublicRoute(b,fetchMock),e=>e.message.includes(expected));
assert.equal(called,1,'No llamar API externa para peticiones inválidas');
console.log('PASS: navegación Leaflet en la página, entrada GPS/mapa/dirección, API y privacidad de ruta.');
