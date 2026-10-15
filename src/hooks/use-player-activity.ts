"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Player } from "@/types";

export type ActivityToast = {
  id: string;
  name: string;
  type: "join" | "leave";
  closing?: boolean;
};

export type DisplayPlayer = Player & { leaving?: boolean };

const EXIT_MS = 480;
const TOAST_MS = 3200;
const TOAST_OUT_MS = 300;

interface UsePlayerActivityResult {
  /** Jugadores actuales más los que están saliendo (para animar su salida). */
  displayPlayers: DisplayPlayer[];
  /** Avisos efímeros de "se unió" / "salió". */
  toasts: ActivityToast[];
  dismissToast: (id: string) => void;
}

/**
 * Detecta altas y bajas de jugadores en el lobby para poder animarlas.
 *
 * - A los jugadores que se van se los conserva unos milisegundos marcados como
 *   `leaving` para que puedan animar su salida antes de desaparecer del DOM.
 * - Cada alta/baja genera un aviso efímero.
 *
 * Funciona sobre la lista que ya llega por el listener de Firestore: no abre
 * ninguna suscripción nueva ni genera lecturas extra.
 */
export function usePlayerActivity(players: Player[]): UsePlayerActivityResult {
  const [displayPlayers, setDisplayPlayers] = useState<DisplayPlayer[]>([]);
  const [toasts, setToasts] = useState<ActivityToast[]>([]);

  const seenIdsRef = useRef<Set<string> | null>(null);
  const namesRef = useRef<Map<string, string>>(new Map());
  const prevDisplayRef = useRef<DisplayPlayer[]>([]);
  const removalTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const toastTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, closing: true } : toast
      )
    );
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_OUT_MS);
    toastTimersRef.current.push(timer);
  }, []);

  useEffect(() => {
    const ids = new Set(players.map((player) => player.id));
    players.forEach((player) => namesRef.current.set(player.id, player.name));

    // ─── Avisos de alta/baja ──────────────────────────────────────────────
    if (seenIdsRef.current === null) {
      // Primera carga: no saludamos a media sala.
      seenIdsRef.current = ids;
    } else {
      const previousIds = seenIdsRef.current;
      const joined = players.filter((player) => !previousIds.has(player.id));
      const leftIds = [...previousIds].filter((id) => !ids.has(id));
      seenIdsRef.current = ids;

      const stamp = Date.now();
      const fresh: ActivityToast[] = [
        ...joined.map((player) => ({
          id: `join-${player.id}-${stamp}`,
          name: player.name,
          type: "join" as const
        })),
        ...leftIds.map((id) => ({
          id: `leave-${id}-${stamp}`,
          name: namesRef.current.get(id) ?? "Alguien",
          type: "leave" as const
        }))
      ];

      if (fresh.length > 0) {
        setToasts((prev) => [...prev, ...fresh].slice(-4));
        fresh.forEach((toast) => {
          const timer = setTimeout(() => dismissToast(toast.id), TOAST_MS);
          toastTimersRef.current.push(timer);
        });
      }
    }

    // ─── Lista con animación de salida ────────────────────────────────────
    const previousDisplay = prevDisplayRef.current;
    const incoming: DisplayPlayer[] = players.map((player) => ({
      ...player,
      leaving: false
    }));
    const stillLeaving = previousDisplay.filter(
      (player) => player.leaving && !ids.has(player.id)
    );
    const next: DisplayPlayer[] = [...incoming, ...stillLeaving];

    for (const player of previousDisplay) {
      if (
        !ids.has(player.id) &&
        !player.leaving &&
        !removalTimersRef.current.has(player.id)
      ) {
        next.push({ ...player, leaving: true });
        const timer = setTimeout(() => {
          removalTimersRef.current.delete(player.id);
          prevDisplayRef.current = prevDisplayRef.current.filter(
            (item) => item.id !== player.id
          );
          setDisplayPlayers((current) =>
            current.filter((item) => item.id !== player.id)
          );
        }, EXIT_MS);
        removalTimersRef.current.set(player.id, timer);
      }
    }

    prevDisplayRef.current = next;
    setDisplayPlayers(next);
  }, [players, dismissToast]);

  useEffect(() => {
    const removalTimers = removalTimersRef.current;
    const toastTimers = toastTimersRef.current;
    return () => {
      removalTimers.forEach((timer) => clearTimeout(timer));
      removalTimers.clear();
      toastTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return { displayPlayers, toasts, dismissToast };
}
