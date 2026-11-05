/*
 * Exportador PDF privado sin servicios externos ni librerías de terceros.
 * Usa únicamente las teselas YA visibles en el mapa (no predescarga). Todos los
 * puntos privados se procesan dentro del navegador autenticado del administrador.
 */
(()=>{'use strict';
 const latin1 = s => Uint8Array.from(Array.from(String(s), ch => ch.charCodeAt(0) <= 255 ? ch.charCodeAt(0) : 63));
 const ascii = latin1;
 const esc = text => String(text).replace(/[^\x20-\xff]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
 const textAt=(x,y,text,size=12,font='F1') => `BT /${font} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${esc(text)}) Tj ET\n`;
 const fmt=n=>Number(n).toFixed(2);
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function capture(map,tileLayer,t,people){
   if(!map || !t) throw Error('Selecciona un territorio guardado.');
   // Solo espera a las teselas del mapa visible en pantalla. No recorre ni precarga regiones.
   const deadline=Date.now()+9000;
   while(tileLayer?.isLoading?.() && Date.now()<deadline) await wait(180);
   await wait(450);
   const container=map.getContainer();
   const bounds=container.getBoundingClientRect();
   const size=map.getSize(), w=Math.floor(size.x),h=Math.floor(size.y);
   if(w<200 || h<200) throw Error('El mapa es demasiado pequeño para exportar. Abre la vista en una pantalla más grande.');
   const scale=2, canvas=document.createElement('canvas');
   canvas.width=w*scale; canvas.height=h*scale;
   const ctx=canvas.getContext('2d',{alpha:false});
   ctx.scale(scale,scale);
   ctx.fillStyle='#edf0e9';ctx.fillRect(0,0,w,h);
   let tileCount=0;
   for(const img of container.querySelectorAll('.leaflet-tile-pane img.leaflet-tile-loaded')){
     if(!img.complete || !img.naturalWidth)continue;
     const r=img.getBoundingClientRect();
     if(r.right<bounds.left||r.left>bounds.right||r.bottom<bounds.top||r.top>bounds.bottom)continue;
     try{
       ctx.drawImage(img,r.left-bounds.left,r.top-bounds.top,r.width,r.height);
       tileCount++;
     }catch(_){/* otras teselas podrían ser exportables */}
   }
   if(tileCount<1) throw Error('Aún no hay mapa cartográfico cargado. Comprueba tu conexión y espera a que aparezcan las calles.');
   // Dibujar el perímetro vectorial encima de las teselas.
   const ring=t.geometry?.coordinates?.[0] || [];
   if(ring.length>=4){
     ctx.beginPath();
     for(let i=0;i<ring.length;i++){
       const pt=map.latLngToContainerPoint([ring[i][1],ring[i][0]]);
       if(i===0)ctx.moveTo(pt.x,pt.y);else ctx.lineTo(pt.x,pt.y);
     }
     ctx.closePath();
     ctx.fillStyle='rgba(34,126,97,.11)';ctx.fill();
     ctx.strokeStyle='#116a4e';ctx.lineWidth=4;ctx.stroke();
   }
   for(let i=0;i<people.length;i++){
     const p=people[i],pt=map.latLngToContainerPoint([Number(p.lat),Number(p.lng)]);
     if(pt.x < -24||pt.x > w+24||pt.y < -24||pt.y>h+24)continue;
     ctx.beginPath();ctx.arc(pt.x,pt.y,12,0,Math.PI*2);
     ctx.fillStyle=p.sex==='hombre'?'#2474a8':'#b45083';ctx.fill();
     ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke();
     ctx.font='bold 13px Arial, sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
     ctx.fillText(p.sex==='hombre'?'H':'M',pt.x,pt.y+.5);
   }
   // Atribución siempre visible también en el PDF generado.
   ctx.font='12px Arial, sans-serif';ctx.textBaseline='alphabetic';ctx.textAlign='right';
   const attribution='© OpenStreetMap contributors';
   const tw=ctx.measureText(attribution).width;
   ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(w-tw-18,h-25,tw+16,22);
   ctx.fillStyle='#333';ctx.fillText(attribution,w-10,h-9);
   // Si la política CORS de las teselas impide exportarlas, no crear PDF vacío.
   let jpeg;
   try{jpeg=canvas.toDataURL('image/jpeg',.91);}
   catch(_){throw Error('El proveedor cartográfico impidió la exportación de imágenes (CORS). Prueba con un proveedor compatible con exportación.');}
   if(!jpeg.startsWith('data:image/jpeg;base64,')) throw Error('No se pudo convertir la vista del mapa.');
   const bytes=Uint8Array.from(atob(jpeg.split(',')[1]),c=>c.charCodeAt(0));
   return {bytes,w:canvas.width,h:canvas.height};
 }
 function makePdf(image,meta){
   const W=960,H=540,mapBox={x:28,y:65,w:904,h:419};
   const fit=Math.min(mapBox.w/image.w,mapBox.h/image.h);
   const iW=image.w*fit,iH=image.h*fit;
   const iX=mapBox.x+(mapBox.w-iW)/2,iY=mapBox.y+(mapBox.h-iH)/2;
   const name=`TERRITORIO #${meta.number} - ${meta.locality}`;
   const count=meta.people.length;
   const men=meta.people.filter(p=>p.sex==='hombre').length;
   const women=meta.people.filter(p=>p.sex==='mujer').length;
   let s='';
   s+='1 1 1 rg 0 0 960 540 re f\n';
   s+='0.08 0.23 0.18 rg\n';
   s+=textAt(28,509,name,21,'F2');
   s+=textAt(806,509,`/ ${count} S.`,18,'F2');
   s+='0.10 0.43 0.33 RG 1.6 w 28 493 m 932 493 l S\n';
   s+='0.96 0.97 0.95 rg 28 65 904 419 re f\n';
   s+=`q ${fmt(iW)} 0 0 ${fmt(iH)} ${fmt(iX)} ${fmt(iY)} cm /Im1 Do Q\n`;
   s+='0.74 0.80 0.76 RG 1 w 28 65 904 419 re S\n';
   s+='0.12 0.30 0.22 rg\n';
   s+=textAt(29,41,`Hombres: ${men}   |   Mujeres: ${women}   |   Total: ${count} personas sordas`,12,'F2');
   s+='0.57 0.17 0.16 rg\n';
   s+=textAt(729,41,'CONFIDENCIAL - USO PRIVADO',11,'F2');
   s+='0.34 0.40 0.37 rg\n';
   s+=textAt(28,19,'© OpenStreetMap contributors  |  Puntos H/M: solo administracion privada',9);
   s+=textAt(837,19,meta.date,9);
   const contents=latin1(s);
   const objects=[];
   objects[1]=ascii('<< /Type /Catalog /Pages 2 0 R >>');
   objects[2]=ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
   objects[3]=ascii('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Resources << /Font << /F1 4 0 R /F2 7 0 R >> /XObject << /Im1 5 0 R >> >> /Contents 6 0 R >>');
   objects[4]=ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
   objects[5]=[ascii(`<< /Type /XObject /Subtype /Image /Width ${image.w} /Height ${image.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`),image.bytes,ascii('\nendstream')];
   objects[6]=[ascii(`<< /Length ${contents.length} >>\nstream\n`),contents,ascii('\nendstream')];
   objects[7]=ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
   const chunks=[],offsets=[0];let cursor=0;
   function push(b){chunks.push(b);cursor+=b.length;}
   push(ascii('%PDF-1.4\n%PDF\n'));
   for(let n=1;n<=7;n++){
     offsets[n]=cursor;push(ascii(`${n} 0 obj\n`));
     for(const part of Array.isArray(objects[n])?objects[n]:[objects[n]])push(part);
     push(ascii('\nendobj\n'));
   }
   const xref=cursor;
   push(ascii('xref\n0 8\n0000000000 65535 f \n'));
   for(let n=1;n<=7;n++)push(ascii(`${String(offsets[n]).padStart(10,'0')} 00000 n \n`));
   push(ascii(`trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
   return new Blob(chunks,{type:'application/pdf'});
 }
 window.exportPrivateTerritoryPDF=async function({map,tileLayer,territory,points}){
   if(!territory?.id) throw Error('Selecciona un territorio guardado antes de exportar.');
   if(!confirm('Se descargará una ficha CONFIDENCIAL con ubicaciones y sexo de personas. Guárdala y compártela únicamente de forma segura. ¿Continuar?'))return false;
   const people=points.filter(p=>p.territory_id===territory.id);
   const image=await capture(map,tileLayer,territory,people);
   const meta={number:territory.number,locality:territory.locality,people,date:new Date().toLocaleDateString('es-PE')};
   const blob=makePdf(image,meta), url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download=`Territorio_${territory.number}_${territory.locality.replace(/[^a-zA-Z0-9_-]/g,'_')}_PRIVADO.pdf`;
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   return true;
 };
})();
