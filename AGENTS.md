# Guía de desarrollo

Estas reglas describen el estilo de este proyecto y sirven como base para proyectos nuevos de React, Next.js y TypeScript. Si un repositorio tiene una arquitectura o herramientas distintas, adapta las secciones específicas de stack y conserva las convenciones que sí apliquen. Antes de cambiar una convención establecida, revisa el código cercano y sigue el patrón local.

## Principios

- Prioriza cambios pequeños, completos y coherentes con la arquitectura existente.
- Reutiliza componentes, hooks, helpers, tipos y tokens existentes antes de crear alternativas.
- No hagas refactors ni cambios de formato ajenos al pedido.
- Mantén el comportamiento actual salvo que el requerimiento indique un cambio.
- No ocultes errores con `catch` vacíos, valores de respaldo que aparenten éxito ni retornos silenciosos. Maneja o propaga los errores explícitamente.
- No agregues dependencias si la plataforma o las utilidades actuales resuelven el problema.

## Stack y estructura

Este proyecto usa Next.js App Router, React, TypeScript, CSS Modules, PostCSS y ESLint/Prettier.

- `app/`: rutas, layout raíz, estilos globales y páginas.
- `components/NombreComponente/`: un componente por carpeta, normalmente con `index.tsx` y `NombreComponente.module.css`.
- `components/index.tsx`: barrel de componentes para exportarlos desde `@/components`.
- `hooks/`: hooks reutilizables; sus archivos usan nombres kebab-case, por ejemplo `use-is-mobile.ts`.
- `lib/`: helpers, configuración, constantes y datos compartidos.
- `types/`: tipos de dominio y contratos compartidos entre módulos.
- `public/`: recursos servidos directamente por la aplicación.

Conserva esta estructura en proyectos basados en este starter. No muevas archivos ni agregues capas solo por preferencia.

## TypeScript y React

- Mantén el modo estricto de TypeScript. No introduzcas `any`; el ESLint actual lo permite por compatibilidad, no porque sea la opción preferida. Usa `unknown` con narrowing cuando el tipo no se conozca.
- Escribe componentes funcionales con arrow functions y props desestructuradas. Para un componente simple puede tiparse el objeto de props junto a la función; si las props se reutilizan o tienen lógica, declara una interfaz o un tipo con nombre.
- Usa nombres PascalCase descriptivos para componentes y tipos nuevos, por ejemplo `HeaderProps`. En tipos compartidos, usa `types/`; deja junto al componente los contratos que no se comparten.
- Usa `interface` para contratos de objetos que puedan extenderse y `type` para uniones, aliases, tuplas y composiciones. Sé consistente dentro del módulo.
- Evita `React.FC` como patrón nuevo; tipa explícitamente las props para que el contrato y la presencia de `children` sean claros. No reescribas componentes existentes únicamente por esta preferencia.
- Declara el tipo de retorno cuando mejore la lectura o el contrato (por ejemplo, hooks con retorno `void`); evita anotaciones redundantes.
- Usa `import type` para dependencias usadas solo como tipos.
- Usa `key` estable y única al renderizar listas; no uses el índice si la colección puede cambiar de orden o contenido.
- Para estado derivado de otro valor, calcula el valor en el render en vez de duplicarlo en estado.
- Nombra manejadores como `handleClick`, `handleClose` o `handleSubmit`; nombra callbacks de props según la acción que representan (`onClose`, `onSubmit`).
- Prefiere actualizaciones funcionales de estado cuando el nuevo valor depende del anterior.
- Usa nombres de variables que expresen propósito; evita abreviaturas crípticas.

### Componentes y props

- Mantén la API de cada componente pequeña y explícita. Marca como opcionales solo las props que realmente puedan omitirse.
- Usa `children` cuando el componente deba componer contenido; no lo agregues automáticamente a todas las props.
- Prefiere props booleanas para estados discretos y uniones literales para conjuntos finitos de valores, en vez de strings arbitrarios.
- Evita pasar objetos de configuración genéricos si el componente solo necesita unos pocos valores claros.
- Mantén los componentes presentacionales enfocados; mueve lógica reutilizable a hooks o helpers cuando exista una necesidad real.
- No agregues `'use client'` de forma preventiva. En App Router, conserva componentes como Server Components por defecto y coloca la directiva en el límite más pequeño que requiera estado, efectos, eventos del navegador o una biblioteca cliente.
- No accedas a `window`, `document`, `navigator` ni APIs del DOM durante el render de servidor. Protege su uso en efectos o handlers y considera hidratación y montaje.

## Imports y exports

- Usa el alias `@/` para imports internos entre áreas (`@/components`, `@/hooks`, `@/lib`, `@/types`). Usa imports relativos para archivos estrechamente colocados, por ejemplo el CSS Module de un componente.
- Mantén las dependencias externas separadas de las internas; agrupa imports relacionados y evita imports duplicados del mismo módulo.
- Ordena los imports de forma legible y consistente: React/Next, paquetes externos, alias internos y finalmente imports relativos/estilos. Conserva los side-effect imports (por ejemplo, CSS global) donde el framework los requiera.
- ESLint tiene `import/order` configurado como advertencia. Aunque hay un plugin de ordenamiento de imports entre las dependencias, no asumas que está activo en Prettier sin comprobar la configuración efectiva.
- Exporta componentes desde su archivo con `export default` y, cuando aporte ergonomía, agrégalos al barrel `components/index.tsx` como `export { default as Nombre } from './Nombre'`.
- Usa exports nombrados para helpers, constantes, tipos y configuraciones compartidas. Evita crear barrels adicionales sin una necesidad de uso concreta.

## Formato y nombres

La configuración Prettier del proyecto define dos espacios, sin tabs, punto y coma, comillas simples, ancho de línea de 100, sin trailing comma, `bracketSameLine` y finales de línea automáticos.

- Ejecuta el formatter configurado; no dependas de preferencias personales del editor.
- Componentes, interfaces y tipos: PascalCase.
- Funciones, variables, props y hooks: camelCase; los hooks empiezan por `use`.
- Constantes globales inmutables: UPPER_SNAKE_CASE cuando el nombre sea una constante de configuración; conserva camelCase para datos/objetos exportados como `AppData`.
- Archivos de componentes: carpeta PascalCase y archivo `index.tsx`; estilos: `NombreComponente.module.css`.
- Hooks y utilidades: nombres de archivo kebab-case.

## Estilos, CSS Modules y BEM

- Usa CSS Modules (`*.module.css`) para estilos de componentes. Reserva `app/globals.css` para reset, tipografía, variables y estilos realmente globales.
- Sigue la convención BEM usada por el proyecto: un bloque local (frecuentemente `container`) y elementos `container__element`; los estados existentes suelen expresarse como `container__element__modifier`. En código nuevo, usa nombres claros y mantén el mismo patrón dentro de cada componente; no mezcles convenciones en un mismo módulo.
- Anida selectores relacionados con `&` siguiendo el PostCSS configurado. Mantén la anidación poco profunda y evita selectores globales que filtren estilos a otros componentes.
- Accede a clases con el objeto importado del CSS Module (`s.container`, `s.container__title`). Para nombres que no puedan escribirse como propiedad válida, usa corchetes.
- Para clases condicionales de CSS Modules, usa `classnames` importado como `cs` siguiendo los componentes existentes; compón el nombre base con un mapa de modificadores booleanos. No concatentes clases opcionales de forma que aparezcan `undefined`, `false` o espacios innecesarios.
- `lib/lazy-cn.ts` ofrece `cn` (clsx + tailwind-merge), pero la convención principal de este proyecto es CSS Modules. No mezcles Tailwind en componentes existentes ni uses `cn` como sustituto de `cs` para CSS Modules sin una razón concreta.
- Reutiliza custom properties y breakpoints de `globals.css`/PostCSS cuando correspondan. Los custom media disponibles se definen en `app/globals.css` y se registran en `postcss.config.mjs` (por ejemplo `--small`, `--medium`, `--large` y `--retina`).
- Mantén responsive design cerca de las reglas del componente mediante media queries. No agregues breakpoints específicos de dispositivo si una regla responsive general resuelve el caso.
- Prefiere propiedades animables por compositor (`transform`, `opacity`) y evita transiciones globales o animaciones que afecten preferencias de movimiento reducido.
- No uses `!important` ni estilos inline como atajo; úsalos únicamente cuando una integración o requisito técnico lo justifique.

## Clases y atributos HTML

- Usa elementos semánticos según su propósito (`header`, `nav`, `main`, `section`, `footer`, listas y botones).
- Usa `<button>` para acciones y enlaces para navegación. No sustituyas elementos interactivos por `div` clicables.
- Añade nombre accesible a controles solo de icono (`aria-label`) y etiqueta los inputs.
- Incluye `alt` adecuado en imágenes informativas y `alt=""` en imágenes decorativas.
- Para enlaces con `target="_blank"`, añade `rel="noopener noreferrer"`.
- No suprimas indicadores de foco sin reemplazo visible y accesible. Comprueba navegación por teclado y contraste.

## Clases dinámicas

- Para el patrón existente, importa `classnames` como `cs` y combina clases del módulo con un objeto de condiciones.
- Mantén los nombres y los valores de variantes tipados mediante uniones literales o tipos compartidos cuando el conjunto sea conocido.
- Evita comparaciones laxas (`==`); usa igualdad estricta (`===`).
- No construyas clases desde entrada arbitraria del usuario. Mapea valores conocidos a clases declaradas.

## Hooks, efectos y ciclo de vida

- Los hooks personalizados empiezan por `use` y se extraen cuando encapsulan comportamiento reutilizable, no solo para mover unas pocas líneas.
- Coloca `'use client'` al comienzo del hook que depende del navegador.
- Mantén arrays de dependencias correctos. Limpia listeners, timers, observers y suscripciones en el retorno del efecto.
- Prefiere `useEffect` para sincronización con sistemas externos; reserva `useLayoutEffect` para mediciones o cambios que deban ocurrir antes del pintado.
- No uses efectos para calcular valores derivados ni para orquestar estado que pueda actualizarse directamente desde eventos.
- Maneja explícitamente los estados asíncronos relevantes (carga, error y resultado); evita que una promesa rechazada quede sin tratar.
- Protege efectos frente a desmontaje o respuestas obsoletas cuando haya operaciones asíncronas que puedan competir.

## Animaciones

- Este proyecto usa Framer Motion (`framer-motion`); sigue sus componentes y APIs existentes (`motion`, `AnimatePresence`, `initial`, `animate`, `exit`, `transition`, `whileInView`).
- Mantén cada animación cerca del elemento que anima y conserva transiciones sencillas. Usa `AnimatePresence` cuando la salida animada de elementos desmontados sea necesaria.
- Evita animar propiedades que provoquen layout costoso si existe una alternativa visual equivalente.
- No dupliques animaciones CSS y Framer Motion para la misma propiedad del mismo elemento.
- Respeta `prefers-reduced-motion` para animaciones no esenciales, especialmente movimiento intenso, parallax o secuencias largas.
- Comprueba que una animación no bloquee interacciones, foco o cierre de overlays.

## Datos, helpers y seguridad

- Separa datos/configuración estáticos de la presentación cuando sean compartidos o tengan suficiente volumen; usa tipos para validar su forma.
- Mantén helpers puros cuando sea posible y dales entradas/salidas explícitas.
- Trata como no confiables valores provenientes de URLs, formularios, HTML, APIs o almacenamiento. Valida y codifica según el contexto.
- No uses `dangerouslySetInnerHTML` para texto sin sanitización confiable.
- No registres secretos, tokens, datos personales ni contenido sensible en consola.
- No introduzcas credenciales o valores de entorno secretos en el cliente. Los valores públicos deben identificarse como tales según Next.js.
- Si se cambia un comportamiento de navegación o se usan URLs externas, valida el destino y conserva las protecciones del navegador.

## Validación y comandos

Este proyecto usa Yarn (`yarn.lock`). Usa Yarn para instalar dependencias y ejecutar scripts; no uses npm ni generes un `package-lock.json`.

Ejecuta el alcance mínimo que cubra el cambio:

- `yarn lint`: ESLint en el proyecto (incluye Prettier).
- `yarn build`: compilación de producción de Next.js.
- `yarn dev`: servidor local de desarrollo.

No hay un script de tests unitarios declarado actualmente; si se añade una infraestructura de tests, cubre cambios de lógica o comportamiento con pruebas relevantes y conserva los comandos oficiales del proyecto. Al terminar, revisa el diff y asegúrate de no incluir cambios generados, temporales o ajenos al pedido.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## PROMPT DE TAREA

Crear una aplicación web de Tuti Frutti multijugador

Quiero desarrollar una aplicación web para jugar al Tuti Frutti (Stop) online con amigos, donde cada jugador pueda participar desde su propia PC o celular, sin necesidad de instalar nada.

Tecnologías

Frontend: Next.js con App Router y TypeScript.

Estilos: reutilizá la estructura y las convenciones existentes del proyecto. Si el proyecto está vacío, proponé una estructura limpia y mantenible.

Backend y sincronización: Firebase Cloud Firestore en tiempo real.

Hosting: preparado para desplegar en Vercel.

Costos: utilizar el plan gratuito de Firebase (Spark) y evitar servicios pagos.

Antes de implementar, inspeccioná el proyecto existente y respetá sus dependencias, estructura y convenciones. No reescribas ni elimines funcionalidades existentes que no estén relacionadas con esta tarea.

Funcionalidades principales

1. Crear y unirse a una sala

Un jugador puede crear una sala y convertirse en su host.

Generar un código de sala único y un link para compartir con amigos.

Permitir que los jugadores se unan mediante el link o el código.

Solicitar un nombre o nickname al ingresar.

Mostrar la lista de jugadores conectados.

Permitir que el host inicie la partida.

El host puede expulsar jugadores y cerrar la sala.

Manejar correctamente las desconexiones y las reconexiones.

2. Sistema de juego

Elegir una letra aleatoria para cada ronda.

Mostrar las categorías configuradas para completar (que haya un modo custom donde se puedan cambiar las categorias), por ejemplo:

Nombre

País o ciudad

Animal

Fruta o verdura

Color

Objeto

Permitir que cada jugador complete sus respuestas en su propio dispositivo.

Incluir un botón «¡Tuti Frutti!» que permita terminar la ronda según las reglas definidas.

Sincronizar el final de la ronda entre todos los jugadores.

Mostrar las respuestas de todos y permitir su validación.

Calcular las puntuaciones según reglas configurables.

Permitir comenzar nuevas rondas y mostrar una clasificación acumulada.

Mostrar una pantalla final con el ganador.

3. Experiencia de usuario

Diseño responsive para celulares, tablets y PC.

Interfaz clara, moderna y rápida.

Mostrar estados como esperando jugadores, partida en curso, ronda finalizada y reconexión.

Evitar recargas completas de página.

Gestionar errores de conexión y mostrar mensajes útiles.

Requisito fundamental: minimizar el consumo de Firebase

La aplicación debe estar diseñada para mantenerse dentro de las cuotas gratuitas de Cloud Firestore siempre que el uso sea compatible con ellas.

Aplicá estas reglas:

No guardar en Firestore cada pulsación de tecla ni cada cambio de carácter de las respuestas. Mantener los borradores localmente y persistirlos únicamente cuando sea necesario.

Evitar lecturas repetidas y consultas innecesarias.

Utilizar listeners en tiempo real solamente para los documentos y campos que cada pantalla necesita.

Evitar crear listeners duplicados y asegurarse de cancelarlos cuando los componentes se desmonten.

Evitar actualizar documentos compartidos continuamente con datos que pueden calcularse localmente.

No hacer polling frecuente para comprobar el estado de una partida.

Minimizar las escrituras de estado, puntuaciones y presencia de jugadores.

Diseñar una estrategia para eliminar las salas antiguas sin requerir un servidor pago. Explicar las limitaciones de la limpieza automática en Firebase Spark.

No almacenar datos que puedan derivarse de otros documentos.

Evitar transacciones y lecturas adicionales si no son necesarias para mantener la consistencia del juego.

Como referencia, considerar una partida casual de 4 a 8 jugadores con varias rondas.

Antes de finalizar, estimá el consumo aproximado de lecturas y escrituras por partida. Explicá los supuestos utilizados y señalá qué operaciones podrían aumentar significativamente el consumo.

Seguridad

Configurar reglas de seguridad de Firestore desde el principio.

No dejar reglas que permitan lectura y escritura indiscriminadas a cualquier usuario.

Validar quién puede crear salas, unirse, iniciar rondas, cerrar partidas y modificar puntuaciones.

Impedir que un jugador modifique las respuestas o puntuaciones de otros jugadores.

Evitar confiar exclusivamente en validaciones del frontend.

No incluir claves privadas ni secretos en variables NEXT*PUBLIC*.

Documentar cualquier limitación de seguridad que requiera lógica confiable en el servidor.

No utilizar Firebase Admin SDK directamente en el navegador.

Si una funcionalidad requiere Cloud Functions, otro servicio pago o un plan superior a Spark, no la implementes silenciosamente: explicá el motivo y proponé una alternativa compatible con el objetivo de mantener el proyecto gratuito.

Organización y calidad

Separar los componentes visuales de la lógica de las partidas y del acceso a Firebase.

Definir tipos TypeScript para salas, jugadores, rondas, respuestas y puntuaciones.

Manejar los estados de carga, errores, desconexiones y datos inexistentes.

Evitar dependencias innecesarias.

No introducir complejidad de arquitectura que no aporte valor a este proyecto.

Configuración y entrega

Inspeccioná el proyecto antes de modificarlo.

Implementá la aplicación funcional, no solamente un prototipo visual.

Indicá cómo crear y configurar el proyecto Firebase en el plan Spark.

Creá un archivo .env.example con las variables necesarias.

Incluí las reglas de seguridad de Firestore y los índices necesarios, si corresponden.

Explicá cómo ejecutar la aplicación localmente y probar una partida con varios navegadores o celulares.

Documentá cómo desplegarla en Vercel.

Indicá qué funcionalidades funcionan sin costos y cuáles podrían requerir servicios pagos en el futuro.

Prioridad: que el juego funcione correctamente, que sea fácil de mantener y que consuma la menor cantidad razonable de recursos gratuitos. No sacrifiques la seguridad ni la consistencia de la partida solamente para reducir lecturas.

Primero analizá la arquitectura y proponé un plan breve de implementación. Después comenzá a trabajar por etapas, verificando cada etapa antes de continuar.
