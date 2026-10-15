"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { ensureSignedIn } from "@/lib/auth";
import { createRoom, getRoomIdByCode } from "@/lib/repositories/room";
import { ROOM_CODE_LENGTH } from "@/lib/constants";

const PLAYER_NAME_KEY = "tuti-player-name";

const AUTH_ERROR_MESSAGE =
  "No se pudo iniciar la sesión. Verificá que la autenticación anónima esté habilitada en Firebase.";

export default function Home() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Restore the last used name without a controlled input, to avoid a
  // hydration mismatch on a statically prerendered page.
  useEffect(() => {
    const savedName = localStorage.getItem(PLAYER_NAME_KEY);
    if (savedName && nameRef.current) {
      nameRef.current.value = savedName;
    }
  }, []);

  const getName = (): string => (nameRef.current?.value ?? "").trim();

  const startSession = async (): Promise<User | null> => {
    try {
      console.log("[tuti:home] iniciando sesión…");
      const user = await ensureSignedIn();
      console.log("[tuti:home] sesión lista → uid:", user.uid);
      return user;
    } catch (error) {
      console.error("[tuti:home] no se pudo iniciar sesión:", error);
      setError(AUTH_ERROR_MESSAGE);
      setLoading(false);
      return null;
    }
  };

  const handleCreate = async () => {
    const name = getName();
    if (!name) {
      setError("Ingresá tu nombre");
      return;
    }

    setLoading(true);
    setError(null);
    console.log("[tuti:home] crear sala →", name);

    const user = await startSession();
    if (!user) return;

    try {
      localStorage.setItem(PLAYER_NAME_KEY, name);
      const { roomId } = await createRoom(user.uid, name);
      console.log("[tuti:home] sala creada, navegando a /room/" + roomId);
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error("[tuti:home] falló createRoom():", error);
      setError("No se pudo crear la sala. Revisá tu conexión e intentá de nuevo.");
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const name = getName();
    if (!name) {
      setError("Ingresá tu nombre");
      return;
    }
    if (roomCode.trim().length !== ROOM_CODE_LENGTH) {
      setError(`El código debe tener ${ROOM_CODE_LENGTH} caracteres`);
      return;
    }

    setLoading(true);
    setError(null);
    console.log("[tuti:home] unirse a sala →", name, "| code:", roomCode.trim());

    const user = await startSession();
    if (!user) return;

    try {
      const roomId = await getRoomIdByCode(roomCode.trim());
      if (!roomId) {
        setError("No se encontró ninguna sala con ese código");
        setLoading(false);
        return;
      }
      localStorage.setItem(PLAYER_NAME_KEY, name);
      console.log("[tuti:home] sala encontrada, navegando a /room/" + roomId);
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error("[tuti:home] falló getRoomIdByCode():", error);
      setError("No se pudo unir a la sala. Revisá tu conexión e intentá de nuevo.");
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Hero */}
        <header className="mb-8 animate-fade-up text-center">
          <div className="mb-4 flex justify-center">
            <span className="relative flex h-20 w-20 animate-float items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-4xl shadow-2xl shadow-fuchsia-500/40">
              🍓
              <span className="absolute -right-2 -top-3 animate-wiggle text-2xl">
                ✨
              </span>
            </span>
          </div>
          <h1 className="bg-gradient-to-r from-amber-200 via-pink-200 to-fuchsia-200 bg-clip-text font-display text-5xl font-black tracking-tight text-transparent drop-shadow-[0_4px_24px_rgba(217,70,239,0.45)] sm:text-6xl">
            Tuti Frutti
          </h1>
          <p className="mt-2 font-medium text-fuchsia-100/90">
            El juego de palabras más divertido 🌈
          </p>
        </header>

        <div
          className="tuti-card animate-fade-up p-6 sm:p-7"
          style={{ animationDelay: "120ms" }}
        >
          <label
            htmlFor="player-name"
            className="mb-1.5 block font-display text-sm font-semibold text-violet-900"
          >
            Tu nombre
          </label>
          <input
            id="player-name"
            ref={nameRef}
            type="text"
            placeholder="Ingresá tu nombre"
            maxLength={20}
            className="tuti-input"
          />

          <button
            onClick={handleCreate}
            disabled={loading}
            className="tuti-cta tuti-sheen mt-4 w-full bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3.5 text-white shadow-lg shadow-fuchsia-600/30 disabled:opacity-50"
          >
            {loading ? "Un momento..." : "Crear sala 🎲"}
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-violet-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 font-medium text-violet-400">o</span>
            </div>
          </div>

          <label
            htmlFor="room-code"
            className="mb-1.5 block font-display text-sm font-semibold text-violet-900"
          >
            Código de sala
          </label>
          <input
            id="room-code"
            type="text"
            value={roomCode}
            onChange={(e) =>
              setRoomCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, ROOM_CODE_LENGTH)
              )
            }
            placeholder="Ej: ABC123"
            maxLength={ROOM_CODE_LENGTH}
            className="tuti-input text-center font-mono text-2xl tracking-[0.3em] uppercase"
          />
          <button
            onClick={handleJoin}
            disabled={loading}
            className="tuti-cta mt-3 w-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50"
          >
            {loading ? "Un momento..." : "Unirse con código 🚪"}
          </button>
        </div>

        {error && (
          <div className="mt-4 animate-pop-in rounded-2xl border border-rose-300/60 bg-rose-50/95 px-4 py-3 text-center text-sm font-medium text-rose-700 shadow-lg shadow-rose-900/20">
            {error}
          </div>
        )}

        <p
          className="mt-6 animate-fade-up text-center text-sm text-fuchsia-100/70"
          style={{ animationDelay: "240ms" }}
        >
          Jugá con amigos en tiempo real · Gratis y sin instalar nada
        </p>
      </div>
    </main>
  );
}
