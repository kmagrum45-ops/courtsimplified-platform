"use client";

import { useEffect, useRef } from "react";

/**
 * "Open the whole form (all your answers)" on the overview of a confirmed case (Chrome check of #544 on a8c8cf57, 7 Nov):
 * civil and Family keep their own one-at-a-time / whole-form mode, so the builder asks them to switch rather than
 * writing that mode itself (one writer: their own `setMode`, saved as before).
 */
export const OPEN_WHOLE_FORM_EVENT = "courtsimplified:open-whole-form";

/** Civil and Family: show the whole form when the overview asks for it. */
export function useOpenWholeForm(show: () => void) {
  const latest = useRef(show);
  useEffect(() => { latest.current = show; });
  useEffect(() => {
    const open = () => latest.current();
    window.addEventListener(OPEN_WHOLE_FORM_EVENT, open);
    return () => window.removeEventListener(OPEN_WHOLE_FORM_EVENT, open);
  }, []);
}
