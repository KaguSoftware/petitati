// zoo.com.tr product page → normalized supplier product. Throws on anything that does not look like
// a Ticimax product page, so a redesign fails loudly instead of importing zero prices.
import { createHash } from "node:crypto";
import { z } from "zod";
import { decodeEntities, extractAssignedJson, extractBreadcrumb, extractImages, extractJsonLdProduct } from "./extract.mjs";

export const ZOO_ORIGIN = "https://www.zoo.com.tr";

/** Major-unit float (4558.1399999) → integer minor units (455814). */
export const toKurus = (major) => Math.round(Number(major) * 100);

const productSchema = z.object({
  externalId: z.number().int().positive(),
  url: z.string().url(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  brand: z.string().nullable(),
  categories: z.array(z.object({ slug: z.string().min(1), name: z.string().min(1) })),
  sku: z.string().min(1),
  barcode: z.string().nullable(),
  stock: z.number().int().min(0),
  active: z.boolean(),
  priceKurus: z.number().int().positive(),
  listPriceKurus: z.number().int().positive().nullable(),
  vatRate: z.number(),
  images: z.array(z.string().url()),
  contentHash: z.string(),
  imagesHash: z.string(),
});

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 32);

export function parseProductPage(html, url) {
  const model = extractAssignedJson(html, "productDetailModel = ");
  if (!model?.product) throw new Error("productDetailModel not found");
  const p = model.product;
  const ld = extractJsonLdProduct(html);

  const slug = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
  const name = decodeEntities(model.productName ?? p.urunAdi ?? "").trim();
  const description = normalizeText(ld?.description ?? "");
  const brand = (model.brandName || ld?.brand?.name || "").trim() || null;

  // What a customer pays today, VAT included (the discounted price when a discount runs).
  const priceKurus = toKurus(model.productPriceKDVIncluded);
  // Crossed-out price: the pre-discount sale price incl. VAT, only when it is actually higher.
  const listMajor = Number(p.satisFiyati ?? 0) + Number(p.satisKDV ?? 0);
  const listPriceKurus = toKurus(listMajor) > priceKurus ? toKurus(listMajor) : null;

  const images = [
    ...(model.productImages ?? []).map((i) => i.bigImagePath).filter(Boolean),
    ...extractImages("", p.spotResimBuyukYolu),
  ].filter((u, i, all) => all.indexOf(u) === i);

  const stock = Math.max(0, Math.floor(Number(model.totalStockAmount ?? p.stokAdedi ?? 0)));

  const product = {
    externalId: Number(model.productId),
    url,
    slug,
    name,
    description,
    brand,
    categories: extractBreadcrumb(html),
    sku: String(p.stokKodu ?? model.stockCode ?? "").trim(),
    barcode: String(p.barkod ?? "").trim() || null,
    stock,
    active: Boolean(model.productActive ?? p.aktif),
    priceKurus,
    listPriceKurus,
    vatRate: Number(p.kdvOrani ?? 0),
    images,
    contentHash: sha(JSON.stringify([name, description, brand])),
    imagesHash: sha(images.join("\n")),
  };
  return productSchema.parse(product);
}

/** Collapse Ticimax's CRLF soup into tidy paragraphs. */
function normalizeText(s) {
  return decodeEntities(s)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
