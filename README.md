# Territorios Lambayeque · GitHub → Cloudflare

**Proyecto listo para subir a un repositorio privado de GitHub.** Un mismo repositorio despliega **DOS Cloudflare Workers** independientes: el mapa público desde la raíz (`/`) y el panel de edición desde `admin-worker/`.

**Empieza aquí:** [GUIA_GITHUB_CLOUDFLARE.md](GUIA_GITHUB_CLOUDFLARE.md). Sigue los pasos en orden; **es obligatorio crear la base de datos D1 y sustituir el UUID en los dos archivos Wrangler antes de desplegar**.

## Qué incluye

- Mapa real con calles y edificios visibles mediante Leaflet + OpenStreetMap.
- Navegación inicial: Lambayeque, Mochumí, Túcume, Íllimo, Pacora y Mórrope. Se puede navegar fuera de estas localidades.
- Polígonos de territorios con números, visibilidad controlada y edición por el administrador.
- Puntos de referencia que solo se publican al ser aprobados.
- Realtime WebSocket por Durable Objects; actualización periódica de respaldo.
- Cloudflare Access obligatorio para la administración (segundo Worker con autorización por identidad comprobada en servidor).
- Base D1 **solo para información geográfica publicable**, sin nombres, sexo, registros ni ubicaciones privadas de personas sordas.
- Formulario público antispam deshabilitado hasta configurar Turnstile (opcional para probar el mapa).

## Organización en GitHub

```text
Repositorio GitHub (private)
├── README.md                   ← Lee este archivo
├── GUIA_GITHUB_CLOUDFLARE.md ← Sigue este tutorial
├── wrangler.jsonc              ← Configuración Worker PÚBLICO
├── package.json
├── public/                     ← Página del mapa
│   ├── index.html
│   ├── app.js
│   └── style.css
├── src/index.js                ← API pública, Durable Object y /api/health
├── database/schema.sql        ← Ejecutar una vez en la consola D1
├── admin-worker/               ← Worker PRIVADO (otra integración GitHub)
│   ├── wrangler.jsonc
│   ├── package.json
│   ├── admin.html
│   └── src/
├── docs/
└── tests/
```

## Comprobación al desplegar

1. Página del mapa: `https://lambayeque-territorios-publico.TU_SUBDOMINIO.workers.dev/`
2. Diagnóstico público: `https://lambayeque-territorios-publico.TU_SUBDOMINIO.workers.dev/api/health` → debe aparecer `"ok":true`.
3. API pública: `/api/data` → empieza con listas vacías de territorios/puntos.
4. El panel privado solo se podrá abrir una vez protegida la administración con Cloudflare Access y configurada la variable secreta `ADMIN_EMAIL`.

**Importante:** Sin datos GeoJSON reales no hay territorios predefinidos. El administrador deberá dibujarlos revisando las calles (el PDF de referencia son capturas, no coordenadas confiables). El registro individual confidencial es la **fase 2**, que debe utilizar una base independiente no conectada al Worker público.

## Estado de las pruebas

Comprobaciones locales de sintaxis, SQL y pruebas automáticas básicas. **No se ha desplegado ni probado en tu cuenta Cloudflare**; el ZIP no incluye credenciales ni el ID de tu D1 porque todavía no lo conocemos.

Fuentes: [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/), [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).
