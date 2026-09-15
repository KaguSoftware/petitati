"use client";

import { useEffect, useRef, useState } from "react";
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { ChevronDown } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "./category-nav";
import { ProductImage } from "./product-image";

interface Props {
  /** top-level categories with their direct children (categoryNavItems) */
  items: NavItem[];
  labels: { categories: string; viewAll: string };
  /** the bar's own link class, so the trigger sits in the row like its neighbours */
  triggerClassName?: string;
  className?: string;
}

const CHILDREN_SHOWN = 8;

/**
 * "Categories" mega-menu for the desktop bars: one trigger, one panel with every top-level
 * category as a column (photo tile + name) and its direct children below. Two levels — the third
 * is one click away as tiles on the category page. Hover, click and keyboard (Base UI
 * NavigationMenu); closes itself on navigation.
 *
 * The popup is portaled INTO the storefront root rather than <body>: the store's palette lives as
 * inline `--store-*` variables on that root, so anything portaled to <body> renders in shadcn's
 * neutral tokens — white sheet, black links — whatever the shop's colours are.
 */
export function CategoryMenu({ items, labels, triggerClassName, className }: Props) {
  const [value, setValue] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setContainer(rootRef.current?.closest<HTMLElement>("[data-storefront]") ?? null);
  }, []);
  // Back/forward and any navigation: the panel must not linger over the new page (derived-state
  // reset during render, the React-sanctioned shape — no effect, no extra paint).
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setValue(null);
  }

  if (items.length === 0) return null;

  return (
    <NavigationMenu.Root ref={rootRef} value={value} onValueChange={setValue} delay={80} closeDelay={150} className={cn("flex items-center", className)}>
      <NavigationMenu.List className="flex items-center">
        <NavigationMenu.Item value="categories">
          <NavigationMenu.Trigger className={cn(triggerClassName, "gap-1 data-popup-open:bg-muted data-popup-open:text-foreground")}>
            {labels.categories}
            <NavigationMenu.Icon className="transition-transform duration-200 data-popup-open:rotate-180">
              <ChevronDown aria-hidden className="size-4" />
            </NavigationMenu.Icon>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-[min(72rem,calc(var(--available-width)-2rem))] p-6 transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
            <ul data-category-menu className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-x-5 gap-y-6">
              {items.map((cat) => {
                const children = cat.children ?? [];
                const shown = children.slice(0, CHILDREN_SHOWN);
                return (
                  <li key={cat.href} className="flex min-w-0 flex-col gap-2">
                    <NavigationMenu.Link
                      render={<Link href={cat.href} />}
                      closeOnClick
                      className="group flex flex-col gap-2 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
                    >
                      <ProductImage src={cat.imageUrl ?? null} alt="" className="aspect-square rounded-xl transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" sizes="140px" />
                      <span className="bidi-auto line-clamp-2 text-sm leading-snug font-semibold transition-colors group-hover:text-primary">{cat.label}</span>
                    </NavigationMenu.Link>
                    {shown.length > 0 && (
                      <ul className="flex flex-col">
                        {shown.map((child) => (
                          <li key={child.href}>
                            <NavigationMenu.Link
                              render={<Link href={child.href} />}
                              closeOnClick
                              className="bidi-auto block truncate rounded-md py-1 text-caption text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-ring"
                            >
                              {child.label}
                            </NavigationMenu.Link>
                          </li>
                        ))}
                        {children.length > CHILDREN_SHOWN && (
                          <li>
                            <NavigationMenu.Link render={<Link href={cat.href} />} closeOnClick className="block py-1 text-caption font-medium text-primary underline-offset-4 hover:underline focus-ring">
                              {labels.viewAll}
                            </NavigationMenu.Link>
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>

      <NavigationMenu.Portal container={container}>
        <NavigationMenu.Positioner
          side="bottom"
          align="center"
          sideOffset={10}
          collisionPadding={16}
          collisionAvoidance={{ side: "none", align: "shift" }}
          className="isolate z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-200 data-instant:transition-none"
        >
          <NavigationMenu.Popup className="relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10 transition-[opacity,scale,width,height] duration-200 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100">
            <NavigationMenu.Viewport className="relative h-full w-full overflow-hidden" />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}
