"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firestore";
import type { Player } from "@/types";

interface UsePlayersResult {
  players: Player[];
  loading: boolean;
  error: string | null;
}

/**
 * Subscribes to the players subcollection, sorted by join time. Player ids are
 * derived from document ids.
 */
export function usePlayers(roomId: string): UsePlayersResult {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    console.log("[tuti:usePlayers] suscribiendo a rooms/" + roomId + "/players");
    const playersQuery = query(
      collection(getDb(), "rooms", roomId, "players"),
      orderBy("joinedAt", "asc")
    );

    const unsubscribe = onSnapshot(
      playersQuery,
      (snapshot) => {
        const list: Player[] = snapshot.docs.map((d) => {
          const data = d.data() as Omit<Player, "id">;
          return { id: d.id, ...data };
        });
        console.log("[tuti:usePlayers] snapshot ok →", list.length, "jugador(es)");
        setPlayers(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("[tuti:usePlayers] Subscription error:", err);
        setError("No se pudieron cargar los jugadores");
        setLoading(false);
      }
    );

    return () => {
      console.log("[tuti:usePlayers] desuscribiendo");
      unsubscribe();
    };
  }, [roomId]);

  return { players, loading, error };
}
