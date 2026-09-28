// Trendyol pages: a slow, polite fetch and the parsers for category listings and product pages.
//
// Trendyol rate-limits bursts (HTTP 429), so everything goes through one queue with a pause between
// requests and a long back-off when told to slow down. Only plain category pages (?pi=N, allowed by
// their robots.txt) and product pages are read; search and the internal APIs are not touched.
// Requests go through curl with an honest bot user agent: Trendyol answers Node's fetch with 403.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

export const TY_ORIGIN = "https://www.trendyol.com";
const USER_AGENT = "Mozilla/5.0 (compatible; PetitatiCatalogSync/1.0; +https://petitati.vercel.app)";
const run = promisify(execFile);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 32);

let last = 0;
/** GET a page as text, one request at a time, at least `gapMs` apart. Returns null on 404. */
export async function politeGet(url, { gapMs = 2500 } = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = last + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const { stdout } = await run(
        "curl",
        ["-sL", "--max-time", "60", "-A", USER_AGENT, "-H", "Accept-Language: tr-TR,tr;q=0.9", "-w", "\n%{http_code} %{url_effective}", url],
        { maxBuffer: 64 * 1024 * 1024 },
      );
      const cut = stdout.lastIndexOf("\n");
      const [status, finalUrl] = stdout.slice(cut + 1).split(" ");
      if (status === "404" || status === "410") return null;
      if (status !== "200") throw new Error(`HTTP ${status}`);
      return { url: finalUrl, html: stdout.slice(0, cut) };
    } catch (e) {
      const backoff = 30_000 * 2 ** attempt; // 30s, 60s, 2m, 4m, 8m
      console.log(`  … ${e.message} on ${url}, waiting ${backoff / 1000}s`);
      await sleep(backoff);
    }
  }
  throw new Error(`gave up on ${url}`);
}

/** Product paths (/brand/slug-p-123) on a category listing page, in page order, without query strings. */
export function listingProductPaths(html) {
  const out = [];
  for (const m of html.matchAll(/href="(\/[a-z0-9-]+\/[a-z0-9-]+-p-(\d+))[?"]/g)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** The value assigned to window["<name>"] in an inline script. */
function envoy(html, name) {
  const marker = `window["${name}"]=`;
  const at = html.indexOf(marker);
  if (at < 0) return null;
  let text = html.slice(at + marker.length, html.indexOf("</script>", at)).trim();
  if (text.endsWith(";")) text = text.slice(0, -1);
  return JSON.parse(text);
}

function jsonLd(html, type) {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      if (j["@type"] === type) return j;
    } catch {}
  }
  return null;
}

const toKurus = (major) => Math.round(Number(major) * 100);

/**
 * A product page → the raw facts build.mjs needs. Throws when the page does not look like a Trendyol
 * product page, so a redesign fails loudly instead of caching empty products.
 */
export function parseProductPage(html, url) {
  const shared = envoy(html, "__envoy__SHARED_PROPS");
  const p = shared?.product;
  if (!p?.id) throw new Error("__envoy__SHARED_PROPS.product not found");
  const ld = jsonLd(html, "Product");
  const page = jsonLd(html, "WebPage");

  // Some pages carry no Product JSON-LD; SHARED_PROPS then has the photos and the winning offer.
  const images = [...new Set([...(ld?.image?.contentUrl ?? []), ...(p.images ?? [])].filter((u) => /^https:\/\//.test(u)))];
  const brand = (p.brand?.name ?? ld?.brand?.name ?? "").trim() || null;
  // SHARED_PROPS drops the brand from the name; JSON-LD keeps it ("LaMito Adult Cat 15 Kg ...").
  const name = String(ld?.name ?? (brand ? `${brand} ${p.name}` : p.name)).trim();
  const listing = p.merchantListing ?? {};
  const winner = listing.winnerVariant ?? {};

  const variants = (p.variants ?? []).map((v) => ({
    itemNumber: Number(v.itemNumber),
    value: String(v.beautifiedValue || v.value || "").trim(),
    inStock: Boolean(v.inStock),
    barcode: String(v.barcode ?? "").trim() || null,
    priceKurus: v.price?.value != null ? toKurus(v.price.value) : null,
  }));
  const offerMajor = ld?.offers?.price ?? winner.price?.discountedPrice?.value;
  const offerKurus = offerMajor != null ? toKurus(offerMajor) : null;
  // Crossed-out price: the highest of the pre-discount prices, only when it is above what is paid.
  const before = Math.max(...[winner.price?.sellingPrice?.value, winner.price?.originalPrice?.value].map((v) => toKurus(v ?? 0)));
  const listKurus = offerKurus && before > offerKurus ? before : null;

  return {
    contentId: Number(p.id),
    url: `${TY_ORIGIN}${new URL(url).pathname}`,
    name,
    brand,
    groupId: p.productGroupId ?? null,
    // root first: Süpermarket > Pet Shop > Kedi Ürünleri > Kedi Maması
    categories: [...(p.webCategoryTree ?? [])].sort((a, b) => a.level - b.level).map((c) => ({ id: c.id, name: c.name })),
    categoryUrls: (page?.breadcrumb?.itemListElement ?? []).map((i) => i.item?.["@id"]).filter((u) => /-x-c\d+$/.test(u ?? "")),
    attributes: (p.attributes ?? []).map((a) => ({ key: a.key?.name, value: a.value?.name })).filter((a) => a.key && a.value),
    images,
    inStock: Boolean(p.inStock),
    variants,
    offerKurus,
    listKurus,
    rating: { average: Number(p.ratingScore?.averageRating ?? 0), count: Number(p.ratingScore?.totalCount ?? p.ratingScore?.totalRatingCount ?? 0) },
    favorites: Number(p.favoriteCount ?? 0),
    merchant: listing.merchant?.name ?? null,
    imagesHash: sha(images.join("\n")),
  };
}
