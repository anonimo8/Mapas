# Guía de instalación y actualización

Esta versión es **V2**. Para actualizar el mapa que ya tienes en GitHub y Cloudflare, abre **[INSTALAR_ACTUALIZACION_V2.md](INSTALAR_ACTUALIZACION_V2.md)**.

Si empiezas desde cero, crea primero la base D1 pública con `database/schema.sql` y la D1 privada con `database/private_schema.sql`; después vincula sus UUID en los archivos `wrangler.jsonc`, despliega ambos Workers desde el mismo GitHub (raíz y `admin-worker`) y protege este último con Cloudflare Access y `ADMIN_EMAIL`. Sigue los apartados de la guía V2 para los pasos y la configuración de seguridad.
