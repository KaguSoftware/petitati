"use client";

import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useDockSpace } from "./dock";
import { Glyph } from "./social-links";

/** Room the bubble takes (size-14 + a gap), published as `--fab-h` so toasts rise above it. */
const FAB_H = "4.5rem";
/** Places where a floating button would compete with the one action that matters on the page. */
const HIDDEN_ON = ["/checkout"];

/**
 * Floating WhatsApp button, end corner, on every storefront page. Payment is manual and shoppers
 * here ask before they buy, so the chat is one tap away instead of at the bottom of the footer.
 * Only rendered when the store has a WhatsApp link (Admin → Settings → Contact & footer). Sits above
 * the phone's sticky buy bar through `bottom-dock`.
 */
export function ContactBubble({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  useDockSpace("--fab-h", FAB_H, !hidden);
  if (hidden) return null;

  // `contents`: the storefront root stretches its direct children (`*:w-full`), and this is one.
  return (
    <div className="contents">
      <a
        href={href}
        target="_blank"
        rel="noopener"
        aria-label={label}
        title={label}
        className={cn(
          "bottom-dock fixed end-4 z-30 grid size-14 place-items-center rounded-full bg-[#128c7e] text-white shadow-lg ring-1 ring-black/10",
          "focus-visible:ring-ring transition-[transform,bottom] duration-200 hover:scale-105 focus-visible:ring-4 focus-visible:outline-none active:scale-95 motion-reduce:transition-none print:hidden",
        )}
      >
        <Glyph name="whatsapp" className="size-7" />
      </a>
    </div>
  );
}
