"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { BrandData } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";

interface Props {
  brands: BrandData[];
  /** The store's top-level categories, used as "pet type" chips. */
  petTypes: { id: string; name: string }[];
  /** brand id → ids of the pet types its products are under. */
  brandPetTypes: Record<string, string[]>;
}

/** Lower-cased, Arabic/Persian letter variants folded, so "كنين" finds "کنین". */
const fold = (s: string) => s.toLocaleLowerCase().replace(/ك/g, "ک").replace(/ي/g, "ی").trim();

/**
 * The /brands tile wall with a search box and pet-type chips (Dog, Cat…). Everything is already on
 * the page, so filtering is instant and needs no URL round trip.
 */
export function BrandDirectory({ brands, petTypes, brandPetTypes }: Props) {
  const t = useTranslations("brands");
  const [query, setQuery] = useState("");
  const [pet, setPet] = useState<string | null>(null);
  const q = fold(useDeferredValue(query));
  // Only chips that would show something.
  const chips = petTypes.filter((p) => brands.some((b) => brandPetTypes[b.id]?.includes(p.id)));
  const shown = brands.filter((b) => (!pet || brandPetTypes[b.id]?.includes(pet)) && (!q || fold(b.name).includes(q)));

  const chip = (on: boolean) => cn("focus-ring inline-flex h-10 items-center rounded-full px-4 text-sm transition-colors", on ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="h-11! rounded-lg bg-background ps-9! text-base! [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
        {chips.length > 1 && (
          <ul className="bleed-gutter flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label={t("petType")}>
            <li className="shrink-0">
              <button type="button" aria-pressed={pet === null} onClick={() => setPet(null)} className={chip(pet === null)}>
                {t("allPets")}
              </button>
            </li>
            {chips.map((p) => (
              <li key={p.id} className="shrink-0">
                <button type="button" aria-pressed={pet === p.id} onClick={() => setPet(pet === p.id ? null : p.id)} className={chip(pet === p.id)}>
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">{t("noMatch")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 @phablet:grid-cols-3 @tablet:gap-4 @desktop:grid-cols-4">
          {shown.map((b) => (
            <li key={b.id}>
              <Link
                href={`/b/${b.slug}`}
                className="flex h-full flex-col items-center gap-3 rounded-xl bg-card p-5 text-center shadow-sm ring-1 ring-foreground/5 transition-colors hover:bg-muted focus-visible:bg-muted focus-ring"
              >
                <BrandMark name={b.name} logoUrl={b.logoUrl} size={72} />
                <span className="bidi-auto font-medium">{b.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
