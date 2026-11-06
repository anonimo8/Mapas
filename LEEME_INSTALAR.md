# Incorporar los 11 territorios del PDF — sin puntos

## Instalación en el repositorio EXISTENTE `anonimo8/Mapas`

Este ZIP es una **actualización parcial** (no reemplaces todo el repositorio ni `wrangler.jsonc`).

1. Descomprime el ZIP.
2. En GitHub → `anonimo8/Mapas` → **Add file → Upload files**, arrastra los directorios `src`, `public`, `data` y `docs` de este ZIP para conservar las rutas. Confirma que GitHub reemplace los dos archivos existentes `src/admin/index.js` y `src/admin/admin-page.js`; los demás son nuevos.
3. Haz **Commit changes** y confirma **Success** en Cloudflare → Workers → `mapas` → Deployments.
4. Abre `https://mapas.territorios.workers.dev/editar`, inicia sesión y pulsa **Cargar los 11 territorios (sin puntos)**. Aparecerán en **Territorios guardados** como borradores.
5. Selecciona cada territorio. A la izquierda verás la imagen del PDF correspondiente. Ajusta los vértices del polígono para seguir las calles de la referencia y pulsa **Guardar**.
6. Cuando corrijas y verifiques un territorio, activa **Publicar en el mapa público** y guarda. Se mostrará en la página inicial.

**IMPORTANTE:** El PDF no trae límites dibujados ni coordenadas geográficas. Los 11 polígonos incluidos son **aproximaciones geográficas iniciales y NO reproducciones exactas**. Nunca se publican solos. Este proyecto no añade ni expone puntos, sexo ni cantidades de personas.

La importación es repetible: si el número ya existe en la base D1, se respeta tal cual y no se sobrescribe.

No modifiques ni borres tu base de datos D1. Si tienes territorios `#1`–`#11` creados antes, no se duplican ni se sobrescriben.

## Archivos que incluye

- `src/admin/index.js`: ruta protegida de importación.
- `src/admin/reference-territories.js`: 11 geometrías de borrador.
- `src/admin/admin-page.js`: botón, selección, referencias y controles.
- `public/reference-map/territorio-01.webp` a `territorio-11.webp`: capturas geográficas recortadas sin el encabezado de cantidades del PDF.
- `data/lambayeque_11_borradores.geojson`: archivo GIS de referencia.
- `docs/COMPROBACION.md`: advertencias y plan de revisión.
