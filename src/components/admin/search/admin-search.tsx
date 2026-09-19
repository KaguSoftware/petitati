"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { confirmDeliveryByCodeAction } from "@/lib/admin/orders/actions";
import { globalSearchAction } from "@/lib/admin/search/actions";
import type { GlobalSearchResult } from "@/lib/admin/search/types";
import { useOptimisticAction } from "../shared/use-optimistic-action";
import { flatten, SearchResults, type FlatHit } from "./search-results";

interface Props {
  storeId: string;
  locale: string;
  canConfirm: boolean;
}

const EDITABLE = "input, textarea, select, [contenteditable=true], [role=textbox], [role=combobox]";

/**
 * The admin's front door: one box that finds an order (by number, delivery code, phone, name or
 * email), a customer, a product or a courier, and opens it on Enter. Ctrl/Cmd+K or "/" from anywhere.
 * A typed delivery code that matches shows a Confirm button, the same payoff as the delivery board.
 */
export function AdminSearch({ storeId, locale, canConfirm }: Props) {
  const t = useTranslations("admin.search");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  // Server and hydration render "Ctrl"; Macs read "⌘" once the store is on the client, so nothing mismatches.
  const mod = useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { run, pending: confirming } = useOptimisticAction("admin.orders");

  // Hotkeys: Ctrl/Cmd+K toggles; "/" opens unless typing somewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing) {
        const target = e.target as HTMLElement | null;
        if (target?.closest(EDITABLE)) return;
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The debounce timer outlives the component otherwise: unmounting the admin shell with a pending
  // keystroke left a timer that fired globalSearchAction and set state on a gone tree.
  // Same shape as shared/table-toolbar.tsx.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function search(q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResult(null);
      return;
    }
    timer.current = setTimeout(() => {
      const mine = ++seq.current;
      startTransition(async () => {
        const res = await globalSearchAction(storeId, q, locale);
        // A slower earlier response must not overwrite a newer one.
        if (mine !== seq.current) return;
        if (res.error) toast.error(t("failed"));
        else if (res.result) {
          setResult(res.result);
          setActive(0);
        }
      });
    }, 250);
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    seq.current++;
    setQuery("");
    setResult(null);
    setActive(0);
  }

  const flat = useMemo<FlatHit[]>(() => (result ? flatten(result) : []), [result]);
  const current = flat[Math.min(active, Math.max(0, flat.length - 1))];

  function pick(hit: FlatHit | undefined) {
    if (!hit) return;
    setOpen(false);
    router.push(hit.href);
  }

  function confirm(orderId: string, number: string) {
    if (!result) return;
    const fd = new FormData();
    fd.set("storeId", storeId);
    fd.set("orderId", orderId);
    fd.set("code", result.query);
    run(() => confirmDeliveryByCodeAction({}, fd), {
      onSuccess: () => {
        toast.success(t("confirmed", { number }));
        search(result.query);
      },
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + flat.length) % flat.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(flat.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(current);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="hidden h-8 w-56 items-center gap-2 rounded-lg border bg-background/60 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground lg:inline-flex xl:w-64"
          />
        }
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-start">{t("placeholder")}</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground lg:inline-block" dir="ltr">
          {mod} K
        </kbd>
      </DialogTrigger>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("open")} />}>
        <Search />
      </DialogTrigger>

      <DialogContent showCloseButton={false} initialFocus={inputRef} className="top-[10%] gap-0 overflow-hidden p-0 -translate-y-0 sm:max-w-xl">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <div className="relative flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="admin-search-list"
            aria-activedescendant={current ? current.id : undefined}
            aria-autocomplete="list"
            aria-label={t("title")}
            autoComplete="off"
            spellCheck={false}
            dir="auto"
            placeholder={t("placeholder")}
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:inline-block">Esc</kbd>
          {/* No spinner: a hairline pulse says "working" without moving anything. */}
          <span aria-hidden className={`absolute inset-x-0 bottom-0 h-0.5 bg-primary/60 transition-opacity ${pending ? "animate-pulse opacity-100" : "opacity-0"}`} />
        </div>
        <SearchResults
          id="admin-search-list"
          query={query}
          result={result}
          flat={flat}
          activeId={current?.id}
          locale={locale}
          canConfirm={canConfirm}
          confirming={confirming}
          onHover={setActive}
          onPick={pick}
          onConfirm={confirm}
        />
        <footer className="hidden items-center gap-4 border-t px-3 py-2 text-xs text-muted-foreground sm:flex">
          <span>
            <kbd className="font-sans">↑↓</kbd> {t("navigate")}
          </span>
          <span>
            <kbd className="font-sans">↵</kbd> {t("select")}
          </span>
          <span>
            <kbd className="font-sans">Esc</kbd> {t("close")}
          </span>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
