# SM-GOLFO-BATABANÓ — Prototipo PWA 0.2.0

**Entrega técnica:** 12 de noviembre de 2026  
**Destino:** un teléfono Android, un usuario, almacenamiento local y funcionamiento offline.

## Qué incluye

- Panel principal con estado de conexión y disponibilidad de datos.
- Panel de viento y estado de la mar.
- Registro manual de un parte, con fuente, emisión, periodo, sector, fuerza Beaufort y fuerza Douglas.
- Escenario sintético para comprobar las reglas. Está identificado como DEMOSTRACIÓN y no es un pronóstico.
- Esquema de sectores A–F no georreferenciado, con los límites desconocidos señalados.
- Evaluación preliminar por clase de buque según los criterios recuperados del artículo 4 de DSIM 05/2008.
- Comprobaciones de eslora, calado, viento y horario para accesos/instalaciones seleccionados del Libro de Calados 2026.
- Persistencia local mediante IndexedDB, con alternativa de almacenamiento local.
- Generación de informes DOCX en el propio dispositivo, sin servidor.
- Exportación de los registros locales a JSON.
- Service Worker v0.2.0 con caché del shell y de la plantilla DOCX, además de comprobación visible del estado de caché.

## Cómo probar en un ordenador

1. Descomprime el ZIP.
2. En la carpeta del proyecto ejecuta:
   - `python -m http.server 8080`
3. Abre `http://localhost:8080`.
4. Pulsa **Cargar escenario demostrativo**.
5. En **Seguridad**, introduce GT `50` y eslora `20`; pulsa **Evaluar**. El sistema debe identificar la clase reducida y señalar que el escenario sintético supera los criterios de viento y mar.
6. En **Puertos y calados**, prueba Pasa de la Manteca con eslora `100`, calado `3.00`, viento `4`, marca horario diurno y confirma no simultaneidad para ver la comprobación.
7. En **Informes DOCX**, genera el informe y abre el archivo con Word o LibreOffice.
8. Para probar offline: carga la aplicación una vez, espera a que se active el Service Worker, desconecta la red del navegador y recarga. El shell y las funciones locales deben continuar disponibles.

## Instalación en Android

La instalación PWA requiere que la carpeta se publique en una dirección **HTTPS**. Un archivo `index.html` abierto directamente o una dirección HTTP pública no habilitan el Service Worker como PWA instalable.

1. Publica el contenido de esta carpeta en un alojamiento estático HTTPS (por ejemplo, GitHub Pages, Cloudflare Pages o Netlify).
2. Abre la URL HTTPS en Google Chrome para Android.
3. Usa el menú de Chrome → **Instalar aplicación** o **Añadir a pantalla de inicio**.
4. Abre la aplicación instalada y carga los datos que necesites conservar localmente.
5. Antes de trabajar sin conexión, abre la aplicación online al menos una vez para que se complete la caché.

Esta entrega no incluye alojamiento web ni una URL pública ya publicada. El ZIP es el paquete de despliegue.

**Estado de verificación:** se comprobaron la sintaxis JavaScript, las rutas y recursos del paquete, la ejecución de las funciones principales en un entorno de prueba DOM, la persistencia local alternativa y la generación/lectura del DOCX. La navegación automatizada de Chrome quedó bloqueada por el entorno de ejecución (`ERR_BLOCKED_BY_ADMINISTRATOR`), por lo que la instalación PWA y la recarga offline mediante Service Worker deben confirmarse al publicarla en HTTPS.

## Seguridad y límites de uso

- No hay feeds reales conectados a ECMWF, NOAA, WaveWatch III, Copernicus Marine ni al Centro de Pronóstico de la Isla.
- La entrada manual no autentica el documento de origen.
- No se realiza conversión automática de SWH a fuerza Douglas.
- El esquema A–F no tiene límites cartográficos exactos; no usarlo para asignación de derrota.
- La evaluación de seguridad compara los valores introducidos con los criterios de referencia; no sustituye la valoración integral ni la decisión de la autoridad marítima.
- Las comprobaciones del Libro de Calados son preliminares. Deben verificarse edición, certificados, actualizaciones, sondajes, mareas y restricciones vigentes.
- El funcionamiento offline conserva los datos locales y el motor de reglas. **No genera pronósticos nuevos sin conexión.**
- No hay sincronización en nube en esta versión.

## Archivos

- `index.html`, `styles.css`, `app.js`: interfaz y lógica.
- `sw.js`: caché offline v0.2.0.
- `manifest.webmanifest`: instalación PWA.
- `assets/`: iconos de aplicación.
- `plantilla_informe_SM-GOLFO-BATABANO.docx`: estructura base de informe Word.
- `FUENTES_Y_LIMITACIONES.md`: trazabilidad documental y pendientes.


## Cambios de la versión 0.2.0

- Actualización del identificador de caché para evitar mezclar archivos de la versión anterior.
- Instalación del Service Worker con espera de activación y limpieza limitada a cachés antiguas de esta aplicación.
- Navegación con estrategia red primero y recurso local como respaldo; recursos estáticos con estrategia caché primero.
- Inclusión de la plantilla DOCX en la precarga offline.
- Panel de diagnóstico para informar si el Service Worker está activo y cuántos recursos se encuentran en caché.
- El diagnóstico no certifica todavía la operación offline en Android: esa prueba exige publicar en HTTPS e interrumpir la conexión del teléfono.
