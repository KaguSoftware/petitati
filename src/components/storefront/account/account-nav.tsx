"use client";

import { useTranslations } from "next-intl";
import { Heart, MapPin, Package, User } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type AccountSection = "orders" | "addresses" | "wishlist" | "profile";

export const ACCOUNT_HREF: Record<AccountSection, string> = {
  orders: "/account",
  addresses: "/account/addresses",
  wishlist: "/account/wishlist",
  profile: "/account/profile",
};

export function accountSectionFromPath(pathname: string): AccountSection {
  if (pathname.startsWith("/account/addresses")) return "addresses";
  if (pathname.startsWith("/account/wishlist")) return "wishlist";
  if (pathname.startsWith("/account/profile") || pathname.startsWith("/account/password")) return "profile";
  return "orders";
}

interface Labels {
  orders: string;
  addresses: string;
  wishlist: string;
  profile: string;
}

const ITEMS: { key: AccountSection; Icon: typeof Package }[] = [
  { key: "orders", Icon: Package },
  { key: "addresses", Icon: MapPin },
  { key: "wishlist", Icon: Heart },
  { key: "profile", Icon: User },
];

/**
 * Account sections. Desktop: a vertical list inside the account card with an icon, a filled
 * active row and an accent bar. Phone/tablet: a segmented control that scrolls sideways.
 * Links stay real anchors (deep-linkable, open-in-new-tab works); a plain click hands over to
 * `onSelect`, which swaps the pre-rendered panel locally instead of navigating.
 */
export function AccountNav({ labels, active, onSelect, signOut }: { labels: Labels; active: AccountSection; onSelect: (section: AccountSection) => void; signOut?: ReactNode }) {
  // The menu is named "My account", not after its first item.
  const t = useTranslations("account");
  const handle = (section: AccountSection) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onSelect(section);
  };

  return (
    <>
      {/* Phone / tablet */}
      <nav aria-label={t("title")} className="-mx-1 overflow-x-auto px-1 pb-1 @tablet:hidden [scrollbar-width:none]">
        <div className="inline-flex w-max min-w-full items-center gap-1 rounded-xl bg-muted/70 p-1">
          {ITEMS.map(({ key, Icon }) => {
            const isActive = active === key;
            return (
              <Link
                key={key}
                href={ACCOUNT_HREF[key]}
                onClick={handle(key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3.5 text-sm whitespace-nowrap transition-colors outline-none select-none",
                  isActive ? "bg-background font-medium text-foreground shadow-sm dark:bg-input/30 dark:shadow-none" : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {labels[key]}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop */}
      <nav aria-label={t("title")} className="hidden flex-col gap-0.5 @tablet:flex">
        {ITEMS.map(({ key, Icon }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={ACCOUNT_HREF[key]}
              onClick={handle(key)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors outline-none",
                isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
            >
              {isActive && <span aria-hidden className="absolute inset-y-2 start-0 w-1 rounded-full bg-primary" />}
              <Icon aria-hidden className="size-4 shrink-0" />
              {labels[key]}
            </Link>
          );
        })}
        {signOut && (
          <div className="mt-2 border-t pt-2 [&_button]:h-11 [&_button]:w-full [&_button]:justify-start [&_button]:gap-3 [&_button]:px-3 [&_button]:text-muted-foreground [&_button]:hover:text-foreground">
            {signOut}
          </div>
        )}
      </nav>
    </>
  );
}
