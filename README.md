# Territorios Lambayeque · V3 — una sola aplicación

**Un repositorio de GitHub, un único Worker `mapas`, una sola dirección web**. El mapa público se consulta sin iniciar sesión y muestra únicamente las divisiones numeradas con sombreado suave y el total agregado de personas sordas registradas. El editor protegido se abre escribiendo `/editar` en la misma dirección web.

## Actualización de vista pública (5 de noviembre de 2026)

- **Solo mapa:** toda la pantalla para los territorios, sin barra lateral, puntos visibles, buscadores ni botones de edición.
- **Territorios discretos:** polígonos con relleno de color al 13 %, bordes suaves y números centrales.
- **Contador en la esquina:** total general agregado de personas sordas registradas (sin desglose por territorio, coordenadas, sexo o fichas individuales). Los registros de 1–4 se muestran como «Menos de 5» por confidencialidad. No muestra un número inventado si PRIVATE_DB no está disponible.
- **Panel administrativo intacto:** disponible en `/editar`. No se requieren migraciones de bases de datos.

Ver [CAMBIOS_VISTA_PUBLICA_2026-11-05.md](CAMBIOS_VISTA_PUBLICA_2026-11-05.md).

## Mejoras anteriores del editor (5 de noviembre de 2026)

- Cada territorio tiene su **propio color**, idéntico en la vista pública, en el editor y en la lista. Los colores se asignan automáticamente según el número de territorio, sin cambios de tablas D1.
- El panel administrativo incluye **Editar** por territorio, además de las herramientas globales. Se conserva el acceso profundo a `/editar?territorio=<UUID>` y el login conserva la selección.
- El editor incorpora **edición de vértices por territorio**, junto con el modo de edición global previo. Pulsa «Editar» en la ficha de un territorio; termina de ajustar los vértices y pulsa **Guardar territorio**.
- Historial de cambios **antes de guardar**: botones Deshacer/Rehacer y teclas `Ctrl+Z`, `Ctrl+Y`, `⌘+Z`, `⌘+Shift+Z` cuando el foco no está en un campo de texto. Los cambios ya guardados en D1 requieren otra edición, no son revertidos por el historial local.
- En celular la **vista pública es el mapa a pantalla completa**. En `/editar`, el mapa aparece antes que el panel de herramientas.
- Rediseño orgánico/premium: fondos cálidos, mejor jerarquía visual, tarjetas individuales, contrastes, controles táctiles y accesibilidad de teclado.

Consulta [CAMBIOS_UX_2026-11-05.md](CAMBIOS_UX_2026-11-05.md) para la lista de comprobación tras publicar.

## Qué puedes hacer

- Consultar mapas de Lambayeque, Mochumí, Túcume, Íllimo, Pacora y Mórrope con zoom a nivel de calle.
- Dibujar territorios con polígonos y rectángulos; ajustar vértices, numerar, guardar y editar.
- Añadir, cambiar de posición y borrar marcadores permanentes de **hombre/mujer** exclusivamente dentro del editor protegido.
- Asignar como máximo seis puntos privados por territorio (también pueden existir puntos sin asignar).
- Encuadrar el mapa y descargar una ficha PDF con mapa y resumen privado para cada territorio.
- Publicar contornos geográficos revisados. Las fichas H/M, coordenadas, sexo y notas nunca se envían por las APIs públicas; solo se publica el total general agregado en `/api/public-summary` según el umbral de privacidad.
- Ver en vivo los cambios autorizados usando WebSockets.

**La opción pública de «Sugerir punto» ya no aparece**, por lo que Turnstile no hace falta para el flujo de trabajo del usuario. El código previo de aportes públicos sigue presente, pero sin botón público.

## Antes de subir a GitHub

Lee [INSTALACION_UNICA.md](INSTALACION_UNICA.md) para configurar **dos bases de datos D1 dentro del mismo Worker**, los dos ID reales de base de datos en `wrangler.jsonc`, y los dos secretos `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` del Worker `mapas`.

No subas contraseñas, secretos, ubicaciones privadas ni ficheros `.dev.vars` a GitHub.

## Instalación

1. Cloudflare → D1: mantén `lambayeque_territorios_publicos` y crea `lambayeque_territorios_privados`.
2. Ejecuta `database/private_schema.sql` en **la base privada**. `database/schema.sql` se ejecuta en la base pública solo si aún faltan tablas; no borres los datos existentes.
3. En GitHub → `wrangler.jsonc`, reemplaza ambos `REEMPLAZAR_UUID_...` por los ID verdaderos de Cloudflare. Deja `"name":"mapas"`.
4. Cloudflare → Workers & Pages → `mapas` → Settings → Variables and Secrets: crea dos variables **Secret**: `ADMIN_PASSWORD` (mínimo 12 caracteres, usa una contraseña larga) y `ADMIN_SESSION_SECRET` (mínimo 32 caracteres aleatorios, distinto de la contraseña).
5. Actualiza/commitea los archivos descomprimidos de este proyecto en el repositorio GitHub que ya usa `mapas`. Cloudflare seguirá desplegando ese único Worker.
6. Abre `https://mapas.territorios.workers.dev/` para consultar el mapa y `https://mapas.territorios.workers.dev/editar` para editar.

La aplicación **no usa Cloudflare Access**: tiene un sistema propio de login, con sesiones firmadas en cookies HttpOnly/Secure/SameSite, control de origen y bloqueo de intentos repetidos por IP. No se garantiza privacidad absoluta: Cloudflare aloja los datos y los administradores de infraestructura/proveedor pueden tener capacidades de acceso. Los PDF descargados se deben custodiar cuidadosamente.

## Archivos principales

- `src/index.js`: Worker único y API pública, enrutamiento a editor autenticado.
- `src/auth.js`: contraseña de administrador y sesiones seguras.
- `src/admin/`: editor, operaciones públicas controladas, datos privados y PDF.
- `public/`: mapa que todos pueden consultar.
- `database/schema.sql`: tablas geográficas públicas.
- `database/private_schema.sql`: tabla de puntos H/M privados y límite de intentos.
- `wrangler.jsonc`: configuración de `mapas` (el mismo Worker, dos D1).
- `tests/`: pruebas de API, permisos, datos y PDF.

## Comprobaciones

Con Node.js: `npm install`, `npm run check`, `npm test`. Se verificó localmente el código y la generación PDF; **no se ha desplegado ni probado en tu Cloudflare real**.

**Limitación de edición:** se puede redibujar y ajustar manualmente una división. No hay una operación automática que corte un polígono en dos al dibujar una línea. En PDF eliges el encuadre visible del mapa; la exportación depende de que las teselas carguen en el navegador.
