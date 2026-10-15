"use client";

import { useState } from "react";
import type { Room, RoomSettings, Player } from "@/types";
import { MIN_PLAYERS_TO_START } from "@/lib/constants";
import CategoryEditor from "@/components/CategoryEditor";

type LobbyProps = {
  room: Room;
  players: Player[];
  playerId: string;
  isHost: boolean;
  onStartGame: () => Promise<void>;
  onCloseRoom: () => Promise<void>;
  onKickPlayer: (playerId: string) => Promise<void>;
  onSaveSettings: (settings: RoomSettings) => Promise<void>;
};

export default function Lobby({
  room,
  players,
  playerId,
  isHost,
  onStartGame,
  onCloseRoom,
  onKickPlayer,
  onSaveSettings
}: LobbyProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [kicking, setKicking] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const shareableLink =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/room/${room.id}`;

  const copyText = async (text: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleKickPlayer = async (targetId: string) => {
    if (!isHost || targetId === room.hostId) return;
    setKicking(targetId);
    setActionError(null);
    try {
      await onKickPlayer(targetId);
    } catch {
      setActionError("No se pudo expulsar al jugador");
    } finally {
      setKicking(null);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setActionError(null);
    try {
      await onStartGame();
    } catch {
      setActionError("No se pudo iniciar la partida");
      setStarting(false);
    }
  };

  const handleCloseRoom = async () => {
    setClosing(true);
    setActionError(null);
    try {
      await onCloseRoom();
    } catch {
      setActionError("No se pudo cerrar la sala");
      setClosing(false);
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === room.hostId) return -1;
    if (b.id === room.hostId) return 1;
    return a.joinedAt - b.joinedAt;
  });

  const canStart = players.length >= MIN_PLAYERS_TO_START;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Room code card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4 text-center">
          <p className="text-sm text-gray-500 mb-2">Código de la sala</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-mono font-bold tracking-[0.2em] text-gray-900">
              {room.code}
            </span>
            <button
              onClick={() => copyText(room.code, "code")}
              className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
              title="Copiar código"
              aria-label="Copiar código"
            >
              {copied === "code" ? (
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={() => copyText(shareableLink, "link")}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition"
          >
            {copied === "link" ? "¡Enlace copiado!" : "Copiar enlace de invitación"}
          </button>
        </div>

        {/* Players list */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Jugadores ({players.length})
            </h2>
            <span className="text-xs text-gray-400">
              Mínimo {MIN_PLAYERS_TO_START} para empezar
            </span>
          </div>
          <ul className="space-y-2">
            {sortedPlayers.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      player.connected ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="font-medium text-gray-800">
                    {player.name}
                  </span>
                  {player.id === room.hostId && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      Host
                    </span>
                  )}
                  {player.id === playerId && (
                    <span className="text-xs text-gray-400">(tú)</span>
                  )}
                </div>
                {isHost && player.id !== room.hostId && (
                  <button
                    onClick={() => handleKickPlayer(player.id)}
                    disabled={kicking === player.id}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition disabled:opacity-50"
                  >
                    {kicking === player.id ? "..." : "Expulsar"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Game settings */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Categorías
            </h2>
            {isHost && (
              <button
                onClick={() => setShowSettings((value) => !value)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition"
              >
                {showSettings ? "Cerrar" : "Personalizar"}
              </button>
            )}
          </div>

          {isHost && showSettings ? (
            <div className="mt-4">
              <CategoryEditor
                categories={room.settings.categories}
                pointsPerCorrect={room.settings.pointsPerCorrect}
                roundsToWin={room.settings.roundsToWin}
                onSave={onSaveSettings}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mt-3">
                {room.settings.categories.map((category) => (
                  <span
                    key={category.id}
                    className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full"
                  >
                    {category.label}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {room.settings.pointsPerCorrect} pts por acierto único ·{" "}
                {room.settings.roundsToWin} rondas
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {actionError && (
            <p className="text-sm text-red-600 mb-3 text-center">{actionError}</p>
          )}
          {isHost ? (
            <div className="space-y-3">
              <button
                onClick={handleStart}
                disabled={!canStart || starting}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
              >
                {starting
                  ? "Iniciando..."
                  : canStart
                    ? "Comenzar partida"
                    : `Se necesitan ${MIN_PLAYERS_TO_START} jugadores`}
              </button>
              <button
                onClick={handleCloseRoom}
                disabled={closing}
                className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition disabled:opacity-50"
              >
                {closing ? "Cerrando..." : "Cerrar sala"}
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Esperando a que el host comience la partida...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
