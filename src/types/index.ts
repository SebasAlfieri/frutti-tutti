// ─── Domain Types ────────────────────────────────────────────────────────────

export type RoomStatus = "lobby" | "playing" | "finished";

export type Category = {
  id: string;
  label: string;
  placeholder: string;
};

export type RoomSettings = {
  categories: Category[];
  roundsToWin: number;
  pointsPerCorrect: number;
};

export type Player = {
  id: string;
  name: string;
  connected: boolean;
  joinedAt: number;
  lastSeen: number;
};

export type FinishedBy = {
  playerId: string;
  playerName: string;
  at: number;
};

export type Room = {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  currentRound: number;
  /** Letter used in each round, keyed by round number. Needed to re-score past rounds. */
  letters: Record<string, string>;
  roundStartedAt: number | null;
  roundEndedAt: number | null;
  finishedBy: FinishedBy | null;
  lastActivity: number;
  createdAt: number;
};

// ─── Responses ───────────────────────────────────────────────────────────────

export type Answers = Record<string, string>;

export type CategoryScore = {
  categoryId: string;
  points: number;
  reason: "unique" | "shared" | "invalid" | "empty";
};

export type PlayerScore = {
  playerId: string;
  name: string;
  roundScores: Record<string, CategoryScore>;
  roundTotal: number;
  total: number;
};

export type RoundResponse = {
  playerId: string;
  answers: Answers;
  submittedAt: number | null;
};

export type RoundData = {
  responses: Record<string, RoundResponse>;
};
