"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ProductDetail } from "@/lib/catalog/types";
import { useDockSpace } from "./dock";
import { Price } from "./price";
import { useVariantSelection } from "./variant-selection";

/** Bar height without the safe area: published as `--dock-h` so floating things sit above it. */
const BAR_H = "4.5rem";
/** Same as the storefront's `@tablet` container width; the bar is a phone-only aid. */
const TABLET = "(min-width: 48rem)";

interface Props {
  product: Pick<ProductDetail, "name" | "variants" | "options">;
  currency: string;
  locale: string;
  /** The purchase panel's form id: the bar submits that form, so it shares its action, toast and pending state. */
  formId: string;
}

/**
 * Phone-only "Add to cart" pinned to the bottom of the screen while the panel's own button is out
 * of view (on a phone the gallery alone fills the first screen). With no valid variant chosen, or
 * the choice sold out, it scrolls to the panel instead of submitting.
 *
 * Rendered by the product PAGE rather than the panel: the admin Design previews reuse the panel,
 * and a fixed bar would escape their frame.
 */
export function StickyBuyBar({ product, currency, locale, formId }: Props) {
  const t = useTranslations("product");
  const selection = useVariantSelection();
  const [panelOffscreen, setPanelOffscreen] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const target = document.querySelector(`#${CSS.escape(formId)} [data-atc-submit]`);
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => setPanelOffscreen(!entry.isIntersecting));
    io.observe(target);
    const mq = window.matchMedia(TABLET);
    const onMq = () => setWide(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => {
      io.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, [formId]);

  const visible = panelOffscreen && !wide;
  useDockSpace("--dock-h", BAR_H, visible);

  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  const variantId = selection?.variantId ?? (product.options.length === 0 ? defaultVariant?.id : null);
  const variant = product.variants.find((v) => v.id === variantId);
  const available = !!variant && (!variant.trackInventory || variant.allowBackorder || variant.stockQty > 0);
  const pending = selection?.pending ?? false;

  function scrollToPanel() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(formId)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(0_0_0/0.06)] backdrop-blur transition-transform duration-200 data-[visible=false]:translate-y-full motion-reduce:transition-none @tablet:hidden print:hidden"
      data-visible={visible}
    >
      <div className="flex h-[4.5rem] items-center gap-3 px-gutter">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="bidi-auto truncate text-sm font-medium">{product.name}</span>
          {variant && <Price amount={variant.price} compareAt={variant.compareAtPrice} currency={currency} locale={locale} className="text-base" />}
        </div>
        {available ? (
          <Button type="submit" form={formId} size="xl" disabled={pending} className="shrink-0">
            <ShoppingBag data-icon="inline-start" aria-hidden />
            {t("addToCart")}
          </Button>
        ) : (
          <Button type="button" size="xl" variant="outline" onClick={scrollToPanel} className="shrink-0">
            {variant ? t("outOfStock") : t("chooseOptions")}
          </Button>
        )}
      </div>
    </div>
  );
}
