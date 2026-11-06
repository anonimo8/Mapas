# Corrección de puntos y visibilidad pública — 5 nov 2026

## Qué estaba ocurriendo

1. La herramienta «Añadir punto» actualizaba las coordenadas de los formularios, pero no dibujaba un marcador provisional. Por eso parecía que no se podía colocar un punto.
2. Al pulsar sobre un polígono, también se activaba la selección del territorio. Eso interfería con la colocación y daba la impresión de que no se podía ubicar un punto encima o fuera del recuadro.
3. La vista pública solicitaba exclusivamente territorios con `published = 1`. Si todos seguían como borradores o la tabla D1 estaba vacía, no mostraba ninguna división.

## Ahora

**Administrador (`/editar`)**

- «Añadir punto privado» permite hacer clic sobre cualquier área del mapa. Aparece inmediatamente un círculo H o M con borde discontinuo, en una capa superior a los territorios. Se puede **arrastrar** para corregirlo. Solo se guarda en D1 privada al pulsar **Guardar punto privado**.
- Los puntos ya guardados aparecen en una capa exclusiva de marcadores, por encima de los polígonos, y pueden arrastrarse y guardarse de nuevo.
- El punto ubicado fuera de los límites queda *sin asignar* automáticamente. Esto evita el error de intentar asignar fuera del contorno. Puedes colocarlo en una posición que sí pertenezca al territorio para asignarlo. Se conserva la restricción de seis puntos privados asignados por territorio.
- El mismo comportamiento de marcador provisional se aplica a los puntos de referencia públicos, pero **no se dibujan en la vista pública minimalista**.

**Vista pública (`/`)**

- Si existen territorios publicados, se muestran únicamente esos contornos, con números y sombreado suave.
- Si no hay publicados, pero sí existen territorios guardados en D1 pública, se muestran como *divisiones en revisión* con un aviso. No se cambia su estado administrativo.
- Si la base D1 pública no contiene territorios, se muestran los 11 contornos orientativos incluidos en el proyecto. **No son límites oficiales ni exactos**: hay que importarlos y revisarlos desde la administración para sustituirlos por divisiones definitivas. Un aviso evita confundirlos con delimitaciones oficiales.
- El público ve solo las divisiones, sus números y el contador general de personas sordas. **Nunca** se muestran puntos privados, sus coordenadas o desglose de hombres y mujeres.

## Instalación

Usa el **ZIP de parche**, que contiene rutas relativas a la raíz del repositorio (`public/`, `src/`, etc.). Extrae y sustituye estos archivos conservando toda la configuración de Cloudflare y las bases D1 existentes. También hay un **ZIP completo** si necesitas reemplazar el proyecto entero.

1. Actualiza los archivos del repositorio GitHub conectado al Worker `mapas`.
2. Espera a que Cloudflare termine el despliegue; refresca `/` con Ctrl+F5.
3. Confirma en `/` que aparecen las divisiones; si muestra el aviso «de ejemplo» o «en revisión», abre `/editar` para revisar/publicar los límites definitivos.
4. Desde `/editar` pulsa «Añadir punto privado», toca el mapa y comprueba que el círculo provisional aparece antes de guardar. Muévelo si quieres y pulsa Guardar. Comprueba que permanece visible tras recargar.
5. Si una operación de guardado falla, revisa los mensajes en el editor y los bindings D1. **Este paquete no configura credenciales ni despliega en tu cuenta**.

No ejecutar migraciones SQL para este parche. No se borra ni se modifica ningún registro D1 existente.
