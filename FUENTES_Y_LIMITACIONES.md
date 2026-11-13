# Fuentes documentales, datos incorporados y pendientes

## 1. Instrucción DSIM No. 05/2008

Documento recuperado: **“INSTRUCCION DSIM 5-2008 Tráfico Gerona-Batabanó”**, Gaceta Oficial de la República de Cuba, 22 de mayo de 2008, páginas impresas 583–586.

Se incorporaron como reglas de referencia del prototipo:

- **Artículo 4 — buques de arqueo bruto inferior a 100 o eslora inferior a 24 m**, incluidos aerodeslizadores y catamaranes: se prohíbe la navegación cuando el estado de la mar sea superior a fuerza 3 Douglas o el viento superior a fuerza 4 Beaufort.
- **Artículo 4 — restantes buques:** se prohíbe la navegación cuando el estado de la mar sea superior a fuerza 4 Douglas o el viento superior a fuerza 5 Beaufort.
- **Artículo 10:** los puestos de dirección transmiten partes meteorológicos y situación de navegación cada 4 horas; capitanes/patrones informan su posición cada 2 horas y al entrar/salir de la Pasa de la Manteca.

La aplicación compara las fuerzas Beaufort y Douglas introducidas. No convierte automáticamente velocidades o altura significativa de ola a escalas de fuerza.

**Situación jurídica:** se respeta la instrucción explícita del usuario de tratar DSIM 05/2008 como vigente y de que la Instrucción 1/2025 fue desechada. El nombre del PDF recuperado conserva una nota antigua que dice “Derogada por la Inst. 1-2025”; no se recuperó evidencia formal de la posterior desestimación de la Instrucción 1/2025 ni una certificación jurídica actual. Antes de usar el sistema como respaldo institucional debe incorporarse esa evidencia y validarse el texto consolidado.

## 2. Libro de Calados 2026

Documento recuperado: **LIBRO DE CALADOS 2026**, aprobado por la Instrucción DSM 01-2026. Se transcribieron referencias de las páginas PDF 109–117 para accesos y puertos de interés.

Parámetros incorporados al comprobador preliminar:

| Área | Eslora máxima | Calado máximo | Otras condiciones transcritas |
|---|---:|---:|---|
| Pasa de la Manteca | 120,00 m | 3,51 m | Viento no superior a fuerza 4; no simultaneidad de dos buques dentro de la pasa |
| Canal de Monterrey | 120,00 m | 3,51 m | Viento no superior a fuerza 4 |
| Canal de entrada Siguanea | 180,00 m | 5,64 m | Horario diurno; viento no superior a fuerza 5 |
| Canal de entrada Río Las Casas | 130,00 m | 4,45 m | Viento no superior a fuerza 5; horario diurno para buques de más de 100 m |
| Muelle carga general / Ferry, Batabanó | 100,00 m | 2,80 m general; 2,70 m operativo del ferry | Sin operaciones nocturnas; viento no superior a fuerza 3 |
| Fondeadero internacional, Cayo Largo | 200,00 m | 6,50 m | Fondeo/Leva diurnos; viento no superior a fuerza 5; práctico a bordo |
| Muelle carga general, Cayo Largo | 50,00 m | 3,80 m | Atraque 0,08 m/s; ángulo ≤10°; restricciones de simultaneidad |
| Muelle de áridos, Cayo Largo | 30,00 m | 3,10 m | Operaciones diurnas; atraque 0,08 m/s; ángulo ≤10° |

**Advertencia:** el comprobador no valida vigencia de certificados, prórrogas, actualizaciones, batimetría, sondajes, marea, avisos a los navegantes, restricciones temporales ni autorización del práctico/autoridad. Algunos certificados que aparecen en el Libro pueden tener fechas de vencimiento anteriores o cercanas a la fecha de uso; no se presume su vigencia.

## 3. Sectorización del Centro de Pronóstico de Isla de la Juventud

Se recuperó una descripción parcial en la Skill Maestra de Meteorología y Pronóstico (exportación de 28/10/2026):

- A: norte de Isla de la Juventud, desde la desembocadura del río Las Casas hasta el Paso del Cayo de la Manteca.
- B–D: referencia agrupada a mares al norte-nordeste y este de Isla de la Juventud; no se recuperaron límites separados.
- C: área de Surgidero de Batabanó, desde Playa El Cajío al este hasta Playa Mayabeque y al sur hasta los cayos de Buenavista; debe validarse contra el mapa vigente.
- E: descripción geográfica inequívoca no recuperada.
- F: referencia general a la costa sur de Isla de la Juventud; límites exactos no recuperados.

**Pendiente crítico:** no está disponible la imagen oficial completa de sectorización A–F enviada anteriormente. El esquema de la aplicación es textual, no georreferenciado, y no debe emplearse para asignar sectores a una derrota.

## 4. Integraciones meteorológicas pendientes

No se incorporaron ni simularon conexiones reales con:

- Centro de Pronóstico de la Isla de la Juventud / INSMET.
- ECMWF.
- NOAA / WaveWatch III.
- Copernicus Marine.

Faltan endpoints autorizados, formato de intercambio, credenciales cuando procedan, términos de uso, variables disponibles, resolución espacial/temporal y procedimiento de validación. Tampoco se cargó un pronóstico oficial vigente para el 12/11/2026.

## 5. Datos demostrativos

El botón “Cargar escenario demostrativo” utiliza valores sintéticos (Beaufort 5, Douglas 4, 18 nudos y altura de ola 1,6 m) solo para probar el motor de reglas. No son observaciones, no proceden de ningún modelo y no describen el estado del Golfo.

## 6. Otros pendientes para una versión operacional

1. Volver a adjuntar el mapa oficial de sectorización A–F y digitalizar sus límites con validación del Centro de Pronóstico.
2. Obtener evidencia formal de la situación jurídica de la Instrucción 1/2025 y validar la vigencia del texto DSIM 05/2008.
3. Validar con la autoridad las equivalencias de las escalas Beaufort/Douglas y su correspondencia con las variables de los modelos (especialmente SWH).
4. Incorporar fuentes meteorológicas y oceanográficas reales, con marcas de emisión, validez, resolución, procedencia y antigüedad.
5. Implementar comparación de modelos sin promediar escenarios incompatibles.
6. Completar tablas y restricciones del Libro de Calados, verificando certificados y actualizaciones vigentes.
7. Publicar el paquete en HTTPS para instalación en Android y, si se requiere, configurar sincronización segura.
8. Realizar pruebas operacionales controladas y validación por la autoridad competente.

## 7. Regla de seguridad

La aplicación es una herramienta de apoyo. No declara por sí misma el cierre de un puerto, la suspensión legal de una salida ni la reapertura de la navegación. La decisión corresponde a la autoridad marítima competente.
