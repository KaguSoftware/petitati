import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<Row> {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  /** Applied to both header and cells (e.g. `text-end`, `w-10`). */
  className?: string;
  /** Hide below a breakpoint: "md" → hidden md:table-cell. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
}

interface Props<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Shown instead of the table when `rows` is empty. */
  empty: ReactNode;
  className?: string;
  /** Rows carry a stretched link (a cell link with `after:absolute after:inset-0`), so the whole row is clickable. */
  linkedRows?: boolean;
}

const HIDE: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

/** Server-renderable table with responsive column hiding. Scrolls horizontally via ui/table. */
export function DataTable<Row>({ columns, rows, rowKey, empty, className, linkedRows }: Props<Row>) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead key={c.key} className={cn("bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase", c.className, c.hideBelow && HIDE[c.hideBelow])}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)} className={cn(linkedRows && "relative cursor-pointer")}>
              {columns.map((c) => (
                <TableCell key={c.key} className={cn("py-2.5", c.className, c.hideBelow && HIDE[c.hideBelow])}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
