"use client";

import { useEffect, useRef } from "react";
import { setPlayerConnected } from "@/lib/repositories/player";

// 60 s keeps the online indicator reasonably fresh while halving the Firestore
// writes (and the reads they trigger for every listener) compared to 30 s.
const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Keeps a player's presence fresh while mounted.
 *
 * `firebase@13` no longer exposes `onDisconnect`, so presence is a heartbeat:
 * `connected: true` + `lastSeen` every 60 s, plus a best-effort
 * `connected: false` on unmount. It is only enabled in the lobby (the only
 * screen that shows online status) to avoid the cost during rounds.
 *
 * Pass `enabled = false` until the player has actually joined the room, so we
 * never write to a document that does not exist yet.
 */
export function usePresence(
  roomId: string,
  playerId: string | null,
  enabled: boolean
): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !roomId || !playerId) return;

    setPlayerConnected(roomId, playerId, true).catch((error) => {
      console.error("[usePresence] No se pudo marcar presencia:", error);
    });

    intervalRef.current = setInterval(() => {
      setPlayerConnected(roomId, playerId, true).catch((error) => {
        console.error("[usePresence] Heartbeat falló:", error);
      });
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPlayerConnected(roomId, playerId, false).catch(() => {
        // Best effort: if the request fails the player simply stays "online".
      });
    };
  }, [enabled, roomId, playerId]);
}
