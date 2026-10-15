"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Answers, Player, Room } from "@/types";
import { ROUND_DURATION_SECONDS } from "@/lib/constants";
import { clearDraft, readDraft, saveDraft } from "@/lib/game/draft";
import { getRoundLetter } from "@/lib/game/scoring";
import { finishRound } from "@/lib/repositories/room";
import { submitResponses } from "@/lib/repositories/round";

type GameScreenProps = {
  room: Room;
  players: Player[];
  playerId: string;
};

function computeTimeLeft(startedAt: number | null): number {
  if (startedAt == null) return ROUND_DURATION_SECONDS;
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return Math.max(0, ROUND_DURATION_SECONDS - elapsed);
}

export default function GameScreen({ room, players, playerId }: GameScreenProps) {
  const letter = getRoundLetter(room.letters, room.currentRound);

  // The component is remounted per round by the parent (keyed), so draft and
  // timer can be initialised once without an effect.
  const [answers, setAnswers] = useState<Answers>(() =>
    readDraft(room.id, room.currentRound)
  );
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    computeTimeLeft(room.roundStartedAt)
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  // ─── Persist draft locally (never per keystroke to Firestore) ─────────────
  useEffect(() => {
    saveDraft(room.id, room.currentRound, answers);
  }, [answers, room.id, room.currentRound]);

  // ─── Submit responses ─────────────────────────────────────────────────────
  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    setSubmitting(true);
    try {
      console.log(
        "[tuti:game] enviando respuestas de la ronda",
        room.currentRound,
        "→",
        playerId
      );
      await submitResponses(room.id, room.currentRound, playerId, answers);
      clearDraft(room.id, room.currentRound);
      console.log("[tuti:game] respuestas enviadas");
    } catch (error) {
      // Allow retry on failure.
      console.error("[tuti:game] no se pudieron enviar las respuestas:", error);
      submittedRef.current = false;
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  }, [room.id, room.currentRound, playerId, answers]);

  const ownName =
    players.find((player) => player.id === playerId)?.name ?? "Jugador";

  // Submits the player's answers and closes the round if nobody has yet.
  // Invoked from the countdown (timeout) and from the ¡Tuti Frutti! button.
  const endRound = useCallback(
    async (playerName: string) => {
      console.log("[tuti:game] cerrando ronda como", playerName);
      try {
        await doSubmit();
        if (!room.finishedBy) {
          await finishRound(room.id, { playerId, playerName, at: Date.now() });
        }
      } catch (error) {
        console.error("[tuti:game] no se pudo cerrar la ronda:", error);
      }
    },
    [doSubmit, room.id, room.finishedBy, playerId]
  );

  const endRoundRef = useRef(endRound);
  useEffect(() => {
    endRoundRef.current = endRound;
  }, [endRound]);

  // ─── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!room.roundStartedAt || room.finishedBy) return;

    const interval = setInterval(() => {
      const remaining = computeTimeLeft(room.roundStartedAt);
      setTimeLeft(remaining);
      if (remaining <= 0 && !submittedRef.current) {
        console.log("[tuti:game] tiempo agotado, cerrando la ronda");
        void endRoundRef.current(ownName);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room.roundStartedAt, room.finishedBy, ownName]);

  // ─── "¡Tuti Frutti!" ──────────────────────────────────────────────────────
  const handleTutiFrutti = async () => {
    if (submittedRef.current) return;
    await endRound(ownName);
  };

  const handleChange = (categoryId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [categoryId]: value }));
  };

  const isRoundFinished = room.finishedBy != null;
  const displayTime = isRoundFinished ? 0 : timeLeft;

  const timerColor =
    displayTime <= 10
      ? "text-red-600"
      : displayTime <= 30
        ? "text-amber-600"
        : "text-gray-900";

  const timerBg =
    displayTime <= 10
      ? "bg-red-50 border-red-200"
      : displayTime <= 30
        ? "bg-amber-50 border-amber-200"
        : "bg-gray-100 border-gray-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-blue-600 to-indigo-700 flex flex-col items-center p-4 pb-8">
      {/* Header: Letter + Timer */}
      <div className="w-full max-w-lg mb-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center justify-between">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Letra</p>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white animate-bounce">
                {letter}
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Ronda</p>
            <p className="text-2xl font-bold text-gray-900">
              {room.currentRound}
              <span className="text-sm text-gray-400 font-normal">
                /{room.settings.roundsToWin}
              </span>
            </p>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Tiempo</p>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${timerBg}`}
            >
              <svg
                className={`w-4 h-4 ${timerColor}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className={`text-xl font-mono font-bold ${timerColor}`}>
                {displayTime}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {isRoundFinished && (
        <div className="w-full max-w-lg mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-amber-800 font-semibold">¡Ronda terminada!</p>
            <p className="text-amber-600 text-sm mt-1">
              {room.finishedBy?.playerName} presionó ¡Tuti Frutti!
            </p>
          </div>
        </div>
      )}

      {/* Category inputs */}
      <div className="w-full max-w-lg space-y-3 flex-1">
        {room.settings.categories.map((category) => (
          <div key={category.id} className="bg-white rounded-2xl shadow-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {category.label}
            </label>
            <input
              type="text"
              value={answers[category.id] ?? ""}
              onChange={(e) => handleChange(category.id, e.target.value)}
              placeholder={category.placeholder || `Empieza con ${letter}`}
              disabled={submitted || isRoundFinished}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        ))}
      </div>

      {/* ¡Tuti Frutti! button */}
      <div className="w-full max-w-lg mt-4">
        <button
          onClick={handleTutiFrutti}
          disabled={submitted || submitting || isRoundFinished}
          className="w-full py-5 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xl font-bold rounded-2xl shadow-2xl shadow-pink-500/30 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {submitted ? "¡Enviado!" : submitting ? "Enviando..." : "¡Tuti Frutti!"}
        </button>
      </div>
    </div>
  );
}
