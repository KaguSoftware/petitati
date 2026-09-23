/**
 * URL slugs for products, brands and categories. Latin only (the storefront URLs are ASCII), so
 * Turkish letters are folded and Persian/Arabic script is transliterated letter by letter — staff
 * type names in Farsi and must never be asked for a slug. Shared by the admin forms and the
 * server actions so the preview and the saved value agree.
 */

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };

// Consonant-level: Persian rarely writes short vowels, so "غذای گربه" becomes "ghzay-grbh". Ugly
// but readable and stable, which is all a slug needs.
const FA_MAP: Record<string, string> = {
  ا: "a", آ: "a", أ: "a", إ: "e", ب: "b", پ: "p", ت: "t", ث: "s", ج: "j", چ: "ch", ح: "h", خ: "kh",
  د: "d", ذ: "z", ر: "r", ز: "z", ژ: "zh", س: "s", ش: "sh", ص: "s", ض: "z", ط: "t", ظ: "z", ع: "",
  غ: "gh", ف: "f", ق: "gh", ک: "k", ك: "k", گ: "g", ل: "l", م: "m", ن: "n", و: "v", ؤ: "v", ه: "h",
  ة: "h", ی: "y", ي: "y", ئ: "y", ى: "y", ء: "",
};

export function slugify(input: string, max = 120): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // Persian digits
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic digits
    .replace(/‌/g, " ") // ZWNJ separates word parts
    .replace(/[؀-ۿ]/g, (c) => FA_MAP[c] ?? "")
    .replace(/[çğıöşüİ]/g, (c) => TR_MAP[c] ?? c)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** First of `base`, `base-2`, `base-3`… not in `taken`. */
export function firstFreeSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base.slice(0, 115)}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
