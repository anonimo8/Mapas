import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style.css',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
for(const id of ['routeDetails','routeMore','toggleRouteDetails','closeRouteCompact','routeDistance','routeDuration']){
  assert.ok(html.includes(`id="${id}"`),`Elemento de barra compacta faltante: ${id}`);
}
assert.match(html, /id="routeMore"[^>]*hidden/, 'Los detalles deben estar ocultos al principio');
assert.match(css, /\.route-panel\.is-ready \.route-head,\.route-panel\.is-ready \.route-status\{display:none\}/, 'No mostrar el aviso grande al tener ruta');
assert.match(css, /\.route-panel\.is-ready\.is-expanded\{max-height:min\(53dvh,410px\)/, 'El panel abierto no debe ocupar toda la pantalla');
assert.match(app, /setRouteExpanded\(false\);\s*setRouteReady\(true\)/, 'La ruta completa debe iniciar en formato compacto');
assert.match(app, /\$\('toggleRouteDetails'\)\.addEventListener\('click'/, 'El botón Detalles debe funcionar');
assert.match(app, /\$\('closeRouteCompact'\)\.addEventListener\('click',closeRoutePlanner\)/, 'La barra se debe poder cerrar');
assert.match(app, /paddingBottomRight:mobile\?\[20,112\]/, 'Encuadrar más mapa sin el panel anterior de gran tamaño');
console.log('PASS: barra móvil de ruta compacta, detalles bajo demanda y botón cerrar.');
