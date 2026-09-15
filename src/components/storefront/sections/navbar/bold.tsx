import { Link } from "@/i18n/navigation";
import { CategoryMenu } from "@/components/storefront/shared/category-menu";
import { categoryNavItems } from "@/components/storefront/shared/category-nav";
import { MobileNav } from "@/components/storefront/shared/mobile-nav";
import { SearchForm } from "@/components/storefront/shared/search-form";
import { StoreLogo } from "@/components/storefront/shared/store-logo";
import { Phone } from "lucide-react";
import type { NavbarProps } from "../types";

const navLink =
  "inline-flex shrink-0 items-center border-b-2 border-transparent px-1 py-2 text-xs font-bold tracking-widest whitespace-nowrap uppercase text-inverse-foreground/80 transition-colors hover:border-inverse-foreground hover:text-inverse-foreground focus-visible:border-inverse-foreground focus-visible:text-inverse-foreground focus-ring";

/** Department-store header: search / big centred logo / icons on the first row, a dark full-width bar below with Shop · Categories (mega-menu) · Brands. */
export function NavbarBold({ storeName, logoUrl, categories, labels, contactPhone, cartSlot, accountSlot, localeSlot }: NavbarProps) {
  const primary = [
    { href: "/", label: labels.home },
    { href: "/shop", label: labels.shop },
    { href: "/brands", label: labels.brands },
  ];
  const categoryTree = categoryNavItems(categories);
  const brand = <StoreLogo storeName={storeName} logoUrl={logoUrl} wordmarkClassName="text-xl font-extrabold uppercase @tablet:text-2xl" />;

  return (
    <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background">
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
          <SearchForm placeholder={labels.search} className="hidden w-56 @tablet:block @desktop:w-64 [&_input]:rounded-none [&_input]:border-2 [&_input]:border-foreground [&_input]:bg-background" />
          {contactPhone && (
            <a href={`tel:${contactPhone.replace(/s/g, "")}`} aria-label={labels.call} className="ms-3 hidden items-center gap-1.5 text-xs font-bold tracking-widest whitespace-nowrap uppercase transition-colors hover:text-primary @wide:inline-flex">
              <Phone aria-hidden className="size-4" />
              <bdi dir="ltr">{contactPhone}</bdi>
            </a>
          )}
        </div>
        <div className="justify-self-center">{brand}</div>
        <div className="flex min-w-0 items-center justify-end gap-0.5 @tablet:gap-1">
          {localeSlot}
          {accountSlot}
          {cartSlot}
        </div>
      </div>
      <nav aria-label={labels.menu} className="hidden bg-inverse text-inverse-foreground @tablet:block">
        <div className="mx-auto flex h-11 max-w-7xl items-center justify-center gap-5 overflow-hidden px-gutter @desktop:gap-8">
          <Link href="/shop" className={navLink}>
            {labels.shop}
          </Link>
          <CategoryMenu items={categoryTree} labels={{ categories: labels.categories, viewAll: labels.viewAll }} triggerClassName={navLink} />
          <Link href="/brands" className={navLink}>
            {labels.brands}
          </Link>
        </div>
      </nav>
    </header>
  );
}
