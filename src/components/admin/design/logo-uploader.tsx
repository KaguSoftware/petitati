"use client";

import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "../shared/collapsible-card";
import { DESIGN_GROUP } from "./design-sections";
import { setBrandingAction } from "@/lib/admin/design/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useActionToast } from "../shared/use-action-toast";

type Kind = "logo" | "favicon";

const LIMITS: Record<Kind, { maxBytes: number; accept: string }> = {
  logo: { maxBytes: 2 * 1024 * 1024, accept: "image/png,image/jpeg,image/webp,image/svg+xml" },
  favicon: { maxBytes: 512 * 1024, accept: "image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml" },
};

interface Props {
  storeId: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

/** Logo + favicon: hidden file input behind a styled button, upload to `store-media/<storeId>/branding/`, then save the public URL. */
export function LogoUploader({ storeId, logoUrl, faviconUrl }: Props) {
  const t = useTranslations("admin.design.branding");
  return (
    <CollapsibleCard group={DESIGN_GROUP} id="branding" title={t("title")} description={t("description")} contentClassName="grid gap-4 sm:grid-cols-2">
      <BrandingCard storeId={storeId} kind="logo" url={logoUrl} title={t("logo")} description={t("logoHint")} />
      <BrandingCard storeId={storeId} kind="favicon" url={faviconUrl} title={t("favicon")} description={t("faviconHint")} />
    </CollapsibleCard>
  );
}

function BrandingCard({ storeId, kind, url, title, description }: { storeId: string; kind: Kind; url: string | null; title: string; description: string }) {
  const t = useTranslations("admin.design.branding");
  const tc = useTranslations("admin.common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [, action, pending] = useActionToast(setBrandingAction, { errorNamespace: "admin.design" });

  function submit(nextUrl: string) {
    const fd = new FormData();
    fd.set("storeId", storeId);
    fd.set("kind", kind);
    fd.set("url", nextUrl);
    startTransition(() => action(fd));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const limit = LIMITS[kind];
    if (file.size > limit.maxBytes) {
      toast.error(t("tooLarge", { max: Math.round(limit.maxBytes / 1024) }));
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `${storeId}/branding/${crypto.randomUUID()}.${ext}`;
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage.from("store-media").upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("store-media").getPublicUrl(path);
      submit(data.publicUrl);
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = uploading || pending;
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-medium">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border bg-[repeating-conic-gradient(var(--color-muted)_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- storage host varies per environment
            <img src={url} alt="" className={kind === "favicon" ? "size-8 object-contain" : "size-full object-contain"} />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <input ref={inputRef} type="file" accept={LIMITS[kind].accept} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Upload data-icon="inline-start" />
              {url ? t("replace") : tc("upload")}
            </Button>
            {url && (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => submit("")}>
                <Trash2 data-icon="inline-start" />
                {tc("remove")}
              </Button>
            )}
          </div>
          {url && (
            <p dir="ltr" className="truncate text-xs text-muted-foreground" title={url}>
              {url.split("/").pop()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
