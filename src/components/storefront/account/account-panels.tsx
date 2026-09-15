"use client";

import { useLocale } from "next-intl";
import { useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { AccountNav, ACCOUNT_HREF, accountSectionFromPath, type AccountSection } from "./account-nav";

interface Props {
  panels: Record<AccountSection, ReactNode>;
  labels: { orders: string; addresses: string; wishlist: string; profile: string };
  /** Signed-in person card (desktop only). */
  userCard: ReactNode;
  signOut: ReactNode;
}

/**
 * Every account section is rendered by the layout up front; this shell shows one and keeps the
 * others mounted but hidden (forms keep their state). Switching is local state plus
 * `history.pushState`, which the Next router mirrors into `usePathname`, so Back/Forward and
 * deep links keep working and a switch costs no request at all.
 */
export function AccountPanels({ panels, labels, userCard, signOut }: Props) {
  const pathname = usePathname();
  const locale = useLocale();
  // Instant switch: remember the section we pushed, keyed by the URL we pushed it for. Once the
  // router mirrors that URL into `usePathname` the two agree; if the URL changes underneath us
  // (Back/Forward, a link elsewhere on the page) the override no longer matches and the URL wins.
  const [pushed, setPushed] = useState<{ path: string; section: AccountSection } | null>(null);
  const active = pushed && pushed.path === pathname ? pushed.section : accountSectionFromPath(pathname);

  const select = (section: AccountSection) => {
    if (section === active) return;
    setPushed({ path: ACCOUNT_HREF[section], section });
    window.history.pushState(null, "", `/${locale}${ACCOUNT_HREF[section]}`);
  };

  return (
    <div className="grid grid-cols-1 gap-6 @tablet:grid-cols-[16rem_minmax(0,1fr)] @tablet:gap-10">
      <aside className="flex min-w-0 flex-col gap-4 @tablet:sticky @tablet:top-24 @tablet:self-start">
        {userCard}
        <div className="@tablet:rounded-xl @tablet:bg-card @tablet:p-2 @tablet:shadow-sm @tablet:ring-1 @tablet:ring-foreground/5">
          <AccountNav labels={labels} active={active} onSelect={select} signOut={signOut} />
        </div>
      </aside>
      <section className="min-w-0">
        {(Object.keys(panels) as AccountSection[]).map((key) => (
          <div key={key} hidden={key !== active} role="tabpanel" aria-label={labels[key]}>
            {panels[key]}
          </div>
        ))}
        <div className="mt-10 border-t pt-6 @tablet:hidden">{signOut}</div>
      </section>
    </div>
  );
}
