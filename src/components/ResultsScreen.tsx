"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlayerScore } from "@/types";
import Confetti from "@/components/Confetti";

type ResultsScreenProps = {
  standings: PlayerScore[];
  winner: PlayerScore | null;
  isHost: boolean;
  onPlayAgain: () => Promise<void>;
};

const MEDALS = ["🥇", "🥈", "🥉"];

const RANK_STYLES = [
  "bg-gradient-to-r from-amber-100 to-yellow-50 ring-1 ring-amber-200",
  "bg-gradient-to-r from-slate-100 to-zinc-50 ring-1 ring-slate-200",
  "bg-gradient-to-r from-orange-100 to-amber-50 ring-1 ring-orange-200"
];

export default function ResultsScreen({
  standings,
  winner,
  isHost,
  onPlayAgain
}: ResultsScreenProps) {
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlayAgain = async () => {
    setResetting(true);
    setError(null);
    try {
      await onPlayAgain();
    } catch {
      setError("No se pudo reiniciar la partida");
      setResetting(false);
    }
  };

  const sorted = standings.slice().sort((a, b) => b.total - a.total);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      {winner && (
        <div className="pointer-events-none fixed inset-0 -z-0">
          <Confetti count={90} />
        </div>
      )}

      <div className="relative w-full max-w-lg">
        {/* Celebración */}
        {winner ? (
          <div className="mb-6 text-center">
            <div className="mb-2 animate-float text-6xl drop-shadow-[0_8px_24px_rgba(251,191,36,0.6)]">
              🏆
            </div>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-amber-200">
              Ganador
            </p>
            <h1 className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text font-display text-4xl font-black text-transparent drop-shadow-[0_4px_20px_rgba(251,191,36,0.5)] sm:text-5xl">
              ¡{winner.name}!
            </h1>
            <p className="mt-1 font-medium text-fuchsia-100/90">
              Se llevó la partida 🎉
            </p>
          </div>
        ) : (
          standings.length > 0 && (
            <div className="mb-6 text-center">
              <div className="mb-2 animate-float text-6xl">🤝</div>
              <h1 className="font-display text-4xl font-black text-white">
                ¡Empate!
              </h1>
              <p className="mt-1 font-medium text-fuchsia-100/90">
                Nadie sacó ventaja esta vez
              </p>
            </div>
          )
        )}

        {/* Clasificación final */}
        <div className="tuti-card animate-fade-up mb-4 p-6">
          <h2 className="mb-4 text-center font-display text-lg font-black text-violet-900">
            Clasificación final
          </h2>
          <div className="space-y-2.5">
            {sorted.map((entry, idx) => (
              <div
                key={entry.playerId}
                className={`flex animate-fade-up items-center justify-between rounded-2xl px-4 py-3 ${
                  RANK_STYLES[idx] ?? "bg-violet-50"
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-8 text-center text-2xl">
                    {MEDALS[idx] ?? (
                      <span className="text-lg font-bold text-violet-300">
                        {idx + 1}
                      </span>
                    )}
                  </span>
                  <span className="truncate font-display text-lg font-bold text-violet-900">
                    {entry.name}
                  </span>
                </div>
                <span className="shrink-0 font-display text-xl font-black text-violet-900">
                  {entry.total}
                  <span className="ml-1 text-sm font-medium text-violet-400">
                    pts
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="tuti-card animate-fade-up space-y-3 p-5" style={{ animationDelay: "120ms" }}>
          {error && (
            <p className="animate-pop-in rounded-xl bg-rose-50 px-3 py-2 text-center text-sm font-medium text-rose-700">
              {error}
            </p>
          )}
          {isHost && (
            <button
              onClick={handlePlayAgain}
              disabled={resetting}
              className="tuti-cta tuti-sheen w-full bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3.5 text-white shadow-lg shadow-fuchsia-600/30 disabled:opacity-50"
            >
              {resetting ? "Reiniciando..." : "🔁 Jugar otra vez"}
            </button>
          )}
          <Link
            href="/"
            className="block w-full rounded-2xl bg-violet-100 px-4 py-3 text-center font-semibold text-violet-700 transition hover:bg-violet-200"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
