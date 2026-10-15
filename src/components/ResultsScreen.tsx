"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlayerScore } from "@/types";

type ResultsScreenProps = {
  standings: PlayerScore[];
  winner: PlayerScore | null;
  isHost: boolean;
  onPlayAgain: () => Promise<void>;
};

export default function ResultsScreen({
  standings,
  winner,
  isHost,
  onPlayAgain
}: ResultsScreenProps) {
  const medals = ["🥇", "🥈", "🥉"];
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-blue-600 to-indigo-700 flex flex-col items-center justify-center p-4 pb-8">
      <div className="w-full max-w-lg">
        {/* Winner celebration */}
        {winner && (
          <div className="text-center mb-6 animate-bounce">
            <div className="text-6xl mb-3">🏆</div>
            <h1 className="text-4xl font-bold text-white mb-1">
              ¡{winner.name}!
            </h1>
            <p className="text-blue-200 text-lg">Ha ganado la partida</p>
          </div>
        )}

        {!winner && standings.length > 0 && (
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">🤝</div>
            <h1 className="text-3xl font-bold text-white mb-1">¡Empate!</h1>
            <p className="text-blue-200 text-lg">
              Nadie sacó ventaja esta vez
            </p>
          </div>
        )}

        {/* Standings */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">
            Clasificación final
          </h2>
          <div className="space-y-3">
            {standings
              .slice()
              .sort((a, b) => b.total - a.total)
              .map((entry, idx) => (
                <div
                  key={entry.playerId}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                    idx === 0
                      ? "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200"
                      : idx === 1
                        ? "bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200"
                        : idx === 2
                          ? "bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200"
                          : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl w-8 text-center">
                      {medals[idx] ?? (
                        <span className="text-lg font-bold text-gray-400">
                          {idx + 1}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-gray-800 text-lg">
                      {entry.name}
                    </span>
                  </div>
                  <span className="font-bold text-xl text-gray-900">
                    {entry.total}
                    <span className="text-sm text-gray-400 font-normal ml-1">
                      pts
                    </span>
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-2xl p-5 space-y-3">
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
          {isHost && (
            <button
              onClick={handlePlayAgain}
              disabled={resetting}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              {resetting ? "Reiniciando..." : "Jugar otra vez"}
            </button>
          )}
          <Link
            href="/"
            className="block w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-center"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
