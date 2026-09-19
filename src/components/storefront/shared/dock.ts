"use client";

import { useEffect } from "react";

/**
 * The bottom dock: things that float over the bottom of the screen (the phone's sticky buy bar,
 * the WhatsApp bubble, the staff "Edit product" pill, toasts) must never sit on top of each other.
 * Each one that takes room publishes its height as a CSS variable on <html>, and everything that
 * floats above it adds that variable to its `bottom` (see the `bottom-dock` utility in globals.css
 * and the Toaster offsets in the root layout). <html> rather than the storefront root because
 * toasts and dialogs are portaled outside it.
 *
 *   --dock-h  height of the sticky buy bar while it is showing (phones only)
 *   --fab-h   room taken by the floating contact bubble
 */
export type DockVar = "--dock-h" | "--fab-h";

/** Publishes `value` on <html> while `active`, and clears it again when inactive or unmounted. */
export function useDockSpace(name: DockVar, value: string, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.style.setProperty(name, value);
    return () => {
      root.style.removeProperty(name);
    };
  }, [name, value, active]);
}
