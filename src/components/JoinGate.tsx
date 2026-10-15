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
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="tuti-card w-full max-w-sm animate-fade-up p-6 sm:p-7"
      >
        <div className="mb-6 text-center">
          <div className="mb-3 text-5xl animate-float">💌</div>
          <p className="text-sm font-medium text-violet-500">
            Te invitaron a la sala
          </p>
          <p className="mt-1 bg-gradient-to-r from-fuchsia-600 to-violet-600 bg-clip-text font-display text-4xl font-black tracking-[0.2em] text-transparent">
            {roomCode}
          </p>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block font-display text-sm font-semibold text-violet-900">
            Tu nombre
          </span>
          <input
            ref={nameRef}
            type="text"
            placeholder="Ingresá tu nombre"
            maxLength={20}
            autoFocus
            className="tuti-input"
          />
        </label>

        {error && (
          <p className="mb-4 animate-pop-in rounded-xl bg-rose-50 px-3 py-2 text-center text-sm font-medium text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={joining}
          className="tuti-cta tuti-sheen w-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50"
        >
          {joining ? "Entrando..." : "Entrar a la sala 🎉"}
        </button>
      </form>
    </main>
  );
}
