import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style.css',import.meta.url),'utf8');

const locate=(id)=>html.indexOf(`id="${id}"`);
assert.ok(locate('searchResults')<locate('destinationPanel')&&
  locate('destinationPanel')<locate('locateButton'),
  'La tarjeta del destino y su botón deben ir inmediatamente después de buscar, no al pie del mapa');
assert.ok(locate('destinationTitle')<locate('routeButton'),'La acción debe mostrarse después del título del destino');
assert.match(html, /id="destinationPanel"[^>]*hidden/,'No mostrar «Cómo llegar» sin destino');
assert.match(html, /id="routePanel"[^>]*hidden/,'No abrir panel de navegación antes de pulsar el botón');
assert.match(html, /id="routeOriginFallback"[^>]*hidden/,'No mostrar selección de punto de inicio antes de necesitarlo');
assert.match(html, /<details id="routeOptions"[^>]*>/,'Preferencias avanzadas plegadas');
assert.match(html, /<details id="routeStepsDisclosure"[^>]*>/,'Pasos de la ruta plegados');
assert.match(app, /\$\('routeButton'\)\.addEventListener\('click',[\s\S]*?requestGPS\(true\)/,
  'El único botón debe lanzar la solicitud GPS automáticamente');
assert.match(app, /function manualOriginPrompt\([\s\S]*?\$\('routeOriginFallback'\)\.hidden=false/,
  'Si el GPS no está disponible debe pedir la dirección de partida');
assert.match(app, /if\(asRouteOrigin\)manualOriginPrompt\(text\)/,
  'Los errores del GPS deben mostrar la entrada manual');
assert.match(app, /function setOrigin\([\s\S]*?void calculateRoute\(\)/,
  'Elegir origen manual debe dibujar la ruta sin volver a mostrar el menú');
assert.match(css, /@media\(max-width:600px\)[\s\S]*?\.route-panel\{left:/,
  'En celular el resultado debe aparecer como panel inferior');
console.log('PASS: UX móvil — un botón debajo del buscador, GPS automático y origen manual como alternativa.');
