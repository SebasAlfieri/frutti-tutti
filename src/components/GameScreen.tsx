"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Answers, Player, Room } from "@/types";
import { ROUND_DURATION_SECONDS } from "@/lib/constants";
import { clearDraft, readDraft, saveDraft } from "@/lib/game/draft";
import { getRoundLetter } from "@/lib/game/scoring";
import { finishRound } from "@/lib/repositories/room";
import { submitResponses } from "@/lib/repositories/round";
import RoundIntro from "@/components/RoundIntro";

type GameScreenProps = {
  room: Room;
  players: Player[];
  playerId: string;
};

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const INTRO_WINDOW_MS = 8000;

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
  // Intro de "ronda empezando". Se decide en el primer render del cliente: el
  // componente solo se monta cuando la sala ya cargó (nunca en el servidor), así
  // que no hay riesgo de desajuste de hidratación. Solo se reproduce si la ronda
  // acaba de comenzar, para no repetirla al reconectar a mitad de ronda.
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined" || room.roundStartedAt == null) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return Date.now() - room.roundStartedAt <= INTRO_WINDOW_MS;
  });
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

  // "¡Tuti Frutti!" only makes sense once every category has an answer. The
  // countdown timeout still closes the round regardless (partial answers count).
  const allFilled = room.settings.categories.every(
    (category) => (answers[category.id] ?? "").trim().length > 0
  );

  const filledCount = room.settings.categories.filter(
    (category) => (answers[category.id] ?? "").trim().length > 0
  ).length;
  const totalCategories = room.settings.categories.length;

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
  const handleTuttiFrutti = async () => {
    if (submittedRef.current || !allFilled) return;
    await endRound(ownName);
  };

  const handleChange = (categoryId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [categoryId]: value }));
  };

  const isRoundFinished = room.finishedBy != null;
  const displayTime = isRoundFinished ? 0 : timeLeft;

  const timeRatio = Math.max(
    0,
    Math.min(1, displayTime / ROUND_DURATION_SECONDS)
  );

  const isLow = displayTime <= 10;
  const isWarn = !isLow && displayTime <= 30;

  const ringColor = isLow
    ? "text-rose-500"
    : isWarn
      ? "text-amber-500"
      : "text-fuchsia-500";

  const timeTextColor = isLow
    ? "text-rose-600"
    : isWarn
      ? "text-amber-600"
      : "text-violet-900";

  return (
    <main className="relative flex min-h-screen flex-col items-center px-4 py-6">
      {showIntro && (
        <RoundIntro
          round={room.currentRound}
          totalRounds={room.settings.roundsToWin}
          letter={letter}
          categories={room.settings.categories.map((category) => category.label)}
          onDone={() => setShowIntro(false)}
        />
      )}

      {/* Header: Letra + Ronda + Tiempo */}
      <div className="mb-4 w-full max-w-lg">
        <div className="tuti-card flex items-center justify-between p-4">
          <div className="text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
              Letra
            </p>
            <div className="flex h-14 w-14 animate-pop-in items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-violet-600 shadow-lg shadow-fuchsia-500/40">
              <span className="font-display text-3xl font-black text-white">
                {letter}
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
              Ronda
            </p>
            <p className="font-display text-3xl font-black text-violet-900">
              {room.currentRound}
              <span className="text-base font-semibold text-violet-300">
                /{room.settings.roundsToWin}
              </span>
            </p>
          </div>

          <div className="text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
              Tiempo
            </p>
            <div className={`relative h-14 w-14 ${isLow ? "animate-timer-alarm" : ""}`}>
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgba(139,92,246,0.16)"
                  strokeWidth="7"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - timeRatio)}
                  className={`${ringColor} transition-[stroke-dashoffset] duration-1000 ease-linear`}
                />
              </svg>
              <span
                className={`absolute inset-0 flex items-center justify-center font-mono text-lg font-bold ${timeTextColor}`}
              >
                {displayTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isRoundFinished && (
        <div className="mb-4 w-full max-w-lg animate-pop-in">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="font-display text-lg font-bold text-amber-800">
              ¡Ronda terminada! 🎉
            </p>
            <p className="mt-1 text-sm text-amber-600">
              {room.finishedBy?.playerName} presionó ¡Tuti Frutti!
            </p>
          </div>
        </div>
      )}

      {/* Progreso */}
      <div className="mb-3 w-full max-w-lg">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-fuchsia-100/80">
          <span>{filledCount} de {totalCategories} completadas</span>
          {allFilled && <span className="text-emerald-200">¡Listo para gritar! 🎉</span>}
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-emerald-400 transition-all duration-300"
            style={{
              width: `${totalCategories ? (filledCount / totalCategories) * 100 : 0}%`
            }}
          />
        </div>
      </div>

      {/* Categorías */}
      <div className="w-full max-w-lg flex-1 space-y-3">
        {room.settings.categories.map((category, index) => {
          const value = answers[category.id] ?? "";
          const filled = value.trim().length > 0;
          return (
            <div
              key={category.id}
              className="tuti-card animate-fade-up p-4"
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <label className="mb-2 flex items-center justify-between text-sm font-semibold text-violet-800">
                <span>{category.label}</span>
                {filled && (
                  <span className="flex h-5 w-5 animate-pop-in items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                    ✓
                  </span>
                )}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => handleChange(category.id, e.target.value)}
                placeholder={category.placeholder || `Empieza con ${letter}`}
                disabled={submitted || isRoundFinished}
                className="tuti-input disabled:bg-violet-50 disabled:text-violet-300"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
          );
        })}
      </div>

      {/* Botón ¡Tuti Frutti! */}
      <div className="sticky bottom-4 mt-4 w-full max-w-lg">
        <button
          onClick={handleTuttiFrutti}
          disabled={submitted || submitting || isRoundFinished || !allFilled}
          className={`tuti-cta w-full bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 px-4 py-5 text-2xl font-black text-white shadow-2xl shadow-rose-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${
            allFilled && !submitted && !isRoundFinished
              ? "tuti-sheen animate-pulse-soft"
              : ""
          }`}
        >
          {submitted ? "¡Enviado! ✓" : submitting ? "Enviando..." : "¡TUTI FRUTTI! 🍓"}
        </button>
        {!allFilled && !submitted && !isRoundFinished && (
          <p className="mt-2 text-center text-xs font-medium text-fuchsia-100/80">
            Completá todas las categorías para poder decir ¡Tuti Frutti!
          </p>
        )}
      </div>
    </main>
  );
}
