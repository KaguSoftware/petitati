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
  const nearest = steps.reduce(
    (best, s) => (Math.abs(s - m) < Math.abs(best - m) ? s : best),
    steps[0],
  );
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

/** The slider step: about a thousandth of the range, rounded UP to 1, 2 or 5 × 10ⁿ (0.5 at the very least). Fine on purpose: the preset chips cut at round numbers like 150 or 2,000 and a coarse step would snap those off the track (a 500 step put a ₺200 chip on zero). */
export function niceStep(rangeMajor: number): number {
  const raw = rangeMajor / 1000;
  if (raw <= 0.5) return 0.5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const m = raw / pow;
  const s = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return s * pow;
}

export interface SliderBounds {
  /** major units, on the step grid */
  lo: number;
  hi: number;
  step: number;
}

/**
 * The track of the price slider: the scope's real bounds widened outwards onto a round step, so a
 * thumb never has to sit off-grid. Null when the scope has no price or every product costs the
 * same (a slider needs two different ends).
 */
export function snapBounds(
  minMinor: number | null,
  maxMinor: number | null,
  currency: string,
): SliderBounds | null {
  if (minMinor == null || maxMinor == null) return null;
  const min = toMajor(minMinor, currency);
  const max = toMajor(maxMinor, currency);
  if (max <= min) return null;
  const step = niceStep(max - min);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  if (hi <= lo) return null;
  return { lo: round(lo), hi: round(hi), step };
}

/** Clamp a value into the bounds and snap it onto the step grid. */
export function snapValue(v: number, b: SliderBounds): number {
  const clamped = Math.min(b.hi, Math.max(b.lo, v));
  return round(Math.round((clamped - b.lo) / b.step) * b.step + b.lo);
}

function round(x: number): number {
  return Math.round(x * 100) / 100;
}
