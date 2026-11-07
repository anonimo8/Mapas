# R8 — Interfaz transparente en PC y controles legibles

## Cambios
- La tarjeta general del buscador y la tarjeta del territorio en **escritorio** adoptan el mismo acabado casi transparente de R7 móvil: fondos blancos al **10 %** y **8 %**, sin bloque blanco ni sombra pesada.
- Tarjeta de territorio en escritorio más compacta: nombre, botón **«Cómo llegar»** y **×** en una sola fila; desaparecen textos accesorios de la tarjeta.
- Campos y controles internos (buscador, filtros, lista de resultados, botones, GPS, resumen de ruta, «Detalles», selección de origen, zoom) usan vidrio translúcido más opaco, bordes suaves y texto oscuro para seguir siendo identificables sobre calles y polígonos.
- La ruta terminada sigue mostrándose en barra compacta; el formulario de origen manual y las indicaciones desplegables permanecen disponibles.
- La ventana de administración y el ojo de contraseña siguen funcionando sin cambios. No se modifican datos, Workers, APIs o geolocalización.

## Contraste y accesibilidad
- Los contenedores decorativos se mantienen casi transparentes; los **controles donde se escribe o pulsa** tienen fondos aprox. **72–91 %** blancos.
- Botones de acción principales conservan un verde oscuro sólido, con foco visible por teclado.
- Cuando el sistema solicita **reducir transparencia**, se prioriza una base opaca para leer mejor.

## Instalación
Reemplazar los archivos del repositorio manteniendo la estructura y publicar como siempre. Los cambios de esta versión están en `public/style.css`, `public/index.html` y `public/version.txt`. No hay migraciones D1. La comprobación de despliegue es `/version.txt`.
