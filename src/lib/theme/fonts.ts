/**
 * Fonts a store may pick in the design editor. Every entry is loaded once by the root layout
 * through `next/font/google` and exposed as a CSS variable; the storefront wrapper then maps the
 * theme's choice onto `--font-sans` / `--heading-font` (see `themeToCssVars`).
 *
 * Persian: fonts marked `arabic` carry Arabic-script glyphs and are used for Persian text
 * directly. Latin-only fonts are PAIRED with an Arabic face of matching character (`pair`), so
 * choosing Playfair Display gives Persian headings a serif (Amiri) instead of always Vazirmatn.
 */
export const FONT_OPTIONS = [
  "IBM Plex Sans Arabic",
  "Inter",
  "Manrope",
  "DM Sans",
  "Playfair Display",
  "Vazirmatn",
  "Noto Sans Arabic",
  "Noto Naskh Arabic",
  "Cairo",
  "Amiri",
  "Markazi Text",
] as const;
export type FontOption = (typeof FONT_OPTIONS)[number];

interface FontMeta {
  /** CSS variable declared by the root layout. */
  cssVar: string;
  generic: "sans-serif" | "serif";
  /** Has Arabic-script glyphs (Persian renders in this font itself). */
  arabic: boolean;
  /** Arabic face used for Persian text when this font is Latin-only. */
  pair?: FontOption;
  /**
   * Latin face used for English/Turkish text when this font is Arabic-script. Arabic faces carry
   * tall vertical metrics that push Latin glyphs above the centre of buttons and inputs, so Latin
   * locales render in the pair and fall back to the Arabic face only for Arabic glyphs.
   */
  latinPair?: FontOption;
}

export const FONTS: Record<FontOption, FontMeta> = {
  /**
   * The default. A true dual-script superfamily — IBM drew the Arabic and the Latin together, so
   * they share weight, proportion and voice, and one font serves every locale. No `latinPair`:
   * unlike the other Arabic faces here its Latin metrics are centred (caps sit 0.9% off the line
   * box, against Vazirmatn's 10%), so Latin text does not ride high in buttons and inputs.
   */
  "IBM Plex Sans Arabic": { cssVar: "--font-ibm-plex-arabic", generic: "sans-serif", arabic: true },
  Inter: { cssVar: "--font-inter", generic: "sans-serif", arabic: false, pair: "Vazirmatn" },
  Manrope: { cssVar: "--font-manrope", generic: "sans-serif", arabic: false, pair: "Noto Sans Arabic" },
  "DM Sans": { cssVar: "--font-dm-sans", generic: "sans-serif", arabic: false, pair: "Cairo" },
  "Playfair Display": { cssVar: "--font-playfair", generic: "serif", arabic: false, pair: "Amiri" },
  Vazirmatn: { cssVar: "--font-vazirmatn", generic: "sans-serif", arabic: true, latinPair: "Inter" },
  "Noto Sans Arabic": { cssVar: "--font-noto-sans-arabic", generic: "sans-serif", arabic: true, latinPair: "Manrope" },
  "Noto Naskh Arabic": { cssVar: "--font-noto-naskh-arabic", generic: "serif", arabic: true, latinPair: "Playfair Display" },
  Cairo: { cssVar: "--font-cairo", generic: "sans-serif", arabic: true, latinPair: "DM Sans" },
  Amiri: { cssVar: "--font-amiri", generic: "serif", arabic: true, latinPair: "Playfair Display" },
  "Markazi Text": { cssVar: "--font-markazi", generic: "serif", arabic: true, latinPair: "Playfair Display" },
};

/** The default theme font, and the fallback for a stored name that is no longer offered. */
export const DEFAULT_FONT: FontOption = "IBM Plex Sans Arabic";

export function isFontOption(name: string): name is FontOption {
  return (FONT_OPTIONS as readonly string[]).includes(name);
}

/** `font-family` value for the font itself (used by the editor's preview). */
export function fontFamily(name: string): string {
  const key = isFontOption(name) ? name : DEFAULT_FONT;
  return `var(${FONTS[key].cssVar}), ${FONTS[key].generic}`;
}

/** Locales written in Arabic script: the Arabic face leads the stack there. */
const ARABIC_SCRIPT_LOCALES: readonly string[] = ["fa", "ar", "ur"];

/**
 * Full storefront stack for a theme font in a given locale. Latin-script locales: the font (or,
 * for an Arabic-script font, its Latin pair first), then an Arabic face for stray Arabic glyphs.
 * Arabic-script locales: the Arabic face leads. Vazirmatn is always the last-resort Arabic
 * fallback, then the generic family.
 */
export function fontStack(name: string, locale = "en"): string {
  const key = isFontOption(name) ? name : DEFAULT_FONT;
  const meta = FONTS[key];
  const arabicLocale = ARABIC_SCRIPT_LOCALES.includes(locale);
  const chain: FontOption[] = meta.arabic && !arabicLocale && meta.latinPair ? [meta.latinPair, key] : [key];
  if (!meta.arabic && meta.pair) chain.push(meta.pair);
  if (!chain.includes("Vazirmatn")) chain.push("Vazirmatn");
  return chain.map((f) => `var(${FONTS[f].cssVar})`).join(", ") + `, ${meta.generic}`;
}
