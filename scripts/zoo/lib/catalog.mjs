// Shared shaping of cached zoo data: buckets, option axes, value normalization, slugs.
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DATA, readJson } from "./store.mjs";

export const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 32);

/** Option axes a zoo item can vary on. Labels are fixed, no translation call needed. */
export const AXES = {
  weight: { tr: "Ağırlık", en: "Weight", fa: "وزن" },
  volume: { tr: "Hacim", en: "Volume", fa: "حجم" },
  size: { tr: "Boyut", en: "Size", fa: "سایز" },
  color: { tr: "Renk", en: "Color", fa: "رنگ" },
  pack: { tr: "Adet", en: "Pack", fa: "تعداد" },
};
export const AXIS_KEYS = Object.keys(AXES);

/** "1,5 kg" → "1.5 kg", "5kg" → "5 kg", "3 Kg" → "3 kg". Colours and words keep their Turkish form. */
export function normalizeValue(v) {
  return String(v)
    .trim()
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/(\d)\s*(kg|gr|g|lt|l|ml|cm|mm)\b/gi, (_, d, u) => `${d} ${u.toLowerCase()}`)
    .replace(/\s+/g, " ");
}

/** Loose comparison key: case-folded (Turkish), no spaces, decimal comma → dot. */
export const looseKey = (s) => String(s).toLocaleLowerCase("tr").replace(/,/g, ".").replace(/\s+/g, "");

export function slugify(s) {
  const map = { ç: "c", ğ: "g", ı: "i", i̇: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u", "&": "" };
  return String(s)
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû&]|i̇/g, (c) => map[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * The working set: products in the latest in-stock listing that have a cached detail page, with the
 * listing's (fresher) price and stock laid over the detail data.
 */
export function loadCatalog({ category } = {}) {
  const listing = readJson("listing.json");
  if (!listing) throw new Error("run crawl.mjs first");
  const cached = new Set(readdirSync(join(DATA, "products")).map((f) => Number(f.replace(".json", ""))));
  return listing.products
    .filter((l) => cached.has(l.externalId) && (!category || l.category === category))
    .map((l) => {
      const d = readJson(`products/${l.externalId}.json`);
      return { ...d, priceKurus: l.priceKurus, listPriceKurus: l.listPriceKurus, stock: l.stock, sku: l.sku || d.sku, barcode: l.barcode ?? d.barcode };
    });
}

/** Siblings can only be the same brand in the same leaf category. */
export function bucketKey(p) {
  const leaf = p.categories.at(-1)?.slug ?? "uncategorized";
  return `${(p.brand ?? "no-brand").toLocaleLowerCase("tr").trim()}|${leaf}`;
}

export function bucketize(products) {
  const buckets = new Map();
  for (const p of products) buckets.set(bucketKey(p), [...(buckets.get(bucketKey(p)) ?? []), p]);
  return buckets;
}

/** Every grouping file, flattened: [{bucket, baseName, axes, members}]. */
export function loadGroups() {
  let files = [];
  try {
    files = readdirSync(join(DATA, "groups"));
  } catch {
    return [];
  }
  return files.flatMap((f) => {
    const g = readJson(`groups/${f}`);
    return g.groups.map((group) => ({ ...group, bucket: g.bucket }));
  });
}

/** The text a group is translated from, and the cache key for that translation. */
export function groupText(group, byId) {
  const members = group.members.map((m) => byId.get(m.externalId)).filter(Boolean);
  const description = members.map((p) => p.description).sort((a, b) => b.length - a.length)[0] ?? "";
  const values = [...new Set(group.members.flatMap((m) => Object.values(m.values)))].sort();
  return { name: group.baseName, description, values, key: sha(JSON.stringify([group.baseName, description, values])) };
}
