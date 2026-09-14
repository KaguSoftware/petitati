// Ticimax listing API: the catalog-wide product list the storefront's category pages use. It returns
// only products that are currently purchasable (in stock), 500 per page, with price and stock, which
// makes it the cheap source for the daily price/stock sync (2 requests instead of ~1,000 pages).
import { fetchWithRetry } from "./http.mjs";
import { ZOO_ORIGIN, toKurus } from "./parse.mjs";

function listUrl(page, size) {
  const q = new URLSearchParams({
    c: "trtry0000",
    FilterJson: "{}",
    PagingJson: JSON.stringify({ PageItemCount: size, PageNumber: page, OrderBy: "KAYITTARIHI", OrderDirection: "DESC" }),
    CreateFilter: "false",
    TransitionOrder: "0",
    PageType: "1",
  });
  return `${ZOO_ORIGIN}/api/product/GetProductList?${q}`;
}

/** Every in-stock product as {externalId, url, name, brand, category, priceKurus, listPriceKurus, stock, sku, barcode}. */
export async function fetchInStockListing({ pageSize = 500 } = {}) {
  const out = new Map();
  let total = null;
  for (let page = 1; page < 100; page++) {
    const { body } = await fetchWithRetry(listUrl(page, pageSize), { as: "json" });
    if (!body || body.isError) throw new Error(`listing page ${page} failed: ${body?.errorMessage ?? "no body"}`);
    total ??= body.totalProductCount;
    if (!body.products?.length) break;
    for (const p of body.products) {
      const priceKurus = toKurus(Number(p.productCartPrice) + Number(p.productCartPriceKDV));
      const list = toKurus(Number(p.productSellPrice) + Number(p.productSellPriceKDV));
      out.set(Number(p.productId), {
        externalId: Number(p.productId),
        url: ZOO_ORIGIN + p.url,
        name: String(p.name).trim(),
        brand: String(p.brand ?? "").trim() || null,
        category: p.category,
        priceKurus,
        listPriceKurus: list > priceKurus ? list : null,
        stock: Math.max(0, Math.floor(Number(p.totalStockAmount ?? 0))),
        sku: String(p.stockCode ?? "").trim(),
        barcode: String(p.barcode ?? "").trim() || null,
      });
    }
  }
  if (total != null && out.size < total) throw new Error(`listing incomplete: ${out.size} of ${total}`);
  return [...out.values()];
}
