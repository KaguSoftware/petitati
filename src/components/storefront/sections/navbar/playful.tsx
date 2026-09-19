import { Link } from "@/i18n/navigation";
import { NavLink } from "@/components/storefront/shared/nav-link";
import { CategoryMenu } from "@/components/storefront/shared/category-menu";
import { categoryNavItems } from "@/components/storefront/shared/category-nav";
import { MobileNav } from "@/components/storefront/shared/mobile-nav";
import { SearchForm } from "@/components/storefront/shared/search-form";
import { StoreLogo } from "@/components/storefront/shared/store-logo";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavbarProps } from "../types";

const navLink =
  "inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all hover:bg-background hover:text-foreground hover:shadow-sm focus-visible:bg-background focus-visible:text-foreground focus-visible:shadow-sm focus-ring aria-[current=page]:text-foreground aria-[current=page]:font-medium";

/** A floating capsule: the whole header lives in a rounded pill that hovers over the page, with a pill nav (Shop · Categories mega-menu · Brands) inside; icon-only search at @tablet, the field from @desktop. */
export function NavbarPlayful({ storeName, logoUrl, categories, labels, cartSlot, accountSlot, localeSlot }: NavbarProps) {
  const primary = [
    { href: "/", label: labels.home },
    { href: "/shop", label: labels.shop },
    { href: "/brands", label: labels.brands },
  ];
  const categoryTree = categoryNavItems(categories);
  const brand = <StoreLogo storeName={storeName} logoUrl={logoUrl} markClassName="rounded-full" />;

  return (
    <header className="sticky top-0 z-40 pt-3 px-gutter">
      <div className="relative mx-auto flex h-14 max-w-7xl items-center gap-2 rounded-full bg-card ps-2 pe-2 shadow-lg shadow-primary/10 ring-1 ring-foreground/10 @tablet:h-16 @tablet:ps-3 @tablet:pe-3">
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
        <nav
          aria-label={labels.menu}
          className="hidden min-w-0 flex-1 items-center justify-center @tablet:flex @desktop:absolute @desktop:start-1/2 @desktop:flex-none @desktop:-translate-x-1/2 rtl:@desktop:translate-x-1/2"
        >
          <div className="flex min-w-0 items-center gap-1 overflow-hidden rounded-full bg-muted/70 p-1 ring-1 ring-foreground/5">
            <NavLink href="/shop" className={navLink}>
              {labels.shop}
            </NavLink>
            <CategoryMenu items={categoryTree} labels={{ categories: labels.categories, viewAll: labels.viewAll }} triggerClassName={navLink} />
            <NavLink href="/brands" className={navLink}>
              {labels.brands}
            </NavLink>
          </div>
        </nav>
        <div className="ms-auto flex items-center gap-0.5 @tablet:gap-1">
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
