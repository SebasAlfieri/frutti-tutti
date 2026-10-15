"use client";

import { useState } from "react";
import type { Room, RoomSettings, Player } from "@/types";
import { MIN_PLAYERS_TO_START } from "@/lib/constants";
import CategoryEditor from "@/components/CategoryEditor";
import { usePlayerActivity } from "@/hooks/use-player-activity";

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

const AVATAR_GRADIENTS = [
  "from-fuchsia-500 to-pink-500",
  "from-violet-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-blue-500",
  "from-rose-500 to-red-500"
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

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

  const { displayPlayers, toasts, dismissToast } = usePlayerActivity(players);

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

  const sortedPlayers = [...displayPlayers].sort((a, b) => {
    if (a.leaving && !b.leaving) return 1;
    if (b.leaving && !a.leaving) return -1;
    if (a.id === room.hostId) return -1;
    if (b.id === room.hostId) return 1;
    return a.joinedAt - b.joinedAt;
  });

  const canStart = players.length >= MIN_PLAYERS_TO_START;

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8">
      {/* Avisos de entrada / salida */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur ${
              toast.type === "join"
                ? "border-emerald-300/60 bg-emerald-500/90"
                : "border-rose-300/60 bg-rose-500/90"
            } ${toast.closing ? "animate-toast-out" : "animate-toast-in"}`}
          >
            <span>{toast.type === "join" ? "👋" : "🚪"}</span>
            <span>
              {toast.name} {toast.type === "join" ? "se unió" : "salió"}
            </span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Cerrar aviso"
              className="ml-1 text-white/70 transition hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg">
        {/* Código de la sala */}
        <div
          className="tuti-card animate-fade-up mb-4 p-6 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">
            Código de la sala
          </p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="bg-gradient-to-r from-fuchsia-600 to-violet-600 bg-clip-text font-mono text-4xl font-black tracking-[0.2em] text-transparent">
              {room.code}
            </span>
            <button
              onClick={() => copyText(room.code, "code")}
              className="rounded-xl bg-violet-100 p-2 text-violet-600 transition hover:scale-105 hover:bg-violet-200 active:scale-95"
              title="Copiar código"
              aria-label="Copiar código"
            >
              {copied === "code" ? (
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={() => copyText(shareableLink, "link")}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-4 py-1.5 text-sm font-semibold text-violet-600 transition hover:scale-[1.03] hover:bg-violet-100 active:scale-95"
          >
            {copied === "link" ? "¡Enlace copiado! ✓" : "🔗 Copiar enlace de invitación"}
          </button>
        </div>

        {/* Jugadores */}
        <div
          className="tuti-card animate-fade-up mb-4 p-6"
          style={{ animationDelay: "100ms" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-violet-900">
              Jugadores <span className="text-fuchsia-600">({players.length})</span>
            </h2>
            <span className="text-xs font-medium text-violet-400">
              Mínimo {MIN_PLAYERS_TO_START} para empezar
            </span>
          </div>

          <ul className="space-y-2">
            {sortedPlayers.map((player) => (
              <li
                key={player.id}
                className={`flex items-center justify-between rounded-2xl bg-violet-50/80 py-2.5 pl-2.5 pr-3 ring-1 ring-violet-100 ${
                  player.leaving ? "animate-fade-out" : "animate-pop-in"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative shrink-0">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(
                        player.id
                      )} font-display text-lg font-bold text-white shadow-md`}
                    >
                      {player.name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        player.connected ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    />
                  </span>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-violet-950">
                      {player.name}
                    </span>
                    {player.id === room.hostId && (
                      <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                        👑 Host
                      </span>
                    )}
                    {player.id === playerId && (
                      <span className="text-xs font-medium text-violet-400">(tú)</span>
                    )}
                  </div>
                </div>
                {isHost && player.id !== room.hostId && !player.leaving && (
                  <button
                    onClick={() => handleKickPlayer(player.id)}
                    disabled={kicking === player.id}
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50"
                  >
                    {kicking === player.id ? "..." : "Expulsar"}
                  </button>
                )}
              </li>
            ))}

            {players.length < MIN_PLAYERS_TO_START && (
              <li className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 py-3 text-sm font-medium text-violet-400">
                <span className="animate-pulse-soft">⏳</span>
                Esperando a más jugadores…
              </li>
            )}
          </ul>
        </div>

        {/* Categorías / configuración */}
        <div
          className="tuti-card animate-fade-up mb-4 p-6"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-violet-900">
              Categorías
            </h2>
            {isHost && (
              <button
                onClick={() => setShowSettings((value) => !value)}
                className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700 transition hover:bg-violet-200"
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
              <div className="mt-3 flex flex-wrap gap-2">
                {room.settings.categories.map((category) => (
                  <span
                    key={category.id}
                    className="rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 px-3 py-1 text-sm font-medium text-violet-700"
                  >
                    {category.label}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs font-medium text-violet-400">
                {room.settings.pointsPerCorrect} pts por acierto único ·{" "}
                {room.settings.roundsToWin} rondas
              </p>
            </>
          )}
        </div>

        {/* Acciones */}
        <div
          className="tuti-card animate-fade-up p-6"
          style={{ animationDelay: "260ms" }}
        >
          {actionError && (
            <p className="mb-3 animate-pop-in rounded-xl bg-rose-50 px-3 py-2 text-center text-sm font-medium text-rose-700">
              {actionError}
            </p>
          )}
          {isHost ? (
            <div className="space-y-3">
              <button
                onClick={handleStart}
                disabled={!canStart || starting}
                className={`tuti-cta w-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-4 text-lg text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50 ${
                  canStart && !starting ? "animate-pulse-soft" : ""
                }`}
              >
                {starting
                  ? "Iniciando..."
                  : canStart
                    ? "🚀 Comenzar partida"
                    : `Se necesitan ${MIN_PLAYERS_TO_START} jugadores`}
              </button>
              <button
                onClick={handleCloseRoom}
                disabled={closing}
                className="w-full rounded-2xl bg-rose-50 px-4 py-3 font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              >
                {closing ? "Cerrando..." : "Cerrar sala"}
              </button>
            </div>
          ) : (
            <div className="py-3 text-center">
              <div className="inline-flex items-center gap-2 font-medium text-violet-500">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Esperando a que el host comience la partida...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
