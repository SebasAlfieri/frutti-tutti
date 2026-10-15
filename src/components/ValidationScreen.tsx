"use client";

import { useMemo } from "react";
import type { Player, PlayerScore, Room, RoundResponse } from "@/types";
import {
  calculateRoundScores,
  getRoundLetter,
  isValidAnswer,
  normalizeAnswer
} from "@/lib/game/scoring";

type ValidationScreenProps = {
  room: Room;
  players: Player[];
  playerId: string;
  responses: Record<string, RoundResponse>;
  /** Cumulative standings up to and including the current round. */
  standings: PlayerScore[];
  onNextRound: () => void;
  onFinishGame: () => void;
};

type AnswerColor = "green" | "yellow" | "red" | "gray";

type RankingRow = {
  playerId: string;
  name: string;
  /** Points earned in this round. */
  delta: number;
  /** Cumulative points up to this round. */
  total: number;
};

export default function ValidationScreen({
  room,
  players,
  playerId,
  responses,
  standings,
  onNextRound,
  onFinishGame
}: ValidationScreenProps) {
  const isHost = room.hostId === playerId;
  const letter = getRoundLetter(room.letters, room.currentRound);
  const isLastRound = room.currentRound >= room.settings.roundsToWin;

  // Build answer groups: Map<categoryId, Map<normalizedAnswer, playerId[]>>
  const answerGroups = useMemo(() => {
    const groups = new Map<string, Map<string, string[]>>();

    for (const category of room.settings.categories) {
      const catMap = new Map<string, string[]>();
      for (const player of players) {
        const rawAnswer = responses[player.id]?.answers[category.id] ?? "";
        if (!isValidAnswer(rawAnswer, letter)) continue;
        const normalized = normalizeAnswer(rawAnswer);
        const existing = catMap.get(normalized);
        if (existing) {
          existing.push(player.id);
        } else {
          catMap.set(normalized, [player.id]);
        }
      }
      groups.set(category.id, catMap);
    }

    return groups;
  }, [players, responses, room.settings.categories, letter]);

  // Points earned in the current round (computed locally on every client).
  const roundPointsById = useMemo(() => {
    const result = calculateRoundScores(
      players,
      { responses },
      room.settings,
      letter
    );
    const map: Record<string, number> = {};
    for (const score of result) {
      map[score.playerId] = score.roundTotal;
    }
    return map;
  }, [players, responses, room.settings, letter]);

  // Cumulative ranking. Falls back to the current round while the standings
  // are still loading (they arrive from the responses subscription).
  const ranking = useMemo<RankingRow[]>(() => {
    if (standings.length > 0) {
      return [...standings]
        .sort((a, b) => b.total - a.total)
        .map((entry) => ({
          playerId: entry.playerId,
          name: entry.name,
          delta: roundPointsById[entry.playerId] ?? 0,
          total: entry.total
        }));
    }
    return players
      .map((player) => ({
        playerId: player.id,
        name: player.name,
        delta: roundPointsById[player.id] ?? 0,
        total: roundPointsById[player.id] ?? 0
      }))
      .sort((a, b) => b.delta - a.delta);
  }, [standings, roundPointsById, players]);

  const getAnswerColor = (
    categoryId: string,
    targetPlayerId: string
  ): AnswerColor => {
    const rawAnswer = responses[targetPlayerId]?.answers[categoryId] ?? "";
    const normalized = normalizeAnswer(rawAnswer);

    if (normalized.length === 0) return "gray";
    if (!isValidAnswer(rawAnswer, letter)) return "red";

    const sharers = answerGroups.get(categoryId)?.get(normalized) ?? [];
    return sharers.length > 1 ? "yellow" : "green";
  };

  const getSharers = (categoryId: string, targetPlayerId: string): string[] => {
    const rawAnswer = responses[targetPlayerId]?.answers[categoryId] ?? "";
    const normalized = normalizeAnswer(rawAnswer);
    const sharerIds = answerGroups.get(categoryId)?.get(normalized) ?? [];
    return sharerIds
      .filter((id) => id !== targetPlayerId)
      .map((id) => players.find((player) => player.id === id)?.name ?? "?");
  };

  const colorStyles: Record<AnswerColor, string> = {
    green: "bg-green-50 border-green-300 text-green-800",
    yellow: "bg-yellow-50 border-yellow-300 text-yellow-800",
    red: "bg-red-50 border-red-300 text-red-800",
    gray: "bg-gray-50 border-gray-200 text-gray-400"
  };

  const dotStyles: Record<AnswerColor, string> = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    gray: "bg-gray-300"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-blue-600 to-indigo-700 flex flex-col items-center p-4 pb-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-5 mb-4 text-center">
          <h2 className="text-xl font-bold text-gray-900">
            Validación — Ronda {room.currentRound}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Letra: <span className="font-bold text-lg">{letter}</span>
            {room.finishedBy && (
              <>
                {"  ·  "}
                <span>
                  Finalizada por{" "}
                  <span className="font-medium">
                    {room.finishedBy.playerName}
                  </span>
                </span>
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Única
              válida
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />{" "}
              Repetida (0 pts)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> No válida
            </span>
          </div>
        </div>

        {/* Answers by category */}
        <div className="space-y-4 mb-4">
          {room.settings.categories.map((category) => (
            <div key={category.id} className="bg-white rounded-2xl shadow-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                {category.label}
              </h3>
              <div className="space-y-2">
                {players.map((player) => {
                  const rawAnswer =
                    responses[player.id]?.answers[category.id] ?? "";
                  const color = getAnswerColor(category.id, player.id);
                  const sharers = getSharers(category.id, player.id);

                  return (
                    <div
                      key={player.id}
                      className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl border ${colorStyles[color]}`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotStyles[color]}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium opacity-70">
                            {player.name}
                          </p>
                          <p className="text-base font-semibold truncate">
                            {rawAnswer || "—"}
                          </p>
                          {sharers.length > 0 && (
                            <p className="text-xs opacity-60 mt-0.5">
                              Compartido con: {sharers.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Cumulative standings (computed locally on every client) */}
        <div className="bg-white rounded-2xl shadow-2xl p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">
            Clasificación acumulada
          </h3>
          <p className="text-xs text-gray-400 text-center mb-3">
            Puntos totales hasta la ronda {room.currentRound}
          </p>
          <div className="space-y-2 mb-4">
            {ranking.map((entry, idx) => (
              <div
                key={entry.playerId}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${
                  entry.playerId === playerId
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg font-bold text-gray-400 w-6">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-800 truncate">
                    {entry.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-emerald-600">
                    +{entry.delta}
                  </span>
                  <span className="font-bold text-gray-900 w-14 text-right">
                    {entry.total}
                    <span className="text-xs text-gray-400 font-normal ml-1">
                      pts
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              onClick={isLastRound ? onFinishGame : onNextRound}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/20"
            >
              {isLastRound ? "Ver resultados finales" : "Siguiente ronda"}
            </button>
          ) : (
            <p className="text-center text-sm text-gray-400">
              Esperando a que el host continúe...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
