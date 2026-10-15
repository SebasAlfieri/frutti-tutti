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
