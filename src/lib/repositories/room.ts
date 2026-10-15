import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { getDb } from "@/lib/firestore";
import { DEFAULT_SETTINGS, ROOM_CODE_LENGTH } from "@/lib/constants";
import type { FinishedBy, RoomSettings, RoomStatus } from "@/types";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVW23456789"; // no ambiguous: I, L, O, 0, 1
const MAX_CODE_ATTEMPTS = 5;

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Creates a room document and the host player document.
 * The room id is a random Firestore id, so room documents are only reachable
 * by someone who already knows (or is told) the id.
 */
export async function createRoom(
  hostId: string,
  hostName: string
): Promise<{ roomId: string; code: string }> {
  const db = getDb();
  const roomRef = doc(collection(db, "rooms"));
  const now = Date.now();

  // Pick a free short code. Collisions are astronomically unlikely, but a
  // single cheap query keeps the code unique for reliable joining.
  let code = generateRoomCode();
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const existing = await getDocs(
      query(collection(db, "rooms"), where("code", "==", code), limit(1))
    );
    if (existing.empty) break;
    code = generateRoomCode();
  }

  await runTransaction(db, async (tx) => {
    tx.set(roomRef, {
      code,
      hostId,
      status: "lobby" as RoomStatus,
      settings: DEFAULT_SETTINGS,
      currentRound: 0,
      letters: {},
      roundStartedAt: null,
      roundEndedAt: null,
      finishedBy: null,
      lastActivity: now,
      createdAt: now
    });
    tx.set(doc(roomRef, "players", hostId), {
      name: hostName,
      connected: true,
      joinedAt: now,
      lastSeen: now
    });
  });

  return { roomId: roomRef.id, code };
}

/**
 * Adds a player document to the room's players subcollection.
 * The document id is the player's auth uid, so rules can verify ownership.
 */
export async function joinRoom(
  roomId: string,
  playerId: string,
  playerName: string
): Promise<void> {
  const db = getDb();
  const now = Date.now();
  await setDoc(doc(db, "rooms", roomId, "players", playerId), {
    name: playerName,
    connected: true,
    joinedAt: now,
    lastSeen: now
  });
}

/**
 * Resolves a short code into a room id. Returns null if the code is unknown.
 */
export async function getRoomIdByCode(code: string): Promise<string | null> {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, "rooms"), where("code", "==", code), limit(1))
  );
  return snap.empty ? null : snap.docs[0].id;
}

/**
 * Updates only the room status field.
 */
export async function updateRoomStatus(
  roomId: string,
  status: RoomStatus
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "rooms", roomId), { status });
}

/**
 * Saves the host-configured game settings (categories, points, rounds).
 * Called once when the host confirms the configuration, not on every keystroke.
 */
export async function saveRoomSettings(
  roomId: string,
  settings: RoomSettings
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "rooms", roomId), {
    settings,
    lastActivity: Date.now()
  });
}

/**
 * Sets the round letter, status to "playing", roundStartedAt, currentRound,
 * resets finishedBy, and updates lastActivity — all in one write.
 */
export async function startRound(
  roomId: string,
  letter: string,
  round: number
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "rooms", roomId), {
    [`letters.${round}`]: letter,
    status: "playing",
    roundStartedAt: Date.now(),
    currentRound: round,
    finishedBy: null,
    lastActivity: Date.now()
  });
}

/**
 * Sets roundEndedAt, finishedBy, and updates lastActivity — all in one write.
 */
export async function finishRound(
  roomId: string,
  finishedBy: FinishedBy
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "rooms", roomId), {
    roundEndedAt: Date.now(),
    finishedBy,
    lastActivity: Date.now()
  });
}

/**
 * Resets the room back to lobby state for a new game.
 */
export async function resetRoom(roomId: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "rooms", roomId), {
    status: "lobby",
    currentRound: 0,
    letters: {},
    roundStartedAt: null,
    roundEndedAt: null,
    finishedBy: null,
    lastActivity: Date.now()
  });
}

/**
 * Deletes the room document and all subcollections (players and responses).
 * Used when the host closes the room. Uses batched deletes.
 *
 * Round documents are never created (responses live directly under
 * `rounds/{n}/responses`), so we walk the known rounds from 1 to `currentRound`
 * instead of listing the `rounds` collection.
 */
export async function closeRoom(
  roomId: string,
  currentRound: number
): Promise<void> {
  const db = getDb();
  const roomRef = doc(db, "rooms", roomId);

  const refs: ReturnType<typeof doc>[] = [];

  const playersSnap = await getDocs(collection(roomRef, "players"));
  for (const d of playersSnap.docs) {
    refs.push(d.ref);
  }

  for (let round = 1; round <= currentRound; round++) {
    const responsesSnap = await getDocs(
      collection(db, "rooms", roomId, "rounds", String(round), "responses")
    );
    for (const d of responsesSnap.docs) {
      refs.push(d.ref);
    }
  }

  await deleteInBatches(db, refs);
  await deleteDoc(roomRef);
}

/**
 * Deletes all responses for rounds 1..upToRound. Used when starting a new game
 * so previous answers never leak into the fresh rounds.
 */
export async function clearRoundResponses(
  roomId: string,
  upToRound: number
): Promise<void> {
  const db = getDb();
  const refs: ReturnType<typeof doc>[] = [];

  for (let round = 1; round <= upToRound; round++) {
    const snap = await getDocs(
      collection(db, "rooms", roomId, "rounds", String(round), "responses")
    );
    for (const d of snap.docs) {
      refs.push(d.ref);
    }
  }

  await deleteInBatches(db, refs);
}

/**
 * Deletes a player's document from the room's players subcollection.
 */
export async function removePlayer(roomId: string, playerId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, "rooms", roomId, "players", playerId));
}

async function deleteInBatches(
  db: ReturnType<typeof getDb>,
  refs: ReturnType<typeof doc>[]
): Promise<void> {
  const BATCH_SIZE = 500; // Firestore batch limit
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + BATCH_SIZE)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}
