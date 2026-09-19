"use client";

import { Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { toggleWishlistAction } from "@/lib/account/actions";
import { cn } from "@/lib/utils";

/** A round white button that reads on any photo; the heart fills red when the product is saved. */
export const wishlistButtonClass =
  "inline-flex size-11 items-center justify-center rounded-full bg-card text-card-foreground shadow-md ring-1 ring-foreground/10 transition hover:scale-105 active:scale-95 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none disabled:opacity-70";

export function WishlistButton({
  storeSlug,
  productId,
  active,
  className,
}: {
  storeSlug: string;
  productId: string;
  active: boolean;
  className?: string;
}) {
  const t = useTranslations("product");
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(active);

  return (
    <button
      type="button"
      // One fixed name + the pressed state: screen readers then say "Save to wishlist, pressed"
      // instead of announcing the change twice (the label AND the state used to flip together).
      aria-pressed={optimistic}
      aria-label={t("saveToWishlist")}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          const fd = new FormData();
          fd.set("storeSlug", storeSlug);
          fd.set("productId", productId);
          await toggleWishlistAction(fd);
        })
      }
      className={cn(wishlistButtonClass, className)}
    >
      <Heart className={cn("size-5 transition-colors", optimistic && "fill-wishlist text-wishlist")} />
    </button>
  );
}

/** Guests see the same heart; it takes them to sign-in and back to this page. */
export function GuestWishlistButton({ className }: { className?: string }) {
  const t = useTranslations("product");
  const pathname = usePathname();
  return (
    <Link href={{ pathname: "/sign-in", query: { next: pathname } }} aria-label={t("addToWishlist")} className={cn(wishlistButtonClass, className)}>
      <Heart className="size-5" />
    </Link>
  );
}
