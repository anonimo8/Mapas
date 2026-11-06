# Restaurar divisiones y administración — Mapas Lambayeque

## ¿Por qué la vista pública salió vacía?

El mapa público consulta **solo** los territorios guardados como `published=1` en la base D1 conectada como `PUBLIC_DB`. La leyenda «No hay territorios publicados» no demuestra que se borraron: pueden seguir guardados como borradores (`published=0`). Otro motivo posible es que la base D1 conectada sea distinta de la que contiene los territorios o que estos aún no se hayan importado. No se puede verificar el estado real de tu cuenta desde este ZIP.

La última actualización había quitado el acceso visual a administración al limpiar la pantalla. Esta versión lo restablece sin volver a añadir menús a la vista pública.

## Instalación recomendada — no cambiar la configuración de Cloudflare

1. Antes de actualizar, haz una copia de seguridad de tu repositorio y, si puedes, una exportación de las D1 existentes desde Cloudflare.
2. Descarga **Mapas_Parche_Restauracion_Admin_Territorios.zip**, descomprímelo y sube su contenido a la **raíz del repositorio GitHub existente** (no subas el ZIP como un único archivo y no crees un nuevo proyecto).
3. El parche sustituye `public/index.html`, `public/style.css`, `public/app.js`, `src/admin/original-admin.html`, `src/admin/admin-page.js` y `src/auth.js`. **No** incluye `wrangler.jsonc`, bases D1 ni secretos. Conserva todos los bindings y valores originales que ya tienes conectados.
4. Haz commit y verifica en Cloudflare Workers → `mapas` → Deployments que el despliegue haya terminado correctamente.
5. Abre **https://mapas.territorios.workers.dev/editar** directamente o el pequeño botón «Administración» de la esquina inferior izquierda. Inicia sesión con tu **contraseña actual** (no se resetea ni modifica).
6. Dentro de administración, busca el bloque **Territorios guardados**. Ahora señala cuántos están **publicados**, cuántos son **borradores**, y cuántos hay en total.
   - Si hay territorios guardados pero **0 publicados**, revisa los límites y pulsa **Publicar** al lado de cada territorio aprobado. Se mostrarán con sombreado sutil y número en el mapa público.
   - Si no hay ninguno, verifica primero que `PUBLIC_DB` apunte a la D1 correcta y que contiene registros. **Solo si los contornos no están en tu base**, el botón «Recuperar los 11 contornos de referencia» los añade como **borradores aproximados**, sin sobrescribir números existentes. Revisa/ajusta cada uno y publícalo cuando sea correcto.
   - Si faltan únicamente algunos y hay menos de 11, el botón también permite importar solo los números no encontrados. No reemplaza los existentes.
7. Abre el mapa público, actualiza la página con `Ctrl+F5` y verifica las divisiones coloreadas y numeradas.

## Si tampoco te permite ingresar con la contraseña

Si `/editar` te lleva a `/acceso` y aparece **«Falta configurar el editor»**, revisa en Cloudflare → Workers & Pages → `mapas` → Settings que estén conectados `PRIVATE_DB` y los dos secretos `ADMIN_PASSWORD` (mínimo 12 caracteres) y `ADMIN_SESSION_SECRET` (mínimo 32 caracteres). La página ahora indica cuáles faltan, sin revelar valores privados.

Si aparece «Contraseña incorrecta», revisa tu contraseña de administración existente. Si aparece «La base D1 privada no tiene la tabla admin_login_limits», revisa que se haya ejecutado `database/private_schema.sql` en la **D1 privada correcta**. No borres tablas para resolverlo.

Para comprobar la base geográfica pública, abre **https://mapas.territorios.workers.dev/api/health**. Si `database` dice que faltan tablas o que no está conectada, revisa el binding `PUBLIC_DB`. Un resultado saludable no demuestra que haya polígonos publicados: esa información la verás en administración.

## Qué permanece igual

- Contornos diferenciados por color, sombreado transparente y número dentro de cada zona.
- Solo total general de registros de personas sordas en la vista pública, nunca coordenadas ni marcadores de personas; muestra `0` si no hay registros en `private_person_points`.
- Herramientas de edición, Ctrl+Z/Ctrl+Y, PDF y puntos privados permanecen en la ruta protegida `/editar`.
- No se crean, alteran, publican ni borran territorios **automáticamente** por instalar el ZIP. La publicación requiere tu confirmación dentro del editor.
- Este parche no modifica contraseñas, bindings, nombres de bases de datos ni sus identificadores.
