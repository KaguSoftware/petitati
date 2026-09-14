// Stage 4: make the store's catalog match the grouped, translated zoo data.
//
//   node scripts/zoo/import.mjs [--category "Kuru Kedi Maması"] [--ids ids.json] [--status draft|active] [--translated-only] [--dry-run]
//
// A reconciler, not an inserter: every zoo item is a variant keyed by product_sources(external_id), so a
// re-run updates in place, a regrouping moves variants between products, and products left without
// variants are removed. New products get --status (default draft); existing ones keep theirs.
// Prices are the supplier's price + markup; the supplier price is kept as cost_price.
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { AXES, groupText, loadCatalog, loadGroups, sha, slugify } from "./lib/catalog.mjs";
import { SUPPLIER, db, markup, must, resolveStore, revalidateCatalog } from "./lib/db.mjs";
import { fetchWithRetry } from "./lib/http.mjs";
import { args, readJson } from "./lib/store.mjs";

const opts = args();
const newStatus = opts.status === "active" ? "active" : "draft";
const catalog = loadCatalog({ category: opts.category });
const onlyIds = new Set(opts.ids ? JSON.parse(readFileSync(opts.ids, "utf8")) : []);
const byId = new Map(catalog.map((p) => [p.externalId, p]));
const categoryNames = readJson("categories.json", {});
const groups = loadGroups()
  .map((g) => ({ ...g, members: g.members.filter((m) => byId.has(m.externalId)) }))
  .filter((g) => g.members.length)
  .filter((g) => !opts.ids || g.members.some((m) => onlyIds.has(m.externalId)))
  // --translated-only: hold back products whose en/fa text is not ready, so nothing goes live in Turkish only
  .filter((g) => !opts["translated-only"] || translationFor(g));

if (opts["dry-run"]) {
  for (const g of groups) {
    const t = translationFor(g);
    console.log(`\n${g.baseName}${t ? `  |  ${t.en.name}  |  ${t.fa.name}` : "  (not translated)"}`);
    for (const m of g.members) {
      const p = byId.get(m.externalId);
      const label = Object.values(m.values).join(" / ") || "(single)";
      console.log(`   ${label.padEnd(16)} ₺${(p.priceKurus / 100).toFixed(2)} → ₺${(markup(p.priceKurus) / 100).toFixed(2)}  stock ${p.stock}`);
    }
  }
  const multi = groups.filter((g) => g.members.length > 1);
  console.log(`\n${catalog.length} zoo items → ${groups.length} products (${multi.length} with options, holding ${multi.reduce((n, g) => n + g.members.length, 0)} items)`);
  process.exit(0);
}

const supabase = db();
const store = await resolveStore(supabase);
const run = must(
  await supabase.from("supplier_sync_runs").insert({ store_id: store.id, supplier: SUPPLIER, kind: "import" }).select("id").single(),
  "start run",
);
const stats = { products_created: 0, products_updated: 0, variants_created: 0, variants_updated: 0, variants_moved: 0, images_uploaded: 0, products_removed: 0, untranslated: 0, failed: 0 };

try {
  const categoryIds = await ensureCategories();
  const brandIds = await ensureBrands();
  let n = 0;
  for (const group of groups) {
    try {
      await importGroup(group, categoryIds, brandIds);
    } catch (e) {
      stats.failed++;
      console.log(`  ! ${group.baseName}: ${e.message}`);
    }
    if (++n % 20 === 0) console.log(`  ${n}/${groups.length}`, stats);
  }
  await removeEmptyProducts();
  const status = stats.failed ? "failed" : "succeeded";
  must(await supabase.from("supplier_sync_runs").update({ status, stats, finished_at: new Date().toISOString() }).eq("id", run.id), "finish run");
  console.log(status, stats);
  await revalidateCatalog(store.id);
} catch (e) {
  await supabase.from("supplier_sync_runs").update({ status: "failed", stats, error: e.message, finished_at: new Date().toISOString() }).eq("id", run.id);
  throw e;
}

// ---------------------------------------------------------------------------------------------------

function translationFor(group) {
  return readJson(`translations/${groupText(group, byId).key}.json`);
}

async function ensureCategories() {
  const ids = new Map();
  const existing = must(await supabase.from("categories").select("id, slug, parent_id, sort_order").eq("store_id", store.id), "categories");
  for (const c of existing) ids.set(c.slug, c.id);
  let nextTopOrder = Math.max(0, ...existing.filter((c) => !c.parent_id).map((c) => c.sort_order)) + 1;

  const chains = new Map();
  for (const p of catalog) chains.set(p.categories.map((c) => c.slug).join("/"), p.categories);
  for (const chain of chains.values()) {
    let parent = null;
    for (const [depth, c] of chain.entries()) {
      if (!ids.has(c.slug)) {
        const row = must(
          await supabase
            .from("categories")
            .insert({ store_id: store.id, parent_id: parent, slug: c.slug, sort_order: depth === 0 ? nextTopOrder++ : 0 })
            .select("id")
            .single(),
          `category ${c.slug}`,
        );
        ids.set(c.slug, row.id);
        const names = categoryNames[c.slug] ?? { tr: c.name };
        const rows = ["tr", "en", "fa"].filter((l) => names[l]).map((locale) => ({ category_id: row.id, locale, name: names[locale] }));
        must(await supabase.from("category_translations").upsert(rows), `category names ${c.slug}`);
      }
      parent = ids.get(c.slug);
    }
  }
  return ids;
}

async function ensureBrands() {
  const ids = new Map();
  const existing = must(await supabase.from("brands").select("id, slug").eq("store_id", store.id), "brands");
  for (const b of existing) ids.set(b.slug, b.id);
  const names = new Map();
  for (const p of catalog) if (p.brand && !/^diğer$/i.test(p.brand)) names.set(slugify(p.brand), p.brand);
  for (const [slug, name] of names) {
    if (ids.has(slug)) continue;
    const row = must(await supabase.from("brands").insert({ store_id: store.id, slug, name }).select("id").single(), `brand ${name}`);
    ids.set(slug, row.id);
  }
  return ids;
}

async function importGroup(group, categoryIds, brandIds) {
  const members = group.members.map((m) => ({ ...m, product: byId.get(m.externalId) }));
  const first = members[0].product;
  const translation = translationFor(group);
  if (!translation) stats.untranslated++;
  const text = groupText(group, byId);

  // ---- which product holds this group: the oldest one already holding a member, else a new one ----
  const sources = must(
    await supabase
      .from("product_sources")
      .select("variant_id, product_id, external_id, images_hash, products(created_at)")
      .eq("store_id", store.id)
      .eq("supplier", SUPPLIER)
      .in("external_id", members.map((m) => m.externalId)),
    "sources",
  );
  const sourceByExternal = new Map(sources.map((s) => [Number(s.external_id), s]));
  let productId = sources.sort((a, b) => a.products.created_at.localeCompare(b.products.created_at))[0]?.product_id;

  const productFields = {
    brand_id: first.brand ? (brandIds.get(slugify(first.brand)) ?? null) : null,
    tags: ["zoo"],
  };
  if (productId) {
    must(await supabase.from("products").update(productFields).eq("id", productId), "update product");
    stats.products_updated++;
  } else {
    const slug = await freeSlug(members.length > 1 ? slugify(group.baseName) : first.slug);
    productId = must(
      await supabase.from("products").insert({ store_id: store.id, slug, status: newStatus, ...productFields }).select("id").single(),
      "insert product",
    ).id;
    stats.products_created++;
  }

  // ---- names, descriptions, category ----
  const names = { tr: { name: group.baseName, description: text.description } };
  if (translation) Object.assign(names, { en: translation.en, fa: translation.fa });
  must(
    await supabase.from("product_translations").upsert(
      Object.entries(names).map(([locale, t]) => ({ product_id: productId, locale, name: t.name, description: t.description || null })),
    ),
    "translations",
  );
  const leaf = categoryIds.get(first.categories.at(-1)?.slug);
  must(await supabase.from("product_categories").delete().eq("product_id", productId), "clear categories");
  if (leaf) must(await supabase.from("product_categories").insert({ product_id: productId, category_id: leaf }), "category");

  // ---- options: exactly the group's axes, values in member order ----
  const valueLabel = new Map((translation?.values ?? []).map((v) => [v.tr, v]));
  const existingOptions = must(
    await supabase.from("product_options").select("id, name, product_option_values(id, value)").eq("product_id", productId),
    "options",
  );
  const optionValueIds = new Map(); // `${axis}|${value}` → option_value id
  const keepOptions = new Set();
  for (const [axisIndex, axis] of group.axes.entries()) {
    let option = existingOptions.find((o) => o.name?.tr === AXES[axis].tr);
    if (!option) {
      option = must(
        await supabase.from("product_options").insert({ product_id: productId, name: AXES[axis], sort_order: axisIndex }).select("id").single(),
        "insert option",
      );
      option.product_option_values = [];
    }
    keepOptions.add(option.id);
    const wanted = [...new Set(members.map((m) => m.values[axis]))];
    for (const [valueIndex, value] of wanted.entries()) {
      const label = valueLabel.get(value) ?? [...valueLabel.values()].find((v) => v.tr.replace(/,/g, ".") === value);
      const json = { tr: value, en: label?.en ?? value, fa: label?.fa ?? value };
      const found = option.product_option_values.find((v) => v.value?.tr === value);
      if (found) {
        must(await supabase.from("product_option_values").update({ value: json, sort_order: valueIndex }).eq("id", found.id), "update value");
        optionValueIds.set(`${axis}|${value}`, found.id);
      } else {
        const row = must(
          await supabase.from("product_option_values").insert({ option_id: option.id, value: json, sort_order: valueIndex }).select("id").single(),
          "insert value",
        );
        optionValueIds.set(`${axis}|${value}`, row.id);
      }
    }
    const stale = option.product_option_values.filter((v) => !wanted.includes(v.value?.tr)).map((v) => v.id);
    if (stale.length) must(await supabase.from("product_option_values").delete().in("id", stale), "stale values");
  }
  const staleOptions = existingOptions.filter((o) => !keepOptions.has(o.id)).map((o) => o.id);
  if (staleOptions.length) must(await supabase.from("product_options").delete().in("id", staleOptions), "stale options");

  // ---- variants ----
  const altName = { tr: group.baseName, ...(translation ? { en: translation.en.name, fa: translation.fa.name } : {}) };
  for (const [index, member] of members.entries()) {
    const p = member.product;
    const source = sourceByExternal.get(member.externalId);
    const fields = {
      store_id: store.id,
      product_id: productId,
      barcode: p.barcode,
      price: markup(p.priceKurus),
      compare_at_price: markup(p.listPriceKurus),
      cost_price: p.priceKurus,
      weight_grams: gramsFrom(member.values.weight ?? p.name),
      track_inventory: true,
      allow_backorder: false,
      is_active: true,
      is_default: index === 0,
    };

    let variantId = source?.variant_id;
    if (variantId) {
      if (source.product_id !== productId) {
        must(await supabase.from("product_images").update({ product_id: productId }).eq("variant_id", variantId), "move images");
        stats.variants_moved++;
      }
      must(await supabase.from("product_variants").update(fields).eq("id", variantId), "update variant");
      stats.variants_updated++;
    } else {
      variantId = must(
        await supabase.from("product_variants").insert({ ...fields, sku: await freeSku(p) }).select("id").single(),
        "insert variant",
      ).id;
      stats.variants_created++;
    }

    must(await supabase.from("variant_option_values").delete().eq("variant_id", variantId), "clear variant values");
    const links = group.axes.map((axis) => ({ variant_id: variantId, option_value_id: optionValueIds.get(`${axis}|${member.values[axis]}`) }));
    if (links.length) must(await supabase.from("variant_option_values").insert(links), "variant values");

    await setStock(variantId, p.stock, !source);
    if (source?.images_hash !== p.imagesHash) await replaceImages(productId, variantId, p, index, altName);

    must(
      await supabase.from("product_sources").upsert({
        variant_id: variantId,
        product_id: productId,
        store_id: store.id,
        supplier: SUPPLIER,
        external_id: p.externalId,
        source_url: p.url,
        source_price: p.priceKurus,
        source_list_price: p.listPriceKurus,
        source_stock: p.stock,
        content_hash: p.contentHash,
        images_hash: p.imagesHash,
        last_seen_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      }),
      "source",
    );
  }
}

async function setStock(variantId, target, isNew) {
  const { stock_qty } = must(await supabase.from("product_variants").select("stock_qty").eq("id", variantId).single(), "stock");
  const delta = target - stock_qty;
  if (delta === 0) return;
  must(
    await supabase.from("stock_movements").insert({
      store_id: store.id,
      variant_id: variantId,
      delta,
      reason: isNew ? "initial" : "correction",
      note: "zoo.com.tr import",
    }),
    "stock movement",
  );
}

async function replaceImages(productId, variantId, p, memberIndex, alt) {
  const old = must(await supabase.from("product_images").select("id, url").eq("variant_id", variantId), "old images");
  const rows = [];
  for (const [i, url] of p.images.entries()) {
    const { body } = await fetchWithRetry(url, { as: "buffer" });
    if (!body) continue;
    const webp = await sharp(body).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const path = `${store.id}/products/${productId}/${sha(url)}.webp`;
    must(await supabase.storage.from("store-media").upload(path, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: true }), `upload ${url}`);
    const publicUrl = supabase.storage.from("store-media").getPublicUrl(path).data.publicUrl;
    rows.push({ product_id: productId, variant_id: variantId, url: publicUrl, alt, sort_order: memberIndex * 10 + i });
    stats.images_uploaded++;
  }
  if (!rows.length) return;
  if (old.length) must(await supabase.from("product_images").delete().in("id", old.map((o) => o.id)), "delete old images");
  must(await supabase.from("product_images").insert(rows), "insert images");
  const keep = new Set(rows.map((r) => r.url));
  const orphaned = old.map((o) => storagePath(o.url)).filter((path, i) => path && !keep.has(old[i].url));
  if (orphaned.length) await supabase.storage.from("store-media").remove(orphaned);
}

async function removeEmptyProducts() {
  const zooProducts = must(
    await supabase.from("products").select("id, slug, product_variants(id)").eq("store_id", store.id).contains("tags", ["zoo"]),
    "zoo products",
  );
  for (const product of zooProducts.filter((p) => !p.product_variants.length)) {
    const { count } = await supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", product.id);
    if (count) must(await supabase.from("products").update({ status: "archived" }).eq("id", product.id), "archive empty");
    else must(await supabase.from("products").delete().eq("id", product.id), "delete empty");
    stats.products_removed++;
  }
}

async function freeSlug(base) {
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("slug", slug);
    if (!count) return slug;
  }
}

async function freeSku(p) {
  const base = `ZOO-${(p.sku || String(p.externalId)).toUpperCase()}`;
  const { count } = await supabase.from("product_variants").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("sku", base);
  return count ? `${base}-${p.externalId}` : base;
}

function gramsFrom(text) {
  const m = String(text).match(/(\d+(?:[.,]\d+)?)\s*(kg|gr|g)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Math.round(/kg/i.test(m[2]) ? n * 1000 : n);
}

function storagePath(url) {
  const marker = "/storage/v1/object/public/store-media/";
  const at = url.indexOf(marker);
  return at < 0 ? null : decodeURIComponent(url.slice(at + marker.length));
}
