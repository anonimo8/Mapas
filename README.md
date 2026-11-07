# Territorios Lambayeque · V3 — una sola aplicación

**Un repositorio de GitHub, un único Worker `mapas`, una sola dirección web**. El mapa público se consulta sin iniciar sesión y ofrece divisiones numeradas, búsqueda por número o dirección, ubicación por GPS y rutas dibujadas directamente dentro del mapa. No muestra el contador general grande. El editor protegido se abre escribiendo `/editar` en la misma dirección web.

## Mejora R4 — «Cómo llegar» en celular (6 de noviembre de 2026)

El botón **Cómo llegar** solo aparece **debajo del buscador**, dentro de la ficha del territorio o dirección elegida. Al tocarlo se pide permiso GPS y, si se concede y la posición está en el área admitida, se calcula y se dibuja **automáticamente** el itinerario a pie desde la posición detectada hasta ese destino. No se abre otro sitio ni hay que seleccionar manualmente el origen.

Si el GPS está apagado, bloqueado, fuera del área o no funciona en ese dispositivo, aparece un único campo para ingresar un lugar de partida; se buscan coincidencias de direcciones y, al elegir una, se calcula la ruta. También se puede reintentar GPS o marcar un inicio en el mapa. Los pasos y las opciones de auto/a pie quedan plegados hasta que el usuario los solicita. El panel de indicaciones se muestra como una tarjeta inferior en pantallas móviles.

El navegador solicita geolocalización únicamente cuando se pulsa **Cómo llegar** o **Mi ubicación**. Para calcular el recorrido, las coordenadas del inicio y destino se envían al endpoint del propio Worker `/api/route`, que consulta el servicio Valhalla/OpenStreetMap; no se guardan en las tablas D1. El servicio externo recibe las coordenadas para realizar el cálculo y su disponibilidad depende de la red. El destino del territorio es un **punto aproximado** del polígono, no una dirección de puerta verificada. Requiere HTTPS para utilizar GPS.

Ver [CAMBIO_UX_COMO_LLEGAR_MOVIL_R4.md](CAMBIO_UX_COMO_LLEGAR_MOVIL_R4.md) para una guía corta de verificación.

## Mapa público: búsqueda, GPS, rutas y etiquetas H/M (6 de noviembre de 2026)

- **Buscador combinado:** el usuario elige **Territorio** (número) o **Dirección** (calle/número/distrito). Las direcciones se consultan mediante el servicio Nominatim que ya tenía el Worker (con cuota y caché); el resultado depende de la cobertura cartográfica disponible.
- **Mi ubicación:** botón GPS con permiso explícito del navegador; requiere conexión segura HTTPS. Señala posición y radio de precisión estimada del dispositivo. La visualización del punto GPS no lo guarda en D1; al solicitar una ruta, las coordenadas del origen sí se envían al Worker para calcularla.
- **Cómo llegar:** solo aparece al seleccionar destino; abre las indicaciones dentro del mapa. Pide GPS al pulsarlo y calcula la ruta automáticamente. Si el dispositivo no permite GPS, solicita un punto de partida escrito. El destino de un territorio es un punto aproximado de su contorno, no una puerta verificada.
- **Sin cuadro de total público:** eliminado completamente de la página y retirado el endpoint antiguo `/api/public-summary`. El resumen global exacto H/M se conserva en la sección privada del editor, pequeño y visible solo con sesión autenticada.
- **Etiquetas en esquina de cada territorio:** muestran `H` y `M` en tamaño discreto, únicamente para territorios publicados. La nueva ruta pública `/api/public-territory-stats` entrega agregados por sexo sin puntos, notas, coordenadas ni fichas. Por privacidad, las celdas de 1 a 4 personas se muestran como `—`; cero o cinco y más pueden mostrarse como cantidad. **Los valores exactos, incluso los pequeños, permanecen en `/editar`.** Las divisiones sin publicar tampoco exponen sus estadísticas.
- Sin nuevas tablas, migraciones, librerías o servicios de pago. Actualizar los archivos en GitHub y desplegar el Worker existente. El cálculo de rutas en la propia página y el GPS requieren navegador/red compatibles.

## Corrección: puntos visibles y divisiones en vista pública (5 de noviembre de 2026)

- **Edición de puntos:** al pulsar «Añadir punto privado» o «Colocar un punto», el clic en el mapa genera un **marcador provisional visible y arrastrable** antes de guardar, incluso al tocar un polígono. Después de guardar el privado, el marcador permanece visible en el **administrador**, por encima del relleno y los números del territorio; nunca aparece en la vista pública.
- **Libertad de colocación:** los puntos se pueden ubicar dentro, encima, debajo o fuera de las divisiones. El punto privado que queda fuera de un polígono se guarda **sin asignar**, para evitar asociarlo erróneamente a un territorio; se puede asignar después si su ubicación pertenece al territorio. Se mantiene la regla de hasta seis puntos privados **asignados** por territorio.
- **Territorios visibles al público:** se muestran los contornos publicados. Si todavía no hay ninguno publicado, se muestran temporalmente los contornos guardados como **preliminares**, sin cambiar sus valores `published`. Si PUBLIC_DB no contiene ningún territorio, se muestran los **11 contornos de referencia NO verificados** del proyecto. Un aviso discreto aclara la condición provisional. Cuando se publica al menos un territorio, solo aparecen los publicados, como siempre.
- **Seguridad:** las ubicaciones privadas, sexo, notas y número por territorio no salen del editor autenticado. En la vista pública solo se muestran números de territorios, polígonos y el total general con supresión de recuentos de 1–4.

La corrección no cambia el esquema D1, no borra ni reubica registros existentes y no modifica la contraseña ni los bindings. Requiere desplegar en Cloudflare: no se ha podido comprobar contra la D1 real de tu cuenta. Más detalles: [CORRECCION_PUNTOS_Y_VISTA_PUBLICA.md](CORRECCION_PUNTOS_Y_VISTA_PUBLICA.md).

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
- Publicar contornos geográficos revisados. Las fichas H/M, coordenadas, sexo y notas nunca se envían por las APIs públicas; solo pueden publicarse recuentos H/M agregados por territorio **publicado**, suprimiendo celdas de 1–4; el total general exacto queda en el administrador.
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
