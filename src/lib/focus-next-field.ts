const FIELD_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])';

/**
 * Moves focus to the next visible form field after `current`, in document
 * order. Returns `true` when focus actually moved, so the caller can decide
 * whether to `preventDefault()` (for example, to avoid submitting a form while
 * navigating between fields with Enter).
 */
export function focusNextField(current: HTMLElement): boolean {
  const scope = current.closest("[data-enter-scope]") ?? document;

  const fields = Array.from(
    scope.querySelectorAll<HTMLElement>(FIELD_SELECTOR)
  ).filter((field) => field.getClientRects().length > 0);

  const index = fields.indexOf(current);
  if (index === -1) return false;

  const next = fields[index + 1];
  if (!next) return false;

  next.focus();

  // Place the caret at the end so the player keeps typing right away.
  if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) {
    const end = next.value.length;
    try {
      next.setSelectionRange(end, end);
    } catch {
      // Some input types (number, email) don't support selection ranges.
    }
  }

  return true;
}
