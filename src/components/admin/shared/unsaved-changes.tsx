"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * "Leave without saving?" for admin editors. While `dirty`:
 *  - closing the tab / reloading gets the browser's own prompt (`beforeunload`);
 *  - clicking any same-site link is caught in the capture phase (before Next's <Link> handles it)
 *    and asks first, in the admin's language, with "Stay" as the safe default.
 *
 * SCOPE(unsaved-guard): browser Back/Forward inside the app is not intercepted (Next exposes no
 * router-leave event). GROWS LATER → a popstate guard if staff lose work that way.
 */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const t = useTranslations("admin.common");
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const leaving = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (leaving.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // In-page anchors and links to the page itself lose nothing.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setTarget(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("unsavedTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("unsavedBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("unsavedStay")}</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              if (!target) return;
              leaving.current = true;
              setTarget(null);
              router.push(target);
            }}
          >
            {t("unsavedLeave")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Dirty flag for an uncontrolled admin form: any input/change inside it marks it dirty; call
 * `reset` after a successful save. Spread `track` on the <form>.
 */
export function useFormDirty() {
  const [dirty, setDirty] = useState(false);
  const mark = useCallback(() => setDirty(true), []);
  const reset = useCallback(() => setDirty(false), []);
  return { dirty, reset, track: { onInput: mark, onChange: mark } };
}
