# Actualización correcta del mapa público (versión 3 · revisión 2)

## Por qué sigue igual la página

Si la página sigue mostrando el cuadro grande «REGISTRO GENERAL / Menos de 5», está sirviendo la interfaz pública anterior. **El ZIP enviado por el chat no publica los cambios en la web por sí solo**. Deben actualizarse los archivos fuente de la aplicación en el proyecto desplegado (y completarse la publicación de Cloudflare).

La actualización anterior sí incluye los cambios en `public/index.html`, pero la captura corresponde exactamente al HTML viejo, que contiene `class="community-summary"` y `id="deafCount"`. El archivo nuevo no contiene esos elementos.

## Vía A: actualizar solo cuatro archivos en GitHub (más fácil)

1. Descomprime **ACTUALIZACION_SOLO_ARCHIVOS.zip**. No cargues el ZIP como un único archivo en GitHub.
2. Abre el repositorio GitHub conectado al Worker `mapas` de Cloudflare. En la **raíz del repositorio**, actualiza los archivos **conservando rutas y nombres**:
   - `public/index.html`
   - `public/style.css`
   - `public/app.js`
   - `src/index.js`
   - `public/version.txt` (archivo nuevo; verificación)
3. Confirma los cambios (**Commit changes**). Si Cloudflare despliega automáticamente el repositorio, comprueba que el despliegue nuevo figure como **Success**. Si tu Worker se despliega manualmente, ejecútalo desde la raíz del proyecto con `npx wrangler deploy` usando tu acceso existente a Cloudflare.
4. Visita `https://mapas.territorios.workers.dev/version.txt`: debe devolver `MAPA_PUBLICO_V3_2026-11-06_R2`. Si no aparece, **el nuevo código todavía no está desplegado en esa dirección**.
5. Abre `https://mapas.territorios.workers.dev/?v=20261106r2` en una pestaña privada o usa Ctrl+Shift+R. Debes ver una barra **«Encuentra un territorio»** en la parte superior izquierda y **«Mi ubicación»** a la derecha. El cuadro «REGISTRO GENERAL» no debe aparecer.

Si `/version.txt` devuelve la revisión nueva pero la página sigue vieja, revisa que el proyecto esté usando `public/index.html` como raíz de assets, no una carpeta `Mapas-main/public` anidada ni un deploy anterior. El código del Worker debe usar `assets.directory: ./public`, tal como aparece en `wrangler.jsonc`.

## Vía B: reemplazar todo el proyecto

Descomprime **MAPA_COMPLETO_RAIZ_GITHUB.zip** y sube el **contenido** directamente a la raíz del repositorio, respetando los archivos y carpetas `public/`, `src/`, `database/`, etc. Esta variante NO incluye una carpeta adicional `Mapas-main/` por fuera. Conserva las variables Secret y las bases D1 existentes de Cloudflare. No borres bases de datos ni vuelvas a ejecutar esquemas sobre datos existentes.

## Qué cambia

- Buscador por número de territorio y dirección.
- GPS con permiso de la persona usuaria y conexión HTTPS.
- Botón «Cómo llegar» que abre Google Maps al pulsarlo.
- Eliminación del contador general grande de la vista pública.
- Etiquetas H/M pequeñas en la esquina de cada territorio. Se ocultan los recuentos individuales inferiores a cinco para evitar revelar datos sensibles. Los conteos solo se alimentan desde territorios publicados y una base privada vinculada.
- Los registros y puntos individuales siguen accesibles únicamente desde el panel administrativo autenticado.

## Comprobaciones

En la raíz del proyecto: `npm run check` y `npm test`.

**Importante:** Esta entrega prepara el código, pero no lo publica en la cuenta Cloudflare del usuario. No se han verificado GPS o rutas contra su sitio real.
