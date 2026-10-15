import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firestore";
import type { Answers, RoundResponse } from "@/types";

/**
 * Writes a player's answers for a specific round.
 * Path: rooms/{roomId}/rounds/{round}/responses/{playerId}
 * The player id comes from the document id, so it is not duplicated in data.
 */
export async function submitResponses(
  roomId: string,
  round: number,
  playerId: string,
  answers: Answers
): Promise<void> {
  console.log(
    "[tuti:round] submitResponses() → ronda:",
    round,
    "| playerId:",
    playerId
  );
  const db = getDb();
  const responseRef = doc(
    db,
    "rooms",
    roomId,
    "rounds",
    String(round),
    "responses",
    playerId
  );
  await setDoc(responseRef, {
    answers,
    submittedAt: Date.now()
  });
  console.log("[tuti:round] submitResponses() ok");
}

/**
 * Subscribes to all responses for a specific round. Returns an unsubscribe
 * function. Player ids are derived from document ids.
 */
export function subscribeToResponses(
  roomId: string,
  round: number,
  callback: (responses: Record<string, RoundResponse>) => void
): () => void {
  console.log("[tuti:round] subscribeToResponses() → ronda:", round);
  const db = getDb();
  const responsesRef = collection(
    db,
    "rooms",
    roomId,
    "rounds",
    String(round),
    "responses"
  );
  return onSnapshot(
    responsesRef,
    (snapshot) => {
      const responses: Record<string, RoundResponse> = {};
      for (const d of snapshot.docs) {
        const data = d.data() as Omit<RoundResponse, "playerId">;
        responses[d.id] = { playerId: d.id, ...data };
      }
      console.log(
        "[tuti:round] respuestas ronda",
        round,
        "→",
        snapshot.size,
        "jugador(es)"
      );
      callback(responses);
    },
    (err) => {
      console.error("[tuti:round] subscribeToResponses() error:", err);
    }
  );
}
