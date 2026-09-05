# Rastry

> Herramienta local y open source para optimizar y transformar imágenes.

**Documento maestro de producto**  
Dominio: **rastry.dev** · Licencia: **Apache-2.0** · Estado: **Definición de producto**

## Resumen ejecutivo

Rastry es una herramienta local-first para optimizar, transformar y organizar imágenes por lotes mediante operaciones reproducibles. Estará disponible como CLI y aplicación desktop, ambas construidas sobre un motor común en TypeScript que usa Bun.Image. No requiere cuentas, no sube archivos y no depende de una nube para hacer su trabajo.

La primera versión prioriza una experiencia segura y útil para desarrolladores, diseñadores y equipos web: convertir PNG/JPEG/WebP, reducir peso, redimensionar, recortar, aplicar padding, eliminar metadata y procesar lotes. Las configuraciones podrán guardarse como presets y pipelines reutilizables.

## Decisión de producto

| Principio       | Decisión                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Privacidad      | Todo el procesamiento ocurre localmente; no hay subida de imágenes ni cuenta obligatoria.      |
| Arquitectura    | Un motor TypeScript sobre Bun.Image; CLI y desktop invocan las mismas reglas de dominio.       |
| Seguridad       | No se sobrescriben originales por defecto. Las salidas van a una carpeta explícita o derivada. |
| Alcance inicial | No incluir background removal, OCR, AVIF ni capturas de pantalla en v0.1.                      |
| Distribución    | Repositorio monorepo, releases instalables y documentación oficial en rastry.dev.              |

## 1. Visión, usuario y propuesta de valor

### Visión

Convertir la optimización de imágenes en una tarea local, rápida y repetible: tan cómoda para arrastrar una carpeta a una app de escritorio como para automatizarla desde una terminal o un pipeline de desarrollo.

### Usuarios prioritarios

- Desarrolladores web que necesitan optimizar assets antes de publicar.

- Diseñadores y creadores que preparan lotes de imágenes sin entregar archivos a un tercero.

- Equipos pequeños que quieren presets consistentes para web, e-commerce, redes o documentación.

- Usuarios avanzados y agentes de automatización que requieren una CLI clara y predecible.

### Propuesta de valor

| Necesidad             | Respuesta de Rastry                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Privacidad y control  | Procesamiento 100% local; los archivos permanecen en el equipo.                                           |
| Resultados repetibles | Pipelines y presets expresan una transformación como configuración versionable.                           |
| Uso simple            | Una GUI para tareas visuales y una CLI para scripts, CI y agentes.                                        |
| Operación segura      | Dry-run, previsualización y política explícita de no sobrescritura.                                       |
| Proyecto sostenible   | Código abierto con una ruta futura de monetización por conveniencia, no por bloqueo de funciones básicas. |

## 2. Alcance funcional

### MVP: formatos de entrada y salida

- Entrada: PNG, JPEG y WebP.

- Salida: PNG, JPEG y WebP.

- Opciones de codificación: calidad para JPEG/WebP, preservación de transparencia cuando el formato lo permita y eliminación de metadata.

### MVP: operaciones

| Operación           | Comportamiento esperado                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| Resize proporcional | Limita ancho y/o alto manteniendo la relación de aspecto.                       |
| Resize exacto       | Produce dimensiones definidas; la política de ajuste se declara explícitamente. |
| Crop                | Recorte por área o anclaje; preparado para exposición visual en desktop.        |
| Trim transparente   | Elimina bordes transparentes innecesarios en imágenes compatibles.              |
| Padding             | Añade margen alrededor de la imagen, con color/fondo configurable.              |
| Conversión          | Convierte entre PNG, JPEG y WebP.                                               |
| Compresión          | Aplica calidad y parámetros de salida para reducir peso.                        |
| Eliminar metadata   | Quita EXIF y metadata no necesaria de las salidas.                              |
| Batch               | Aplica la misma configuración a múltiples archivos y carpetas.                  |

### Fuera de v0.1

Quedan deliberadamente fuera: eliminación de fondo, OCR, AVIF, generación de screenshots, sincronización cloud, cuentas, colaboración en tiempo real y un sistema de plugins. Esta restricción protege la velocidad de entrega y evita introducir modelos, binarios grandes o inferencia local antes de validar la utilidad central.

## 3. Experiencia de uso y garantías de seguridad

### CLI como ciudadano de primera clase

La CLI debe ser legible, scriptable y estable. Ejemplos de la dirección deseada:

rastry photo.png --to webp

rastry photo.png --to webp --quality 82 --max-width 1600

rastry ./assets --to webp --quality 80 --output ./optimized

rastry run ./public --preset web

### Batch, pipelines y presets

- Batch procesa una selección de archivos o una carpeta, con filtrado por formato y resumen final.

- Un pipeline es una secuencia declarativa de operaciones: por ejemplo, trim → resize → convertir a WebP → eliminar metadata.

- Un preset es un pipeline nombrado y reutilizable, inicialmente almacenado localmente como archivo de configuración legible.

- Los presets podrán invocarse desde la GUI y desde la CLI; el comportamiento debe ser idéntico.

### Dry-run y no sobrescritura

Por defecto Rastry nunca modifica un original. La salida se escribe en una carpeta indicada por el usuario o, si no se indica, junto al original con el formato `{nombre}-rastry.{formato}`. Si un nombre entra en conflicto, la herramienta falla con un mensaje claro o usa una estrategia de sufijo explícita; no reemplaza silenciosamente.

- --dry-run muestra archivos afectados, operaciones, ruta de salida estimada y posibles conflictos sin escribir nada.

- La opción de sobrescritura, si se ofrece, será explícita y difícil de activar accidentalmente.

- La app desktop debe mostrar una vista previa del plan antes de ejecutar un lote.

- Cada ejecución entrega un resumen: procesados, omitidos, fallidos, tamaño antes/después y ubicación de salida.

## 4. Arquitectura técnica

La regla arquitectónica es simple: la interfaz no transforma imágenes y la CLI tampoco. Ambas invocan el mismo motor de dominio TypeScript. Bun.Image realiza el procesamiento local; Electrobun ofrece el runtime Bun, la capa de escritorio y el puente RPC seguro entre interfaz y proceso principal. Esto reduce divergencias, permite pruebas sólidas y mantiene abierta la puerta a futuras integraciones.

| Capa                         | Responsabilidad                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Core · TypeScript            | Pipelines, validación, planificación, rutas de salida, dry-run, métricas y errores de dominio; sin dependencia de interfaz. |
| Image Engine · Bun.Image     | Decodificación/codificación, resize, crop, trim, padding, conversión, calidad y escritura local de resultados.              |
| CLI · Bun                    | Parseo de argumentos, carga de presets, presentación de resultados, códigos de salida y compilación en binario autónomo.    |
| Desktop · Electrobun + React | Interfaz React en WebView; proceso principal con Bun; ventanas, diálogos, menús y RPC tipado para invocar el motor.         |
| Configuración                | Esquema compartido de pipelines/presets; serialización local, validación por versión y migraciones futuras.                 |
| Web                          | Landing, documentación y blog estáticos, independientes del binario y publicados en rastry.dev.                             |

### Principios de implementación

- Core determinista y testeable sin UI.

- Pipelines validados antes de procesar archivos.

- Errores por archivo aislados en batch; un fallo no oculta el resultado de los demás.

- La interfaz no obtiene acceso directo al filesystem: usa RPC tipado hacia el proceso principal.

- Bun.Image usa límites como maxPixels y errores estables para proteger el procesamiento.

- Telemetría desactivada por defecto; si alguna vez existe, debe ser opt-in y transparente.

## 5. Estructura propuesta del monorepo

Un solo repositorio mantiene el core, los adaptadores y la web alineados, sin forzar que el sitio dependa del ciclo de release de la aplicación.

```text
rastry/
apps/
cli/ # comando rastry: Bun --compile
desktop/ # Electrobun + React
web/ # Astro: landing, docs y blog
packages/
core/ # pipelines, dry-run, validación y rutas de salida
image-engine/ # adaptador Bun.Image
contracts/ # tipos y esquemas compartidos
docs/ # ADRs, guías de contribución y decisiones
examples/ # presets y casos de uso
scripts/ # release, generación y verificación
.github/ # CI, issues, PR templates y releases
LICENSE # Apache-2.0
README.md
```

## 6. Web oficial: landing, documentación y SEO

### Stack web

La web vive dentro del monorepo en apps/web y utiliza Astro como framework estático, Starlight para la documentación y Content Collections para contenidos tipados (docs, blog, presets, operaciones y comparativas). Esta combinación favorece rendimiento, mantenimiento y una estructura SEO predecible.

### Arquitectura de contenido

| Área                         | Objetivo y contenido                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing                      | Qué es Rastry, privacidad local-first, funciones, ejemplos CLI, descargas, roadmap y CTA a GitHub.                                                         |
| Documentación                | Instalación, quickstart, referencia CLI, operaciones, batch, pipelines, presets, configuración, troubleshooting y contribución.                            |
| Blog                         | Guías prácticas y notas de producto: optimización para web, PNG vs JPEG vs WebP, flujos de trabajo y lanzamientos.                                         |
| Páginas programáticas útiles | Una página por operación, formato, preset y caso de uso; todas con ejemplos reales y enlaces internos. No crear páginas vacías orientadas solo a keywords. |
| Changelog                    | Cambios por versión, compatibilidad y notas de migración.                                                                                                  |
| Legal                        | Licencia, política de privacidad local-first y aviso de marcas.                                                                                            |

### SEO técnico no negociable

- HTML estático rápido, URLs limpias, sitemap.xml, robots.txt y canonical URLs.

- Metadatos únicos por página: title, description, Open Graph y Twitter cards.

- Schema.org donde aporte valor: SoftwareApplication, TechArticle, FAQPage y BreadcrumbList.

- Hreflang cuando se publique contenido multilingüe; empezar con español o inglés de forma consistente, sin traducciones incompletas.

- Imágenes web optimizadas, fuentes mínimas, Core Web Vitals como métrica de producto y enlaces internos semánticos.

- RSS del blog, feed de releases y datos de descarga/versionado visibles para indexación.

- No indexar resultados internos, previews ni páginas de baja calidad.

### Páginas programáticas iniciales

- /docs/operations/resize, /crop, /trim, /padding, /convert y /strip-metadata.

- /docs/formats/png, /jpeg y /webp.

- /presets/web, /ecommerce y /social (solo cuando cada preset tenga instrucciones y configuración sustantiva).

- /guides/optimize-images-for-web, /convert-png-to-webp y /batch-resize-images.

## 7. Roadmap de producto

| Versión              | Objetivo                                         | Funciones principales                                                                                                                                       | Criterio de salida                                                                        |
| -------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| v0.1 · Fundaciones   | Resolver el caso de uso central con seguridad.   | Core TypeScript; Bun.Image; CLI Bun compilada; PNG/JPEG/WebP; resize, crop, trim, padding, conversión, calidad, metadata, batch, dry-run y salidas seguras. | Un lote real puede ejecutarse sin sobrescribir originales y con resultados reproducibles. |
| v0.2 · Desktop       | Hacer accesible el motor a usuarios no técnicos. | Electrobun + React; proceso principal Bun; selección/arrastre de archivos; formulario de operaciones; preview del plan; progreso y resumen vía RPC.         | GUI y CLI producen resultados equivalentes con la misma configuración.                    |
| v0.3 · Reutilización | Convertir tareas repetidas en flujos guardables. | Pipelines declarativos; presets locales; import/export; historial básico de ejecuciones; docs de recetas.                                                   | Un preset se puede compartir e invocar de forma confiable desde CLI y desktop.            |
| v0.4 · Integración   | Madurar automatización y distribución.           | Watch mode inicial; instaladores y releases; actualizaciones/documentación de migración; mejoras de rendimiento y observabilidad local opcional.            | Watch mode es explícito, seguro ante bucles y conserva la política de no sobrescritura.   |

### Nota sobre watch mode

Watch mode se reserva para v0.4 porque requiere un diseño cuidadoso: carpetas observadas, exclusión de la carpeta de salida, de-duplicación de eventos, estabilidad del archivo antes de procesarlo, cola con reintentos y un registro claro. Debe ser un modo explícito y reversible, nunca una automatización silenciosa.

## 8. Plan de acción por fases

1. Definición y base del repositorio: crear el monorepo Bun, establecer Apache-2.0, README, CONTRIBUTING, Code of Conduct, ADR inicial y esquema de configuración de pipelines.

1. Spike técnico Bun/Electrobun: comprobar PNG/JPEG/WebP, operaciones críticas, batch con progreso/cancelación y builds en Windows, macOS y Linux antes de fijar el stack.

1. Core y CLI v0.1: implementar operaciones con Bun.Image, pruebas unitarias y fixtures; definir el plan de ejecución, dry-run, rutas de salida y resumen de batch.

1. Calidad de release: añadir CI para pruebas, lint, builds de la CLI, pruebas de compatibilidad de formatos y generación de changelog.

1. Web desde el inicio: construir la landing, Starlight, referencia CLI y las primeras guías SEO; publicar en rastry.dev antes o junto al alpha.

1. Alpha cerrada: validar con flujos reales de assets web; recoger problemas de seguridad, nomenclatura, rendimiento y ergonomía.

1. Desktop v0.2: integrar Electrobun + React sobre RPC tipado hacia el proceso Bun; verificar equivalencia con la CLI y completar onboarding.

1. Pipelines/presets v0.3 y watch mode v0.4: avanzar solo cuando los casos de uso repetidos y la estabilidad del core lo justifiquen.

## 9. Métricas y criterios de éxito

| Área          | Criterio de éxito inicial                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Utilidad      | Un usuario puede optimizar una carpeta de assets web con un solo comando o flujo visual, sin editar originales.   |
| Confiabilidad | Resultados deterministas, mensajes de error accionables y cobertura fuerte de operaciones críticas.               |
| Rendimiento   | Procesamiento competitivo para lotes comunes, sin bloquear la interfaz y con progreso comprensible.               |
| Adopción OSS  | Issues bien triados, ejemplos reproducibles, contribuciones externas y releases regulares.                        |
| Web/SEO       | Documentación indexable y útil que atrae búsquedas de intención práctica, no solo tráfico de marca.               |
| Confianza     | La propuesta local-first se entiende en menos de un minuto y la política de archivos evita pérdidas accidentales. |

## 10. Modelo open source y monetización futura

### Licencia: Apache-2.0

Rastry se publicará bajo Apache License 2.0. Es una licencia permisiva, compatible con uso comercial y contribuciones empresariales, e incluye una concesión explícita de patentes. El repositorio debe incluir LICENSE, NOTICE si corresponde, cabeceras de copyright donde tenga sentido y una política de contribución clara.

### Principio de monetización

La funcionalidad central seguirá siendo abierta: CLI, desktop, conversión, compresión, batch, pipelines y presets. Si el proyecto llega a monetizarse, el usuario paga por conveniencia, soporte o distribución, no por recuperar capacidades básicas.

| Vía potencial                   | Qué podría ofrecer                                                                                  | Cuándo considerarla                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Sponsors                        | GitHub Sponsors, OpenCollective y sponsors corporativos.                                            | Desde los primeros usuarios; no altera el producto.                                  |
| Distribución oficial de pago    | Instaladores firmados, actualizaciones automáticas, builds certificados e integraciones de sistema. | Tras lograr releases estables y una demanda clara de conveniencia.                   |
| Pro por automatización avanzada | Reglas complejas, colecciones de presets, historial/gestión avanzada o integraciones empresariales. | Solo si existe una capa claramente adicional; no antes de validar el núcleo abierto. |
| Servicios empresariales         | Soporte, integración CI/CD, desarrollo de procesadores personalizados o despliegues internos.       | Cuando haya adopción de equipos y necesidades repetidas.                             |

## 11. Por qué Rastry

Rastry nace de raster: el tipo de imagen que la herramienta procesa. El nombre conserva esa asociación técnica sin sentirse rígido, es corto, memorable y pronunciable en español e inglés. La terminación “-y” le da una identidad de producto más cálida y distintiva, mientras que rastry.dev comunica con claridad su lugar: una herramienta para personas que construyen, optimizan y automatizan. Además, el dominio rastry.dev está disponible en la decisión actual, lo que permite alinear nombre, proyecto y documentación bajo una sola marca.

## 12. Decisiones a mantener explícitas

- Rastry es local-first y no exige cuenta.

- El core TypeScript y Bun.Image son la única fuente de verdad para transformaciones.

- CLI Bun compilada y desktop Electrobun tienen paridad de comportamiento.

- Los originales no se sobrescriben por defecto.

- v0.1 se mantiene deliberadamente pequeño y completo.

- La web, documentación y SEO son parte del producto desde el primer día.

- Apache-2.0 permite adopción amplia sin renunciar a una ruta sostenible de monetización por conveniencia.

## Apéndice A. Próximas decisiones concretas

- Confirmar el nombre de la CLI (rastry) y los paquetes del monorepo Bun.

- Ejecutar el spike Bun.Image + Electrobun: compatibilidad, rendimiento, progreso, cancelación y builds en tres plataformas.

- Definir el formato inicial de presets (por ejemplo YAML o JSON) y publicar un esquema versionado.

- Crear los primeros tres presets de ejemplo: web, e-commerce y social.

- Redactar el README inicial y publicar la primera landing/documentación de “coming soon”.
