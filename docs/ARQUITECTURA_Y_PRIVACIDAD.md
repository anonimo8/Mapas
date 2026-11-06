# Arquitectura V3: un solo Worker, dos bases D1

```
GitHub (un repositorio)
          |
          v
Cloudflare Worker `mapas` (una sola URL)
     /                       \
GET / y /api/data        /editar y /api/admin/*
Público, lectura         Sesión firmada obligatoria
     |                       |              \
 PUBLIC_DB                 PUBLIC_DB        PRIVATE_DB
 solo mapas               polígonos         puntos H/M
 publicados               editables         y limitador de login
```

El usuario no necesita dos proyectos ni dos direcciones de Cloudflare. El backend tiene rutas públicas y rutas autenticadas dentro del mismo Worker. Los datos individuales sobre personas no se incluyen en `GET /api/data` ni en GeoJSON, HTML público, ni activos estáticos. La ruta `/api/public-summary` devuelve **únicamente el total agregado de puntos privados registrados en toda la base**, sin desglose territorial: totales entre 1 y 4 se suprimen como «Menos de 5», y no se divulgan ubicaciones, sexo, identificadores o notas. Esta publicación agregada requiere autorización para el uso estadístico de la información. La página de administración y el JS de exportación solo se sirven tras verificar la cookie firmada.

El ingreso de contraseña usa el secreto `ADMIN_PASSWORD`, y la sesión HMAC SHA-256 se firma con `ADMIN_SESSION_SECRET`, ambos secretos en Cloudflare, nunca en el repositorio. Hay una limitación de cinco contraseñas incorrectas cada 15 minutos por clave derivada de IP, con HMAC, guardada en la D1 privada. Se validan orígenes de operaciones, se usa cookie `Secure`, `HttpOnly`, `SameSite=Strict`, y las consultas son parametrizadas.

La separación de bases mantiene el principio de no almacenar ubicación, sexo y notas de personas en la D1 pública. Sin embargo, el mismo Worker tiene acceso técnico a ambas bases: la seguridad depende del código, la sesión y la configuración del proveedor. Cloudflare, como operador de infraestructura, no ofrece garantía de que el administrador sea la única persona técnicamente capaz de acceder a la infraestructura o datos. La generación de PDF se hace en el navegador y los archivos descargados son responsabilidad del usuario.

Las API públicas aún mantienen el antiguo endpoint de sugerencias controlado por Turnstile si se configura, pero no se ofrece esa función en la interfaz para evitar confusiones.
