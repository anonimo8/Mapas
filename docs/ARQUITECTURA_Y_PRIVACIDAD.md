# Arquitectura y privacidad — proyecto Territorios Lambayeque

## Interpretación de los materiales entregados

Las 11 páginas de «TERRITORIOS - Lambayeque.pdf» muestran mapas detallados de calles y manzanas con territorios numerados; constituyen referencias de **escala visual**, NO una fuente GeoJSON ni una referencia geoespacial calibrada. La imagen del Google Maps de Lambayeque muestra el centro urbano y el estilo de calles. Ninguno de esos archivos se distribuye en el paquete público, para evitar publicar datos asociados.

En el PDF aparecen registros «S.», cuyo significado en los requisitos es número de personas sordas, no cuadras ni manzanas. El Territorio #6 presenta una cifra mayor al máximo de seis que se exige para la futura administración. **No mostrar esas cifras ni distribución en el mapa público.** En la fase privada deberán dividirse o reorganizarse sectores tras revisión manual de límites y de las personas asociadas. No se infieren domicilios del PDF.

## Separación de confianza

```text
VISITANTES (sin cuenta)
        │
        ▼
MAPA PÚBLICO → Worker público → D1 PUBLIC_DB (solo polígonos publicables y puntos)
        │                        │
        │ sugerencia + Turnstile │ puntos pendientes, jamás publicados sin aprobación
        └────────────────────────┘
                    │
                    ▼ (evento 'updated' sin datos)
           Durable Object WebSockets
                    ▲
                    │
ADMINISTRADOR → Cloudflare Access → Worker administrador → misma D1 pública
          (único email autorizado)          │
                             [aprobar geografía publicable]

FASE 2, NO implementada:
ADMINISTRADOR → Access + MFA → Worker PRIVADO → D1 PRIVATE_DB
                   └── sin binding, API, consulta, service binding ni archivo
                       hacia el Worker público
```

**El Worker público nunca tendrá binding a PRIVATE_DB.** La futura API privada solo se servirá por un hostname privado protegido íntegramente con Access; no habrá rutas públicas de consulta. Separación lógica de base y de código de despliegue. Aplicar cifrado de campos sensibles, controles de copia de seguridad y revisión de seguridad antes de registrar datos reales.

## Modelo propuesto para fase 2 (no crear todavía)

- `private_persons`: ID aleatorio, ID de territorio, localización exacta cifrada, sexo (hombre/mujer cuando corresponda al registro), fecha y consentimiento/base legal, estado de visita. Minimización de datos, acceso único.
- `private_territory_stats`: conteos y distribución privada, avance, asignación y fechas.
- `private_audit_log`: cambios autorizados, sin exportación pública y con retención controlada.
- Regla de negocio: para un territorio, **hasta seis personas**; los territorios con más de seis deben dividirse con aprobación humana del límite geográfico. Validación en servidor y en transacciones de base de datos, no solo en el formulario.
- Geometrías que permitan inferir domicilios privados no deben publicarse. Una separación de bases por sí sola no neutraliza inferencias por límites publicados.

## Principales riesgos y mitigaciones

1. **Inferencia de discapacidad por polígonos:** no publicar por defecto; exigir confirmación humana; considerar publicar únicamente zonificación independiente de las ubicaciones privadas.
2. **Filtración por API o HTML:** no se incluye ninguna columna privada en el esquema de la fase 1. La API pública consulta SOLO filas aprobadas y territorios publicados.
3. **Acceso no autorizado al administrador:** Cloudflare Access en el Worker completo + validación real `ctx.access` y correo exacto del servidor. Activar MFA y proteger la cuenta Cloudflare.
4. **Colaboración abusiva o datos personales introducidos por usuarios:** Turnstile verificado en backend y moderación previa. Añadir Cloudflare WAF/rate limiting para tráfico elevado.
5. **Direcciones enviadas a geocodificadores externos:** Nominatim solo para consultas públicas, sin datos personales. Ningún dato de la futura base privada pasará por su buscador.
6. **Datos almacenados en Cloudflare:** el administrador controla el acceso en la aplicación, pero Cloudflare como proveedor opera infraestructura y puede procesar o acceder a datos en condiciones de servicio, mantenimiento, cumplimiento o incidente. No debe afirmarse que Cloudflare ni sus operadores jamás puedan acceder. Cifrado en reposo/en tránsito no equivale a cifrado de extremo a extremo administrado exclusivamente por el cliente. Revisar términos y ubicación de datos, obligaciones legales en Perú, claves gestionadas externamente y respaldo cifrado antes de añadir información confidencial.
7. **Riesgo de precisión cartográfica:** capturas raster no equivalen a contornos verificados; siempre revisar in situ o sobre cartografía georreferenciada.
8. **Disponibilidad y límites de terceros:** las cuotas Free son finitas y los servidores OSM/Nominatim no garantizan uso a gran escala. Implementar monitorización y proveedor de tiles dedicado en producción.

## Costos y cuotas de referencia (verificados a noviembre de 2026)

- **Cloudflare D1 Free:** hasta **5 millones de filas leídas/día**, **100 000 filas escritas/día** y **5 GB** de almacenamiento total; el exceso diario puede generar fallas temporales. Límite de **500 MB por base** en Free.
- **Durable Objects Free:** backend SQLite; **100 000 solicitudes/día** y **13 000 GB-segundos/día** incluidos. La hibernación de WebSockets reduce duración facturable.
- **Cloudflare Access:** hay plan gratuito, pero requiere configurar una organización Zero Trust y su política específica; disponibilidad y condiciones pueden variar.
- **OpenStreetMap / Nominatim:** datos OSM de licencia abierta no significa servidores sin límites; Nominatim público permite máximo 1 consulta/s por aplicación y NO admite autocompletado.

## Inspiración funcional, no dependencia

PrediMaps demuestra un flujo práctico con mapas por zonas, acceso controlado, asignaciones, avances y consultas móviles. Para este proyecto se conserva la idea de distinguir *consulta* de *edición*, pero **no se copian recursos ni diseños**. El sistema no depende de PrediMaps, Territory Helper ni de otros servicios de terceros, aparte de proveedores geográficos y Cloudflare ya declarados.

## Comprobaciones antes de aceptar datos confidenciales (fase 2)

- Revisar si las divisiones públicas revelarían domicilios o discapacidad por inferencia.
- Pruebas de autorización: solicitudes sin Access, con otra cuenta, sin cookie, por API y por WebSocket.
- Auditoría de logging, respuestas de error y analítica, para que no registren datos sensibles.
- Cifrado con rotación y custodia de llaves, backups cifrados, retención y eliminación verificables.
- Evaluación jurídica local y privacidad por diseño; revisar obligaciones al tratar datos relacionados con discapacidad.


## Referencias funcionales comparadas (fuentes oficiales consultadas)

| Sistema | Funciones encontradas | Inspiración para este proyecto |
|---|---|---|
| PrediMaps | Mapas de territorios, PIN, asignaciones, avance móvil y copia sin conexión | Mapas con numeración y funciones adaptadas al móvil; nuestra consulta geográfica es pública, sin datos personales |
| Territory Helper | Dibujar/editar límites, ajustar a calles, dividir, importar/exportar e imprimir territorios | Contornos pequeños y editables, no división automática municipal |
| Territory Bro | Tarjetas impresas, enlaces consultables sin cuenta, asignaciones; uso de QGIS para dibujar zonas | Separación entre geometría y datos privados; ficha individual imprimible |
| New World Scheduler | Límites, direcciones, asignaciones, información territorial, app y mapas impresos | Futura administración privada de avances y estados, pero no en la fase pública |
| MAT2414 | Visor interactivo de territorios, marcadores, sincronización fuera de línea, permisos y enlaces de mapas | Distinción entre visualización pública de límites y registros privados, con funciones móviles |

URLs revisadas:
- https://predimaps.app/
- https://www.territoryhelper.com/es/Help
- https://territorybro.com/
- https://nwscheduler.com/territory-management/
- https://apps.apple.com/pe/app/mat2414/id6785926796

Estas herramientas se investigaron como referencias de producto; ninguna se integra ni se presume oficial de una organización por el mero hecho de incluir funciones de predicación.
