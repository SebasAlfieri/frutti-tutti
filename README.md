# Tuti Frutti Multijugador

Juego de palabras tipo **Tuti Frutti (Stop)** para jugar online con amigos. Cada
jugador entra desde su propia PC o celular sin instalar nada: solo necesita un
navegador y el enlace o código de la sala.

- **Frontend:** Next.js (App Router) + React + TypeScript.
- **Estilos:** Tailwind CSS (el stack con el que se inicializó el proyecto).
- **Backend / tiempo real:** Firebase Cloud Firestore.
- **Autenticación:** Firebase Anonymous Auth (gratis en el plan Spark).
- **Hosting:** listo para Vercel.
- **Costo:** diseñado para mantenerse dentro del plan gratuito **Spark**.

---

## Índice

1. [Funcionalidades](#funcionalidades)
2. [Puesta en marcha](#puesta-en-marcha)
3. [Ejecutar en local](#ejecutar-en-local)
4. [Probar con varios jugadores](#probar-con-varios-jugadores)
5. [Desplegar en Vercel](#desplegar-en-vercel)
6. [Arquitectura](#arquitectura)
7. [Seguridad](#seguridad)
8. [Consumo de Firebase](#consumo-de-firebase)
9. [Limpieza de salas antiguas](#limpieza-de-salas-antiguas)
10. [Gratis vs. pago](#gratis-vs-pago)
11. [Scripts](#scripts)

---

## Funcionalidades

**Salas**

- Crear una sala y convertirse en host, con **código único** y **enlace de
  invitación**.
- Unirse por enlace o por código, indicando un nombre/nickname.
- Lista de jugadores conectados en tiempo real.
- El host puede iniciar la partida, **expulsar jugadores** y **cerrar la sala**.
- Manejo de desconexiones y reconexiones: al recargar, el navegador conserva la
  misma sesión anónima, así que el jugador vuelve a la misma sala.

**Sistema de juego**

- Letra aleatoria por ronda.
- Categorías por defecto (Nombre, País o ciudad, Animal, Fruta o verdura,
  Color, Objeto) con **modo personalizado**: el host puede agregar, quitar y
  renombrar categorías, y ajustar los puntos por acierto y la cantidad de rondas.
- Cada jugador completa sus respuestas en su propio dispositivo. Los borradores
  se guardan **localmente**, nunca en Firestore.
- Botón **«¡Tuti Frutti!»** para cerrar la ronda; el fin de ronda se sincroniza
  para todos y también se cierra solo cuando se agota el tiempo.
- Validación visual de respuestas (única / repetida / no válida) y puntuaciones
  calculadas en cada cliente.
- **Clasificación acumulada visible en cada validación de ronda** y pantalla final
  con el ganador (o empate).
- Botón «Jugar otra vez» para reiniciar la partida con los mismos jugadores.

**Experiencia**

- Diseño responsive para celular, tablet y PC.
- Estados claros: esperando jugadores, partida en curso, ronda finalizada,
  resultados y reconexión.
- Sin recargas completas de página (todo es client-side con listeners en vivo).
- Mensajes de error de conexión útiles.

---

## Puesta en marcha

### 1. Crear el proyecto en Firebase (plan Spark)

1. Entrá a <https://console.firebase.google.com> y creá un proyecto (por ejemplo
   `tuttifrutti`). El plan **Spark** es gratuito y no requiere tarjeta.
2. **Firestore Database → Crear base de datos → Modo producción.** Elegí la
   región más cercana a tus jugadores.
3. **Authentication → Comenzar → Sign-in method → Anonymous → Habilitar.**
   Es obligatorio: la app usa una sesión anónima por navegador para poder
   aplicar reglas de seguridad reales.
4. **Configuración del proyecto → Tus apps → App web** (`</>`). Registrá una app
   y copiá los valores de configuración (`apiKey`, `authDomain`, `projectId`,
   `storageBucket`, `messagingSenderId`, `appId`). Son claves **públicas**.

### 2. Variables de entorno

Copiá `.env.example` a `.env.local` y completá los valores del paso anterior:

```bash
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

> `NEXT_PUBLIC_*` se incluye en el bundle del cliente: **solo** van ahí claves
> públicas de Firebase. Nunca pongas secretos, tokens ni claves de servicio en
> variables `NEXT_PUBLIC_*`.

### 3. Publicar reglas e índices de Firestore

El repo incluye `firestore.rules`, `firestore.indexes.json`, `firebase.json` y
`.firebaserc`. Con la [Firebase CLI](https://firebase.google.com/docs/cli):

```bash
npm install -g firebase-tools     # o: npx firebase-tools
firebase login
firebase use tutifrutti-9231b     # tu project id (ya está en .firebaserc)
yarn firebase:deploy              # reglas + índices
```

También podés pegar el contenido de `firestore.rules` directamente en
**Firestore → Reglas** de la consola. No se necesitan índices compuestos: todas
las consultas usan índices de un solo campo (automáticos).

---

## Ejecutar en local

Requisitos: **Node 20+** y **Yarn 1.x** (el proyecto usa `yarn.lock`).

```bash
yarn install
yarn dev
```

Abrí <http://localhost:3000>.

Otros comandos:

```bash
yarn lint     # ESLint (incluye Prettier)
yarn build    # build de producción
yarn start    # servir el build
```

---

## Probar con varios jugadores

1. Levantá el servidor con `yarn dev`.
2. Abrí el sitio en el navegador, poné tu nombre y **Crear sala**.
3. Copiá el enlace de invitación (o el código de 6 caracteres).
4. En **otra ventana de incógnito** (o en el celular, usando la IP de tu PC en
   la red local, por ejemplo `http://192.168.0.10:3000`), abrí el enlace.
   - Cada ventana privada/navegador obtiene una sesión anónima distinta, así que
     cuenta como un jugador diferente.
5. Repetí para sumar jugadores. El host verá la lista actualizarse en vivo.
6. Con 2 o más jugadores, el host pulsa **Comenzar partida**.
7. Completá respuestas en cada dispositivo y usá **¡Tuti Frutti!**; verificá la
   validación, las puntuaciones y la clasificación final.

> `yarn dev` escucha en `localhost`. Para probar desde el celular en la misma
> red, usá `yarn dev --hostname 0.0.0.0` o `next dev -H 0.0.0.0` y entrá por la
> IP de la PC.

---

## Desplegar en Vercel

1. Subí el repositorio a GitHub/GitLab/Bitbucket.
2. En <https://vercel.com> → **Add New → Project** e importá el repo. Vercel
   detecta Next.js automáticamente.
3. En **Settings → Environment Variables**, agregá las mismas seis variables
   `NEXT_PUBLIC_FIREBASE_*` (para Production, Preview y Development).
4. **Deploy.** No hace falta configuración extra ni `vercel.json`.
5. En Firebase → **Authentication → Settings → Dominios autorizados**, agregá tu
   dominio de Vercel (por ejemplo `tuti-frutti.vercel.app`) si la autenticación
   lo requiere.

Para usar Firebase CLI contra otro proyecto, actualizá `.firebaserc` o ejecutá
`firebase use --add`.

---

## Arquitectura

### Estructura del proyecto

```
src/
  app/
    page.tsx                 # Inicio: crear / unirse (con nombre y código)
    layout.tsx
    room/[roomId]/page.tsx   # Pantalla de sala (lobby, juego, validación, resultados)
  components/
    Lobby.tsx                # Sala de espera + configuración de categorías
    CategoryEditor.tsx       # Modo custom de categorías y reglas
    GameScreen.tsx           # Ronda en curso (inputs + ¡Tuti Frutti!)
    ValidationScreen.tsx     # Respuestas de todos + puntuaciones
    ResultsScreen.tsx        # Clasificación final y ganador
    JoinGate.tsx             # Nombre para unirse desde un enlace
  hooks/
    use-room.ts              # Suscripción al documento de sala
    use-players.ts           # Suscripción a jugadores
    use-presence.ts          # Heartbeat de presencia (solo lobby)
  lib/
    auth.ts                  # Sesión anónima (ensureSignedIn)
    firebase.ts              # Inicialización de la app y Firestore
    constants.ts             # Categorías y ajustes por defecto, límites
    game/scoring.ts          # Lógica pura de puntuación/validación
    repositories/
      room.ts                # Operaciones sobre salas
      player.ts              # Presencia de jugadores
      round.ts               # Respuestas de ronda
  types/index.ts             # Tipos de dominio (sala, jugador, ronda, puntajes)
firestore.rules              # Reglas de seguridad
firestore.indexes.json       # Índices (ninguno compuesto)
scripts/cleanup-stale-rooms.mjs  # Limpieza opcional de salas antiguas
```

La lógica de juego (`lib/game/scoring.ts`) y el acceso a Firebase
(`lib/repositories/*`) están separados de los componentes visuales.

### Modelo de datos en Firestore

```
rooms/{roomId}
  ├── code            string  (código corto para unirse)
  ├── hostId          string  (uid anónimo del host)
  ├── status          "lobby" | "playing" | "finished"
  ├── settings        { categories[], pointsPerCorrect, roundsToWin }
  ├── currentRound    number
  ├── letters         { "1": "A", "2": "M", ... }   (letra por ronda)
  ├── roundStartedAt  number | null
  ├── roundEndedAt    number | null
  ├── finishedBy      { playerId, playerName, at } | null
  ├── lastActivity    number
  ├── createdAt       number
  ├── players/{playerId}       → { name, connected, joinedAt, lastSeen }
  └── rounds/{round}/responses/{playerId}
                               → { answers: { [categoryId]: string }, submittedAt }
```

Notas de diseño:

- El **id del documento de jugador es el `uid`** de la sesión anónima, y el
  `playerId` de las respuestas también. Así las reglas pueden verificar la
  identidad sin confiar en valores que manda el cliente.
- Las **puntuaciones no se guardan**: son deterministas a partir de las
  respuestas, la letra y los ajustes, así que cada cliente las calcula.
- `letters` guarda la letra de cada ronda para poder recalcular rondas pasadas
  al mostrar la clasificación final (antes solo se guardaba la actual).

### Flujo de una partida

1. El host crea la sala (transacción: documento de sala + documento de jugador).
2. Los demás se unen; `roomCodes` no hace falta: el código se resuelve con una
   consulta puntual sobre `rooms.code`.
3. El host (opcionalmente) personaliza categorías y ajustes y guarda **una sola
   vez**.
4. El host inicia la ronda: una escritura actualiza letra, estado, ronda y
   `roundStartedAt`.
5. Cada cliente escribe **una vez** sus respuestas (`responses/{uid}`).
6. El primer **¡Tuti Frutti!** (o el fin del temporizador) escribe `finishedBy`.
   Todos ven el cambio y pasan a validación.
7. El host avanza a la siguiente ronda o finaliza el juego (estado `finished`).
   En cada validación se muestra la **clasificación acumulada** de todas las
   rondas jugadas.
8. Al finalizar, cada cliente calcula la clasificación total y se muestra el
   ganador.

---

## Seguridad

Las reglas de `firestore.rules` se aplican **desde el inicio** y no permiten
lectura/escritura indiscriminada.

### Qué validan las reglas

| Acción | Regla |
| --- | --- |
| Crear sala | Usuario autenticado y `hostId == uid`. |
| Modificar sala (letra, ronda, ajustes, estado) | Solo el host (`uid == hostId`); el host no puede reasignarse. |
| Cerrar sala | Solo el host, y no en medio de una ronda. |
| Crear/editar jugador | Solo el propio `uid`; el nombre tiene longitud acotada y no puede cambiarse después de entrar. |
| Expulsar jugador | El host, o el propio jugador (salir). |
| Escribir respuestas | Solo el propio `uid` y solo si es miembro de la sala. |
| Leer respuestas | Solo miembros de la sala (nadie de afuera puede espiar). |
| Leer sala/jugadores | Usuarios autenticados (necesario para unirse por enlace). |

Como el `uid` anónimo es la identidad del jugador, **un jugador no puede
modificar las respuestas ni las puntuaciones de otro**, y no se depende de
validaciones del frontend.

### Limitaciones que requieren lógica de servidor

En el plan Spark no hay Cloud Functions, por lo que algunas garantías quedan del
lado del cliente. Están asumidas y limitadas:

- **Enumeración de salas:** un usuario autenticado podría listar salas. Se mitiga
  con ids aleatorios y códigos de 6 caracteres; no se expone información sensible
  (las respuestas siguen siendo solo para miembros). Un cierre hermético
  requeriría Cloud Functions o **App Check** (reCAPTCHA), fuera del objetivo
  gratuito de este proyecto.
- **Reglas del juego (letra aleatoria, puntajes, fin de ronda):** se calculan en
  el cliente. Un cliente manipulado podría, por ejemplo, cerrar una ronda antes
  de tiempo. Para un juego casual entre amigos es aceptable; con Cloud Functions
  se validarían en el servidor.
- **Presencia:** es un *heartbeat* desde el cliente. Si alguien cierra el
  navegador abruptamente, puede figurar "online" hasta que falle el siguiente
  latido.

---

## Consumo de Firebase

### Estrategias de minimización aplicadas

- **Borradores locales:** las respuestas se guardan en `localStorage` y se
  escriben a Firestore **una sola vez**, al enviar o al terminar la ronda. Nunca
  se escribe por pulsación de tecla.
- **Lecturas acotadas y con propósito:** solo se abren listeners para el documento
  de sala, la subcolección de jugadores y las respuestas. Las respuestas se
  escuchan **únicamente cuando hacen falta** (validación de ronda y pantalla
  final): durante la escritura de respuestas nadie está suscrito, así que esas
  escrituras no generan lecturas por *echo*. Para mostrar la clasificación
  acumulada se reutiliza **una sola suscripción** a las rondas `1..N`, sin
  listeners extra por ronda.
- **Sin listeners duplicados:** cada `useEffect` devuelve su `unsubscribe`, así
  que se cancelan al desmontar, al cambiar de ronda o al volver al lobby.
- **Sin polling:** todo es push mediante `onSnapshot`.
- **Sin datos derivados:** las puntuaciones y la clasificación se calculan en el
  cliente; no se guardan.
- **Escrituras de estado mínimas:** iniciar ronda, cerrar ronda y finalizar son
  una escritura cada una.
- **Presencia acotada:** el heartbeat (60 s) corre **solo en el lobby**, que es la
  única pantalla que muestra quién está online.
- **Sin transacciones innecesarias:** la única transacción es la creación de la
  sala (sala + jugador host), donde sí importa la consistencia.

### Estimación por partida

Supuestos: **6 jugadores**, **3 rondas**, **6 categorías**, ~10 minutos de
partida y ~4 minutos de lobby.

| Operación | Escrituras | Lecturas |
| --- | --- | --- |
| Crear sala + host | 2 | ~1 (chequeo de código) |
| Uniones (5 jugadores) | 5 | — |
| Presencia en lobby (heartbeat 60 s) | ~40 | ~240 (se difunde a todos los listeners) |
| Guardar configuración | 1 | — |
| Iniciar ronda ×3 | 3 | ~18 (sala) |
| Enviar respuestas (6×3) | 18 | — (nadie suscrito mientras se escribe) |
| Cerrar ronda ×3 + finalizar | 4 | ~24 (sala) |
| Lecturas iniciales de sala/jugadores | — | ~85 |
| Validación + clasificación acumulada (rondas `1..N`) | — | ~216 |
| Pantalla final (reutiliza la suscripción anterior) | — | — |
| **Total aproximado** | **~75** | **~585** |

Con los límites gratuitos (50.000 lecturas y 20.000 escrituras por día) esto da
del orden de **~75–250 partidas por día**, dependiendo de si el cuello de botella
son las lecturas (presencia) o las escrituras. El consumo es más que suficiente
para uso casual.

> Las cifras son aproximadas y varían con la duración del lobby, las
> reconexiones y la cantidad de jugadores.

### Qué aumentaría el consumo

- **Más jugadores:** las lecturas de la subcolección de jugadores crecen de forma
  cuadrática (cada cambio se difunde a todos los listeners).
- **Lobby muy largo:** cada heartbeat (cada 60 s por jugador) se difunde a todos.
- **Más rondas:** más escrituras y lecturas de respuestas.
- **Reconexiones frecuentes** (recargar la página muchas veces): nuevas lecturas
  iniciales y reinicio del heartbeat. Si se recarga durante la validación, se
  vuelven a leer las respuestas de todas las rondas `1..N`.
- **Abrir la app en muchas pestañas** a la vez: cada pestaña abre sus listeners.

Si en el futuro el consumo crece, las palancas más efectivas son: subir el
intervalo del heartbeat, o mover la presencia a un documento aparte que solo se
lea en el lobby.

---

## Limpieza de salas antiguas

Firestore **no tiene TTL de documentos completos** en el plan Spark (su política
de TTL es para campos, en planes superiores) y **Cloud Functions requiere el plan
Blaze**. Por eso hay dos mecanismos, ambos gratuitos:

1. **Cierre manual (lo normal):** cuando el host cierra la sala, se borran el
   documento de sala y sus subcolecciones (jugadores, rondas y respuestas) en
   lotes de hasta 500 operaciones. Esto cubre la mayoría de las partidas.
2. **Limpieza programada (opcional, para salas abandonadas):** el script
   `scripts/cleanup-stale-rooms.mjs` borra las salas con `lastActivity` de más de
   24 h. Se ejecuta **sin servidor pago** desde el workflow gratuito de GitHub
   Actions `.github/workflows/cleanup-rooms.yml` (una vez por día), usando
   `firebase-admin` con una cuenta de servicio.

Para activar la limpieza programada:

1. Creá una cuenta de servicio en Firebase → **Configuración del proyecto →
   Cuentas de servicio → Generar nueva clave privada**.
2. En GitHub → **Settings → Secrets and variables → Actions**, agregá el secreto
   `FIREBASE_SERVICE_ACCOUNT` con el **contenido JSON** de la clave.
3. El workflow corre solo (o manualmente con *Run workflow*).

Para correrlo en local:

```bash
# Con GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON, o con FIREBASE_SERVICE_ACCOUNT
yarn cleanup:rooms
```

**Limitaciones en Spark:**

- No hay ejecución automática *en el propio Firebase*; la automatización depende
  de un cron externo (GitHub Actions). Si el repo es privado, los minutos de
  Actions están limitados (aun así, una corrida diaria consume muy poco).
- El script usa la **cuenta de servicio** (Admin SDK) y **omite las reglas de
  seguridad**: es una herramienta administrativa, nunca debe ejecutarse en el
  navegador ni exponerse como endpoint público.
- La limpieza por `lastActivity` puede borrar una sala abandonada con jugadores
  que pensaban volver; por eso el umbral es amplio (24 h).

---

## Gratis vs. pago

**Funciona gratis (plan Spark + Vercel Hobby):**

- Crear/unirse a salas, jugar en tiempo real, puntuaciones y clasificación.
- Autenticación anónima.
- Despliegue en Vercel (dentro de los límites del plan gratuito).
- Limpieza de salas vía GitHub Actions.

**Podría requerir servicios pagos si se quisiera:**

- **Cloud Functions** (plan Blaze) para validar reglas de juego, puntajes o cierre
  de ronda en el servidor.
- **App Check** (reCAPTCHA Enterprise) para bloquear clientes no autorizados.
- **Firestore TTL nativo** de documentos / mayor cuota si el uso crece mucho más
  allá del uso casual.
- **Dominio propio** en Vercel (opcional).

Ninguna de estas es necesaria para jugar: el proyecto está pensado para sostenerse
en el plan gratuito.

---

## Scripts

| Comando | Descripción |
| --- | --- |
| `yarn dev` | Servidor de desarrollo. |
| `yarn build` | Build de producción. |
| `yarn start` | Sirve el build. |
| `yarn lint` | ESLint (incluye Prettier). |
| `yarn firebase:deploy` | Publica reglas e índices a Firestore. |
| `yarn cleanup:rooms` | Borra salas inactivas > 24 h (requiere credenciales). |
