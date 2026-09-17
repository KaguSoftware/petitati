"use client";

import { useLayoutEffect } from "react";

const PROPS = ["--font-sans", "--heading-font"] as const;

/**
 * Puts the store's font stacks on <html> while a storefront (or courier) page is mounted.
 *
 * The storefront wrapper already carries them, but portals — sheets, dialogs, selects, dropdowns,
 * popovers, tooltips and toasts — render into <body>, outside that wrapper, and would otherwise
 * inherit the app's fixed IBM Plex. On unmount the previous values come back, so client navigation
 * into the admin restores its own font.
 */
export function StoreFontVars({ body, heading }: { body: string; heading: string }) {
  useLayoutEffect(() => {
    const style = document.documentElement.style;
    const values: Record<(typeof PROPS)[number], string> = { "--font-sans": body, "--heading-font": heading };
    const previous = PROPS.map((prop) => [prop, style.getPropertyValue(prop)] as const);
    for (const prop of PROPS) style.setProperty(prop, values[prop]);
    return () => {
      for (const [prop, value] of previous) {
        if (value) style.setProperty(prop, value);
        else style.removeProperty(prop);
      }
    };
  }, [body, heading]);
  return null;
}
