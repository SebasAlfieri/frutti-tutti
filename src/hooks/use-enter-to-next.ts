"use client";

import { useCallback } from "react";
import { focusNextField } from "@/lib/focus-next-field";

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Returns a `keydown` handler that moves focus to the next field when the user
 * presses Enter (or the "next" key on a mobile keyboard).
 *
 * If there is no next field, the default behaviour is preserved, so a lone
 * input inside a form can still submit with Enter. Modifier combinations
 * (Shift/Ctrl/Alt/Cmd + Enter) are left untouched.
 */
export function useEnterToNext() {
  return useCallback((event: React.KeyboardEvent<FieldElement>) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

    if (focusNextField(event.currentTarget)) {
      event.preventDefault();
    }
  }, []);
}
