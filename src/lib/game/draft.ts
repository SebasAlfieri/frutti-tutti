import type { Answers } from "@/types";

// Drafts are kept in localStorage so answers are never written to Firestore per
// keystroke. They are only pushed when the player submits (or when the round is
// closed by someone else, see the room page).

export function draftKey(roomId: string, round: number): string {
  return `tuti-draft-${roomId}-${round}`;
}

export function readDraft(roomId: string, round: number): Answers {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(draftKey(roomId, round));
    return saved ? (JSON.parse(saved) as Answers) : {};
  } catch {
    return {};
  }
}

export function saveDraft(
  roomId: string,
  round: number,
  answers: Answers
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(draftKey(roomId, round), JSON.stringify(answers));
  } catch {
    // Storage unavailable (private mode): drafts are simply not kept.
  }
}

export function clearDraft(roomId: string, round: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(roomId, round));
  } catch {
    // Ignore: nothing to clean up.
  }
}
