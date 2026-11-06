# Mejoras del mapa público · 6 de noviembre de 2026

## Qué cambia en la vista pública

- Barra superior izquierda para buscar un **territorio por número** o una **dirección**.
- La búsqueda de direcciones consulta OpenStreetMap / Nominatim mediante el Worker, con limitación de solicitudes y caché. Se ofrecen coincidencias para seleccionar: no hay garantía de precisión exacta de todas las direcciones.
- Botón **Mi ubicación** para mostrar la ubicación aproximada/precisa según GPS, dispositivo y permisos del navegador; requiere HTTPS o localhost. Muestra también el radio de precisión que reporta el dispositivo.
- Al seleccionar un territorio o dirección aparece **Cómo llegar**. Solo después del clic se abre Google Maps para ofrecer una ruta peatonal. Los destinos de territorios son centros aproximados, no entradas verificadas. Google Maps calcula el recorrido y su disponibilidad depende del servicio externo.
- Se retira el bloque grande «REGISTRO GENERAL» / «Menos de 5 personas sordas registradas» de la vista pública.
- Cada territorio muestra una etiqueta **pequeña H / M** en una esquina de su área. Las cifras son agregadas por territorio publicado. Los valores individuales de 1 a 4 se sustituyen por «—» para evitar exponer grupos muy pequeños; las cifras exactas se mantienen solo en el área administrativa protegida. Sin PUBLIC_DB, PRIVATE_DB o territorios publicados los datos públicos no estarán disponibles.
- Se conserva el diseño de límites, la paleta, el editor administrativo, el arrastre de polígonos y la gestión de puntos privados.

## Archivos principales

- `public/index.html` — interfaz, búsqueda, GPS, ruta.
- `public/style.css` — estilo responsive, rótulos pequeños y controles.
- `public/app.js` — interacción, carga de territorios y estadísticas agregadas.
- `src/index.js` — endpoints de estadísticas agregadas protegidas y geocodificación limitada.
- `tests/smoke.mjs` y `tests/ux-territories.mjs` — pruebas de visibilidad pública/privacidad.

## Despliegue

Usa el flujo de instalación ya documentado en `INSTALACION_UNICA.md` / `GUIA_GITHUB_CLOUDFLARE.md`. Deben mantenerse los bindings D1 `PUBLIC_DB` y `PRIVATE_DB` y el Durable Object `LIVE`. No es necesario configurar una API key de Google Maps para el enlace «Cómo llegar», porque abre Google Maps fuera del sitio.

## Validación local

`npm run check` — aprobado.

`npm test` — aprobado (7 suites).

Estas pruebas validan código y rutas; no constituyen una prueba GPS real ni una verificación de geocodificación externa en producción.
