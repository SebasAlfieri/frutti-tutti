"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firestore";
import type { Room } from "@/types";

interface UseRoomResult {
  room: Room | null;
  loading: boolean;
  error: string | null;
}

/**
 * Subscribes to a room document in real time. The listener is cancelled on
 * unmount, and state is only updated from the snapshot callback.
 */
export function useRoom(roomId: string): UseRoomResult {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onSnapshot(
      doc(getDb(), "rooms", roomId),
      (snapshot) => {
        if (snapshot.exists()) {
          setRoom({ id: snapshot.id, ...snapshot.data() } as Room);
          setError(null);
        } else {
          setRoom(null);
          setError("La sala no existe o fue cerrada");
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useRoom] Subscription error:", err);
        setError("No se pudo cargar la sala");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  return { room, loading, error };
}
