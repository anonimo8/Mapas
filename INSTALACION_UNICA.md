# Actualizar tu GitHub y Cloudflare sin crear otro Worker

## Resultado

Una sola web, la que ya tienes:

- **Mapa público:** `https://mapas.territorios.workers.dev/` — todos pueden ver los territorios publicados, sin contraseña.
- **Editor dentro de la misma web:** `https://mapas.territorios.workers.dev/editar` — se pide una contraseña solamente para editar y consultar puntos H/M.

Todo vive en el Worker de Cloudflare llamado **`mapas`**. No hay que crear `lambayeque-territorios-administracion`.

## Paso 1 — Conserva tu base pública y crea una D1 privada

En Cloudflare → **Storage & databases → D1 SQL database**:

- **Pública existente:** `lambayeque_territorios_publicos`. Anota su Database ID que ya te funcionó.
- **Privada nueva:** crea `lambayeque_territorios_privados`. Anota su Database ID.

En la base privada, abre **Console** y ejecuta todo el SQL que está en el archivo GitHub `database/private_schema.sql`. Esto crea las tablas `private_person_points` y `admin_login_limits`. No elimines ningún dato de la base pública.

## Paso 2 — Sube los archivos a tu mismo GitHub

1. Descomprime el nuevo ZIP.
2. Sube **todo el contenido de las carpetas** a tu repositorio actual `anonimo8/Mapas`, usando **Add file → Upload files**, arrastrando los archivos y carpetas desde Windows.
3. **Antes de guardar o iniciar un nuevo deploy**, abre `wrangler.jsonc` (raíz de GitHub) y sustituye las dos variables de ID. Debe verse así (no copies el JSON parcial como archivo completo):

```jsonc
"name": "mapas",
"d1_databases": [
  { "binding":"PUBLIC_DB", "database_name":"lambayeque_territorios_publicos", "database_id":"AQUI_ID_REAL_PUBLICO" },
  { "binding":"PRIVATE_DB", "database_name":"lambayeque_territorios_privados", "database_id":"AQUI_ID_REAL_PRIVADO" }
]
```

**Es importante:** si copias `REEMPLAZAR_UUID_D1` o `REEMPLAZAR_UUID_D1_PRIVADA` sin cambiarlo, volverás a ver el error `database_id` (10021). Si ya arreglaste el ID público en tu repositorio, **conserva ese mismo valor real** en la nueva versión.

## Paso 3 — Activa solamente dos secretos dentro de `mapas`

Cloudflare → Workers & Pages → **mapas** → Settings → **Variables and Secrets** → Add:

| Nombre del secret | Qué escribir como Value |
| --- | --- |
| `ADMIN_PASSWORD` | Tu contraseña privada de edición (12 caracteres o más; usa una contraseña fuerte y única). |
| `ADMIN_SESSION_SECRET` | Un valor aleatorio distinto de la contraseña, de **32 caracteres o más** (preferible 64 caracteres aleatorios). |

Selecciona **Secret** para ambos, **no Text**. Pulsa Save/Deploy.

No publiques esos valores en GitHub ni los envíes por chat.

## Paso 4 — Verifica

1. Comprueba que el último build de `mapas` esté **Success**.
2. Abre el mapa normal: `/`. Debes ver un botón **✎ Editar mapa**, no «Sugerir punto».
3. Presiona **Editar mapa** → ingresa la contraseña → debe abrir el editor territorial.
4. Dibuja un pequeño polígono, elige localidad, número y Guardar territorio.
5. Selecciona un punto H/M, haz clic en el mapa, guarda; recarga la web para comprobar permanencia.
6. Selecciona el territorio y pulsa **Descargar PDF**.

Si al entrar al editor aparece «Falta configurar el editor», revisa los secretos y el binding `PRIVATE_DB`. Si aparece «La base D1 privada no tiene la tabla admin_login_limits», ejecuta el SQL del paso 1. Si el mapa no tiene datos, comprueba el binding `PUBLIC_DB` y las tablas ya existentes.

## Privacidad importante

El **sitio** es público, **no las ubicaciones privadas**. Los puntos H/M requieren contraseña en la misma aplicación. Si se publicaran esos datos en una web abierta para todos, cualquier visitante podría ver las coordenadas. No habilites acceso público de edición de información personal. La contraseña limita el acceso de visitantes pero no sustituye controles operativos como contraseñas fuertes, backups, protección de cuenta de Cloudflare y custodia de PDF.

## Lo que ya no necesitas

- Crear un segundo Worker de administración.
- Configurar `ADMIN_EMAIL` o Cloudflare Access para esta versión.
- Configurar Turnstile para el editor personal (la sugerencia pública está desactivada visualmente).
