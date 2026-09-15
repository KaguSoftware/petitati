"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { listingHref } from "./listing-params";

/** "Go to page [ 10 ] Go" — the owner's ask: reach page 10 without pressing Next ten times. */
export function PageJump({ pages, basePath, query }: { pages: number; basePath: string; query: Record<string, string | undefined> }) {
  const t = useTranslations("shop");
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Math.trunc(Number(value));
        if (!Number.isFinite(n) || n < 1 || n > pages) return;
        router.push(listingHref(basePath, { ...query, page: n > 1 ? String(n) : undefined }));
      }}
    >
      <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
        {t("goToPage")}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={pages}
        dir="ltr"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-10! w-20 rounded-lg bg-card text-center"
        aria-describedby={`${id}-of`}
      />
      <span id={`${id}-of`} className="sr-only">
        {t("pageOf", { page: value || "1", total: pages })}
      </span>
      <Button type="submit" variant="outline" size="lg" className="bg-card">
        {t("go")}
      </Button>
    </form>
  );
}
