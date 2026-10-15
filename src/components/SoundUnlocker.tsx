"use client";

import { useEffect } from "react";
import { unlockAudio } from "@/lib/sound";

/**
 * Desbloquea el audio en el primer gesto del usuario (toque, clic o tecla).
 *
 * Safari exige crear o reanudar el `AudioContext` dentro de un gesto. Algunos
 * sonidos se disparan desde Firestore (por ejemplo, «empieza la ronda») y no
 * tienen un gesto asociado, así que con esto quedan habilitados. No se dibuja
 * nada.
 */
export default function SoundUnlocker() {
  useEffect(() => {
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    const unlock = () => unlockAudio();

    events.forEach((event) =>
      window.addEventListener(event, unlock, { once: true, passive: true })
    );

    return () => {
      events.forEach((event) => window.removeEventListener(event, unlock));
    };
  }, []);

  return null;
}
