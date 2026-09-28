// Stage 1 (Trendyol): walk the Pet Shop category pages and cache every product page found on them.
//
//   SUPPLIER=trendyol node scripts/trendyol/crawl.mjs [--pages 4] [--max 3000] [--seed <category url>]
//
// Starts from the seed categories below; every category a product's breadcrumb names under Pet Shop
// is queued too, so the leaf categories are found without a sitemap. Each category gets --pages
// listing pages (~36 products each, Trendyol's default ranking). Product pages already cached in
// .data/trendyol/pages/<contentId>.json are skipped, so a stopped crawl resumes where it was.
// Slow on purpose (one request every ~2.5s): Trendyol answers bursts with 429.
import { args, hasJson, readJson, writeJson } from "../zoo/lib/store.mjs";
import { TY_ORIGIN, listingProductPaths, parseProductPage, politeGet } from "./lib/page.mjs";

if (process.env.SUPPLIER !== "trendyol") throw new Error("run with SUPPLIER=trendyol so the cache lands in .data/trendyol");

const SEEDS = [
  "/pet-shop-x-c1142",
  "/kedi-urunleri-x-c103569",
  "/kedi-mamasi-x-c103588",
  "/kedi-kumu-x-c103584",
  "/kopek-mamasi-x-c103620",
  "/kopek-tasmasi-x-c103631",
  "/akvaryum-x-c103586",
];
const PET_SHOP_ID = 1142;

const opts = args();
const pages = Number(opts.pages ?? 4);
const max = Number(opts.max ?? 3000);
const state = readJson("crawl/state.json", { categories: {}, products: {} });
for (const seed of [opts.seed, ...SEEDS].filter(Boolean)) {
  const path = seed.replace(TY_ORIGIN, "");
  state.categories[path] ??= { pagesDone: 0 };
}
const save = () => writeJson("crawl/state.json", state);

let fetched = 0;
let failed = 0;

// products seen on listing pages earlier but not cached (a stopped run, or a cache entry removed to
// re-parse it) are fetched first, since their listing pages are not read again
for (const [id, entry] of Object.entries(state.products)) {
  if (fetched >= max) break;
  if (!hasJson(`pages/${id}.json`) && !entry.failed) await fetchProduct(Number(id), entry.path);
}
save();

for (;;) {
  const next = Object.entries(state.categories).find(([, c]) => c.pagesDone < pages && !c.exhausted);
  if (!next || fetched >= max) break;
  const [path, cat] = next;
  const page = cat.pagesDone + 1;
  const res = await politeGet(`${TY_ORIGIN}${path}${page > 1 ? `?pi=${page}` : ""}`);
  const found = res ? listingProductPaths(res.html) : [];
  cat.pagesDone = page;
  if (!found.length) cat.exhausted = true;
  console.log(`${path} p${page}: ${found.length} products`);

  for (const productPath of found) {
    const id = Number(productPath.match(/-p-(\d+)$/)[1]);
    state.products[id] ??= { path: productPath, from: path };
    if (hasJson(`pages/${id}.json`) || state.products[id].failed || fetched >= max) continue;
    await fetchProduct(id, productPath);
  }
  save();
}
save();
const cats = Object.keys(state.categories).length;
console.log(`done: ${fetched} product pages fetched this run, ${failed} failed, ${cats} categories known`);

async function fetchProduct(id, productPath) {
  try {
    const got = await politeGet(TY_ORIGIN + productPath);
    if (!got) throw new Error("404");
    const product = parseProductPage(got.html, got.url);
    writeJson(`pages/${product.contentId}.json`, { ...product, crawledAt: new Date().toISOString() });
    fetched++;
    // queue every category under Pet Shop that this product's breadcrumb names
    const underPetShop = product.categories.findIndex((c) => c.id === PET_SHOP_ID);
    if (underPetShop >= 0) {
      for (const url of product.categoryUrls.slice(underPetShop + 1)) {
        const catPath = url.replace(TY_ORIGIN, "");
        if (!state.categories[catPath]) {
          state.categories[catPath] = { pagesDone: 0 };
          console.log(`  + category ${catPath}`);
        }
      }
    }
  } catch (e) {
    failed++;
    state.products[id].failed = e.message;
    console.log(`  ! ${productPath}: ${e.message}`);
  }
  if ((fetched + failed) % 25 === 0) save();
}
