# Corrección del editor: los controles de vértices acompañan al territorio

La actualización anterior permitía arrastrar el contorno completo, pero los cuadrados blancos de edición podían permanecer en las coordenadas antiguas.

## Comportamiento corregido

- Al mantener presionado el mouse y arrastrar un territorio en modo **Editar**, la figura, los vértices y los puntos intermedios se trasladan en paralelo durante todo el movimiento.
- Al soltar el mouse, Leaflet.Draw actualiza sus referencias internas a la geometría nueva. Así se puede ajustar un vértice o el tamaño después de mover el territorio, sin que los controles vuelvan a la ubicación anterior.
- Funciona tanto con polígonos editables como con rectángulos y con la edición global.
- Cancelar el arrastre recupera la geometría inicial y vuelve a generar los controles.
- Los cambios siguen siendo temporales hasta pulsar **Guardar territorio**; se conserva el historial Deshacer/Rehacer.

## Alcance y archivos

Solo se modificaron los dos archivos de la interfaz administrativa del Worker principal:

- `src/admin/original-admin.html` (fuente HTML)
- `src/admin/admin-page.js` (HTML empaquetado que sirve `/editar`)

Se amplió `tests/drag-territories.mjs` para comprobar la sincronización de los vértices y se añadió esta nota. El resto del proyecto, los datos de los mapas, fotografías de referencia, puntos privados, bases de datos, API y configuración se conservaron. No se requiere migración D1.

## Instalación

Actualiza el proyecto desde el ZIP y despliega el Worker principal (`wrangler.jsonc` en la raíz). Abre `/editar`, selecciona un territorio, pulsa **Editar**, arrastra el contorno y comprueba que los controles se desplazan junto a él. Guarda solo si deseas confirmar la nueva posición.
