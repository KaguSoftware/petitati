import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "./shared/table-skeleton";

/** Static placeholder for the whole admin frame while session + store resolve. */
export function AdminShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-background" aria-busy>
      {/* Pinned like the real sidebar: the skeleton shows for seconds on a cold load and must not scroll away. */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col self-start border-e bg-sidebar md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex flex-col gap-1.5 p-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b px-3 md:px-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ms-auto hidden h-8 w-56 rounded-lg lg:block xl:w-64" />
          <Skeleton className="size-9 rounded-full" />
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <Skeleton className="h-8 w-48" />
            <TableSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}
