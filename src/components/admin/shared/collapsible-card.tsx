"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * Open/closed state for groups of collapsible cards, shared across the page (so an "expand all"
 * button and each card agree) and remembered per browser. Every card starts open; only the
 * sections someone folded are stored.
 */
const listeners = new Set<() => void>();
const closed = new Map<string, Set<string>>();
const loaded = new Set<string>();
const storageKey = (group: string) => `collapsible:${group}`;

function groupSet(group: string): Set<string> {
  let set = closed.get(group);
  if (!set) closed.set(group, (set = new Set()));
  if (!loaded.has(group) && typeof window !== "undefined") {
    loaded.add(group);
    try {
      const raw = window.localStorage.getItem(storageKey(group));
      if (raw) for (const id of JSON.parse(raw) as string[]) set.add(id);
    } catch {
      // private mode or blocked storage: everything stays open
    }
  }
  return set;
}

function setOpen(group: string, ids: string[], open: boolean) {
  const set = groupSet(group);
  for (const id of ids) {
    if (open) set.delete(id);
    else set.add(id);
  }
  try {
    window.localStorage.setItem(storageKey(group), JSON.stringify([...set]));
  } catch {
    // not persisted; the in-memory state still applies
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useClosedKey(group: string): string {
  return useSyncExternalStore(
    subscribe,
    () => [...groupSet(group)].sort().join("|"),
    () => "",
  );
}

interface Props {
  group: string;
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Controls beside the title (e.g. a device toggle); shown only while the card is open. */
  headerExtra?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

/** A card whose header folds its body away. The body stays mounted, so drafts and uploads survive folding. */
export function CollapsibleCard({ group, id, title, description, headerExtra, children, contentClassName }: Props) {
  const key = useClosedKey(group);
  const open = !key.split("|").includes(id);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={(next) => setOpen(group, [id], next)}
      render={<section data-slot="card" className="flex flex-col overflow-hidden rounded-xl bg-card text-sm text-card-foreground ring-1 ring-foreground/10" />}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 p-4">
        <Collapsible.Trigger className="group/trigger -m-1.5 flex min-w-0 flex-1 items-start gap-2.5 rounded-lg p-1.5 text-start outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50">
          <ChevronDown aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 -rotate-90 group-data-panel-open/trigger:rotate-0 rtl:-scale-x-100" />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-heading text-base leading-snug font-medium">{title}</span>
            {description && <span className="text-sm text-muted-foreground">{description}</span>}
          </span>
        </Collapsible.Trigger>
        {open && headerExtra}
      </div>
      <Collapsible.Panel keepMounted className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
        <div className={cn("px-4 pb-4", contentClassName)}>{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/** "Expand all" / "Collapse all" for one group of cards. */
export function CollapseAllButton({ group, ids, labels }: { group: string; ids: string[]; labels: { expand: string; collapse: string } }) {
  const key = useClosedKey(group);
  const anyClosed = ids.some((id) => key.split("|").includes(id));
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(group, ids, anyClosed)}>
      <ChevronDown data-icon="inline-start" className={cn("transition-transform", !anyClosed && "rotate-180")} />
      {anyClosed ? labels.expand : labels.collapse}
    </Button>
  );
}
