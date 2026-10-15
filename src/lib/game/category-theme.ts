export type CategoryAccent = {
  /** Color principal del gradiente de la categoría. */
  a: string;
  /** Color secundario del gradiente de la categoría. */
  b: string;
};

/**
 * Paleta de acentos para las categorías. Se asignan por posición, así que una
 * misma categoría mantiene su color durante toda la partida. Son colores vivos
 * pensados para contrastar sobre las tarjetas blancas.
 */
export const CATEGORY_ACCENTS: CategoryAccent[] = [
  { a: "#f472b6", b: "#a855f7" },
  { a: "#38bdf8", b: "#6366f1" },
  { a: "#34d399", b: "#0ea5e9" },
  { a: "#fbbf24", b: "#fb7185" },
  { a: "#a78bfa", b: "#ec4899" },
  { a: "#22d3ee", b: "#34d399" },
  { a: "#fb7185", b: "#f97316" },
  { a: "#818cf8", b: "#22d3ee" },
  { a: "#facc15", b: "#a3e635" },
  { a: "#e879f9", b: "#8b5cf6" },
  { a: "#2dd4bf", b: "#38bdf8" },
  { a: "#fda4af", b: "#f43f5e" }
];

export function accentFor(index: number): CategoryAccent {
  return CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length];
}

const ICONS: Array<[RegExp, string]> = [
  [/nombre|persona|apellido/i, "🙋"],
  [/pa[íi]s|ciudad|lugar|capital|provincia|destino/i, "🌍"],
  [/animal|mascota|insecto/i, "🐶"],
  [/frut|verdura|vegetal/i, "🍓"],
  [/color/i, "🎨"],
  [/objeto|cosa|utensilio/i, "📦"],
  [/comida|bebida|alimento|plato|postre/i, "🍽️"],
  [/marca/i, "🏷️"],
  [/pel[íi]cula|serie|programa|actor/i, "🎬"],
  [/flor|planta|[áa]rbol/i, "🌸"],
  [/deporte|juego/i, "⚽"],
  [/profesi[óo]n|oficio|trabajo/i, "👷"],
  [/cuerpo/i, "🦵"],
  [/m[úu]sica|cantante|banda|canci[óo]n|instrumento/i, "🎵"],
  [/ropa|prenda/i, "👕"],
  [/palabra|letra|idioma/i, "🔤"]
];

/** Devuelve un emoji temático para la etiqueta de una categoría. */
export function iconForCategory(label: string): string {
  const match = ICONS.find(([pattern]) => pattern.test(label));
  return match ? match[1] : "⭐";
}
