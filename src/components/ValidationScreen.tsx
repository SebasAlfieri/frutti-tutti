"use client";

import { useMemo, useState } from "react";
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
  /** Marks the current player as ready for the next round (toggles). */
  onToggleReady: () => Promise<void>;
  /** Host-only escape hatch: advance without waiting for everyone. */
  onForceAdvance?: () => Promise<void>;
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

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ValidationScreen({
  room,
  players,
  playerId,
  responses,
  standings,
  onToggleReady,
  onForceAdvance
}: ValidationScreenProps) {
  const isHost = room.hostId === playerId;
  const letter = getRoundLetter(room.letters, room.currentRound);
  const isLastRound = room.currentRound >= room.settings.roundsToWin;

  const [toggling, setToggling] = useState(false);
  const [forcing, setForcing] = useState(false);
  const [readyError, setReadyError] = useState<string | null>(null);

  const roundStartedAt = room.roundStartedAt;

  const isPlayerReady = (player: Player): boolean =>
    roundStartedAt != null && player.readyRoundStartedAt === roundStartedAt;

  const readyPlayers = players.filter(isPlayerReady);
  const waitingPlayers = players.filter((player) => !isPlayerReady(player));
  const allReady = players.length > 0 && waitingPlayers.length === 0;
  const iAmReady = readyPlayers.some((player) => player.id === playerId);

  const handleToggleReady = async () => {
    setToggling(true);
    setReadyError(null);
    try {
      await onToggleReady();
    } catch {
      setReadyError("No se pudo marcar como listo. Intentá de nuevo.");
    } finally {
      setToggling(false);
    }
  };

  const handleForce = async () => {
    if (!onForceAdvance) return;
    setForcing(true);
    setReadyError(null);
    try {
      await onForceAdvance();
    } catch {
      setReadyError("No se pudo continuar. Intentá de nuevo.");
      setForcing(false);
    }
  };

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
    green: "bg-emerald-50 border-emerald-200 text-emerald-800",
    yellow: "bg-amber-50 border-amber-200 text-amber-800",
    red: "bg-rose-50 border-rose-200 text-rose-800",
    gray: "bg-violet-50 border-violet-100 text-violet-300"
  };

  const dotStyles: Record<AnswerColor, string> = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-rose-500",
    gray: "bg-violet-200"
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Encabezado */}
        <div className="tuti-card animate-fade-up mb-4 p-5 text-center">
          <div className="mb-2 flex items-center justify-center gap-3">
            <span className="flex h-12 w-12 animate-pop-in items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-violet-600 font-display text-2xl font-black text-white shadow-lg shadow-fuchsia-500/40">
              {letter}
            </span>
            <div className="text-left">
              <h2 className="font-display text-xl font-black text-violet-900">
                Validación
              </h2>
              <p className="text-sm font-medium text-violet-400">
                Ronda {room.currentRound} de {room.settings.roundsToWin}
              </p>
            </div>
          </div>
          {room.finishedBy && (
            <p className="text-sm text-violet-500">
              Finalizada por{" "}
              <span className="font-semibold text-violet-800">
                {room.finishedBy.playerName}
              </span>{" "}
              🍓
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-violet-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Única válida
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Repetida (0 pts)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> No válida
            </span>
          </div>
        </div>

        {/* Respuestas por categoría */}
        <div className="mb-4 space-y-4">
          {room.settings.categories.map((category, categoryIndex) => (
            <div
              key={category.id}
              className="tuti-card animate-fade-up p-4"
              style={{ animationDelay: `${categoryIndex * 50}ms` }}
            >
              <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-violet-700">
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
                      className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 ${colorStyles[color]}`}
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotStyles[color]}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium opacity-70">
                            {player.name}
                          </p>
                          <p className="truncate text-base font-semibold">
                            {rawAnswer || "—"}
                          </p>
                          {sharers.length > 0 && (
                            <p className="mt-0.5 text-xs opacity-60">
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

        {/* Clasificación acumulada (calculada en cada cliente) */}
        <div
          className="tuti-card animate-fade-up mb-4 p-5"
          style={{ animationDelay: "80ms" }}
        >
          <h3 className="mb-1 text-center font-display text-lg font-black text-violet-900">
            Clasificación acumulada
          </h3>
          <p className="mb-3 text-center text-xs font-medium text-violet-400">
            Puntos totales hasta la ronda {room.currentRound}
          </p>
          <div className="space-y-2">
            {ranking.map((entry, idx) => (
              <div
                key={entry.playerId}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${
                  entry.playerId === playerId
                    ? "bg-gradient-to-r from-fuchsia-100 to-violet-100 ring-1 ring-fuchsia-200"
                    : "bg-violet-50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-7 text-center text-lg font-bold text-violet-400">
                    {MEDALS[idx] ?? idx + 1}
                  </span>
                  <span className="truncate font-semibold text-violet-900">
                    {entry.name}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-emerald-600">
                    +{entry.delta}
                  </span>
                  <span className="w-14 text-right font-black text-violet-900">
                    {entry.total}
                    <span className="ml-1 text-xs font-normal text-violet-400">
                      pts
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Listo para continuar */}
        <div className="tuti-card animate-fade-up p-5 text-center" style={{ animationDelay: "140ms" }}>
          <h3 className="mb-1 font-display text-lg font-black text-violet-900">
            {isLastRound
              ? "¿Listos para ver los resultados?"
              : `¿Listos para la ronda ${room.currentRound + 1}?`}
          </h3>
          <p className="mb-4 text-xs font-medium text-violet-400">
            {isLastRound
              ? "Cuando todos estén listos, terminamos la partida."
              : "Cuando todos estén listos, empieza la siguiente ronda."}
          </p>

          {/* Quién está listo / quién falta */}
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {readyPlayers.map((player) => (
              <span
                key={player.id}
                className="inline-flex animate-pop-in items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
              >
                <span aria-hidden>✓</span>
                {player.name}
              </span>
            ))}
            {waitingPlayers.map((player) => (
              <span
                key={player.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-sm font-medium text-violet-400"
              >
                <span className="h-3 w-3 animate-pulse rounded-full border-2 border-violet-300" />
                {player.name}
              </span>
            ))}
          </div>

          <p className="mb-4 text-sm font-medium text-violet-500">
            Listos: <span className="font-bold text-violet-800">{readyPlayers.length}</span> /{" "}
            {players.length}
            {waitingPlayers.length > 0 && (
              <>
                {" · "}
                Faltan:{" "}
                <span className="font-semibold">
                  {waitingPlayers.map((player) => player.name).join(", ")}
                </span>
              </>
            )}
          </p>

          {readyError && (
            <p className="mb-3 animate-pop-in rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {readyError}
            </p>
          )}

          {allReady ? (
            <div className="flex items-center justify-center gap-2 py-3.5 font-display font-bold text-emerald-600">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
              ¡Todos listos! Comenzando…
            </div>
          ) : (
            <button
              onClick={handleToggleReady}
              disabled={toggling}
              className={`tuti-cta w-full px-4 py-3.5 text-lg ${
                iAmReady
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300"
                  : "tuti-sheen bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30"
              } disabled:opacity-50`}
            >
              {toggling
                ? "Guardando…"
                : iAmReady
                  ? "Estoy listo ✓ (tocar para cancelar)"
                  : "¡Listo! 👍"}
            </button>
          )}

          {/* Válvula de escape del host: continuar aunque falte alguien. */}
          {isHost && onForceAdvance && !allReady && (
            <button
              onClick={handleForce}
              disabled={forcing}
              className="mt-3 text-xs font-medium text-violet-400 underline transition hover:text-violet-600 disabled:opacity-50"
            >
              {forcing ? "Continuando…" : "Continuar sin esperar (host)"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
