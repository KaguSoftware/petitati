// Stage 1: snapshot zoo.com.tr's in-stock catalog and cache each product's detail page data.
//
//   node scripts/zoo/crawl.mjs [--category "Kuru Kedi Maması"] [--ids ids.json] [--limit N] [--refresh]
//
// --ids: a JSON array of external ids (e.g. newly stocked items); their listing siblings of
// the same brand and category are fetched too, because grouping needs the whole bucket.
//
// Writes .data/zoo/listing.json (all in-stock products) and .data/zoo/products/<externalId>.json.
// Detail pages already cached are skipped unless --refresh.
import { readFileSync } from "node:fs";
import { fetchInStockListing } from "./lib/listing.mjs";
import { fetchWithRetry, mapPool } from "./lib/http.mjs";
import { parseProductPage } from "./lib/parse.mjs";
import { args, hasJson, writeJson } from "./lib/store.mjs";

const opts = args();
const listing = await fetchInStockListing();
writeJson("listing.json", { fetchedAt: new Date().toISOString(), products: listing });
console.log(`listing: ${listing.length} in-stock products`);

let targets = listing;
if (opts.category) targets = targets.filter((p) => p.category === opts.category);
if (opts.ids) {
  const ids = new Set(JSON.parse(readFileSync(opts.ids, "utf8")));
  const sibling = (p) => `${(p.brand ?? "").toLocaleLowerCase("tr")}|${p.category}`;
  const buckets = new Set(listing.filter((p) => ids.has(p.externalId)).map(sibling));
  targets = targets.filter((p) => buckets.has(sibling(p)));
}
if (opts.limit) targets = targets.slice(0, Number(opts.limit));
if (!opts.refresh) targets = targets.filter((p) => !hasJson(`products/${p.externalId}.json`));
console.log(`fetching ${targets.length} detail pages`);

let done = 0;
const failures = [];
await mapPool(
  targets,
  3,
  async (item) => {
    try {
      const { status, body } = await fetchWithRetry(item.url);
      if (!body) throw new Error(`HTTP ${status}`);
      const product = parseProductPage(body, item.url);
      writeJson(`products/${product.externalId}.json`, { ...product, fetchedAt: new Date().toISOString() });
    } catch (e) {
      failures.push({ url: item.url, error: e.message });
    }
    if (++done % 25 === 0) console.log(`  ${done}/${targets.length}`);
  },
  { delayMs: 250 },
);
if (failures.length) {
  writeJson("crawl-failures.json", failures);
  console.log(`${failures.length} failed (see .data/zoo/crawl-failures.json)`);
}
console.log("done");
