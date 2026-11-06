# Actualización del editor: arrastrar cuadros completos · 6 de noviembre de 2026

Este cambio modifica **únicamente la interacción del editor administrativo** en `/editar`.

## Cómo utilizarlo

1. Abre `/editar` y selecciona el territorio existente (o dibuja uno nuevo).
2. Pulsa **✎ Editar** en la lista o en la barra inferior del mapa.
3. Coloca el cursor **dentro** del contorno, mantén pulsado el botón izquierdo y arrastra el **cuadro entero** hasta la nueva ubicación. Su forma, tamaño, vértices y número se mantienen mientras lo desplazas.
4. Para cambiar el tamaño o la silueta, utiliza los tiradores blancos de vértices como antes.
5. Pulsa **Guardar territorio** para conservar el cambio. **Deshacer/Rehacer** siguen funcionando antes de guardar.

También se admite desplazar un contorno durante el modo de edición global de Leaflet.Draw. El arrastre del mapa fuera del modo de edición funciona como antes. Si se cancela el gesto con una interrupción del puntero, la figura vuelve a su posición inicial.

## Datos y despliegue

- No se ha cambiado ningún polígono guardado, imagen, GeoJSON, script público, API, esquema SQL, credencial, marcador privado ni configuración.
- No hay migraciones D1 ni instrucciones para eliminar o recrear bases de datos.
- El cambio se aplica a `src/admin/original-admin.html` y a su versión generada `src/admin/admin-page.js` (la utilizada por el Worker principal).
- Se añade una prueba automatizada `tests/drag-territories.mjs` y se incluye en `npm test`.
- Para instalar: sustituye los archivos de tu proyecto actual por los de este ZIP en el repositorio que despliega el Worker principal, sin resetear D1. Comprueba `/editar` tras el despliegue.

**Nota:** los territorios que ya existen en Cloudflare no se sustituyen al instalar esta actualización. Únicamente se guardará una nueva posición si el administrador arrastra una figura y pulsa **Guardar territorio**.
