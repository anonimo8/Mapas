# Territorios Lambayeque · V3 — una sola aplicación

**Un repositorio de GitHub, un único Worker `mapas`, una sola dirección web**. El mapa se consulta sin iniciar sesión. En el mismo sitio, el botón **Editar mapa** abre un editor protegido por contraseña.

## Mejoras de interfaz (5 de noviembre de 2026)

- Cada territorio tiene su **propio color**, idéntico en la vista pública, en el editor y en la lista. Los colores se asignan automáticamente según el número de territorio, sin cambios de tablas D1.
- La lista pública y la ventana emergente de cada territorio incluyen **Editar**, además del acceso general de la cabecera. El login conserva el territorio seleccionado.
- El editor incorpora **edición de vértices por territorio**, junto con el modo de edición global previo. Pulsa «Editar» en la ficha de un territorio; termina de ajustar los vértices y pulsa **Guardar territorio**.
- Historial de cambios **antes de guardar**: botones Deshacer/Rehacer y teclas `Ctrl+Z`, `Ctrl+Y`, `⌘+Z`, `⌘+Shift+Z` cuando el foco no está en un campo de texto. Los cambios ya guardados en D1 requieren otra edición, no son revertidos por el historial local.
- En celular el **mapa se muestra inmediatamente bajo la cabecera**, ocupa la mayor parte de la primera pantalla y el panel completo queda debajo. La vista pública mantiene los filtros en un menú deslizable.
- Rediseño orgánico/premium: fondos cálidos, mejor jerarquía visual, tarjetas individuales, contrastes, controles táctiles y accesibilidad de teclado.

Consulta [CAMBIOS_UX_2026-11-05.md](CAMBIOS_UX_2026-11-05.md) para la lista de comprobación tras publicar.

## Qué puedes hacer

- Consultar mapas de Lambayeque, Mochumí, Túcume, Íllimo, Pacora y Mórrope con zoom a nivel de calle.
- Dibujar territorios con polígonos y rectángulos; ajustar vértices, numerar, guardar y editar.
- Añadir, cambiar de posición y borrar marcadores permanentes de **hombre/mujer** exclusivamente dentro del editor protegido.
- Asignar como máximo seis puntos privados por territorio (también pueden existir puntos sin asignar).
- Encuadrar el mapa y descargar una ficha PDF con mapa y resumen privado para cada territorio.
- Publicar contornos geográficos revisados y referencias que **no revelen** información confidencial. Los datos H/M nunca se envían por las APIs públicas.
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
