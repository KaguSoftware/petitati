import { Link } from "@/i18n/navigation";
import type { CategoryBannerProps } from "../types";

export function CategoryBannerEditorial({ title, categories }: CategoryBannerProps) {
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl border-t border-foreground/15 px-gutter py-12 @tablet:py-16">
      <div className="mb-8 flex items-baseline gap-4">
        <span aria-hidden className="text-xs tracking-[0.2em] text-muted-foreground">
          02
        </span>
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      </div>
      <ul className="flex flex-col divide-y divide-foreground/15 border-y border-foreground/15 @desktop:flex-row @desktop:flex-wrap @desktop:divide-x @desktop:divide-y-0">
        {categories.map((c) => (
          <li key={c.id} className="@desktop:flex-1">
            <Link
              href={`/c/${c.slug}`}
              className="flex h-full items-center py-4 font-heading text-2xl font-medium tracking-tight transition-colors hover:text-primary focus-visible:text-primary focus-ring @desktop:justify-center @desktop:px-6 @desktop:py-6 @desktop:text-center @desktop:text-3xl @wide:text-4xl"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
