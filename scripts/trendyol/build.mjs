// Stage 2 (Trendyol): pick the products to sell from the crawl cache and write them in the shape the
// zoo stages read, so scripts/zoo/translate.mjs and import.mjs run on them unchanged.
//
//   SUPPLIER=trendyol node --env-file=.env.local scripts/trendyol/build.mjs [--target 1200] [--dry-run]
//
// Picks: in stock, has photos and a price, maps onto one of the store's existing categories (see
// categories.mjs; unmapped Trendyol categories are reported, never created), is not already sold in
// the store (same brand and near-same name as a product there), and is the best of its Trendyol
// product group and of identical listings by other sellers. Categories are then filled round-robin by
// score (reviews × rating, plus favourites), so every category grows instead of just the biggest.
// Products imported from Trendyol before are always kept.
//
// Writes .data/trendyol/listing.json, products/<itemNumber>.json and groups/<bucket>.json. Trendyol
// sells sizes of one product as variants of one page; each variant becomes one item (externalId =
// Trendyol's itemNumber), grouped under the product with a weight/volume/size option.
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { looseKey, normalizeValue, sha, slugify } from "../zoo/lib/catalog.mjs";
import { SUPPLIER, db, must, resolveStore } from "../zoo/lib/db.mjs";
import { DATA, args, readJson, writeJson } from "../zoo/lib/store.mjs";
import { storeCategoryFor } from "./categories.mjs";

if (SUPPLIER !== "trendyol") throw new Error("run with SUPPLIER=trendyol");
const opts = args();
const target = Number(opts.target ?? 1200);
const NOMINAL_STOCK = 20; // Trendyol shows only in / out of stock; the daily sync re-checks it
const MAX_PHOTOS = 4; // keeps storage in check: ~1,200 products × 4 photos ≈ 450 MB

// ---- the store: category chains, and what it already sells ----
const supabase = db();
const store = await resolveStore(supabase);
const categories = must(
  await supabase.from("categories").select("id, slug, parent_id, category_translations(locale, name)").eq("store_id", store.id),
  "categories",
);
const byId = new Map(categories.map((c) => [c.id, c]));
const chainOf = new Map();
for (const c of categories) {
  const chain = [];
  for (let at = c; at; at = byId.get(at.parent_id)) chain.unshift({ slug: at.slug, name: at.category_translations.find((t) => t.locale === "tr")?.name ?? at.slug });
  chainOf.set(c.slug, chain);
}
const existing = must(
  await supabase.from("products").select("id, tags, brands(name), product_translations(locale, name)").eq("store_id", store.id).limit(10000),
  "products",
);
const alreadySold = existing
  .filter((p) => !p.tags?.includes(SUPPLIER))
  .map((p) => ({ brand: brandKey(p.brands?.name), words: words(p.product_translations.find((t) => t.locale === "tr")?.name ?? "") }));
const keepIds = new Set(
  must(await supabase.from("product_sources").select("external_id").eq("store_id", store.id).eq("supplier", SUPPLIER), "sources").map((s) => Number(s.external_id)),
);

// ---- candidates ----
const pages = readdirSync(join(DATA, "pages")).map((f) => readJson(`pages/${f}`));
const reasons = {};
const unmapped = {};
const skip = (why) => ((reasons[why] = (reasons[why] ?? 0) + 1), false);
for (const p of pages) p.name = dropRepeatedBrand(p.name, p.brand);
const candidates = pages.filter((p) => {
  if (!p.inStock || !p.variants.some((v) => v.inStock)) return skip("out of stock");
  if (!p.images.length) return skip("no photos");
  if (!p.offerKurus) return skip("no price");
  const slug = storeCategoryFor(p);
  if (!slug || !chainOf.has(slug)) {
    const leaf = p.categories.map((c) => c.name).join(" > ");
    unmapped[leaf] = (unmapped[leaf] ?? 0) + 1;
    return skip("category not in store");
  }
  p.storeCategory = slug;
  p.score = p.rating.count * (p.rating.average / 5) + p.favorites / 20;
  p.words = words(p.name);
  p.brandKey = brandKey(p.brand);
  p.kept = p.variants.some((v) => keepIds.has(v.itemNumber));
  if (!p.kept && alreadySold.some((s) => s.brand === p.brandKey && similar(s.words, p.words))) return skip("already in store");
  return true;
});

// best of each Trendyol product group, then best of identical listings by different sellers
const best = new Map();
for (const p of candidates.sort((a, b) => b.kept - a.kept || b.score - a.score)) {
  const key = p.groupId ? `g${p.groupId}` : `c${p.contentId}`;
  if (best.has(key)) skip("same Trendyol product group");
  else best.set(key, p);
}
const unique = [];
for (const p of best.values()) {
  if (unique.some((u) => u.brandKey === p.brandKey && similar(u.words, p.words))) skip("same product, other seller");
  else unique.push(p);
}

// round-robin over the store's categories, best first, until the target
const perCategory = new Map();
for (const p of unique) perCategory.set(p.storeCategory, [...(perCategory.get(p.storeCategory) ?? []), p]);
// each category takes its best products up to its quota; quotas shrink together to fit the target
const picked = unique.filter((p) => p.kept);
const fresh = new Map([...perCategory].map(([slug, list]) => [slug, list.filter((x) => !x.kept)]));
const wanted = new Map([...fresh].map(([slug, list]) => [slug, Math.min(quotaFor(slug), list.length)]));
const total = [...wanted.values()].reduce((a, b) => a + b, 0);
const scale = Math.min(1, (target - picked.length) / total);
for (const [slug, list] of fresh) picked.push(...list.slice(0, Math.ceil(wanted.get(slug) * scale)));

// ---- report ----
const count = new Map();
for (const p of picked) count.set(p.storeCategory, (count.get(p.storeCategory) ?? 0) + 1);
console.log(`${pages.length} crawled → ${candidates.length} usable → ${unique.length} unique → ${picked.length} picked`);
console.log("skipped:", reasons);
console.log("picked per store category:");
for (const [slug, n] of [...count].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${slug}  (of ${perCategory.get(slug).length})`);
const unmappedList = Object.entries(unmapped).sort((a, b) => b[1] - a[1]);
if (unmappedList.length) {
  console.log("Trendyol categories with no store category (add to categories.mjs if wanted):");
  for (const [leaf, n] of unmappedList) console.log(`  ${String(n).padStart(4)}  ${leaf}`);
}
if (opts["dry-run"]) process.exit(0);

// ---- write the zoo-shaped files ----
for (const dir of ["products", "groups"]) rmSync(join(DATA, dir), { recursive: true, force: true });
const listing = [];
for (const p of picked) {
  const variants = p.variants.filter((v) => v.inStock && v.itemNumber);
  const axis = variants.length > 1 ? axisFor(variants.map((v) => v.value)) : null;
  const members = axis ? variants : [variants.find((v) => v.priceKurus === p.offerKurus) ?? variants[0]];
  const description = describe(p);
  const chain = chainOf.get(p.storeCategory);
  const group = { baseName: p.name, axes: axis ? [axis] : [], members: [] };
  for (const v of members) {
    const priceKurus = v.priceKurus ?? p.offerKurus;
    const listPriceKurus = p.listKurus && p.listKurus > priceKurus ? Math.round((p.listKurus * priceKurus) / p.offerKurus) : null;
    const name = axis ? `${p.name} ${v.value}` : p.name;
    const item = {
      externalId: v.itemNumber,
      url: p.url,
      slug: slugify(axis ? `${p.name}-${v.value}` : p.name),
      name,
      description,
      brand: p.brand,
      categories: chain,
      sku: String(v.itemNumber),
      barcode: /^\d{8,14}$/.test(v.barcode ?? "") ? v.barcode : null,
      stock: NOMINAL_STOCK,
      active: true,
      priceKurus,
      listPriceKurus,
      vatRate: 0,
      images: p.images.slice(0, MAX_PHOTOS),
      contentHash: sha(JSON.stringify([name, description, p.brand])),
      imagesHash: sha(p.images.slice(0, MAX_PHOTOS).join("\n")),
    };
    writeJson(`products/${item.externalId}.json`, item);
    listing.push({ externalId: item.externalId, url: item.url, name, brand: p.brand, category: p.storeCategory, priceKurus, listPriceKurus, stock: NOMINAL_STOCK, sku: item.sku, barcode: item.barcode });
    group.members.push({ externalId: v.itemNumber, values: axis ? { [axis]: normalizeValue(v.value) } : {} });
  }
  const bucket = `trendyol|${p.contentId}`;
  writeJson(`groups/${sha(bucket)}.json`, { bucket, membership: sha(group.members.map((m) => m.externalId).join(",")), groupedAt: new Date().toISOString(), groups: [group] });
}
writeJson("listing.json", { fetchedAt: new Date().toISOString(), products: listing });
console.log(`wrote ${picked.length} products (${listing.length} items) to .data/trendyol`);

// ---------------------------------------------------------------------------------------------------

/** How many products a store category may take: food and litter sell most, niche items least. */
function quotaFor(slug) {
  if (/mamasi|kumu$|yemi|yemleri/.test(slug)) return 60;
  if (/tirnak|otomatik|motoru|filtre|halka|olcek|cam-yuzeyi|biberon|seramik|kurek|surungen|kafesi/.test(slug)) return 15;
  return 30;
}

/** "Gourmet Gourmet Gold ..." → "Gourmet Gold ...": Trendyol prefixes the brand even when the title has it. */
function dropRepeatedBrand(name, brand) {
  if (!brand) return name;
  const b = brand.toLocaleLowerCase("tr");
  const lower = name.toLocaleLowerCase("tr");
  return lower.startsWith(`${b} ${b}`) ? name.slice(brand.length + 1) : name;
}

function brandKey(name) {
  return looseKey(name ?? "").replace(/[^a-z0-9çğıöşü]/g, "");
}

/** Significant words of a product name, Turkish-folded, units glued to their numbers. */
function words(name) {
  const text = normalizeValue(String(name).toLocaleLowerCase("tr")).replace(/(\d) (kg|gr|g|lt|l|ml|cm|mm)\b/g, "$1$2");
  return new Set(text.split(/[^a-z0-9çğıöşü.]+/).filter((w) => w.length > 1));
}

/** Same product when ≥ 80% of the words match (Jaccard). */
function similar(a, b) {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared) >= 0.8;
}

/** Which option axis a list of variant values is: weight, volume, pack or size. Values must be distinct. */
function axisFor(values) {
  if (new Set(values.map(looseKey)).size !== values.length || values.some((v) => !v)) return null;
  const all = (re) => values.every((v) => re.test(v));
  if (all(/\d\s*(kg|gr|g)\b/i)) return "weight";
  if (all(/\d\s*(ml|lt|l)\b/i)) return "volume";
  if (all(/\d+\s*('?l[iıuü]|adet|paket)/i)) return "pack";
  return "size";
}

/** The page's free-text feature paragraphs first, then the spec list as "Key: Value" lines. */
function describe(p) {
  const long = p.attributes.filter((a) => a.value.length > 80);
  const specs = p.attributes.filter((a) => a.value.length <= 80 && !/^(menşei|alerjen uyarıları)$/i.test(a.key));
  const origin = p.attributes.find((a) => /^menşei$/i.test(a.key));
  return [
    ...long.map((a) => a.value.trim()),
    specs.length ? ["Ürün Özellikleri", ...specs.map((a) => `${a.key}: ${a.value}`)].join("\n") : "",
    origin ? `Menşei: ${origin.value}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
