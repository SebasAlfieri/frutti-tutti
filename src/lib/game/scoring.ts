import type { Player, PlayerScore, RoomSettings, RoundData } from "@/types";
import { AVAILABLE_LETTERS } from "@/lib/constants";

// ─── Answer Normalization ─────────────────────────────────────────────────────

/**
 * Lowercase, trim, and strip accents from an answer.
 */
export function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ─── Answer Validation ────────────────────────────────────────────────────────

/**
 * An answer is valid if it starts with the given letter (case-insensitive)
 * and has more than one character after trimming.
 */
export function isValidAnswer(answer: string, letter: string): boolean {
  const normalized = normalizeAnswer(answer);
  if (normalized.length <= 1) return false;
  return normalized.startsWith(normalizeAnswer(letter));
}

// ─── Round Letter ─────────────────────────────────────────────────────────────

/**
 * Returns the letter used in a given round, or an empty string if unknown.
 */
export function getRoundLetter(
  letters: Record<string, string>,
  round: number
): string {
  return letters[String(round)] ?? "";
}

// ─── Round Score Calculation ──────────────────────────────────────────────────

/**
 * Calculate per-category and per-player scores for a single round.
 *
 * Rules:
 * - Empty or invalid answers → 0 points
 * - Valid answers shared by multiple players → 0 points
 * - Unique valid answers → settings.pointsPerCorrect points
 */
export function calculateRoundScores(
  players: Player[],
  responses: RoundData,
  settings: RoomSettings,
  letter: string,
): PlayerScore[] {
  const playerIds = players.map((p) => p.id);

  // Build a lookup for valid answers grouped by category and normalized value.
  // Map<categoryId, Map<normalizedAnswer, playerId[]>>
  const answerGroups = new Map<string, Map<string, string[]>>();

  for (const category of settings.categories) {
    const categoryMap = new Map<string, string[]>();
    answerGroups.set(category.id, categoryMap);

    for (const playerId of playerIds) {
      const rawAnswer = responses.responses[playerId]?.answers[category.id] ?? "";
      const normalized = normalizeAnswer(rawAnswer);

      if (!isValidAnswer(rawAnswer, letter)) continue;

      const existing = categoryMap.get(normalized);
      if (existing) {
        existing.push(playerId);
      } else {
        categoryMap.set(normalized, [playerId]);
      }
    }
  }

  // Build PlayerScore[] with per-category breakdowns.
  return players.map((player) => {
    const roundScores: PlayerScore["roundScores"] = {};
    let roundTotal = 0;

    for (const category of settings.categories) {
      const rawAnswer =
        responses.responses[player.id]?.answers[category.id] ?? "";
      const normalized = normalizeAnswer(rawAnswer);

      if (!isValidAnswer(rawAnswer, letter)) {
        roundScores[category.id] = {
          categoryId: category.id,
          points: 0,
          reason: normalized.length === 0 ? "empty" : "invalid",
        };
        continue;
      }

      const group = answerGroups.get(category.id)!;
      const sharers = group.get(normalized) ?? [];

      if (sharers.length > 1) {
        roundScores[category.id] = {
          categoryId: category.id,
          points: 0,
          reason: "shared",
        };
      } else {
        roundScores[category.id] = {
          categoryId: category.id,
          points: settings.pointsPerCorrect,
          reason: "unique",
        };
        roundTotal += settings.pointsPerCorrect;
      }
    }

    return {
      playerId: player.id,
      name: player.name,
      roundScores,
      roundTotal,
      total: roundTotal,
    };
  });
}

// ─── Standings Computation ────────────────────────────────────────────────────

/**
 * Merge multiple rounds of PlayerScore[] into cumulative standings.
 * Each player's roundTotal is summed, and roundScores are merged.
 */
export function computeStandings(allScores: PlayerScore[][]): PlayerScore[] {
  if (allScores.length === 0) return [];

  // Use the first round's player list as the canonical order/identity.
  const playerIds = allScores[0].map((s) => s.playerId);

  return playerIds.map((playerId, idx) => {
    const name = allScores[0][idx].name;
    const mergedRoundScores: PlayerScore["roundScores"] = {};
    let total = 0;

    for (const round of allScores) {
      const playerRound = round.find((s) => s.playerId === playerId);
      if (!playerRound) continue;

      total += playerRound.roundTotal;
      Object.assign(mergedRoundScores, playerRound.roundScores);
    }

    return {
      playerId,
      name,
      roundScores: mergedRoundScores,
      roundTotal: total,
      total,
    };
  });
}

// ─── Winner Determination ─────────────────────────────────────────────────────

/**
 * Returns the player with the highest total, or null if there is a tie
 * for first place.
 */
export function determineWinner(standings: PlayerScore[]): PlayerScore | null {
  if (standings.length === 0) return null;

  let top: PlayerScore | null = null;
  let tie = false;

  for (const entry of standings) {
    if (top === null || entry.total > top.total) {
      top = entry;
      tie = false;
    } else if (entry.total === top.total) {
      tie = true;
    }
  }

  return tie ? null : top;
}

// ─── Random Letter Selection ──────────────────────────────────────────────────

/**
 * Pick a random letter from AVAILABLE_LETTERS.
 */
export function pickRandomLetter(): string {
  const idx = Math.floor(Math.random() * AVAILABLE_LETTERS.length);
  return AVAILABLE_LETTERS[idx];
}
