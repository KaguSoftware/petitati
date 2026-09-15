import { z } from "zod";
import { SECTION_KEYS, themeColorsSchema, VARIANT_KEYS } from "@/lib/theme/types";

import { FONT_OPTIONS } from "@/lib/theme/fonts";

export { FONT_OPTIONS, type FontOption } from "@/lib/theme/fonts";

/** Corner radius presets (CSS length applied to `--radius`). */
export const RADIUS_PRESETS = [
  { key: "none", value: "0rem" },
  { key: "small", value: "0.375rem" },
  { key: "medium", value: "0.75rem" },
  { key: "large", value: "1.25rem" },
] as const;

export const THEME_COLOR_KEYS = ["primary", "primaryForeground", "accent", "accentForeground", "background", "card", "foreground", "muted", "mutedForeground"] as const;

/** Patch accepted by `saveThemeAction`: every part optional, merged into the stored theme. */
export const themePatchSchema = z.object({
  sections: z.partialRecord(z.enum(SECTION_KEYS), z.enum(VARIANT_KEYS)).optional(),
  colors: themeColorsSchema.partial().optional(),
  fonts: z.object({ heading: z.enum(FONT_OPTIONS).optional(), body: z.enum(FONT_OPTIONS).optional() }).optional(),
  radius: z.string().regex(/^\d+(\.\d+)?(rem|px)$/, "invalid").optional(),
  announcement: z.record(z.string().max(5), z.string().trim().max(200)).optional(),
});
export type ThemePatch = z.infer<typeof themePatchSchema>;
