# GUÍA — Subir a GitHub y desplegar automáticamente en Cloudflare

**Usa esta guía en Windows, sin necesidad de programar ni usar una terminal.** No subas el ZIP directo a GitHub: **descomprímelo y sube su contenido**, con las carpetas incluidas. Los dos Workers se conectan al **mismo repositorio privado**.

> Seguridad: No se incluye ninguna información sobre personas sordas. No escribas nombres, domicilios, sexo, ubicaciones particulares, cantidad de personas, registros de visitas ni ninguna otra información confidencial en estos archivos, en GitHub ni en D1 pública.

## PASO 1. Crear la base D1 en Cloudflare (ANTES de publicar GitHub)

1. Abre https://dash.cloudflare.com/ e ingresa a tu cuenta.
2. Ve a **D1 SQL Database** (puede aparecer en el menú **Storage & databases → D1 SQL Database**).
3. Selecciona **Create database**.
4. Nombre exacto: `lambayeque_territorios_publicos`.
5. Abre esa base, entra a **Console** y pega **todo** el contenido del archivo `database/schema.sql` del ZIP. Selecciona **Execute**.
6. Comprueba que existen las tablas `territories` y `points`. Las tablas nuevas estarán vacías (correcto).
7. Copia el identificador **Database ID** (UUID), por ejemplo `12345678-1234-1234-1234-123456789abc` (es un ejemplo inventado, NO lo uses).

**Muy importante:** Es una sola base D1 utilizada por los dos Workers, **exclusivamente para geografía no confidencial**. Si la interfaz de Cloudflare cambia, busca el apartado **D1 / SQL Database**.

## PASO 2. Colocar tu ID de D1 en los 2 archivos

Abre en un editor de texto (Bloc de notas/VS Code) estos dos archivos de la carpeta descomprimida:

- `wrangler.jsonc` (raíz del repositorio — mapa público).
- `admin-worker/wrangler.jsonc` (panel administrativo).

Busca `REEMPLAZAR_UUID_D1` en **ambos** y sustitúyelo por el **mismo UUID de la base D1** copiado en el paso 1. No modifiques `binding`, `name`, `script_name` ni `class_name`. Guarda ambos archivos.

La parte relevante debe verse así (ejemplo, cambia el UUID):

```json
"d1_databases": [
  {
    "binding": "PUBLIC_DB",
    "database_name": "lambayeque_territorios_publicos",
    "database_id": "12345678-1234-1234-1234-123456789abc"
  }
]
```

El UUID de D1 es un identificador, no una contraseña. **Nunca subas secretos, claves privadas, token de Cloudflare ni datos de personas a GitHub.**

## PASO 3. Crear el repositorio privado en GitHub

1. Abre https://github.com/new.
2. Nombre: **`territorios-lambayeque`**.
3. Selecciona **Private**. No marques la opción de crear README automáticamente; ya viene incluido.
4. Pulsa **Create repository**.
5. En GitHub, usa **uploading an existing file** (o **Add file → Upload files**).
6. Desde la carpeta DESCOMPRIMIDA, sube **todos los archivos y carpetas internos** (no el ZIP y no una sola carpeta envolvente). Si el navegador no mantiene carpetas, usa **GitHub Desktop** para subir la carpeta del proyecto.
7. Confirma con **Commit changes**.

Al abrir el repositorio, su raíz debe mostrar: `wrangler.jsonc`, `package.json`, `public/`, `src/`, `admin-worker/`, `database/` y `README.md`.

## PASO 4. Desplegar el Worker PÚBLICO desde GitHub

1. Abre https://dash.cloudflare.com/ → **Workers & Pages** → **Create application** → **GitHub** (o **Import a repository**).
2. Autoriza el acceso al repositorio privado `territorios-lambayeque` si lo pide.
3. Elige el repositorio y la rama `main`.
4. Comprueba estos valores:

| Campo Cloudflare | Valor |
| --- | --- |
| Project/Worker name | `lambayeque-territorios-publico` |
| Root directory | Raíz del repositorio (`/`, `.` o dejar vacío según la UI) |
| Build command | `npm install` |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |

5. Pulsa **Save and Deploy**.
6. El Worker debe quedar publicado en una URL parecida a `https://lambayeque-territorios-publico.TU_SUBDOMINIO.workers.dev`.
7. Comprueba `/api/health`: debe devolver `"ok": true` y `"database": "conectada"`.
8. Abre la raíz `/` y comprueba que aparece el mapa. Es **normal** que todavía no se vean territorios dibujados: la base empieza vacía.

Si Cloudflare dice **"Missing entry-point"**, la raíz está mal seleccionada o no encuentra `wrangler.jsonc`. Si indica que no encuentra la base D1, vuelve al paso 2. Si devuelve `/api/health` un error sobre tablas, vuelve al paso 1.

## PASO 5. Desplegar el Worker ADMINISTRATIVO desde el MISMO GitHub

1. Vuelve a **Workers & Pages → Create application → GitHub**.
2. Selecciona **el MISMO repositorio** `territorios-lambayeque` y rama `main`.
3. Configura estos valores:

| Campo Cloudflare | Valor |
| --- | --- |
| Project/Worker name | `lambayeque-territorios-administracion` |
| Root directory | `admin-worker` |
| Build command | `npm install` |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |

4. Selecciona **Save and Deploy**.
5. **Importante:** Antes de configurar la seguridad, este Worker deberá mostrar `403` (bloqueado). **Es intencional**: no abre la administración sin Access y sin `ADMIN_EMAIL`.

## PASO 6. Proteger administración con Cloudflare Access

1. En Cloudflare, abre **Workers & Pages** y selecciona **`lambayeque-territorios-administracion`**.
2. Busca su pestaña **Access** y elige **Protect this Worker behind Access**. Si Cloudflare requiere Zero Trust, actívalo siguiendo los pasos en pantalla.
3. Configura una política **Allow** para **únicamente tu dirección de correo**, no para todo un dominio ni para todos los usuarios de la cuenta. Configura MFA si tu proveedor de identidad lo permite.
4. Dentro de ese mismo Worker ve a **Settings → Variables & Secrets** y añade una variable protegida/secret:

   - Nombre exacto: `ADMIN_EMAIL`
   - Valor: **tu propio correo autorizado**, el mismo que inicia sesión con Access.

5. Guarda y prueba entrar al enlace del Worker administrativo. Debe pedir autenticación mediante Access y permitir entrar **solo al correo configurado**.
6. Verifica que las rutas `/api/admin/all` también están protegidas. **Nunca desactives Access para resolver un problema de acceso**.

> `ADMIN_EMAIL` no contiene información sobre personas; aun así se guarda como secreto por organización. El Worker valida la identidad en el servidor mediante `ctx.access.getIdentity()`; no depende de ocultar botones.

## PASO 7. Crear tus territorios

1. En el **panel administrativo**, elige Lambayeque u otra localidad.
2. Con la herramienta de dibujo de polígonos, selecciona el contorno ajustándolo a las calles.
3. Indica número único y guarda. **El territorio empieza sin publicar.**
4. Solo si es seguro, habilita **Publicar** y vuelve a guardar. Aparecerá en el mapa público.
5. La información de personas sordas (ubicaciones, cifras, género, visitas) **no se introduce en esta fase**, ni siquiera en los borradores de D1 pública.

El PDF entregado contiene capturas de referencia y no GeoJSON confiable. Los límites reales deben revisarse y dibujarse, nunca inventarse a partir de las imágenes.

## PASO 8. Opcional — Activar sugerencias públicas de puntos con Turnstile

1. En Cloudflare entra a **Turnstile**, crea un widget para el dominio de tu Worker público.
2. Copia la **site key (pública)** y ponla en `wrangler.jsonc`, campo `TURNSTILE_SITE_KEY` dentro de `vars`. Súbelo a GitHub (commit) para aplicar el cambio.
3. En el Worker **público**, abre **Settings → Variables & Secrets** y agrega como secreto `TURNSTILE_SECRET` con la secret key correspondiente.
4. Agrega como secreto `EXPECTED_HOSTNAME` con el hostname público exacto sin `https://` y sin ruta.
5. Verifica que `/api/health` cambió a `"contributions": true`. Prueba una sugerencia; aparecerá como pendiente hasta que la apruebes.

**No publiques la secret key en `wrangler.jsonc`, el código ni en GitHub.** Sin Turnstile, el mapa y la edición administrativa seguirán funcionando; solo las sugerencias anónimas estarán bloqueadas.

## Cómo actualizar el sitio en el futuro

Edita los archivos del repositorio (desde GitHub o GitHub Desktop) y confirma el cambio en `main`. Cloudflare **Workers Builds** vuelve a desplegar el Worker conectado. Dado que ambos Workers están conectados al mismo repositorio, pueden reconstruirse al recibir un commit; puedes ajustar rutas vigiladas (*Build watch paths*) más adelante.

## Cómo comprobar qué está fallando

| Síntoma | Qué verificar |
| --- | --- |
| Build falla: `Missing entry-point` | Root directory y presencia de `wrangler.jsonc` en ese directorio |
| Build falla: D1 UUID | La cadena `REEMPLAZAR_UUID_D1` debe desaparecer de ambos archivos |
| `/api/health` dice que faltan tablas | Ejecutar `database/schema.sql` en la consola D1 |
| El mapa aparece, pero sin territorios | Es normal al inicio: todavía no se han dibujado/publicado |
| No hay geocodificación | Límites/indisponibilidad de Nominatim y política de uso |
| Panel privado devuelve 403 | Configurar Access + secret `ADMIN_EMAIL`, iniciar sesión con el mismo correo |
| Los usuarios no pueden sugerir puntos | Falta Turnstile, su secret o hostname autorizado |
| El mapa no tiene mosaicos | Problema de conexión o de límites del servidor de tiles OSM |
| Cambios no aparecen en tiempo real | Revisar Durable Object `LIVE`, WebSocket; respaldo sincroniza cada 60 s |

## Advertencias

- La cuenta Cloudflare Free dispone de cuotas y restricciones; no presupongas capacidad ilimitada.
- Las teselas públicas de OpenStreetMap y Nominatim son recursos compartidos sujetos a políticas. Para muchos usuarios, necesitarás proveedor de mapas/geocodificación apropiado.
- GitHub es repositorio de código, **no** un lugar para guardar registros personales sensibles.
- La fase 2 necesitará un Worker privado y una base **distintos** que el mapa público jamás pueda consultar.
- Aunque el código cumple las comprobaciones locales, requiere configuración y pruebas **en tu cuenta Cloudflare** antes de considerarlo en producción.

Fuentes oficiales:
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/workers/static-assets/binding/
