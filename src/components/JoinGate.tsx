"use client";

import { useEffect, useRef } from "react";

type JoinGateProps = {
  roomCode: string;
  defaultName?: string;
  joining: boolean;
  error: string | null;
  onJoin: (name: string) => void;
};

/**
 * Shown when a visitor opens a room (for example through a shared link) but is
 * not yet a player in it. Collects a nickname and joins the room.
 */
export default function JoinGate({
  roomCode,
  defaultName = "",
  joining,
  error,
  onJoin
}: JoinGateProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  // Applied after mount (not as `defaultValue`) so the server-rendered markup
  // stays identical to the first client render (no hydration mismatch).
  useEffect(() => {
    if (defaultName && nameRef.current) {
      nameRef.current.value = defaultName;
    }
  }, [defaultName]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = (nameRef.current?.value ?? "").trim();
    if (!trimmed) return;
    onJoin(trimmed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
      >
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">Te invitaron a la sala</p>
          <p className="text-3xl font-mono font-bold tracking-[0.2em] text-gray-900">
            {roomCode}
          </p>
        </div>

        <label className="block mb-4">
          <span className="block text-sm font-medium text-gray-700 mb-1.5">
            Tu nombre
          </span>
          <input
            ref={nameRef}
            type="text"
            placeholder="Ingresá tu nombre"
            maxLength={20}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-gray-900"
          />
        </label>

        {error && (
          <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={joining}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
        >
          {joining ? "Entrando..." : "Entrar a la sala"}
        </button>
      </form>
    </div>
  );
}
