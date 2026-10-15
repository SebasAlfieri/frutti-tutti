import { Category, RoomSettings } from "@/types";

// ─── Default Game Settings ───────────────────────────────────────────────────

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "nombre", label: "Nombre", placeholder: "Un nombre propio" },
  { id: "pais", label: "País o ciudad", placeholder: "Un país o ciudad" },
  { id: "animal", label: "Animal", placeholder: "Un animal" },
  { id: "fruta", label: "Fruta o verdura", placeholder: "Una fruta o verdura" },
  { id: "color", label: "Color", placeholder: "Un color" },
  { id: "objeto", label: "Objeto", placeholder: "Un objeto" },
];

export const DEFAULT_SETTINGS: RoomSettings = {
  categories: DEFAULT_CATEGORIES,
  roundsToWin: 3,
  pointsPerCorrect: 10,
};

// ─── Round Configuration ─────────────────────────────────────────────────────

export const ROUND_DURATION_SECONDS = 90;

export const ROOM_CODE_LENGTH = 6;

export const MAX_PLAYERS = 8;

export const MIN_PLAYERS_TO_START = 2;

export const ROOM_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Letters ─────────────────────────────────────────────────────────────────

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const EXCLUDED_LETTERS = new Set(["X", "Y", "Z"]);

export const AVAILABLE_LETTERS = LETTERS.filter((l) => !EXCLUDED_LETTERS.has(l));
