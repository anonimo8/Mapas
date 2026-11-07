# R4 · Mejora «Cómo llegar» en celular — 6 de noviembre de 2026

## Objetivo

El visitante no necesita comprender un planificador de rutas: primero busca el territorio, después pulsa un solo botón, y el sistema resuelve su punto de partida con GPS cuando existe permiso.

## Nuevo flujo

1. El visitante busca un territorio por número (o una dirección) y lo selecciona.
2. Aparece una ficha compacta bajo el buscador con el destino elegido y el botón **Cómo llegar**.
3. Al pulsar el botón se solicita GPS (si aún no estaba concedido). **Solo entonces** se obtiene la ubicación y se pide el trazado de ruta al Worker.
4. Con GPS válido, el mapa dibuja el recorrido automáticamente y muestra distancia y tiempo estimados en una tarjeta inferior.
5. Si no hay GPS, se rechaza el permiso o falla la ubicación, se muestra **«¿Desde dónde sales?»** y un buscador de lugar de partida. Elegir una coincidencia dibuja la ruta automáticamente.
6. Las opciones secundarias (reintentar GPS, elegir inicio en el mapa) se presentan únicamente en el caso de que falle el GPS. Ver pasos, cambiar recorrido a auto y cambiar origen se mantienen disponibles pero plegados.

## Qué se conservó

- Mapa y rutas dentro de Leaflet / OpenStreetMap, sin abrir Google Maps.
- Búsqueda de direcciones por el endpoint existente `/api/geocode`.
- `/api/route` del Worker y cálculo Valhalla para recorridos a pie o en auto.
- Contornos, colores, estadísticas públicas H/M con supresión de grupos pequeños.
- Área de administración `/editar`, puntos privados y D1 sin cambios.

## Límites

- Geolocalización requiere navegador compatible, permiso del usuario y **HTTPS**. No se activa sin el clic.
- No se guarda el GPS en D1, pero para calcular rutas se envían origen y destino al Worker y a su proveedor externo Valhalla.
- El trazado depende de los caminos registrados en OpenStreetMap y de la disponibilidad del proveedor; no es una navegación GPS turn-by-turn en tiempo real.
- El centro aproximado del territorio puede no coincidir con su entrada real.

## Archivo para desplegar

Subir el contenido del ZIP al mismo repositorio GitHub conectado a Cloudflare Workers. No cambiar `wrangler.jsonc`, secretos, D1 ni el endpoint del Worker. El cambio principal está en `public/index.html`, `public/style.css`, `public/app.js` y `public/version.txt`.

## Validación

- `npm run check` y `npm test`: comprobaciones automatizadas.
- Ensayo en navegador móvil con GPS autorizado: búsqueda del territorio 4 → botón visible → se crea ruta a pie sin pedir un origen manual.
- Ensayo con GPS rechazado: búsqueda → botón → aparece entrada de partida → elegir dirección → se crea ruta.
- Las pruebas del navegador se efectuaron con servicios cartográficos simulados; **no sustituyen una comprobación en el sitio de Cloudflare y un celular real**.
