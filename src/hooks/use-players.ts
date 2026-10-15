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
        setPlayers(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("[usePlayers] Subscription error:", err);
        setError("No se pudieron cargar los jugadores");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  return { players, loading, error };
}
