"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { addToCartAction, type CartActionState } from "@/lib/cart/actions";
import type { ProductDetail } from "@/lib/catalog/types";
import { Price } from "./price";
import { QuantityStepper } from "./quantity-stepper";
import { useVariantSelection } from "./variant-selection";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  product: ProductDetail;
  storeSlug: string;
  currency: string;
  locale: string;
}

/** Option pickers → resolved variant → quantity → add. Shared by every product-page variant. */
export function AddToCartPanel({ product, storeSlug, currency, locale }: Props) {
  const t = useTranslations("product");
  const router = useRouter();
  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const opt of product.options) {
      const v = opt.values.find((val) => defaultVariant?.optionValueIds.includes(val.id));
      if (v) init[opt.id] = v.id;
    }
    return init;
  });
  const [qty, setQty] = useState(1);

  const variant = useMemo(() => {
    if (product.options.length === 0) return defaultVariant;
    const chosen = Object.values(selected);
    return product.variants.find((v) => chosen.every((id) => v.optionValueIds.includes(id)));
  }, [product, selected, defaultVariant]);

  const inStock = (v: (typeof product.variants)[number]) => !v.trackInventory || v.allowBackorder || v.stockQty > 0;
  const available = variant ? inStock(variant) : false;

  const selection = useVariantSelection();
  const setSelectedVariant = selection?.setVariantId;
  useEffect(() => setSelectedVariant?.(variant?.id ?? null), [variant, setSelectedVariant]);

  /** The variant this value leads to: same choices elsewhere if that combination exists, else any with the value. */
  function resolve(optionId: string, valueId: string) {
    const chosen = { ...selected, [optionId]: valueId };
    const exact = product.variants.find((v) => Object.values(chosen).every((id) => v.optionValueIds.includes(id)));
    const withValue = product.variants.filter((v) => v.optionValueIds.includes(valueId));
    return exact ?? withValue.find(inStock) ?? withValue[0];
  }

  function choose(optionId: string, valueId: string) {
    const target = resolve(optionId, valueId);
    if (!target) return setSelected((s) => ({ ...s, [optionId]: valueId }));
    // Snap every option to the resolved variant so the choice never lands on a combination that doesn't exist.
    const next: Record<string, string> = {};
    for (const opt of product.options) {
      const v = opt.values.find((val) => target.optionValueIds.includes(val.id));
      if (v) next[opt.id] = v.id;
    }
    setSelected(next);
  }
  const maxQty = variant && variant.trackInventory && !variant.allowBackorder ? variant.stockQty : 99;

  const [state, action, pending] = useActionState(
    async (prev: CartActionState, fd: FormData) => {
      const res = await addToCartAction(prev, fd);
      if (res.ok) toast.success(t("addedToCart"), { action: { label: t("viewCart"), onClick: () => router.push("/cart") } });
      else if (res.error === "out_of_stock") toast.error(t("outOfStock"));
      return res;
    },
    {} as CartActionState,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      {variant && <input type="hidden" name="variantId" value={variant.id} />}
      <input type="hidden" name="quantity" value={qty} />

      {variant && (
        <Price amount={variant.price} compareAt={variant.compareAtPrice} currency={currency} locale={locale} className="text-3xl" />
      )}

      {product.options.map((opt) => (
        <fieldset key={opt.id} className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{opt.name}</legend>
          <div className="flex flex-wrap gap-2">
            {opt.values.map((val) => {
              const active = selected[opt.id] === val.id;
              const target = resolve(opt.id, val.id);
              const soldOut = !target || !inStock(target);
              return (
                <button
                  key={val.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(opt.id, val.id)}
                  className={cn(
                    "min-w-10 rounded-md border bg-background px-3 py-1.5 text-sm transition",
                    active ? "border-primary bg-primary text-primary-foreground" : "hover:border-foreground",
                    soldOut && !active && "text-muted-foreground line-through decoration-muted-foreground/60",
                  )}
                  style={val.swatch ? { backgroundColor: active ? undefined : val.swatch } : undefined}
                >
                  {val.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-3">
        <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
        <span className="text-sm text-muted-foreground">
          {!variant
            ? t("selectOption", { option: product.options[0]?.name ?? "" })
            : available
              ? variant.trackInventory && variant.stockQty <= 5 && !variant.allowBackorder
                ? t("lowStock", { count: variant.stockQty })
                : t("inStock")
              : t("outOfStock")}
        </span>
      </div>

      <Button type="submit" size="xl" disabled={!variant || !available || pending} className="w-full">
        {available ? t("addToCart") : t("outOfStock")}
      </Button>
      {state.error && state.error !== "out_of_stock" && (
        <p role="alert" className="text-sm text-destructive">
          {t.has(`errors.${state.error}`) ? t(`errors.${state.error}`) : t("errors.failed")}
        </p>
      )}
    </form>
  );
}
