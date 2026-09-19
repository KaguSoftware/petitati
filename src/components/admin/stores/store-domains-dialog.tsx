"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/admin/shared/form-field";
import { useActionToast } from "@/components/admin/shared/use-action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/shared/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addStoreDomainAction, removeStoreDomainAction, setPrimaryDomainAction } from "@/lib/admin/stores/domain-actions";
import type { ActionState } from "@/lib/admin/types";
import type { StoreDomainRow } from "@/lib/db/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: { id: string; name: string; slug: string; domains: StoreDomainRow[] };
  rootDomain: string;
}

/**
 * Custom hostnames of one store: list, add, make primary, remove.
 * SCOPE(multi-store, unpaid): verification stays manual (`verified_at` is never set here).
 */
export function StoreDomainsDialog({ open, onOpenChange, store, rootDomain }: Props) {
  const t = useTranslations("stores.domains");
  const tErr = useTranslations("stores.fieldErrors");
  const tc = useTranslations("admin.common");
  const [hostname, setHostname] = useState("");
  const [makePrimary, setMakePrimary] = useState(false);
  const [pending, start] = useTransition();
  const [state, formAction, adding] = useActionToast(addStoreDomainAction, {
    errorNamespace: "stores",
    onSuccess: () => {
      setHostname("");
      setMakePrimary(false);
    },
  });
  const errors = Object.fromEntries(Object.entries(state.fieldErrors ?? {}).map(([k, v]) => [k, tErr.has(v) ? tErr(v) : v]));
  const target = rootDomain.split(":")[0];

  function run(action: () => Promise<ActionState>) {
    start(async () => {
      const res = await action();
      if (res.error) toast.error(tc.has(`errors.${res.error}`) ? tc(`errors.${res.error}`) : res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title", { name: store.name })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col divide-y rounded-lg border">
          <li className="flex items-center gap-3 px-3 py-2 text-sm">
            <code dir="ltr" className="min-w-0 flex-1 truncate">
              {store.slug}.{rootDomain}
            </code>
            <Badge variant="secondary">{t("verified")}</Badge>
          </li>
          {store.domains.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">{t("none")}</li>
          ) : (
            store.domains.map((d) => (
              <li key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <code dir="ltr" className="min-w-0 flex-1 truncate">
                  {d.hostname}
                </code>
                {d.is_primary && <Badge>{t("primary")}</Badge>}
                <Badge variant="outline">{d.verified_at ? t("verified") : t("unverified")}</Badge>
                {!d.is_primary && (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t("setPrimary")} title={t("setPrimary")} disabled={pending} onClick={() => run(() => setPrimaryDomainAction(d.id))}>
                    <Star />
                  </Button>
                )}
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t("remove")} title={t("remove")} disabled={pending} className="text-destructive">
                      <Trash2 />
                    </Button>
                  }
                  title={t("removeConfirm", { hostname: d.hostname })}
                  confirmLabel={t("remove")}
                  destructive
                  action={() => removeStoreDomainAction(d.id)}
                />
              </li>
            ))
          )}
        </ul>

        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="storeId" value={store.id} />
          <input type="hidden" name="makePrimary" value={makePrimary ? "true" : "false"} />
          <FormField name="hostname" label={t("hostname")} errors={errors} description={hostname ? t("dns", { hostname, target }) : undefined}>
            <Input id="hostname" name="hostname" dir="ltr" value={hostname} placeholder={t("placeholder")} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={253} onChange={(e) => setHostname(e.target.value.toLowerCase().trim())} className="font-mono text-sm" />
          </FormField>
          <div className="flex items-center justify-between gap-3">
            <Label className="flex cursor-pointer items-center gap-2 font-normal">
              <Checkbox checked={makePrimary} onCheckedChange={(v) => setMakePrimary(v)} />
              {t("makePrimary")}
            </Label>
            <Button type="submit" disabled={adding || !hostname}>
              {t("add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
