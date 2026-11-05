# Territorios Lambayeque — V2 (GitHub → Cloudflare)

Actualización del mapa de territorios que ya funciona en GitHub/Cloudflare.

**INSTRUCCIONES DE ACTUALIZACIÓN:** abre [INSTALAR_ACTUALIZACION_V2.md](INSTALAR_ACTUALIZACION_V2.md). Si aún no has configurado los dos Workers, también puedes leer [GUIA_GITHUB_CLOUDFLARE.md](GUIA_GITHUB_CLOUDFLARE.md).

## Funciones

- Mapa público Leaflet + OpenStreetMap, con mapa general, puntos geográficos públicos aprobados y polígonos que el administrador decide publicar.
- **Administración privada:** dos conjuntos de datos separados. Los contornos e información geográfica publicable están en `PUBLIC_DB`; los puntos confidenciales H/M están exclusivamente en `PRIVATE_DB`.
- Puntos permanentes: añadir haciendo clic, arrastrar para recolocar, editar sexo, nota opcional y territorio, borrar, persistir en la base D1 privada.
- Límite de seis personas por territorio, validación de puntos dentro de su contorno.
- Dibujar polígonos o rectángulos, editar vértices, crear áreas más pequeñas manualmente y numerarlas.
- **Descarga de PDF confidencial** con mapa visible, polígono, H/M, totales y encabezado por territorio. Generado directamente en el navegador, sin enviar los datos a un conversor externo.
- Actualizaciones en vivo para información geográfica pública aprobada; **los datos privados no se transmiten por ese canal**.

## Archivos principales

```text
wrangler.jsonc                          Worker público, SOLO PUBLIC_DB
src/index.js                           API pública
public/                                Sitio público
admin-worker/wrangler.jsonc             Worker administrativo, PUBLIC_DB + PRIVATE_DB
admin-worker/admin.html                 Interfaz administrativa editable
admin-worker/export-pdf-browser.js      Crea PDF en navegador sin librerías de terceros
admin-worker/src/private-points.js      Validaciones de datos confidenciales
admin-worker/src/index.js               API protegida con Cloudflare Access
admin-worker/src/admin-page.js          HTML generado
admin-worker/src/export-pdf.js          Exportador generado
database/schema.sql               Esquema ya existente de PUBLIC_DB
database/private_schema.sql             NUEVO: ejecutar solo en PRIVATE_DB
docs/regenerar-admin-html.py             Regenera los dos archivos JS derivados
INSTALAR_ACTUALIZACION_V2.md            Pasos para actualizar GitHub
```

Para modificar el HTML o el generador PDF, edita sus archivos fuente y ejecuta `python docs/regenerar-admin-html.py` antes del commit para actualizar las cadenas importadas por el Worker.

### Pruebas locales

```bash
npm test
npm run check
```

La integración con D1 y Access requiere configuración en Cloudflare; estos comandos **no sustituyen** las pruebas de despliegue real.

**Privacidad:** No introduzcas datos personales en archivos del repositorio, GitHub Issues, ejemplos SQL o mapas públicos. Los contornos no se publican automáticamente.
