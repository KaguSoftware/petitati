import { Link } from "@/i18n/navigation";
import { CategoryMenu } from "@/components/storefront/shared/category-menu";
import { categoryNavItems } from "@/components/storefront/shared/category-nav";
import { MobileNav } from "@/components/storefront/shared/mobile-nav";
import { SearchForm } from "@/components/storefront/shared/search-form";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StoreLogo } from "@/components/storefront/shared/store-logo";
import { cn } from "@/lib/utils";
import type { NavbarProps } from "../types";

const navLink =
  "inline-flex shrink-0 items-center px-2.5 py-1.5 text-micro uppercase tracking-[0.18em] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:underline focus-visible:underline-offset-4 focus-ring";

/**
 * Split header: Shop · Categories (mega-menu) · Brands on the start side, a centred serif wordmark, the icons on
 * the end side. Both side cells are `minmax(0,1fr)` so the wordmark stays on the page centre whatever the end
 * cell holds.
 */
export function NavbarEditorial({ storeName, logoUrl, categories, labels, cartSlot, accountSlot, localeSlot }: NavbarProps) {
  const primary = [
    { href: "/", label: labels.home },
    { href: "/shop", label: labels.shop },
    { href: "/brands", label: labels.brands },
  ];
  const categoryTree = categoryNavItems(categories);
  const brand = <StoreLogo storeName={storeName} logoUrl={logoUrl} wordmarkClassName="text-xl font-medium tracking-normal @tablet:text-2xl" />;

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-gutter @tablet:h-20">
        <div className="flex min-w-0 items-center gap-1">
          <MobileNav
            labels={{ menu: labels.menu, closeMenu: labels.closeMenu, categories: labels.categories, search: labels.search }}
            brand={brand}
            primary={primary}
            categories={categoryTree}
            footer={
              <>
                {localeSlot}
                {accountSlot}
              </>
            }
          />
          <nav aria-label={labels.menu} className="hidden items-center @tablet:flex">
            <Link href="/shop" className={navLink}>
              {labels.shop}
            </Link>
            <CategoryMenu items={categoryTree} labels={{ categories: labels.categories, viewAll: labels.viewAll }} triggerClassName={navLink} />
            <Link href="/brands" className={navLink}>
              {labels.brands}
            </Link>
          </nav>
        </div>
        <div className="justify-self-center">{brand}</div>
        <div className="flex min-w-0 items-center justify-end gap-0.5 @tablet:gap-1">
          {/* Icon-only search until there is room for the field itself. */}
          <Link href="/shop" aria-label={labels.search} className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }), "hidden @tablet:inline-flex @desktop:hidden")}>
            <Search className="size-5" />
          </Link>
          <SearchForm
            placeholder={labels.search}
            className="hidden w-48 shrink-0 @desktop:block @desktop:me-1 @wide:w-52 [&_input]:rounded-none [&_input]:border-0 [&_input]:border-b [&_input]:border-foreground/30 [&_input]:bg-transparent"
          />
          {localeSlot}
          {accountSlot}
          {cartSlot}
        </div>
      </div>
    </header>
  );
}
