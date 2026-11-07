# Instalar R8 (PC + controles de mapa)

1. Descomprimir el ZIP completo dentro del repositorio y sustituir los archivos correspondientes.
2. Hacer commit y dejar que GitHub/Cloudflare despliegue el Worker como de costumbre.
3. Comprobar `/version.txt`: `MAPA_PUBLICO_R8_2026-11-07_GLASS_DESKTOP_CONTROLS`.
4. Actualizar con recarga forzada si se veía una versión en caché. `style.css` y `app.js` se sirven con `?v=20261107r8`.
5. Revisar desde una PC y un teléfono la selección de territorio, GPS y rutas.

**Solo cambia el diseño público; no importar SQL ni reiniciar la base de datos.** La autenticación administrativa y el ojo de contraseña se conservan.
