# Territorios Lambayeque — actualización V2 en tu GitHub existente

**Para quien YA ve el mapa público:** NO crees otro proyecto ni borres la base D1 actual. Esta actualización agrega un registro privado de personas (sexo y coordenadas) y una ficha PDF por territorio.

## 1) Antes de subir los cambios a GitHub: crea la D1 PRIVADA

1. En [Cloudflare Dashboard](https://dash.cloudflare.com/), abre **Storage & databases → D1 SQL Database → Create**.
2. Nombre: **`lambayeque_territorios_privados`**. Es una base **NUEVA**, diferente de `lambayeque_territorios_publicos`.
3. Abre la nueva base → **Console**. Copia y ejecuta todo el archivo `database/private_schema.sql` de este proyecto. Debe crear `private_person_points` y su índice.
4. Copia su **Database ID** (UUID de D1 privada).
5. Abre `admin-worker/wrangler.jsonc` y sustituye **solo** `REEMPLAZAR_UUID_D1_PRIVADA` por ese UUID. Deja el ID REAL de tu base pública donde dice `PUBLIC_DB`.
6. Comprueba que `wrangler.jsonc` de la **raíz del repositorio** solo tiene `PUBLIC_DB`. **Nunca agregues `PRIVATE_DB` al Worker público.**

Si tu proyecto anterior todavía tiene `REEMPLAZAR_UUID_D1` en los archivos, sustitúyelo por el UUID real de la D1 **pública que ya funciona**. No crees otra base pública.

**No cargues datos personales reales en GitHub, archivos SQL del proyecto ni ejemplos de prueba. Los puntos se registran después, desde el panel privado.**

## 2) Actualiza tu repositorio privado de GitHub

1. Descarga el ZIP V2 y usa **Extraer todo** de Windows.
2. Copia el contenido de la carpeta descomprimida en el repositorio local que ya usas (por ejemplo con GitHub Desktop). **Sustituye** los archivos existentes; conserva tu repositorio, la rama y tus credenciales.
3. Confirma que en la raíz están `public/`, `src/`, `admin-worker/`, `database/`, `wrangler.jsonc`.
4. Haz **Commit to main → Push origin**. Si usas GitHub web, actualiza los archivos de la misma estructura, sin crear otra carpeta contenedora.
5. Cloudflare volverá a desplegar los dos Workers conectados. La D1 que ya contiene tus territorios **no se elimina ni se reemplaza** al actualizar el código.

> Importante: crea y configura la D1 privada **antes** de hacer el commit; de otro modo el despliegue del Worker administrativo puede fallar porque su configuración tendrá un UUID de ejemplo.

## 3) Verifica el acceso privado (obligatorio)

En Cloudflare → **Workers & Pages → `lambayeque-territorios-administracion`**:

- **Access**: protege este Worker; política **Allow para tu correo exacto**, preferiblemente con MFA. No habilites acceso a todos los usuarios ni a todo un dominio.
- **Settings → Variables & Secrets**: comprueba que existe `ADMIN_EMAIL` con **ese mismo correo**. Mantén el secreto fuera de GitHub.
- **Bindings**: comprueba `PUBLIC_DB` (base geográfica) y `PRIVATE_DB` (base confidencial).
- Abre el Worker **administrativo**, no la URL pública del mapa. Al entrar debe aparecer la sección verde **Puntos permanentes: hombres y mujeres**. Si esa sección dice que falta `PRIVATE_DB`, revisa los pasos 1 y 3.

**Seguridad:** el Worker público no recibe la D1 privada y no ofrece un endpoint para los puntos H/M. El Worker privado exige identidad validada por Cloudflare Access en cada solicitud.

## 4) Cómo usar el mapa ya actualizado

### A. Crear un territorio / dividir una zona

1. En el **panel administrativo**, elige localidad.
2. En la esquina superior derecha del mapa usa **Dibujar polígono** o **Dibujar rectángulo**.
3. Dibuja siguiendo calles y manzanas. Pon **número único** y pulsa **Guardar territorio**.
4. Para modificar un territorio, selecciónalo en la lista; usa la herramienta **Editar vértices** y vuelve a guardar.
5. Para dividir un territorio grande, dibuja un segundo polígono, modifica el primero para que no se superpongan y guarda ambos con números diferentes. **No existe todavía un corte automático con una línea**.
6. El territorio empieza **sin publicar**. Solo activa la publicación si ese contorno no expone información confidencial.

### B. Marcar hombres y mujeres permanentemente

1. En la sección **Puntos permanentes: hombres y mujeres**, pulsa **Añadir punto privado**.
2. Haz clic en la dirección correcta sobre el mapa. Aparecerán sus coordenadas.
3. Elige **Hombre (H)** o **Mujer (M)** y el territorio (o deja sin asignar).
4. Pulsa **Guardar punto privado**.
5. El punto queda en la **D1 privada**, con marcador H/M, incluso después de cerrar sesión. Para editarlo, selecciónalo en la lista. También puedes arrastrar el marcador y pulsar **Guardar**.
6. Si el punto pertenece a un territorio, debe estar dentro de su contorno y se admiten como máximo **6 personas asignadas** por territorio. Los puntos sin territorio se pueden organizar más adelante.

### C. Descargar la ficha PDF de un territorio

1. Selecciona un territorio guardado en la lista.
2. Pulsa **Encuadrar / recortar vista** para acercarte al contorno.
3. Ajusta el zoom y mueve el mapa para escoger el área exacta que aparecerá en el PDF.
4. Espera a ver cargadas las calles; pulsa **Descargar PDF** y confirma el aviso de confidencialidad.
5. Se descargará una ficha **horizontal 16:9**, inspirada en tu PDF: `TERRITORIO # - localidad`, mapa, contorno, marcadores H/M, total, desglose y pie **CONFIDENCIAL**.

El exportador toma **solo las imágenes cartográficas visibles en pantalla**, no genera capturas masivas de OpenStreetMap. Si tu proveedor cartográfico deniega capturas por CORS o no carga las teselas, el programa mostrará un error en vez de entregar un PDF sin calles. Utiliza un proveedor que permita exportación si ocurre ese caso.

## 5) Para diagnosticar

| Problema | Solución |
|---|---|
| El mapa público sigue funcionando, pero no hay H/M | Correcto: **los H/M solo se muestran en administración**, nunca en el sitio público. |
| Panel privado dice `PRIVATE_DB` no conectada | Crear D1 privada, ejecutar `database/private_schema.sql`, actualizar UUID privado en `admin-worker/wrangler.jsonc` y redeplegar. |
| Worker administrativo falla al desplegar | No dejar `REEMPLAZAR_UUID_D1_PRIVADA` ni `REEMPLAZAR_UUID_D1`; verificar root `admin-worker`. |
| El panel devuelve 403 | Cloudflare Access y `ADMIN_EMAIL` deben estar configurados correctamente. |
| No permite guardar el séptimo punto | Es intencional: límite de 6 personas **asignadas** a cada territorio. Divide el contorno. |
| El punto no puede asignarse | Comprueba que esté **dentro** del polígono de ese territorio. |
| No se descarga PDF | Usa el panel privado, selecciona territorio, espera a que se carguen las calles y revisa el mensaje mostrado. |
| No veo un territorio en el mapa público | Se guarda oculto hasta activar **Publicar**, por privacidad. |

## 6) Privacidad y limitaciones

- Cloudflare aloja el Worker y la D1 confidencial. Aunque solo tu cuenta se autoriza en la aplicación, **Cloudflare como proveedor mantiene capacidad operativa sobre la infraestructura**, y nadie puede garantizar que ni el proveedor ni un administrador de la cuenta puedan acceder técnicamente a los datos. Activa MFA, controla los permisos de tu cuenta y aplica copias cifradas.
- Los PDF descargados en tu computadora **ya no quedan bajo el control de Cloudflare Access**. Trátalos como archivos confidenciales y evita guardarlos en carpetas públicas.
- Leaflet y Leaflet Draw se cargan de CDN (unpkg) como en la versión anterior. Para requisitos más estrictos puede convenir alojar y verificar localmente esas dependencias.
- OpenStreetMap tiene [política de uso](https://operations.osmfoundation.org/policies/tiles/) y límites de disponibilidad. No es un servicio ilimitado de mapas para PDF.
- Código probado localmente (API, permisos, validaciones y estructura del PDF). **No se ha hecho una prueba real en tu cuenta Cloudflare ni con sus permisos/D1/tiles**.

## Fuentes oficiales

- Cloudflare Access: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- Cloudflare D1: https://developers.cloudflare.com/d1/get-started/
- Wrangler D1: https://developers.cloudflare.com/workers/wrangler/configuration/
- OpenStreetMap tiles: https://operations.osmfoundation.org/policies/tiles/
