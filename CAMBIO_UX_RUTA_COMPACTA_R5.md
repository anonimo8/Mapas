# R5 · «Cómo llegar» compacto en celular

## Cambio principal

Tras calcular una ruta, el panel inferior grande **se convierte en una barra discreta** de aproximadamente 60 px de altura. Muestra únicamente la distancia y el tiempo estimado a pie/en auto, con botones **Detalles** y **×**. Oculta el texto «Ruta lista» y las opciones adicionales sin eliminar esas funciones.

- **Detalles** despliega los pasos del recorrido y opciones avanzadas, que siguen plegadas por defecto; **Ocultar** devuelve la tarjeta compacta.
- **×** cierra el recorrido y libera el mapa.
- Si GPS está desactivado, se conserva el formulario para ingresar el punto de partida.
- El encuadre automático de la ruta reserva menos altura abajo para mostrar más mapa.
- Los controles de zoom se desplazan encima de la barra; el acceso de administración se oculta mientras está la ruta (sin eliminarlo del sitio).
- No se modificaron bases de datos, Worker, API ni administración.

## Publicación

Subir los archivos del ZIP al repositorio que despliega el Worker de Cloudflare. Los cambios funcionales están en `public/index.html`, `public/style.css`, `public/app.js` y `public/version.txt`. Se cambió el parámetro de versión de los recursos para evitar que el navegador use el CSS anterior.

## Comprobación

Revisar en un celular real la búsqueda, «Cómo llegar», GPS, detalles y opción de origen manual. Las pruebas automatizadas no sustituyen el chequeo GPS con permisos reales.
