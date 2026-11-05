import {readFile} from 'node:fs/promises';
import {strict as assert} from 'node:assert';
import vm from 'node:vm';
const html=await readFile(new URL('../admin-worker/admin.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js,'Script de administración no encontrado');
new vm.Script(js,{filename:'admin-ui.js'});
for(const id of ['newPrivatePoint','privateSex','privateTerritory','savePrivatePoint','fitTerritory','exportTerritoryPdf'])
  assert.ok(html.includes('id="'+id+'"'),'Falta elemento '+id);
console.log('PASS: JavaScript inline y botones del editor privado.');
