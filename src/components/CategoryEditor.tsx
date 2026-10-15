"use client";

import { useState } from "react";
import type { Category, RoomSettings } from "@/types";
import { useEnterToNext } from "@/hooks/use-enter-to-next";

type CategoryEditorProps = {
  categories: Category[];
  pointsPerCorrect: number;
  roundsToWin: number;
  onSave: (settings: RoomSettings) => Promise<void>;
};

const MAX_CATEGORIES = 12;
const MIN_CATEGORIES = 2;

function createCategoryId(): string {
  return `cat_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Lets the host customise the categories and scoring rules before the game.
 * The whole configuration is persisted in a single write when the host saves,
 * never on each keystroke.
 */
export default function CategoryEditor({
  categories,
  pointsPerCorrect,
  roundsToWin,
  onSave
}: CategoryEditorProps) {
  const [draft, setDraft] = useState<Category[]>(categories);
  const [points, setPoints] = useState(pointsPerCorrect);
  const [rounds, setRounds] = useState(roundsToWin);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleEnterToNext = useEnterToNext();

  const handleAdd = () => {
    if (draft.length >= MAX_CATEGORIES) return;
    setSaved(false);
    setDraft([
      ...draft,
      { id: createCategoryId(), label: "Nueva categoría", placeholder: "" }
    ]);
  };

  const handleRemove = (id: string) => {
    if (draft.length <= MIN_CATEGORIES) return;
    setSaved(false);
    setDraft(draft.filter((category) => category.id !== id));
  };

  const handleChange = (
    id: string,
    field: "label" | "placeholder",
    value: string
  ) => {
    setSaved(false);
    setDraft(
      draft.map((category) =>
        category.id === id ? { ...category, [field]: value } : category
      )
    );
  };

  const handleSave = async () => {
    const cleaned = draft.map((category) => ({
      ...category,
      label: category.label.trim(),
      placeholder: category.placeholder.trim()
    }));

    if (cleaned.length < MIN_CATEGORIES) {
      setError(`Necesitás al menos ${MIN_CATEGORIES} categorías`);
      return;
    }
    if (cleaned.some((category) => category.label.length === 0)) {
      setError("Ninguna categoría puede quedar sin nombre");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        categories: cleaned,
        pointsPerCorrect: points,
        roundsToWin: rounds
      });
      setSaved(true);
    } catch {
      setError("No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-enter-scope className="space-y-4">
      <div className="space-y-2">
        {draft.map((category, index) => (
          <div key={category.id} className="flex items-center gap-2">
            <span className="w-5 text-right text-xs font-semibold text-violet-300">
              {index + 1}
            </span>
            <input
              type="text"
              value={category.label}
              onChange={(e) => handleChange(category.id, "label", e.target.value)}
              onKeyDown={handleEnterToNext}
              enterKeyHint="next"
              autoComplete="off"
              placeholder="Nombre de la categoría"
              maxLength={30}
              aria-label={`Nombre de la categoría ${index + 1}`}
              className="tuti-input min-w-0 flex-1 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => handleRemove(category.id)}
              disabled={draft.length <= MIN_CATEGORIES}
              aria-label={`Eliminar categoría ${index + 1}`}
              className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={draft.length >= MAX_CATEGORIES}
        className="text-sm font-semibold text-fuchsia-600 transition hover:text-fuchsia-800 disabled:opacity-40"
      >
        + Agregar categoría
      </button>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-violet-500">
            Puntos por acierto único
          </span>
          <input
            type="number"
            min={1}
            max={100}
            value={points}
            onChange={(e) => {
              setSaved(false);
              setPoints(Math.max(1, Number(e.target.value) || 1));
            }}
            onKeyDown={handleEnterToNext}
            enterKeyHint="next"
            className="tuti-input px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-violet-500">
            Rondas para terminar
          </span>
          <input
            type="number"
            min={1}
            max={20}
            value={rounds}
            onChange={(e) => {
              setSaved(false);
              setRounds(Math.max(1, Number(e.target.value) || 1));
            }}
            onKeyDown={handleEnterToNext}
            enterKeyHint="go"
            className="tuti-input px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="tuti-cta w-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm text-white shadow-lg shadow-violet-600/25 disabled:opacity-50"
      >
        {saving ? "Guardando..." : saved ? "Guardado ✓" : "Guardar configuración"}
      </button>
    </div>
  );
}
