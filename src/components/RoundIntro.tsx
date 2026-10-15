"use client";

import { useEffect, useRef } from "react";

type RoundIntroProps = {
  round: number;
  totalRounds: number;
  letter: string;
  categories: string[];
  onDone: () => void;
};

// Debe coincidir con la animación de salida definida más abajo.
const INTRO_OUT_DELAY_MS = 2050;
const INTRO_OUT_DURATION_MS = 550;
export const ROUND_INTRO_MS = INTRO_OUT_DELAY_MS + INTRO_OUT_DURATION_MS;

/**
 * Overlay que celebra el comienzo de una ronda: cuenta la ronda, revela la
 * letra con un "pop" y lista las categorías. Aparece una sola vez por ronda
 * (el padre decide si es "recién empezada") y se autodestruye.
 */
export default function RoundIntro({
  round,
  totalRounds,
  letter,
  categories,
  onDone
}: RoundIntroProps) {
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDoneRef.current();
      return;
    }
    const timer = setTimeout(() => onDoneRef.current(), ROUND_INTRO_MS);
    return () => clearTimeout(timer);
  }, []);

  const containerStyle = {
    animation: `fade-in 0.35s ease-out both, fade-out ${INTRO_OUT_DURATION_MS}ms ease-in ${INTRO_OUT_DELAY_MS}ms forwards`
  } as React.CSSProperties;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[#1c0636]/70 backdrop-blur-sm"
      style={containerStyle}
      role="status"
      aria-live="polite"
    >
      <div className="mx-4 w-full max-w-md animate-pop-in rounded-[2rem] border border-white/20 bg-white/10 p-8 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <p className="font-display text-sm uppercase tracking-[0.35em] text-fuchsia-200">
          Ronda
        </p>
        <p className="font-display text-5xl font-bold text-white">
          {round}
          <span className="text-2xl text-white/50"> / {totalRounds}</span>
        </p>

        <div className="relative mx-auto my-6 flex h-32 w-32 items-center justify-center">
          <span className="absolute inset-0 animate-ring rounded-full border-2 border-fuchsia-300/70" />
          <span
            className="absolute inset-0 animate-ring rounded-full border-2 border-amber-300/60"
            style={{ animationDelay: "0.6s" }}
          />
          <span className="flex h-28 w-28 animate-bounce-in items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 font-display text-7xl font-bold text-white shadow-2xl shadow-fuchsia-500/40">
            {letter}
          </span>
        </div>

        <p className="font-display text-3xl font-bold text-white">¡A jugar! 🎉</p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {categories.map((label, index) => (
            <span
              key={label}
              className="animate-fade-up rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90"
              style={{ animationDelay: `${300 + index * 80}ms` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
