import { doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firestore";

/**
 * Marks the player's presence in their own document.
 *
 * Called when joining, on each heartbeat, and (best effort) on unmount. Kept on
 * the player document so the lobby can render who is online.
 */
export async function setPlayerConnected(
  roomId: string,
  playerId: string,
  connected: boolean
): Promise<void> {
  console.log("[tuti:player] setPlayerConnected() →", playerId, "=", connected);
  const db = getDb();
  await updateDoc(doc(db, "rooms", roomId, "players", playerId), {
    connected,
    lastSeen: Date.now()
  });
}

/**
 * Marks (or clears) the player as ready for the next round.
 *
 * `roundStartedAt` identifies the round being validated: passing the current
 * round's timestamp means "ready for the next round". Passing `null` clears it.
 * Only the owner can write their own document, which the security rules already
 * enforce (the update keeps `name` unchanged).
 */
export async function setPlayerReady(
  roomId: string,
  playerId: string,
  roundStartedAt: number | null
): Promise<void> {
  console.log(
    "[tuti:player] setPlayerReady() →",
    playerId,
    "=",
    roundStartedAt == null ? "no listo" : "listo"
  );
  const db = getDb();
  await updateDoc(doc(db, "rooms", roomId, "players", playerId), {
    readyRoundStartedAt: roundStartedAt
  });
}
