import { Send } from "lucide-react";
import type { SocialKey } from "@/lib/theme/footer";
import { cn } from "@/lib/utils";

/** Brand glyphs (lucide ships no brand icons): currentColor, 24-unit box. */
export function Glyph({ name, className }: { name: SocialKey; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false } as const;
  switch (name) {
    case "instagram":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.5 21.5v-7.2h2.4l.4-3h-2.8V9.4c0-.9.3-1.5 1.5-1.5h1.6V5.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5v7.2z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c1.7.7 2.1.6 2.8.5a2.4 2.4 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c0-.1-.2-.2-.5-.3z" />
        </svg>
      );
    case "telegram":
      return <Send className={className} aria-hidden />;
    case "x":
      return (
        <svg {...common} fill="currentColor">
          <path d="M18.2 2.3h3.3l-7.2 8.2 8.5 11.2h-6.6l-5.2-6.8-6 6.8H1.7l7.7-8.8L1.3 2.3H8l4.7 6.2 5.5-6.2zm-1.2 17.5h1.8L7 4.1H5.1l11.9 15.7z" />
        </svg>
      );
  }
}

interface Props {
  links: { key: SocialKey; href: string; label: string }[];
  /** `icon` = bare glyphs, `round` = filled round buttons, `square` = outlined squares, `text` = names. */
  variant: "icon" | "round" | "square" | "text";
  tone?: "default" | "dark";
  className?: string;
}

const ITEM: Record<Props["variant"], string> = {
  icon: "grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
  round: "grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/85",
  square: "grid size-10 place-items-center border-2 border-background/40 text-background transition-colors hover:border-background hover:bg-background hover:text-foreground",
  text: "text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground",
};

export function SocialLinks({ links, variant, tone = "default", className }: Props) {
  if (links.length === 0) return null;
  const item = cn(ITEM[variant], tone === "dark" && variant === "icon" && "text-background/70 hover:bg-background/10 hover:text-background");
  return (
    <ul className={cn("flex flex-wrap items-center", variant === "text" ? "gap-x-5 gap-y-2" : "gap-1.5", className)}>
      {links.map((l) => (
        <li key={l.key}>
          <a href={l.href} target="_blank" rel="me noopener" aria-label={l.label} className={cn(item, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
            {variant === "text" ? l.label : <Glyph name={l.key} className="size-[18px]" />}
          </a>
        </li>
      ))}
    </ul>
  );
}
