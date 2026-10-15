"use client";

import { useState } from "react";

type ConfettiPiece = {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  width: number;
  height: number;
  color: string;
  round: boolean;
};

const COLORS = [
  "#f472b6",
  "#facc15",
  "#34d399",
  "#60a5fa",
  "#c084fc",
  "#fb923c",
  "#f43f5e",
  "#22d3ee"
];

function buildPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 2.5,
    duration: 2.8 + Math.random() * 2.6,
    drift: (Math.random() - 0.5) * 220,
    width: 6 + Math.random() * 8,
    height: 8 + Math.random() * 10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    round: Math.random() > 0.5
  }));
}

/**
 * Lluvia de confeti puramente decorativa. Las piezas se generan una sola vez
 * (en el inicializador del estado) para que no cambien en cada render. Se
 * desactiva con prefers-reduced-motion gracias a la regla global de globals.css.
 */
export default function Confetti({ count = 80 }: { count?: number }) {
  const [pieces] = useState(() => buildPieces(count));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece, index) => {
        const style = {
          left: `${piece.left}%`,
          width: piece.width,
          height: piece.height,
          backgroundColor: piece.color,
          borderRadius: piece.round ? "9999px" : "2px",
          animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s infinite`,
          "--drift": `${piece.drift}px`
        } as React.CSSProperties;

        return <span key={index} className="absolute top-0 block" style={style} />;
      })}
    </div>
  );
}
