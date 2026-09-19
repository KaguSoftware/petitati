"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import type { NavItem } from "./category-nav";
import { SearchForm } from "./search-form";

interface Props {
  labels: { menu: string; closeMenu: string; categories: string; search: string };
  /** Brand element shown in the drawer header (same node as the navbar logo). */
  brand: ReactNode;
  primary: NavItem[];
  /** top-level categories; `children` render indented under their parent */
  categories: NavItem[];
  /** Locale switcher + account button, rendered in the drawer footer. */
  footer: ReactNode;
}

const bar =
  "h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out motion-reduce:transition-none";
// Phone rows are thumb-sized: 48 px at 16 px for the main links, 44 px at 16 px for category children
// (the owner found 14 px children too small to hit and to read).
const drawerLink =
  "stagger-in flex min-h-12 items-center rounded-lg px-3 py-2.5 text-base transition-colors hover:bg-muted focus-visible:bg-muted focus-ring";
const childLink =
  "flex min-h-11 items-center py-2 text-base text-foreground/80 hover:text-foreground focus-visible:text-foreground";

/**
 * Hamburger + full-height drawer from the inline-start edge (mirrors under RTL). Links close the
 * drawer on navigation via `SheetClose render={<Link/>}`, so no effects are needed; the staggered
 * reveal is driven by Base UI's `data-starting-style` on the popup (see `stagger-in` in globals.css).
 */
export function MobileNav({ labels, brand, primary, categories, footer }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const renderLink = (item: NavItem, index: number, child = false) => (
    <SheetClose
      key={item.href}
      nativeButton={false}
      render={<Link href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} />}
      className={cn(drawerLink, child && childLink, "aria-[current=page]:font-semibold aria-[current=page]:text-primary")}
      style={{ "--stagger": index } as CSSProperties}
    >
      {item.label}
    </SheetClose>
  );
  // Stagger index counts every rendered row (children included) so the reveal stays sequential.
  let row = primary.length + 1;
  const renderCategory = (item: NavItem) => (
    <div key={item.href} className="flex flex-col gap-0.5">
      {renderLink(item, row++)}
      {item.children && item.children.length > 0 && (
        <div className="border-foreground/15 ms-5 flex flex-col gap-0.5 border-s-2 ps-2">
          {item.children.map((child) => renderLink(child, row++, true))}
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="group/burger @tablet:hidden"
            aria-label={open ? labels.closeMenu : labels.menu}
          />
        }
      >
        <span aria-hidden className="flex flex-col items-center justify-center gap-[5px]">
          <span
            className={`${bar} group-data-[popup-open]/burger:translate-y-[7px] group-data-[popup-open]/burger:rotate-45`}
          />
          <span
            className={`${bar} group-data-[popup-open]/burger:scale-x-0 group-data-[popup-open]/burger:opacity-0`}
          />
          <span
            className={`${bar} group-data-[popup-open]/burger:-translate-y-[7px] group-data-[popup-open]/burger:-rotate-45`}
          />
        </span>
      </SheetTrigger>

      <SheetContent side="start" showCloseButton={false} className="gap-0 p-0">
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          {brand}
          <SheetClose
            render={<Button variant="ghost" size="icon-lg" aria-label={labels.closeMenu} />}
          >
            <XIcon />
          </SheetClose>
        </div>
        <SheetTitle className="sr-only">{labels.menu}</SheetTitle>

        <div className="shrink-0 px-4 py-3">
          <SearchForm placeholder={labels.search} onSubmitted={() => setOpen(false)} />
        </div>

        <OverlayScroll className="flex-1">
          <nav aria-label={labels.menu} className="flex flex-col gap-0.5 px-2 pb-4">
            {primary.map((item, i) => renderLink(item, i))}
            {categories.length > 0 && (
              <p
                className="stagger-in text-caption text-muted-foreground mt-5 mb-2 px-3 font-semibold tracking-wide uppercase"
                style={{ "--stagger": primary.length } as CSSProperties}
              >
                {labels.categories}
              </p>
            )}
            {categories.map(renderCategory)}
          </nav>
        </OverlayScroll>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t p-3">
          {footer}
        </div>
      </SheetContent>
    </Sheet>
  );
}
