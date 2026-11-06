# Actualización de la vista pública: solo divisiones y contador

- Se muestra el mapa a pantalla completa (escritorio y celular), sin barra lateral, puntos públicos, buscadores ni botones de edición.
- Cada territorio publicado conserva su color distintivo, ahora con **sombreado sutil (13%)**, bordes suaves y su **número centrado**.
- La vista centra automáticamente los polígonos publicados al abrir el mapa; después respeta el zoom y los desplazamientos del visitante.
- En la esquina superior derecha aparece el **total general de personas sordas registradas**, consultado directamente por el Worker mediante una consulta `COUNT(*)` a la D1 privada.
- Se publica **solo ese total general**, nunca coordenadas, fichas personales, sexo, notas ni cifras por territorio. Para evitar identificación en grupos pequeños, los totales entre 1 y 4 se muestran como «Menos de 5». Si la D1 privada no está disponible, se muestra «—»; no se inventan cifras.
- El contador y los polígonos se actualizan al llegar avisos en vivo y cada 60 segundos, sin recargar la página.
- El editor protegido sigue disponible en la dirección **`/editar`**. No se ha eliminado ni modificado el panel de administración.

## Instalación

Sube el proyecto actualizado a GitHub y despliega el mismo Worker de Cloudflare. No se necesitan cambios en la estructura de las dos D1, secretos ni migraciones. La nueva ruta pública `/api/public-summary` exige que el Worker mantenga su binding `PRIVATE_DB` para calcular únicamente el total agregado.

**Nota sobre privacidad:** El contador de personas con discapacidad auditiva constituye información estadística sensible. Antes de publicar este indicador, asegúrate de que su divulgación agregada está autorizada. Los puntos privados permanecen protegidos por la sesión administrativa.
