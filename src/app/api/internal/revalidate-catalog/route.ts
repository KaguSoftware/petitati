import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { catalogTag } from "@/lib/catalog/queries";
import { env } from "@/lib/env";

/**
 * Lets out-of-app writers (the supplier import/sync scripts under scripts/) expire a store's catalog
 * cache. Server actions use updateTag; a script cannot, so without this the storefront keeps serving
 * the pre-import catalog for hours. Guarded by CATALOG_REVALIDATE_SECRET in `x-revalidate-secret`.
 */
// guid, not uuid: seeded store ids (10000000-…-0001) are not RFC-variant UUIDs.
const bodySchema = z.object({ storeId: z.guid() });

function secretMatches(given: string | null, expected: string) {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = env.catalogRevalidateSecret();
  if (!expected || !secretMatches(request.headers.get("x-revalidate-secret"), expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  // expire: 0 — the import just changed prices/stock, so never serve the stale catalog.
  revalidateTag(catalogTag(parsed.data.storeId), { expire: 0 });
  return NextResponse.json({ revalidated: catalogTag(parsed.data.storeId) });
}
