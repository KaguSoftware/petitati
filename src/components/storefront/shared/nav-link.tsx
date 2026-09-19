"use client";

import type { ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";

/** Is `href` the page being viewed (or a page under it, e.g. /shop?page=2 or /c/dogs/…)? */
export function useIsCurrent(href: string) {
  const pathname = usePathname();
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * A navbar link that knows when it is the current page: `aria-current="page"` for screen readers,
 * and callers style it with `aria-[current=page]:`.
 */
export function NavLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const current = useIsCurrent(href);
  return <Link href={href} aria-current={current ? "page" : undefined} {...props} />;
}
