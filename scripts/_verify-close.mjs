/**
 * Verificación puntual (y temporal): confirma que un jugador que NO es host
 * puede cerrar la ronda, usando dos usuarios anónimos reales sobre el proyecto
 * real y limpiando todo lo que crea.
 *
 * Va por REST (el SDK de cliente desde Node lo bloquea la restricción de
 * referer de la API key). No forma parte de la app: se borra después de usar.
 */
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const KEY = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const ORIGIN = "http://localhost:3000/";
const BASE = `https://firestore.googleapis.com/v1beta1/projects/${PROJECT}/databases/(default)/documents`;

function fv(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "boolean") return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fv) } };
  return { mapValue: { fields: fields(v) } };
}
function fields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = fv(v);
  return out;
}

async function call(token, init) {
  const res = await fetch(BASE, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return text;
}

// commit via :commit endpoint
async function commit(token, writes) {
  const res = await fetch(`${BASE}:commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ writes })
  });
  const text = await res.text();
  if (!res.ok) {
    const isDenied = text.includes("PERMISSION_DENIED") || text.includes("Missing or insufficient permissions");
    throw Object.assign(new Error(`commit HTTP ${res.status}: ${text.slice(0, 300)}`), { denied: isDenied });
  }
}

const put = (path, obj) => ({ update: { name: `${BASE}/${path}`, fields: fields(obj) } });
const patch = (path, obj) => ({
  update: { name: `${BASE}/${path}`, fields: fields(obj) },
  updateMask: { fieldPaths: Object.keys(obj) }
});
const del = (path) => ({ delete: `${BASE}/${path}` });

async function getDoc(token, path) {
  const res = await fetch(`${BASE}/${path}?key=${KEY}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`read HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text).fields ?? {};
}

async function signUp() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: ORIGIN },
    body: JSON.stringify({ returnSecureToken: true })
  });
  const j = await res.json();
  if (!res.ok || !j.localId) throw new Error("signUp falló: " + JSON.stringify(j).slice(0, 300));
  return { uid: j.localId, token: j.idToken };
}

const host = await signUp();
const player = await signUp();
console.log("host uid:", host.uid, "| player uid:", player.uid);

const roomId = "VERIFY-" + Math.random().toString(36).slice(2, 10);
const roomPath = `rooms/${roomId}`;

try {
  const now = Date.now();
  await commit(host.token, [
    put(roomPath, {
      code: "VERIFY9",
      hostId: host.uid,
      status: "lobby",
      settings: {
        categories: [{ id: "n", label: "Nombre", placeholder: "" }],
        roundsToWin: 1,
        pointsPerCorrect: 10
      },
      currentRound: 0,
      letters: {},
      roundStartedAt: null,
      roundEndedAt: null,
      finishedBy: null,
      lastActivity: now,
      createdAt: now
    }),
    put(`${roomPath}/players/${host.uid}`, {
      name: "Host",
      connected: true,
      joinedAt: now,
      lastSeen: now
    })
  ]);
  console.log("sala creada + host unido");

  await commit(player.token, [
    put(`${roomPath}/players/${player.uid}`, {
      name: "Player",
      connected: true,
      joinedAt: now,
      lastSeen: now
    })
  ]);
  console.log("jugador no-host unido");

  await commit(host.token, [
    patch(roomPath, {
      "letters.1": "A",
      status: "playing",
      roundStartedAt: now + 5,
      currentRound: 1,
      finishedBy: null,
      lastActivity: now + 5
    })
  ]);
  console.log("ronda 1 empezada por el host");

  await commit(player.token, [
    put(`${roomPath}/rounds/1/responses/${player.uid}`, {
      answers: { n: "Ana" },
      submittedAt: now + 10
    })
  ]);
  console.log("respuestas del jugador guardadas");

  // ← La prueba: un jugador que NO es host cierra la ronda.
  let closed = false;
  try {
    await commit(player.token, [
      patch(roomPath, {
        roundEndedAt: Date.now(),
        finishedBy: { playerId: player.uid, playerName: "Player", at: Date.now() },
        lastActivity: Date.now()
      })
    ]);
    closed = true;
    console.log("OK → el jugador NO-host pudo cerrar la ronda");
  } catch (error) {
    console.log(`FALLO → el jugador NO-host NO pudo cerrar (${error.message.slice(0, 120)})`);
    if (error.denied) console.log("    (fue un permiso denegado, no un error de red)");
  }

  const data = await getDoc(host.token, roomPath);
  const finishedBy = data.finishedBy?.mapValue?.fields ?? null;
  console.log("finishedBy en la sala:", finishedBy ? JSON.stringify(finishedBy) : "null");
  const got = finishedBy?.playerId?.stringValue;
  if (got === player.uid) {
    console.log("OK → finishedBy coincide con el jugador que gritó");
  } else {
    console.log(`FALLO → finishedBy = ${got}, esperado ${player.uid}`);
  }
  if (!closed || got !== player.uid) process.exitCode = 1;
} finally {
  try {
    await commit(host.token, [patch(roomPath, { status: "finished" })]);
  } catch {
    /* seguir con la limpieza */
  }
  await commit(host.token, [
    del(`${roomPath}/rounds/1/responses/${player.uid}`),
    del(`${roomPath}/players/${player.uid}`),
    del(`${roomPath}/players/${host.uid}`),
    del(roomPath)
  ]).catch((e) => console.log("limpieza:", e.message.slice(0, 160)));
  console.log("limpieza intentada (roomId:", roomId + ")");
}
