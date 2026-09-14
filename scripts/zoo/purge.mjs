// Undo an import: delete every zoo-sourced product (tag "zoo") and its uploaded images.
//
//   node scripts/zoo/purge.mjs --yes
//
// Products referenced by orders are archived instead of deleted. Categories and brands the import
// created are left in place (they may be in use); remove them in the admin if unwanted.
import { SUPPLIER, db, must, resolveStore, revalidateCatalog } from "./lib/db.mjs";
import { args } from "./lib/store.mjs";

if (!args().yes) {
  console.log("this deletes every zoo-imported product; re-run with --yes");
  process.exit(1);
}
const supabase = db();
const store = await resolveStore(supabase);
const products = must(await supabase.from("products").select("id, slug").eq("store_id", store.id).contains("tags", ["zoo"]), "products");
let deleted = 0;
let archived = 0;
for (const p of products) {
  const { count } = await supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", p.id);
  if (count) {
    must(await supabase.from("products").update({ status: "archived" }).eq("id", p.id), "archive");
    archived++;
    continue;
  }
  const folder = `${store.id}/products/${p.id}`;
  const files = must(await supabase.storage.from("store-media").list(folder, { limit: 1000 }), "list images");
  if (files.length) await supabase.storage.from("store-media").remove(files.map((f) => `${folder}/${f.name}`));
  must(await supabase.from("products").delete().eq("id", p.id), "delete");
  deleted++;
}
console.log({ supplier: SUPPLIER, deleted, archived });
await revalidateCatalog(store.id);
