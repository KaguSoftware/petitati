import { toMajor } from "@/lib/money";

export interface QuickRange {
  /** major units, inclusive; undefined = open end */
  min?: number;
  max?: number;
}

/** Snap a price to a round figure a shopper would type: 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10ⁿ. */
function roundNice(x: number): number {
  if (x <= 0) return 0;
  const pow = 10 ** Math.floor(Math.log10(x));
  const m = x / pow;
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const nearest = steps.reduce((best, s) => (Math.abs(s - m) < Math.abs(best - m) ? s : best), steps[0]);
  return nearest * pow;
}

/**
 * Up to four one-tap buckets cut at the scope's price QUARTILES, snapped to round numbers:
 * "under 150", "150 – 300", "300 – 600", "over 600". Quartiles rather than min/max because one
 * expensive outlier (a ₺32,945 aquarium in a ₺300 shelf) must not push every bucket past what the
 * shelf actually sells for. Empty when the cuts collapse (a narrow or tiny scope).
 */
export function quickRanges(quartilesMinor: (number | null)[], currency: string): QuickRange[] {
  const cuts: number[] = [];
  for (const q of quartilesMinor) {
    if (q == null) continue;
    const major = roundNice(toMajor(q, currency));
    if (major > 0 && (cuts.length === 0 || major > cuts[cuts.length - 1])) cuts.push(major);
  }
  if (cuts.length < 2) return [];
  const ranges: QuickRange[] = [{ max: cuts[0] }];
  for (let i = 1; i < cuts.length; i++) ranges.push({ min: cuts[i - 1], max: cuts[i] });
  ranges.push({ min: cuts[cuts.length - 1] });
  return ranges;
}
