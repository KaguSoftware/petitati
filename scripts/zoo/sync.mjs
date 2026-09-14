// Daily supplier sync: keep zoo-sourced variants priced and stocked like zoo.com.tr, and bring in newly
// stocked items.
//
//   node scripts/zoo/sync.mjs [--dry-run] [--force] [--skip-new]
//
// 1. One listing snapshot (all in-stock products, 2 requests).
// 2. Known variants: re-price (supplier price + markup), mirror stock, reactivate if they were retired.
// 3. Known variants missing from the listing are sold out: stock → 0. Ones whose page is gone (404) are
//    retired (is_active = false); a product with no active variant left is archived.
// 4. New in-stock items: crawl → group → translate → import (active) for just their buckets.
//
// Guards (abort before writing, run recorded as "aborted"; --force overrides):
//   - the listing shrank below half of the variants we believed in stock
//   - more than 20% of known in-stock variants changed price in one run
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fetchInStockListing } from "./lib/listing.mjs";
import { fetchWithRetry, mapPool } from "./lib/http.mjs";
import { SUPPLIER, db, markup, must, resolveStore, revalidateCatalog } from "./lib/db.mjs";
import { DATA, ROOT, args, writeJson } from "./lib/store.mjs";

const opts = args();
const supabase = db();
const store = await resolveStore(supabase);
const stats = { listed: 0, known: 0, repriced: 0, restocked: 0, sold_out: 0, retired: 0, archived: 0, new_items: 0 };
const run = opts["dry-run"]
  ? null
  : must(await supabase.from("supplier_sync_runs").insert({ store_id: store.id, supplier: SUPPLIER, kind: "sync" }).select("id").single(), "start run");

async function finish(status, error) {
  console.log(status, stats, error ?? "");
  if (run) await supabase.from("supplier_sync_runs").update({ status, stats, error: error ?? null, finished_at: new Date().toISOString() }).eq("id", run.id);
}

try {
  const listing = await fetchInStockListing();
  writeJson("listing.json", { fetchedAt: new Date().toISOString(), products: listing });
  const listed = new Map(listing.map((p) => [p.externalId, p]));
  stats.listed = listing.length;

  const sources = await allSources();
  stats.known = sources.length;
  const variants = new Map((await allVariants(sources.map((s) => s.variant_id))).map((v) => [v.id, v]));

  // ---- guards ----
  const believedInStock = sources.filter((s) => s.source_stock > 0).length;
  const priceChanges = sources.filter((s) => listed.has(Number(s.external_id)) && listed.get(Number(s.external_id)).priceKurus !== s.source_price).length;
  const problems = [];
  if (believedInStock > 20 && listing.length < believedInStock / 2) problems.push(`listing has ${listing.length} items, expected ~${believedInStock}`);
  if (believedInStock > 20 && priceChanges > believedInStock * 0.2) problems.push(`${priceChanges} price changes (> 20%)`);
  if (listing.some((p) => p.priceKurus <= 0)) problems.push("zero prices in listing");
  if (problems.length && !opts.force) {
    await finish("aborted", problems.join("; "));
    process.exit(1);
  }

  // ---- known variants ----
  const now = new Date().toISOString();
  const retiredProducts = new Set();
  await mapPool(sources, 4, async (s) => {
    const item = listed.get(Number(s.external_id));
    const variant = variants.get(s.variant_id);
    if (!variant) return;

    if (item) {
      const update = {};
      const price = markup(item.priceKurus, s.markup_bp);
      const compareAt = markup(item.listPriceKurus, s.markup_bp);
      if (variant.price !== price || variant.compare_at_price !== compareAt || variant.cost_price !== item.priceKurus) {
        Object.assign(update, { price, compare_at_price: compareAt, cost_price: item.priceKurus });
        stats.repriced++;
      }
      if (!variant.is_active) update.is_active = true;
      if (opts["dry-run"]) return logChange(s, variant, item, update);
      if (Object.keys(update).length) must(await supabase.from("product_variants").update(update).eq("id", variant.id), "update variant");
      if (await setStock(variant, item.stock)) stats.restocked++;
      must(
        await supabase
          .from("product_sources")
          .update({ source_price: item.priceKurus, source_list_price: item.listPriceKurus, source_stock: item.stock, last_seen_at: now, last_synced_at: now })
          .eq("variant_id", s.variant_id),
        "update source",
      );
      return;
    }

    // not listed: sold out, or gone for good
    if (s.source_stock > 0 || variant.stock_qty > 0) {
      const { status } = await fetchWithRetry(s.source_url, { redirect: "manual" });
      const gone = status === 404 || status === 410 || (status >= 300 && status < 400);
      if (opts["dry-run"]) return console.log(`  ${gone ? "retire" : "sold out"}: ${s.source_url}`);
      await setStock(variant, 0);
      stats.sold_out++;
      if (gone && variant.is_active) {
        must(await supabase.from("product_variants").update({ is_active: false }).eq("id", variant.id), "retire variant");
        stats.retired++;
        retiredProducts.add(s.product_id);
      }
      must(await supabase.from("product_sources").update({ source_stock: 0, last_synced_at: now }).eq("variant_id", s.variant_id), "update source");
    }
  });

  for (const productId of retiredProducts) {
    const { count } = await supabase.from("product_variants").select("id", { count: "exact", head: true }).eq("product_id", productId).eq("is_active", true);
    if (!count) {
      must(await supabase.from("products").update({ status: "archived" }).eq("id", productId), "archive product");
      stats.archived++;
    }
  }

  // ---- new in-stock items ----
  const knownIds = new Set(sources.map((s) => Number(s.external_id)));
  const newIds = listing.map((p) => p.externalId).filter((id) => !knownIds.has(id));
  stats.new_items = newIds.length;
  if (newIds.length && !opts["skip-new"] && !opts["dry-run"]) {
    const idsFile = join(DATA, "new-ids.json");
    writeJson("new-ids.json", newIds);
    writeJson("live-groups.json", await liveGroups(sources));
    for (const [script, extra] of [["crawl.mjs", []], ["group.mjs", []], ["translate.mjs", []], ["import.mjs", ["--status", "active"]]]) {
      execFileSync(process.execPath, [join(ROOT, "scripts", "zoo", script), "--ids", idsFile, ...extra], { stdio: "inherit", env: process.env });
    }
  }

  if (!opts["dry-run"]) await revalidateCatalog(store.id);
  await finish("succeeded");
} catch (e) {
  await finish("failed", e.message);
  throw e;
}

// ---------------------------------------------------------------------------------------------------

async function allSources() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const page = must(
      await supabase
        .from("product_sources")
        .select("variant_id, product_id, external_id, source_url, source_price, source_stock, markup_bp")
        .eq("store_id", store.id)
        .eq("supplier", SUPPLIER)
        .order("variant_id")
        .range(from, from + 999),
      "sources",
    );
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function allVariants(ids) {
  const rows = [];
  for (let i = 0; i < ids.length; i += 200) {
    rows.push(
      ...must(
        await supabase.from("product_variants").select("id, price, compare_at_price, cost_price, stock_qty, is_active").in("id", ids.slice(i, i + 200)),
        "variants",
      ),
    );
  }
  return rows;
}

/** {externalId: {product, name}} for the grouping hint, from what is live in the store. */
async function liveGroups(sources) {
  const productIds = [...new Set(sources.map((s) => s.product_id))];
  const names = new Map();
  for (let i = 0; i < productIds.length; i += 200) {
    const rows = must(
      await supabase.from("product_translations").select("product_id, name").eq("locale", "tr").in("product_id", productIds.slice(i, i + 200)),
      "names",
    );
    for (const r of rows) names.set(r.product_id, r.name);
  }
  return Object.fromEntries(sources.map((s) => [Number(s.external_id), { product: s.product_id, name: names.get(s.product_id) ?? "" }]));
}

async function setStock(variant, target) {
  const delta = target - variant.stock_qty;
  if (delta === 0) return false;
  must(
    await supabase.from("stock_movements").insert({ store_id: store.id, variant_id: variant.id, delta, reason: "correction", note: "zoo.com.tr stock sync" }),
    "stock movement",
  );
  return true;
}

function logChange(s, variant, item, update) {
  const parts = [];
  if (update.price !== undefined) parts.push(`price ${variant.price} → ${update.price}`);
  if (variant.stock_qty !== item.stock) parts.push(`stock ${variant.stock_qty} → ${item.stock}`);
  if (update.is_active) parts.push("reactivate");
  if (parts.length) console.log(`  ${s.external_id}: ${parts.join(", ")}`);
}
