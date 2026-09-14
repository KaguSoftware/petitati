"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * The variant chosen in the purchase panel, shared with the photo gallery that themes render as a
 * sibling. Outside a provider (previews, other pages) nothing is selected and galleries show every photo.
 */
const VariantSelectionContext = createContext<{ variantId: string | null; setVariantId: (id: string | null) => void } | null>(null);

export function VariantSelectionProvider({ children }: { children: ReactNode }) {
  const [variantId, setVariantId] = useState<string | null>(null);
  const value = useMemo(() => ({ variantId, setVariantId }), [variantId]);
  return <VariantSelectionContext.Provider value={value}>{children}</VariantSelectionContext.Provider>;
}

export function useVariantSelection() {
  return useContext(VariantSelectionContext);
}

/** The selected variant's own photos, then the shared ones; every photo when the variant has none. */
export function useVariantImages<T extends { variantId?: string | null }>(images: T[]): T[] {
  const variantId = useVariantSelection()?.variantId ?? null;
  return useMemo(() => {
    if (!variantId || !images.some((i) => i.variantId)) return images;
    const own = images.filter((i) => i.variantId === variantId);
    return own.length ? [...own, ...images.filter((i) => !i.variantId)] : images;
  }, [images, variantId]);
}
