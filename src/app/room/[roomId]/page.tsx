"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ensureSignedIn } from "@/lib/auth";
import { useRoom } from "@/hooks/use-room";
import { usePlayers } from "@/hooks/use-players";
import { usePresence } from "@/hooks/use-presence";
import {
  clearRoundResponses,
  closeRoom,
  joinRoom,
  removePlayer,
  resetRoom,
  saveRoomSettings,
  startRound,
  updateRoomStatus
} from "@/lib/repositories/room";
import { subscribeToResponses, submitResponses } from "@/lib/repositories/round";
import { clearDraft, readDraft } from "@/lib/game/draft";
import {
  calculateRoundScores,
  computeStandings,
  determineWinner,
  getRoundLetter,
  pickRandomLetter
} from "@/lib/game/scoring";
import { MAX_PLAYERS } from "@/lib/constants";
import type { PlayerScore, RoomSettings, RoundData, RoundResponse } from "@/types";
import Lobby from "@/components/Lobby";
import GameScreen from "@/components/GameScreen";
import ValidationScreen from "@/components/ValidationScreen";
import ResultsScreen from "@/components/ResultsScreen";
import JoinGate from "@/components/JoinGate";

const PLAYER_NAME_KEY = "tuti-player-name";

function RoomPageContent() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;

  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [autoJoinFailed, setAutoJoinFailed] = useState(false);
  const [allRoundsResponses, setAllRoundsResponses] = useState<
    Record<number, Record<string, RoundResponse>>
  >({});
  const joinAttemptedRef = useRef(false);

  // ─── Anonymous sign-in ────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    console.log("[tuti:room] iniciando sesión…");
    ensureSignedIn()
      .then((user) => {
        if (active) {
          console.log("[tuti:room] sesión lista → uid:", user.uid);
          setUserId(user.uid);
        }
      })
      .catch((error) => {
        console.error("[tuti:room] no se pudo iniciar sesión:", error);
        if (active) {
          setAuthError(
            "No se pudo iniciar la sesión. Verificá que la autenticación anónima esté habilitada en Firebase."
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // ─── Real-time data ───────────────────────────────────────────────────────
  const { room, loading: roomLoading, error: roomError } = useRoom(roomId);
  const { players, loading: playersLoading } = usePlayers(roomId);
  const currentRound = room?.currentRound ?? 0;

  const isMember =
    userId != null && players.some((player) => player.id === userId);
  const isHost = room != null && userId != null && room.hostId === userId;

  // Presence heartbeat only runs in the lobby: that is the only screen that
  // shows online status, so we avoid the write/read cost during rounds.
  usePresence(roomId, userId, isMember && room?.status === "lobby");

  // ─── Join flow ────────────────────────────────────────────────────────────
  const join = useCallback(
    async (name: string) => {
      if (!userId) return;
      setJoining(true);
      setJoinError(null);
      try {
        console.log("[tuti:room] join() → roomId:", roomId, "| nombre:", name.trim());
        await joinRoom(roomId, userId, name.trim());
        localStorage.setItem(PLAYER_NAME_KEY, name.trim());
      } catch (error) {
        console.error("[tuti:room] join() falló:", error);
        setJoinError("No se pudo entrar a la sala. Intentá de nuevo.");
        joinAttemptedRef.current = false;
      } finally {
        setJoining(false);
      }
    },
    [roomId, userId]
  );

  // Auto-join when a stored name exists (e.g. arriving from the home page).
  // `awaitingAutoJoin` is derived (no state) so no setState runs synchronously
  // in the effect; failures flip `autoJoinFailed` from an async callback.
  const storedName =
    typeof window === "undefined"
      ? ""
      : localStorage.getItem(PLAYER_NAME_KEY) ?? "";

  const awaitingAutoJoin =
    userId != null &&
    room != null &&
    !playersLoading &&
    !isMember &&
    !autoJoinFailed &&
    room.status === "lobby" &&
    players.length < MAX_PLAYERS &&
    storedName.length > 0;

  useEffect(() => {
    if (!awaitingAutoJoin || !userId || !room) return;
    if (joinAttemptedRef.current) return;
    joinAttemptedRef.current = true;

    void (async () => {
      try {
        console.log("[tuti:room] auto-join con nombre guardado:", storedName.trim());
        await joinRoom(roomId, userId, storedName.trim());
        localStorage.setItem(PLAYER_NAME_KEY, storedName.trim());
      } catch (error) {
        console.error("[tuti:room] auto-join falló:", error);
        joinAttemptedRef.current = false;
        setAutoJoinFailed(true);
      }
    })();
  }, [awaitingAutoJoin, userId, room, roomId, storedName]);

  // ─── Flush local draft when the round is closed by someone else ───────────
  // The parent swaps GameScreen → ValidationScreen as soon as `finishedBy` is
  // set, so GameScreen cannot submit on its own. We persist whatever the local
  // draft holds (a no-op if it already submitted, since the draft is cleared).
  const roundFinished = room?.finishedBy != null;
  const roundToFlush = room?.currentRound ?? 0;

  useEffect(() => {
    if (!userId || !roundFinished || roundToFlush < 1) return;
    const draft = readDraft(roomId, roundToFlush);
    if (Object.keys(draft).length === 0) return;

    void (async () => {
      try {
        console.log("[tuti:room] volcando borrador local de la ronda", roundToFlush);
        await submitResponses(roomId, roundToFlush, userId, draft);
        clearDraft(roomId, roundToFlush);
      } catch (error) {
        // Keep the draft so the player can retry / it survives a reload.
        console.error("[tuti:room] no se pudo volcar el borrador local:", error);
      }
    })();
  }, [userId, roundFinished, roundToFlush, roomId]);

  // ─── Round responses (tracked during validation and at the end) ───────────
  // We only need responses once a round is over (validation) or once the game
  // is finished, and we track every round 1..currentRound so the standings can
  // be accumulated. A single subscription set avoids duplicate listeners.
  const trackingRounds =
    roundFinished || room?.status === "finished";

  useEffect(() => {
    if (!trackingRounds || currentRound < 1) return;
    const unsubs: Array<() => void> = [];
    for (let round = 1; round <= currentRound; round++) {
      const unsub = subscribeToResponses(roomId, round, (roundResponses) => {
        setAllRoundsResponses((prev) => ({ ...prev, [round]: roundResponses }));
      });
      unsubs.push(unsub);
    }
    return () => unsubs.forEach((unsub) => unsub());
  }, [trackingRounds, currentRound, roomId]);

  // Responses of the round currently being validated / shown.
  const roundResponses = allRoundsResponses[currentRound] ?? {};

  // ─── Derived cumulative standings ─────────────────────────────────────────
  const standings = useMemo<PlayerScore[]>(() => {
    if (!room || Object.keys(allRoundsResponses).length === 0) return [];
    const perRoundScores: PlayerScore[][] = [];
    for (let round = 1; round <= room.currentRound; round++) {
      const responsesForRound = allRoundsResponses[round];
      if (!responsesForRound) continue;
      const roundData: RoundData = { responses: responsesForRound };
      perRoundScores.push(
        calculateRoundScores(
          players,
          roundData,
          room.settings,
          getRoundLetter(room.letters, round)
        )
      );
    }
    return computeStandings(perRoundScores);
  }, [room, players, allRoundsResponses]);

  const winner = useMemo(
    () => (standings.length > 0 ? determineWinner(standings) : null),
    [standings]
  );

  // ─── Host actions ─────────────────────────────────────────────────────────
  const handleStartGame = useCallback(async () => {
    console.log("[tuti:room] host inicia la partida");
    await startRound(roomId, pickRandomLetter(), 1);
  }, [roomId]);

  const handleNextRound = useCallback(async () => {
    if (!room) return;
    console.log("[tuti:room] host avanza a la ronda", room.currentRound + 1);
    await startRound(roomId, pickRandomLetter(), room.currentRound + 1);
  }, [room, roomId]);

  const handleFinishGame = useCallback(async () => {
    console.log("[tuti:room] host finaliza la partida");
    await updateRoomStatus(roomId, "finished");
  }, [roomId]);

  const handlePlayAgain = useCallback(async () => {
    if (!room) return;
    console.log("[tuti:room] host reinicia la partida");
    setAllRoundsResponses({});
    await clearRoundResponses(roomId, room.currentRound);
    await resetRoom(roomId);
  }, [room, roomId]);

  const handleCloseRoom = useCallback(async () => {
    console.log("[tuti:room] host cierra la sala");
    await closeRoom(roomId, room?.currentRound ?? 0);
    router.push("/");
  }, [roomId, room?.currentRound, router]);

  const handleSaveSettings = useCallback(
    async (settings: RoomSettings) => {
      await saveRoomSettings(roomId, settings);
    },
    [roomId]
  );

  const handleKickPlayer = useCallback(
    async (targetId: string) => {
      await removePlayer(roomId, targetId);
    },
    [roomId]
  );

  // ─── Loading / error states ───────────────────────────────────────────────
  if (authError) {
    return (
      <ErrorScreen message={authError} onHome={() => router.push("/")} />
    );
  }

  if (roomLoading) {
    return <LoadingScreen />;
  }

  if (roomError || !room) {
    return (
      <ErrorScreen
        message="La sala fue cerrada o no existe."
        onHome={() => router.push("/")}
      />
    );
  }

  // ─── Not a member yet ─────────────────────────────────────────────────────
  if (!isMember) {
    if (room.status !== "lobby") {
      return (
        <ErrorScreen
          message="La partida ya comenzó. Pedile al host que cree una sala nueva."
          onHome={() => router.push("/")}
        />
      );
    }
    if (players.length >= MAX_PLAYERS) {
      return (
        <ErrorScreen
          message="La sala está llena."
          onHome={() => router.push("/")}
        />
      );
    }
    if (awaitingAutoJoin) {
      return <LoadingScreen />;
    }
    return (
      <JoinGate
        roomCode={room.code}
        defaultName={storedName}
        joining={joining}
        error={joinError}
        onJoin={join}
      />
    );
  }

  // ─── Render by room status ────────────────────────────────────────────────
  if (room.status === "lobby") {
    return (
      <Lobby
        room={room}
        players={players}
        playerId={userId!}
        isHost={isHost}
        onStartGame={handleStartGame}
        onCloseRoom={handleCloseRoom}
        onKickPlayer={handleKickPlayer}
        onSaveSettings={handleSaveSettings}
      />
    );
  }

  if (room.status === "playing") {
    if (room.finishedBy) {
      return (
        <ValidationScreen
          room={room}
          players={players}
          playerId={userId!}
          responses={roundResponses}
          standings={standings}
          onNextRound={handleNextRound}
          onFinishGame={handleFinishGame}
        />
      );
    }
    return <GameScreen key={room.currentRound} room={room} players={players} playerId={userId!} />;
  }

  return (
    <ResultsScreen
      standings={standings}
      winner={winner}
      isHost={isHost}
      onPlayAgain={handlePlayAgain}
    />
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-blue-600 to-indigo-700 flex items-center justify-center">
      <div className="text-white text-lg animate-pulse">Cargando sala...</div>
    </div>
  );
}

function ErrorScreen({
  message,
  onHome
}: {
  message: string;
  onHome: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
        <p className="text-red-600 mb-4">{message}</p>
        <button
          onClick={onHome}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RoomPageContent />
    </Suspense>
  );
}
