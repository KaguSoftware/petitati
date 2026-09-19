"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { localeNames, type Locale } from "@/i18n/config";
import { updatePagesAction } from "@/lib/admin/settings/actions";
import { CONTENT_PAGES } from "@/lib/admin/settings/constants";
import { FormField } from "../shared/form-field";
import { useActionToast } from "../shared/use-action-toast";
import { UnsavedChangesGuard, useFormDirty } from "@/components/admin/shared/unsaved-changes";

interface Props {
  storeId: string;
  locale: Locale;
  enabledLocales: Locale[];
  /** `store.settings.pages` as stored: page → locale → text. */
  pages: Record<string, Record<string, string>>;
}

/**
 * Content pages (privacy / terms / about) per locale. Plain text; the storefront renders it with
 * `whitespace-pre-line`. SCOPE(content-pages): GROWS LATER → rich text editor.
 */
export function PagesForm({ storeId, locale, enabledLocales, pages }: Props) {
  const t = useTranslations("admin.settings.pages");
  const tc = useTranslations("admin.common");
  const { dirty, reset: resetDirty, track } = useFormDirty();
  const [state, action, pending] = useActionToast(updatePagesAction, { errorNamespace: "admin.settings", onSuccess: () => resetDirty() });
  const localeTabs = enabledLocales.length ? enabledLocales : [locale];
  const initialLocale = localeTabs.includes(locale) ? locale : localeTabs[0];

  return (
    <form action={action} {...track} className="flex flex-col gap-6">
      <UnsavedChangesGuard dirty={dirty && !pending} />
      <input type="hidden" name="storeId" value={storeId} />
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={CONTENT_PAGES[0]}>
            <TabsList>
              {CONTENT_PAGES.map((page) => (
                <TabsTrigger key={page} value={page}>
                  {t(`keys.${page}`)}
                </TabsTrigger>
              ))}
            </TabsList>
            {CONTENT_PAGES.map((page) => (
              <TabsContent key={page} value={page} keepMounted className="pt-2">
                <Tabs defaultValue={initialLocale}>
                  <TabsList variant="line">
                    {localeTabs.map((l) => (
                      <TabsTrigger key={l} value={l}>
                        {localeNames[l]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {localeTabs.map((l) => {
                    const name = `pages.${page}.${l}`;
                    return (
                      <TabsContent key={l} value={l} keepMounted>
                        <FormField name={name} label={`${t(`keys.${page}`)} · ${localeNames[l]}`} errors={state.fieldErrors} className="[&>label]:sr-only">
                          <Textarea key={pages[page]?.[l] ?? ""} id={name} name={name} dir={l === "fa" ? "rtl" : "ltr"} rows={12} defaultValue={pages[page]?.[l] ?? ""} placeholder={t("placeholder")} className="min-h-56 font-mono text-sm leading-relaxed" />
                        </FormField>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? tc("saving") : tc("save")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
