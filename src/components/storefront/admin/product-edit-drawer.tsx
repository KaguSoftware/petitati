"use client";

import { useState } from "react";
import { ExternalLink, Pencil, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductForm } from "@/components/admin/products/product-form";
import { ProductImages } from "@/components/admin/products/product-images";
import { VariantsEditor } from "@/components/admin/products/variants-editor";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { Button } from "@/components/ui/button";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/i18n/config";
import type { BrandOption } from "@/lib/admin/brands/types";
import type { CategoryOption, ProductEditData } from "@/lib/admin/products/types";

interface Props {
  storeId: string;
  productId: string;
  productName: string;
  locale: Locale;
  defaultLocale: Locale;
  enabledLocales: Locale[];
  currency: string;
  lowStockThreshold: number;
  product: ProductEditData;
  categories: CategoryOption[];
  brands: BrandOption[];
  variantOptions: { value: string; label: string }[];
}

/**
 * WordPress-style admin bar for staff on a product page: a floating pill that opens the real
 * admin editors (details, prices & stock, photos) in a wide drawer, so a typo or a price can be
 * fixed without leaving the shop. Saves go through the same actions as the admin, which refresh
 * this page; a slug or status change is redirected by the action itself.
 */
export function ProductEditDrawer({
  storeId,
  productId,
  productName,
  locale,
  defaultLocale,
  enabledLocales,
  currency,
  lowStockThreshold,
  product,
  categories,
  brands,
  variantOptions,
}: Props) {
  const t = useTranslations("admin.products.storefrontEdit");
  const tc = useTranslations("admin.common");
  const tcommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const adminHref = `/${locale}/admin/products/${productId}`;
  // The storefront URL the drawer sits on (public host: /<locale>/p/<slug>; the proxy rewrites it).
  const returnBase = `/${locale}/p/`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* `contents`: the storefront root stretches its direct children (`*:w-full`), and this bar is one. */}
      <div className="contents">
        <div className="bg-inverse text-inverse-foreground fixed end-4 bottom-4 z-40 flex items-center gap-1 rounded-full p-1.5 shadow-lg ring-1 ring-black/10 print:hidden">
          <SheetTrigger
            render={
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
              />
            }
          >
            <Pencil data-icon="inline-start" />
            {t("button")}
          </SheetTrigger>
          <a
            href={adminHref}
            target="_blank"
            rel="noreferrer"
            aria-label={t("openInAdmin")}
            title={t("openInAdmin")}
            className="focus-ring grid size-10 place-items-center rounded-full transition-colors hover:bg-white/10"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>
      <SheetContent
        side="end"
        showCloseButton={false}
        className="gap-0 p-0 data-[side=end]:w-[min(46rem,100vw)]"
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
          <SheetTitle className="flex min-w-0 items-center gap-3 text-base font-semibold">
            <span className="truncate">{productName}</span>
            <StatusBadge kind="product" value={product.product.status} />
          </SheetTitle>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={adminHref}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:bg-muted hover:text-foreground hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm sm:inline-flex"
            >
              <ExternalLink className="size-4" />
              {t("openInAdmin")}
            </a>
            <SheetClose
              render={<Button variant="ghost" size="icon-lg" aria-label={tcommon("close")} />}
            >
              <XIcon />
            </SheetClose>
          </div>
        </div>
        <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList variant="line" className="h-11 w-full justify-start gap-2 border-b px-4">
            <TabsTrigger value="details" className="flex-none px-2">
              {t("tabs.details")}
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex-none px-2">
              {t("tabs.pricing")}
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex-none px-2">
              {t("tabs.photos")}
            </TabsTrigger>
          </TabsList>
          <OverlayScroll className="flex-1">
            <TabsContent value="details" keepMounted className="p-4">
              <ProductForm
                storeId={storeId}
                locale={locale}
                defaultLocale={defaultLocale}
                enabledLocales={enabledLocales}
                product={product}
                categories={categories}
                brands={brands}
                returnBase={returnBase}
                onSaved={() => setOpen(false)}
                footer={({ pending, submitLabel }) => (
                  <div className="bg-background/95 sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t px-4 py-3 backdrop-blur">
                    <SheetClose render={<Button variant="ghost" />}>{tc("cancel")}</SheetClose>
                    <Button type="submit" disabled={pending}>
                      {submitLabel}
                    </Button>
                  </div>
                )}
              />
            </TabsContent>
            <TabsContent value="pricing" keepMounted className="flex flex-col gap-6 p-4">
              <VariantsEditor
                storeId={storeId}
                productId={productId}
                currency={currency}
                locale={locale}
                defaultLocale={defaultLocale}
                enabledLocales={enabledLocales}
                lowStockThreshold={lowStockThreshold}
                options={product.options}
                variants={product.variants}
              />
            </TabsContent>
            <TabsContent value="photos" keepMounted className="p-4">
              <ProductImages
                storeId={storeId}
                productId={productId}
                locale={locale}
                defaultLocale={defaultLocale}
                enabledLocales={enabledLocales}
                images={product.images}
                variantOptions={variantOptions}
              />
            </TabsContent>
          </OverlayScroll>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
