# Publicación de R7 — Interfaz de destino transparente

## GitHub / Cloudflare

1. Descomprimir el ZIP completo y reemplazar los archivos del repositorio conservando su estructura.
2. Hacer commit y publicar la versión del Worker en Cloudflare siguiendo la configuración que ya usa el proyecto.
3. Verificar que `/version.txt` muestre `MAPA_PUBLICO_R7_2026-11-07_GLASS_MOBILE`.
4. En el celular, recargar la página sin caché para recibir `style.css?v=20261107r7`.

**Si ya está publicada R6 y solo se quiere aplicar el cambio visual**, bastan estos archivos:

- `public/style.css` (transparencia y legibilidad)
- `public/index.html` (identificador de versión y caché del CSS)
- `public/version.txt` (verificación de despliegue)

No volver a importar los SQL, ni reiniciar la base de datos D1; no hay migraciones. Se preservan GPS, rutas, administración y el ojo para contraseña.

## Transparencia elegida

- Contenedor general del buscador: 10 % de blanco, sin sombra ni desenfoque.
- Fila del territorio seleccionado: 8 % de blanco.
- Campo editable de búsqueda: 77 % de blanco para mantener suficiente legibilidad.
- Botón «Cómo llegar»: verde sólido para poder distinguirlo de las calles.

El acabado puede cambiar ligeramente con el navegador y la cartografía que aparezca detrás. Comprobar en teléfono real tras publicar.
