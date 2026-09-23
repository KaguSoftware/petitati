"use client";

import { useLinkStatus } from "next/link";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { AdminNavItem } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { navIcon } from "./admin-nav-icons";

interface Props {
  items: AdminNavItem[];
  /** Called after a link is chosen (mobile drawer closes itself). */
  onNavigate?: () => void;
  className?: string;
}

export function AdminSidebarNav({ items, onNavigate, className }: Props) {
  const t = useTranslations("admin.nav");
  const tc = useTranslations("admin.crumbs");
  const pathname = usePathname();
  const isUnder = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav aria-label={t("openMenu")} className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item) => {
        const Icon = navIcon(item.icon);
        const active = item.href === "/admin" ? pathname === "/admin" : isUnder(item.href);
        const children = active ? (item.children ?? []) : [];
        const childActive = children.some((c) => isUnder(c.href));
        return (
          <div key={item.key} className="flex flex-col gap-0.5">
            <Link
              href={item.href}
              // Full prefetch (page + data) so a click paints from the client cache; the router
              // re-prefetches on hover once the copy is older than staleTimes.static.
              prefetch={true}
              onClick={onNavigate}
              aria-current={active && !childActive ? "page" : undefined}
              className={cn(
                // 34 px rows on desktop so the whole menu fits a 720 px laptop screen (no inner scroll); thumb-sized in the phone drawer.
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors md:py-1.5",
                active && !childActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                active && childActive && "font-medium text-sidebar-foreground",
                !active && "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{t(item.key)}</span>
              <PendingDot />
            </Link>
            {/* Sub-pages appear only while their section is open: the sidebar stays short, the section stays reachable. */}
            {children.length > 0 && (
              <div className="ms-5 flex flex-col gap-0.5 border-s ps-2">
                {children.map((c) => {
                  const on = isUnder(c.href);
                  return (
                    <Link
                      key={c.key}
                      href={c.href}
                      prefetch={true}
                      onClick={onNavigate}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                        on ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                      <span className="truncate">{tc(c.key)}</span>
                      <PendingDot />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Subtle pulse at the end of a sidebar link while its navigation is pending (rare: pages are prefetched). */
function PendingDot() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={cn("ms-auto size-1.5 shrink-0 rounded-full bg-current", pending ? "animate-pulse opacity-70" : "opacity-0")} />;
}
