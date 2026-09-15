import { Link } from "@/i18n/navigation";
import { CategoryMenu } from "@/components/storefront/shared/category-menu";
import { categoryNavItems } from "@/components/storefront/shared/category-nav";
import { MobileNav } from "@/components/storefront/shared/mobile-nav";
import { SearchForm } from "@/components/storefront/shared/search-form";
import { StoreLogo } from "@/components/storefront/shared/store-logo";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { NavbarProps } from "../types";

const navLink =
  "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-ring";

/** Classic bar: Shop · Categories (mega-menu with the whole tree) · Brands on the page centre; the search field never truncates its placeholder. */
export function NavbarMinimal({ storeName, logoUrl, categories, labels, cartSlot, accountSlot, localeSlot }: NavbarProps) {
  const primary = [
    { href: "/", label: labels.home },
    { href: "/shop", label: labels.shop },
    { href: "/brands", label: labels.brands },
  ];
  const categoryTree = categoryNavItems(categories);
  const brand = <StoreLogo storeName={storeName} logoUrl={logoUrl} />;

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      {/* Phones: a flex row so the wordmark takes what the icon cluster leaves (the symmetric grid gave it 77 px → "Pe…"). From @tablet: the 3-column grid whose centre cell keeps the nav on the page centre. */}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-gutter @tablet:grid @tablet:grid-cols-[1fr_auto_1fr]">
        <div className="flex min-w-0 flex-1 items-center gap-1 @tablet:flex-none">
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
          {brand}
        </div>

        {/* The grid's centre cell, so these sit on the page centre and can never overlap the ends. */}
        <nav aria-label={labels.menu} className="hidden items-center justify-center gap-1 @tablet:flex @desktop:gap-2">
          <Link href="/shop" className={navLink}>
            {labels.shop}
          </Link>
          <CategoryMenu items={categoryTree} labels={{ categories: labels.categories, viewAll: labels.viewAll }} triggerClassName={navLink} />
          <Link href="/brands" className={navLink}>
            {labels.brands}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-0.5 @tablet:min-w-0 @tablet:gap-1">
          <Link href="/shop" aria-label={labels.search} className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }), "hidden @tablet:inline-flex @desktop:hidden")}>
            <Search className="size-5" />
          </Link>
          <SearchForm placeholder={labels.search} className="hidden w-48 shrink-0 @desktop:block @desktop:me-1 @wide:w-52" />
          {localeSlot}
          {accountSlot}
          {cartSlot}
        </div>
      </div>
    </header>
  );
}
