import type { ReactNode } from "react";
import Image from "next/image";
import { pageHeading } from "@/components/storefront/shared/page-shell";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string | null;
  imageUrl: string | null;
  /** breadcrumb, laid over the photo above the title */
  eyebrow?: ReactNode;
}

/**
 * The top of a category page: the category's photo edge to edge under the navbar, the breadcrumb
 * and the name laid over a bottom scrim (owner, 2026-09-15: "the top of the page should be a
 * hero"). Falls back to the brand gradient when a category has no photo.
 */
export function CategoryHero({ title, description, imageUrl, eyebrow }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-inverse text-white">
      <div className="relative aspect-[16/9] max-h-[26rem] min-h-52 w-full @tablet:aspect-[3/1] @tablet:min-h-64 @desktop:aspect-[7/2]">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))]" />
        )}
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/75 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-gutter pb-6 @tablet:pb-8 @desktop:pb-10">
            {eyebrow && <div className="text-white/85 [&_a:hover]:text-white [&_[aria-current]]:text-white">{eyebrow}</div>}
            <h1 className={cn("bidi-auto max-w-3xl font-semibold tracking-tight text-balance [text-shadow:0_2px_12px_rgb(0_0_0/.35)]", pageHeading.page)}>{title}</h1>
            {description && <p className="bidi-auto max-w-xl text-white/85 [text-shadow:0_1px_6px_rgb(0_0_0/.4)]">{description}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
