"use client";

import { ArrowDown, ArrowUp, ImageIcon, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { dirFor, localeNames, type Locale } from "@/i18n/config";
import { EMPTY_SLIDE, heroLinkSchema, MAX_HERO_SLIDES, type HeroContent, type HeroSlide } from "@/lib/theme/hero";
import { cn } from "@/lib/utils";
import { CollapsibleCard } from "../shared/collapsible-card";
import { ImageUploader } from "../shared/image-uploader";
import { DESIGN_GROUP } from "./design-sections";

interface Props {
  storeId: string;
  locale: Locale;
  locales: Locale[];
  hero: HeroContent;
  onChange: (hero: HeroContent) => void;
}

/** Hero slides: photo + per-locale headline/subtitle + button link each. Edits land in the editor draft and save with the theme. */
export function HeroCard({ storeId, locale, locales, hero, onChange }: Props) {
  const t = useTranslations("admin.design.hero");
  const tc = useTranslations("admin.common");
  const slides = hero.slides;

  const setSlides = (next: HeroSlide[]) => onChange({ slides: next });
  const update = (i: number, patch: Partial<HeroSlide>) => setSlides(slides.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const setText = (i: number, field: "title" | "subtitle", l: Locale, value: string) => {
    const next = { ...slides[i][field] };
    if (value.trim() === "") delete next[l];
    else next[l] = value;
    update(i, { [field]: next });
  };
  const move = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[i], next[target]] = [next[target], next[i]];
    setSlides(next);
  };
  const remove = (i: number) => setSlides(slides.filter((_, j) => j !== i));
  const add = () => slides.length < MAX_HERO_SLIDES && setSlides([...slides, { ...EMPTY_SLIDE }]);

  return (
    <CollapsibleCard group={DESIGN_GROUP} id="hero" title={t("title")} description={t("description")} contentClassName="flex flex-col gap-5">
        {slides.length === 0 && <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>}
        <ol className="flex flex-col gap-4">
          {slides.map((slide, i) => {
            const badLink = !!slide.link && !heroLinkSchema.safeParse(slide.link).success;
            return (
              <li key={i} className="flex flex-col gap-4 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">{t("slide", { n: i + 1 })}</h3>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon-sm" variant="ghost" aria-label={t("moveUp")} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label={t("moveDown")} disabled={i === slides.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label={t("removeSlide")} className="text-destructive hover:text-destructive" onClick={() => remove(i)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>{t("image")}</Label>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,20rem)_1fr] sm:items-start">
                    <div className="grid aspect-[12/5] w-full place-items-center overflow-hidden rounded-lg border bg-[repeating-conic-gradient(var(--color-muted)_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]">
                      {slide.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- storage host varies per environment
                        <img src={slide.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <ImageUploader storeId={storeId} folder="hero" label={slide.imageUrl ? t("replace") : t("upload")} onUploaded={(url) => update(i, { imageUrl: url })} />
                        {slide.imageUrl && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => update(i, { imageUrl: null })}>
                            <Trash2 data-icon="inline-start" />
                            {tc("remove")}
                          </Button>
                        )}
                      </div>
                      {slide.imageUrl ? (
                        <p dir="ltr" className="truncate text-xs text-muted-foreground" title={slide.imageUrl}>
                          {slide.imageUrl.split("/").pop()}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t("noImage")}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Tabs defaultValue={locales.includes(locale) ? locale : locales[0]}>
                  <TabsList>
                    {locales.map((l) => (
                      <TabsTrigger key={l} value={l} className="leading-5">
                        {localeNames[l]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {locales.map((l) => (
                    <TabsContent key={l} value={l} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`hero_${i}_title_${l}`}>{t("headline")}</Label>
                        <Input id={`hero_${i}_title_${l}`} dir={dirFor(l)} maxLength={120} value={slide.title[l] ?? ""} placeholder={t("headlinePlaceholder")} onChange={(e) => setText(i, "title", l, e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`hero_${i}_subtitle_${l}`}>{t("subtitle")}</Label>
                        <Textarea id={`hero_${i}_subtitle_${l}`} dir={dirFor(l)} rows={2} maxLength={300} value={slide.subtitle[l] ?? ""} placeholder={t("subtitlePlaceholder")} onChange={(e) => setText(i, "subtitle", l, e.target.value)} />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`hero_${i}_link`}>{t("link")}</Label>
                  <Input
                    id={`hero_${i}_link`}
                    dir="ltr"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={200}
                    value={slide.link ?? ""}
                    placeholder={t("linkPlaceholder")}
                    aria-invalid={badLink || undefined}
                    className={cn("sm:max-w-sm", badLink && "border-destructive")}
                    onChange={(e) => update(i, { link: e.target.value.trim() === "" ? null : e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t("linkNote")}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" disabled={slides.length >= MAX_HERO_SLIDES} onClick={add}>
            <Plus data-icon="inline-start" />
            {t("addSlide")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("maxSlides", { max: MAX_HERO_SLIDES })}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t("fallbackNote")}</p>
    </CollapsibleCard>
  );
}
