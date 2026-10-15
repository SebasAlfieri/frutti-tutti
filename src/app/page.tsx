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
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
            Tuti Frutti
          </h1>
          <p className="text-blue-100 text-lg">
            El juego de palabras más divertido
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 pb-4">
            <label
              htmlFor="player-name"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Tu nombre
            </label>
            <input
              id="player-name"
              ref={nameRef}
              type="text"
              placeholder="Ingresá tu nombre"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-gray-900"
            />
          </div>

          <div className="px-6 pb-4">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
            >
              {loading ? "Un momento..." : "Crear sala"}
            </button>
          </div>

          <div className="relative px-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-400">o</span>
            </div>
          </div>

          <div className="p-6 pt-4 space-y-4">
            <div>
              <label
                htmlFor="room-code"
                className="block text-sm font-medium text-gray-700 mb-1.5"
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
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-center text-2xl font-mono tracking-[0.3em] text-gray-900 uppercase"
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
            >
              {loading ? "Un momento..." : "Unirse con código"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <p className="text-center text-blue-200/70 text-sm mt-6">
          Jugá con amigos en tiempo real
        </p>
      </div>
    </div>
  );
}
