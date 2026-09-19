"use client";

import { ExternalLink, Monitor, RotateCcw, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { UnsavedChangesGuard } from "@/components/admin/shared/unsaved-changes";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StoreProvider } from "@/components/storefront/store-provider";
import { dirFor, localeNames, type Locale } from "@/i18n/config";
import { saveThemeAction } from "@/lib/admin/design/actions";
import { FONT_OPTIONS, RADIUS_PRESETS, THEME_COLOR_KEYS } from "@/lib/admin/design/constants";
import { renderAnnouncementBar, renderHero } from "@/lib/theme/client-registry";
import { fixtureHeroImage } from "@/lib/theme/fixtures";
import { fontFamily } from "@/lib/theme/fonts";
import { EMPTY_SLIDE, type HeroContent } from "@/lib/theme/hero";
import { composeHome, gridCombo, type SectionPreviews } from "@/lib/theme/preview-compose";
import { PREVIEW_STORE_SLUG } from "@/lib/theme/preview-slug";
import { type SectionKey, type StoreTheme, type VariantKey } from "@/lib/theme/types";
import { cn } from "@/lib/utils";
import { CollapsibleCard } from "../shared/collapsible-card";
import { useActionToast } from "../shared/use-action-toast";
import { DESIGN_GROUP } from "./design-sections";
import { ColorField } from "@/components/admin/color-field";
import { HeroCard } from "./hero-card";
import { PreviewFrame, type PreviewDevice } from "./preview-frame";
import { SectionPicker } from "./section-picker";

interface Props {
  storeId: string;
  storeName: string;
  currency: string;
  locale: Locale;
  theme: StoreTheme;
  hero: HeroContent;
  enabledLocales: Locale[];
  /** Every section variant, pre-rendered on the server with sample data. */
  previews: SectionPreviews;
  /** Dev-only preview harness link; evaluated on the server. */
  previewHref: string | null;
}

interface Draft {
  theme: StoreTheme;
  hero: HeroContent;
}

const FORM_ID = "theme-form";

export function ThemeEditor({ storeId, storeName, currency, locale, theme, hero, enabledLocales, previews, previewHref }: Props) {
  const t = useTranslations("admin.design");
  const tc = useTranslations("admin.common");
  const th = useTranslations("home");
  const [draft, setDraft] = useState<Draft>({ theme, hero });
  const [saved, setSaved] = useState(() => JSON.stringify({ theme, hero }));
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [state, action, pending] = useActionToast(saveThemeAction, {
    errorNamespace: "admin.design",
    onSuccess: () => setSaved(JSON.stringify(draft)),
  });
  const dirty = JSON.stringify(draft) !== saved;
  const dir = dirFor(locale);

  const patch = (p: Partial<StoreTheme>) => setDraft((d) => ({ ...d, theme: { ...d.theme, ...p } }));
  const pick = (section: SectionKey, variant: VariantKey) => patch({ sections: { ...draft.theme.sections, [section]: variant } });
  const textLocales = enabledLocales.length ? enabledLocales : [locale];

  // Hero and announcement are rendered here, on the client, so typing shows up live in every frame.
  const announcementText = draft.theme.announcement[locale] ?? Object.values(draft.theme.announcement).find(Boolean) ?? "";
  const heroSlides = (draft.hero.slides.length ? draft.hero.slides : [EMPTY_SLIDE]).map((s, i) => ({
    title: s.title[locale] ?? Object.values(s.title).find(Boolean) ?? (i === 0 ? th("heroTitle") : ""),
    subtitle: s.subtitle[locale] ?? Object.values(s.subtitle).find(Boolean) ?? (i === 0 ? th("heroSubtitle") : ""),
    ctaLabel: th("shopNow"),
    ctaHref: s.link ?? "/shop",
    imageUrl: s.imageUrl ?? (i === 0 ? fixtureHeroImage : null),
  }));
  // Frames are inert pictures: no auto-advance, so a dozen previews do not each run a timer.
  const heroProps = { slides: heroSlides, labels: { previous: th("previousSlide"), next: th("nextSlide"), slideOf: th.raw("slideOf") as string }, autoplay: false };
  const nodeFor = (section: SectionKey, v: VariantKey): ReactNode => {
    switch (section) {
      case "hero":
        return renderHero(v, heroProps);
      case "announcementBar":
        return (
          <>
            {renderAnnouncementBar(v, { text: announcementText || t("announcement.placeholder") })}
            {previews.navbar[draft.theme.sections.navbar]}
            {renderHero(draft.theme.sections.hero, heroProps)}
          </>
        );
      case "navbar":
        return (
          <>
            {previews.navbar[v]}
            {renderHero(draft.theme.sections.hero, heroProps)}
          </>
        );
      case "productGrid":
        return previews.productGrid[gridCombo(v, draft.theme.sections.productCard)];
      case "productCard":
        return previews.productGrid[gridCombo(draft.theme.sections.productGrid, v)];
      default:
        return previews[section][v];
    }
  };
  const home = composeHome(previews, draft.theme.sections, {
    announcementBar: announcementText ? renderAnnouncementBar(draft.theme.sections.announcementBar, { text: announcementText }) : null,
    hero: renderHero(draft.theme.sections.hero, heroProps),
  });

  const deviceToggle = (
    <div role="group" aria-label={t("preview.title")} className="inline-flex rounded-lg border p-0.5">
      {(["desktop", "mobile"] as const).map((d) => (
        <Button key={d} type="button" size="sm" variant={device === d ? "secondary" : "ghost"} className="h-7 px-2" aria-pressed={device === d} onClick={() => setDevice(d)}>
          {d === "desktop" ? <Monitor /> : <Smartphone />}
          <span className="sr-only sm:not-sr-only">{t(`preview.${d}`)}</span>
        </Button>
      ))}
    </div>
  );

  return (
    <StoreProvider value={{ id: PREVIEW_STORE_SLUG, slug: PREVIEW_STORE_SLUG, name: storeName, currency, locale, enabledLocales, logoUrl: null }}>
      {/* The form carries only the payload: previews contain their own <form>s and must not nest. */}
      <form id={FORM_ID} action={action} hidden>
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="theme" value={JSON.stringify(draft.theme)} />
        <input type="hidden" name="hero" value={JSON.stringify(draft.hero)} />
      </form>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <HeroCard storeId={storeId} locale={locale} locales={textLocales} hero={draft.hero} onChange={(h) => setDraft((d) => ({ ...d, hero: h }))} />

            {/* Colours */}
            <CollapsibleCard group={DESIGN_GROUP} id="colors" title={t("colors.title")} description={t("colors.description")} contentClassName="grid gap-4 sm:grid-cols-2">
                {THEME_COLOR_KEYS.map((key) => (
                  <ColorField
                    key={key}
                    name={`color_${key}`}
                    id={`color_${key}`}
                    label={t(`colors.${key}`)}
                    defaultValue={theme.colors[key]}
                    value={draft.theme.colors[key]}
                    onChange={(hex) => patch({ colors: { ...draft.theme.colors, [key]: hex } })}
                  />
                ))}
            </CollapsibleCard>

            {/* Radius + fonts */}
            <CollapsibleCard group={DESIGN_GROUP} id="shape" title={t("shape.title")} description={t("shape.description")} contentClassName="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label>{t("shape.radius")}</Label>
                  <RadioGroup value={draft.theme.radius} onValueChange={(v) => patch({ radius: String(v) })} className="grid-cols-2 sm:grid-cols-4">
                    {RADIUS_PRESETS.map((r) => (
                      <label
                        key={r.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
                          draft.theme.radius === r.value && "border-primary bg-primary/5",
                        )}
                      >
                        <RadioGroupItem value={r.value} aria-label={t(`shape.radiusPresets.${r.key}`)} />
                        <span aria-hidden className="size-7 shrink-0 border-2 border-foreground/60 bg-muted" style={{ borderRadius: r.value }} />
                        <span className="text-sm">{t(`shape.radiusPresets.${r.key}`)}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["heading", "body"] as const).map((slot) => (
                    <div key={slot} className="flex flex-col gap-2">
                      <Label htmlFor={`font_${slot}`}>{t(`shape.font.${slot}`)}</Label>
                      <Select value={draft.theme.fonts[slot]} onValueChange={(v) => patch({ fonts: { ...draft.theme.fonts, [slot]: String(v) } })} modal={false}>
                        <SelectTrigger id={`font_${slot}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {FONT_OPTIONS.map((f) => (
                            <SelectItem key={f} value={f}>
                              <span style={{ fontFamily: fontFamily(f) }}>{f}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{t("shape.fontNote")}</p>
            </CollapsibleCard>

            {/* Announcement */}
            <CollapsibleCard group={DESIGN_GROUP} id="announcement" title={t("announcement.title")} description={t("announcement.description")}>
                <Tabs defaultValue={textLocales.includes(locale) ? locale : textLocales[0]}>
                  <TabsList>
                    {textLocales.map((l) => (
                      <TabsTrigger key={l} value={l} className="leading-5">
                        {localeNames[l]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {textLocales.map((l) => (
                    <TabsContent key={l} value={l}>
                      <Textarea
                        dir={dirFor(l)}
                        rows={2}
                        maxLength={200}
                        value={draft.theme.announcement[l] ?? ""}
                        placeholder={t("announcement.placeholder")}
                        aria-label={`${t("announcement.title")} (${localeNames[l]})`}
                        onChange={(e) => {
                          const next = { ...draft.theme.announcement };
                          if (e.target.value.trim() === "") delete next[l];
                          else next[l] = e.target.value;
                          patch({ announcement: next });
                        }}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
            </CollapsibleCard>

            {/* Section layouts */}
            <CollapsibleCard group={DESIGN_GROUP} id="sections" title={t("sections.title")} description={t("sections.description")} headerExtra={deviceToggle}>
                <SectionPicker theme={draft.theme} dir={dir} locale={locale} device={device} onPick={pick} nodeFor={nodeFor} />
            </CollapsibleCard>
          </div>

          {/* Live preview: the home page assembled from the chosen layouts */}
          <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium">{t("preview.title")}</h2>
              <div className="flex flex-wrap items-center gap-1">
                {deviceToggle}
                <a href={`/${locale}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  {t("preview.openStorefront")}
                  <ExternalLink data-icon="inline-end" />
                </a>
                {previewHref && (
                  <a href={previewHref} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    {t("preview.harness")}
                    <ExternalLink data-icon="inline-end" />
                  </a>
                )}
              </div>
            </div>
            <OverlayScroll className="max-h-[calc(100dvh-8rem)] rounded-xl border shadow-sm">
              <PreviewFrame device={device} theme={draft.theme} dir={dir} locale={locale} label={t("preview.home")} className="bg-background">
                {home}
              </PreviewFrame>
            </OverlayScroll>
            <p className="text-xs text-muted-foreground">{t("preview.home")}</p>
          </div>
        </div>

        <UnsavedChangesGuard dirty={dirty && !pending} />
        {/* Sticky save bar: only while there is something to save, so it never covers the picker while browsing. */}
        <div
          hidden={!dirty && !pending}
          className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
        >
          <p className="text-sm text-muted-foreground">{dirty ? t("unsaved") : t("allSaved")}</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={!dirty || pending} onClick={() => setDraft(JSON.parse(saved) as Draft)}>
              <RotateCcw data-icon="inline-start" />
              {t("reset")}
            </Button>
            <Button type="submit" form={FORM_ID} disabled={!dirty || pending}>
              {pending ? tc("saving") : tc("save")}
            </Button>
          </div>
        </div>
        {(state.fieldErrors?.theme || state.fieldErrors?.hero) && <p className="text-sm text-destructive">{tc("errors.invalid")}</p>}
      </div>
    </StoreProvider>
  );
}
