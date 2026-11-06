# Actualización de interfaz y experiencia de usuario · 2026-11-05

## Cambios implementados

1. Colores individualizados por número para polígonos, etiquetas y tarjetas. La aplicación pública y el editor usan `public/territory-colors.js`.
2. Acceso **Editar** independiente por territorio en la lista pública y en los popups. La URL `/editar?territorio=<UUID>` conserva la selección al iniciar sesión.
3. Acceso **Editar** en cada territorio del panel de administración. Se habilita edición de vértices solo del contorno seleccionado, sin suprimir las herramientas de dibujo globales existentes.
4. Deshacer / Rehacer para cambios locales del dibujo y del formulario territorial; 70 estados como máximo. Atajos `Ctrl/Cmd + Z`, `Ctrl + Y` o `Cmd + Shift + Z`. No afecta acciones ya guardadas en la base de datos ni ediciones de puntos privados.
5. Editor móvil reorganizado: mapa primero y panel debajo. Cabeceras y herramientas compactas; botones de historial en una barra flotante.
6. Estética unificada cálida y orgánica, tarjetas y botones de edición diferenciados, estados de selección visibles, consejos colapsables, tamaños táctiles más generosos y mayor contraste.
7. Mantenidos controles de sesión, separación PUBLIC_DB / PRIVATE_DB y exportación PDF, sin modificar esquemas ni eliminar datos.

## Para publicar

- Reemplazar **todo el contenido del repositorio del Worker principal** con los archivos de este ZIP; mantener los valores de entorno y las bases de datos ya configuradas en Cloudflare.
- Comprobar que se despliega `src/index.js`, que sirve los archivos de `public/` y usa `src/admin/admin-page.js`.
- No es necesario modificar tablas D1 ni migrar la información existente.
- Abrir `/` en escritorio y móvil: verificar los colores, y en la lista de territorios seleccionar **Editar**.
- Iniciar sesión: comprobar que llega al territorio seleccionado. Cambiar un vértice, utilizar Deshacer/Rehacer y guardar.
- Comprobar que los puntos privados no aparecen en `/` y que el PDF sigue disponible en el editor.

## Validación local

`npm run check && npm test` (requiere Node 22 o compatible). Se ejecutaron además pruebas de interfaz DOM simulando Leaflet, escritorio y móvil. No se realizaron pruebas contra Cloudflare real ni se desplegó este ZIP.
