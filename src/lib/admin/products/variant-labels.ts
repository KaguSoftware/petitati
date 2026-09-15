import type { Locale } from "@/i18n/config";
import { pickJson } from "@/lib/catalog/types";
import type { ProductEditData } from "./types";

/**
 * One label per variant for pickers ("Small · Red", else the SKU, else the "default variant"
 * wording): what the image editor shows when a photo is tied to one variant. Shared by the admin
 * product page and the storefront edit drawer.
 */
export function variantLabels(data: ProductEditData, locale: Locale, fallback: Locale, defaultLabel: string): { value: string; label: string }[] {
  const valueLabel = new Map<string, string>();
  for (const o of data.options) for (const v of o.values) valueLabel.set(v.id, pickJson(v.value, locale, fallback));
  return data.variants.map((v) => {
    const parts = v.optionValueIds.map((vid) => valueLabel.get(vid)).filter(Boolean);
    return { value: v.id, label: parts.length ? parts.join(" · ") : (v.sku ?? defaultLabel) };
  });
}
