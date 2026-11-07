# Mapa público con navegación integrada — R3 (06-11-2026)

## Actualización recomendada: paquete de seis archivos

1. Descomprime `ACTUALIZACION_MAPA_RUTAS_INTERNAS_R3.zip`.
2. Copia y reemplaza, manteniendo exactamente las rutas **desde la raíz del repositorio GitHub del Worker**:
   - `public/index.html`
   - `public/style.css`
   - `public/app.js`
   - `public/version.txt`
   - `src/index.js`
   - `src/routing.js` (**archivo nuevo, imprescindible**)
3. Haz commit y confirma que Cloudflare despliegue el nuevo código del Worker. Se requiere desplegar tanto `public/` como `src/`; si solo se publican los HTML/JS sin `src/routing.js`, la navegación no funcionará.
4. Comprueba `/version.txt`: debe decir `MAPA_PUBLICO_V4_2026-11-06_R3`.
5. Abre el mapa con `?v=20261106r3` y recarga con `Ctrl+Shift+R` si fuese necesario.

**No importes archivos SQL de nuevo, no crees tablas ni restablezcas D1.** Esta actualización no modifica el administrador, las contraseñas, los territorios ni las estadísticas H/M.

## Comportamiento de «Cómo llegar»

- Elige un territorio o dirección y pulsa **Cómo llegar**.
- Selecciona «Desde mi ubicación» (permiso GPS), «Elegir inicio en mapa» o busca una dirección de partida.
- Elige «A pie» o «En auto»; se dibuja en el mapa Leaflet una línea azul, con distancia, tiempo estimado e indicaciones.
- No abre ni redirige a Google Maps.
- Para cálculo de rutas se consulta el servidor público Valhalla de OpenStreetMap a través de `/api/route`, sin guardar coordenadas. El servidor de demostración tiene límites de uso y no garantiza continuidad; si se usa mucho, debe configurarse un servicio de rutas propio o dedicado.
- Para territorios, el punto de destino es **aproximadamente el centro del territorio**, no una entrada o domicilio exacto.

## Comprobación técnica

Ejecutar en la raíz del repositorio: `npm run check` y `npm test`.
La funcionalidad se ha probado con respuestas simuladas del servicio de rutas, no con un GPS real ni con el servicio remoto desde Cloudflare. Después del despliegue se recomienda probar un recorrido de Lambayeque a un territorio cercano.
