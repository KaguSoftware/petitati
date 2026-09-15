import { BadgePercent, Gift, Headset, RotateCcw, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import type { TrustIcon } from "@/lib/theme/footer";
import { cn } from "@/lib/utils";

const ICONS: Record<TrustIcon, LucideIcon> = {
  truck: Truck,
  "shield-check": ShieldCheck,
  "rotate-ccw": RotateCcw,
  headset: Headset,
  "badge-percent": BadgePercent,
  gift: Gift,
};

/** The glyph for a trust promise (a truck for anything unknown). */
export function trustIcon(icon: TrustIcon): LucideIcon {
  return ICONS[icon] ?? Truck;
}

export type TrustTone = "line" | "dark" | "hairline" | "cards";

interface Props {
  /** null = strip disabled. */
  items: { icon: TrustIcon; title: string; text: string }[] | null;
  tone: TrustTone;
  className?: string;
}

const PANEL: Record<TrustTone, { wrap: string; panel: string; icon: string; title: string; text: string }> = {
  line: {
    wrap: "border-b",
    panel: "flex items-start gap-3",
    icon: "grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary",
    title: "text-sm font-semibold leading-tight",
    text: "text-xs text-muted-foreground leading-snug",
  },
  dark: {
    wrap: "border-b-2 border-background/20",
    panel: "flex items-start gap-3",
    icon: "grid size-10 shrink-0 place-items-center border-2 border-background/40 text-accent",
    title: "text-xs font-bold tracking-widest uppercase",
    text: "text-xs text-background/70",
  },
  hairline: {
    wrap: "border-b border-foreground/15",
    panel: "flex flex-col items-center gap-2 text-center",
    icon: "text-foreground/70",
    title: "text-micro uppercase tracking-[0.18em]",
    text: "font-serif text-sm italic text-muted-foreground",
  },
  cards: {
    wrap: "",
    panel: "flex items-start gap-3 rounded-2xl bg-background p-4 shadow-sm ring-1 ring-foreground/5",
    icon: "grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary",
    title: "text-sm font-bold",
    text: "text-xs text-muted-foreground",
  },
};

/** Four small promises (shipping, payment, returns, support): 2×2 on phones, one row from desktop. */
export function TrustStrip({ items, tone, className }: Props) {
  if (!items || items.length === 0) return null;
  const s = PANEL[tone];
  return (
    <div className={cn(s.wrap, className)}>
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-3 gap-y-4 px-gutter py-5 @tablet:gap-5 @tablet:py-6 @desktop:grid-cols-4 @desktop:gap-6">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon] ?? Truck;
          return (
            <li key={i} className={s.panel}>
              <span aria-hidden className={s.icon}>
                <Icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn("bidi-auto", s.title)}>{item.title}</span>
                {item.text && <span className={cn("bidi-auto", s.text)}>{item.text}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
