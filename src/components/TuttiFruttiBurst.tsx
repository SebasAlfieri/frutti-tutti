"use client";

import { useEffect, useState } from "react";
import Confetti from "@/components/Confetti";
import { playSound } from "@/lib/sound";

type TuttiFruttiBurstProps = {
  playerName: string;
  /** Momento (epoch ms) en que se cerró la ronda. */
  finishedAt: number;
  /** Si la ronda terminó hace más de esta ventana, no se reproduce. */
  freshnessMs?: number;
};

const HOLD_MS = 2400;
const OUT_MS = 450;
const BURST_TOTAL_MS = HOLD_MS + OUT_MS;

/**
 * Sorpresa de fin de ronda: cuando alguien grita "¡Tutti Frutti!", todos ven
 * una explosión de confeti y el nombre de quien cerró la ronda. Se reproduce
 * una sola vez (si la ronda acaba de terminar) y no bloquea la interacción.
 */
export default function TuttiFruttiBurst({
  playerName,
  finishedAt,
  freshnessMs = 8000
}: TuttiFruttiBurstProps) {
  const [visible, setVisible] = useState(
    () => Date.now() - finishedAt < freshnessMs
  );

  useEffect(() => {
    if (!visible) return;
    playSound("tutti");
    const timer = setTimeout(() => setVisible(false), BURST_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  const containerStyle = {
    animation: `fade-in 0.3s ease-out both, fade-out ${OUT_MS}ms ease-in ${HOLD_MS}ms forwards`
  } as React.CSSProperties;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
      style={containerStyle}
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_50%,rgba(217,70,239,0.35),transparent_70%)]" />
      <Confetti count={110} />

      <div className="relative mx-4 animate-burst text-center">
        <div className="mb-2 text-6xl">🎉</div>
        <h2 className="font-display text-4xl font-black uppercase leading-none tracking-tight text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.15)] bg-gradient-to-r from-amber-300 via-pink-400 to-fuchsia-400 bg-clip-text drop-shadow-[0_4px_20px_rgba(217,70,239,0.6)] sm:text-6xl">
          ¡Tutti Frutti!
        </h2>
        <p className="mt-4 font-display text-2xl font-bold text-white">
          {playerName} 🍓
        </p>
        <p className="mt-1 text-sm font-medium uppercase tracking-[0.25em] text-fuchsia-200">
          Ronda terminada
        </p>
      </div>
    </div>
  );
}
