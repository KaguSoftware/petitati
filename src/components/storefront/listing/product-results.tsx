import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getBrands, getCategories, getListingFacets, getProducts } from "@/lib/catalog/queries";
import { categoryChain, childrenOf } from "@/lib/catalog/tree";
import type { ProductListParams } from "@/lib/catalog/types";
import { toMinor } from "@/lib/money";
import type { StoreContext } from "@/lib/tenant/context";
import { ProductGridWithWishlist } from "@/components/storefront/product-grid-with-wishlist";
import { ActiveFilters } from "./active-filters";
import { FilterSidebar } from "./filter-sidebar";
import { activeFilterCount, parseListingParams, toQuery } from "./listing-params";
import { ListingToolbar } from "./listing-toolbar";
import { NumberedPagination } from "./numbered-pagination";

interface Props {
  ctx: StoreContext;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  /** `/shop`, `/c/<slug>` or `/b/<slug>` — where the pagination and filter links point */
  basePath: string;
  /** what the page fixes: a category (whole subtree) or a brand (hides the brand filter) */
  scope?: { categorySlug?: string; brandSlug?: string };
  /** rendered above the results while no search term is active */
  leading?: ReactNode;
}

/**
 * The listing shared by /shop, /c/<slug> and /b/<slug>: filter sidebar (desktop) or sheet
 * (phone), toolbar, active-filter chips, the store's product grid and numbered pagination.
 * Reads searchParams, so it must render inside <Suspense>; the page around it prerenders.
 */
export async function ProductResults({ ctx, searchParams, basePath, scope = {}, leading }: Props) {
  const { store, locale, fallback } = ctx;
  const state = parseListingParams(await searchParams);
  const hideBrands = !!scope.brandSlug;
  const facetParams: Omit<ProductListParams, "page" | "pageSize" | "sort"> = {
    categorySlug: scope.categorySlug,
    brandSlug: scope.brandSlug,
    brandSlugs: hideBrands || state.brandSlugs.length === 0 ? undefined : state.brandSlugs,
    search: state.q,
    priceMin: state.min != null ? toMinor(state.min, store.currency) : undefined,
    priceMax: state.max != null ? toMinor(state.max, store.currency) : undefined,
    inStock: state.stock || undefined,
    onSale: state.sale || undefined,
  };
  const [t, result, facets, brands, categories] = await Promise.all([
    getTranslations("shop"),
    getProducts(store.id, locale, fallback, { ...facetParams, sort: state.sort, page: state.page }),
    getListingFacets(store.id, locale, fallback, facetParams),
    getBrands(store.id),
    getCategories(store.id, locale, fallback),
  ]);
  const brandNames = Object.fromEntries(brands.map((b) => [b.slug, b.name]));
  // Sidebar categories: the facets say WHICH ids (children of the scope, or siblings on a leaf) and
  // how many products each has; the cached tree supplies the localised names and the parent link.
  const chain = scope.categorySlug ? categoryChain(categories, scope.categorySlug) : [];
  const current = chain.at(-1);
  const hasChildren = !!current && childrenOf(categories, current.id).length > 0;
  const parentOfList = current ? (hasChildren ? current : (chain.at(-2) ?? null)) : null;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const categoryNav = {
    parent: parentOfList ? { href: parentOfList === current ? `/c/${parentOfList.slug}` : `/c/${parentOfList.slug}`, label: parentOfList.name } : undefined,
    items: facets.categories
      .map((f) => ({ f, c: byId.get(f.id) }))
      .filter((x): x is { f: (typeof facets.categories)[number]; c: NonNullable<typeof x.c> } => !!x.c)
      .map(({ f, c }) => ({ href: `/c/${c.slug}`, label: c.name, count: f.count, current: c.id === current?.id })),
  };
  // The "All <parent>" link points one level up from the LIST, which is the current page itself
  // when the list is its children — then it is just noise.
  if (categoryNav.parent && parentOfList === current) categoryNav.parent = undefined;
  const activeCount = activeFilterCount({ ...state, brandSlugs: hideBrands ? [] : state.brandSlugs });
  const filtered = activeCount > 0 || !!state.q;
  const panel = { facets, currency: store.currency, locale, hideBrands, brandNames, categoryNav, activeCount };

  return (
    <div className="flex flex-col gap-6">
      {!state.q && leading}
      <div className="grid gap-6 @desktop:grid-cols-[14rem_minmax(0,1fr)] @desktop:gap-8 @wide:grid-cols-[16rem_minmax(0,1fr)] @wide:gap-10">
        <FilterSidebar {...panel} />
        <div className="flex min-w-0 flex-col gap-5">
          <ListingToolbar total={result.total} {...panel} />
          <ActiveFilters facets={facets} currency={store.currency} locale={locale} hideBrands={hideBrands} brandNames={brandNames} />
          <ProductGridWithWishlist
            ctx={ctx}
            products={result.items}
            bare
            emptyLabel={t("noResultsTitle")}
            emptyAction={
              <Link href={filtered ? basePath : "/shop"} className={buttonVariants({ size: "xl", variant: filtered ? "outline" : "default" })}>
                {filtered ? t("clearFilters") : t("browseAll")}
              </Link>
            }
          />
          <NumberedPagination page={result.page} pageSize={result.pageSize} total={result.total} basePath={basePath} query={toQuery(state)} />
        </div>
      </div>
    </div>
  );
}
