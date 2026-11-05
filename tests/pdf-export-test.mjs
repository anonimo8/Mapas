import {strict as assert} from 'node:assert';
import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../admin-worker/export-pdf-browser.js',import.meta.url),'utf8');
const jpg=await readFile(new URL('./sample-tile.jpg',import.meta.url));
const fakeCtx={
 fillRect(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},arc(){},fillText(){},scale(){},
 measureText(txt){return {width:txt.length*7};}
};
const canvas={width:0,height:0,getContext(){return fakeCtx;},toDataURL(){return 'data:image/jpeg;base64,'+jpg.toString('base64');}};
const tile={complete:true,naturalWidth:256,getBoundingClientRect:()=>({left:0,top:0,right:400,bottom:400,width:400,height:400})};
const mapDiv={getBoundingClientRect:()=>({left:0,top:0,right:1200,bottom:650,width:1200,height:650}),querySelectorAll(){return [tile];}};
const map={getSize:()=>({x:1200,y:650}),getContainer:()=>mapDiv,latLngToContainerPoint:([lat,lng])=>({x:(lng+80)*800,y:(lat+7)*450})};
let pdfBlob=null;
const document={createElement(tag){if(tag==='canvas')return canvas;return {click(){},remove(){},set href(_) {},set download(_) {}};},body:{append(){}}};
const FakeURL={createObjectURL(blob){pdfBlob=blob;return 'blob:fake';},revokeObjectURL(){}};
const context={window:{},document,URL:FakeURL,atob,Blob,confirm:()=>true,setTimeout:(fn)=>{fn();}};
vm.runInNewContext(source,context);
assert.equal(typeof context.window.exportPrivateTerritoryPDF,'function');
const t={id:'id-example',number:2,locality:'Lambayeque',geometry:{type:'Polygon',coordinates:[[[-79.9,-6.7],[-79.8,-6.7],[-79.8,-6.8],[-79.9,-6.7]]]}};
const ok=await context.window.exportPrivateTerritoryPDF({map,tileLayer:{isLoading:()=>false},territory:t,points:[{territory_id:'id-example',lat:-6.701,lng:-79.9,sex:'hombre'}]});
assert.equal(ok,true);assert.ok(pdfBlob);
const bytes=Buffer.from(await pdfBlob.arrayBuffer());
assert.equal(bytes.subarray(0,8).toString(),'%PDF-1.4');
assert.ok(bytes.includes(Buffer.from('%%EOF')));
await writeFile(new URL('./sample-output.pdf',import.meta.url),bytes);
console.log('PASS: PDF generado en navegador con título, cartografía y marcador; tamaño',bytes.length);
