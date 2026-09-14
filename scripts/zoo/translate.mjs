// Stage 3: translate grouped products and categories from Turkish into English and Persian.
//
//   node scripts/zoo/translate.mjs [--category "Kuru Kedi Maması"] [--export work.json | --answers answers.json]
//
// Same hand-off mode as group.mjs when there is no ANTHROPIC_API_KEY: --export writes the texts to
// translate, --answers reads {"categories": [{slug, en, fa}], "products": {"<key>": {en, fa, values}}}
// and validates it with the same schemas before saving.
//
// Writes .data/zoo/translations/<key>.json per product text and .data/zoo/categories.json. Keys hash
// the source text, so only new or changed text is ever sent again.
import { z } from "zod";
import { structured, claudeUsage } from "./lib/claude.mjs";
import { groupText, loadCatalog, loadGroups } from "./lib/catalog.mjs";
import { mapPool } from "./lib/http.mjs";
import { args, hasJson, readJson, writeJson } from "./lib/store.mjs";
import { readFileSync, writeFileSync } from "node:fs";

const SYSTEM = `You translate product listings of a Turkish pet shop into English and Persian (Farsi) for the same shop's English and Persian storefronts.

- Keep brand names and product line names in Latin script exactly as written (Royal Canin, N&D Quinoa, Fit 32, Reflex Plus). Translate the descriptive words around them.
- Use Latin digits (0-9) in both languages, including Persian. Keep units as "kg", "g", "ml", "l", "cm".
- Product names read naturally for a shopper, in the usual word order of the target language.
- Descriptions: translate faithfully and completely. Keep the line breaks and the order of lines; headings stay on their own line. Plain text only, no markdown. Fix obvious typos silently. Do not add claims that are not in the source.
- Option values (sizes, colours, pack counts) are translated as short labels ("Açık Mavi" → "Light Blue" / "آبی روشن"; "3'lü" → "3-pack" / "بسته 3 عددی"; "12 kg" stays "12 kg").`;

const productSchema = z.object({
  en: z.object({ name: z.string(), description: z.string() }),
  fa: z.object({ name: z.string(), description: z.string() }),
  values: z.array(z.object({ tr: z.string(), en: z.string(), fa: z.string() })),
});

const categorySchema = z.object({
  categories: z.array(z.object({ slug: z.string(), en: z.string(), fa: z.string() })),
});

const opts = args();
const catalog = loadCatalog({ category: opts.category });
const byId = new Map(catalog.map((p) => [p.externalId, p]));
const groups = loadGroups().filter((g) => g.members.some((m) => byId.has(m.externalId)));
const answers = opts.answers ? JSON.parse(readFileSync(opts.answers, "utf8")) : null;
const handOff = !answers && (opts.export || !process.env.ANTHROPIC_API_KEY);
const exportWork = { instructions: SYSTEM, categories: [], products: [] };

// ---- categories: one call for every breadcrumb name not translated yet ----
const categories = readJson("categories.json", {});
const missing = new Map();
for (const p of catalog) for (const c of p.categories) if (!categories[c.slug]) missing.set(c.slug, c.name);
if (missing.size && handOff) {
  exportWork.categories = [...missing].map(([slug, name]) => ({ slug, tr: name }));
} else if (missing.size && answers && !answers.categories) {
  console.log(`categories: ${missing.size} still untranslated`);
} else if (missing.size) {
  const result = answers ? categorySchema.parse({ categories: answers.categories }) : await structured({
    schema: categorySchema,
    system: SYSTEM,
    prompt: `Translate these pet-shop category names. Return one entry per slug.\n\n${[...missing].map(([slug, name]) => `${slug}\t${name}`).join("\n")}`,
    effort: "low",
  });
  for (const c of result.categories) if (missing.has(c.slug)) categories[c.slug] = { tr: missing.get(c.slug), en: c.en, fa: c.fa };
  writeJson("categories.json", categories);
  console.log(`categories: translated ${result.categories.length}`);
}

// ---- products ----
const todo = groups.map((g) => groupText(g, byId)).filter((t) => !hasJson(`translations/${t.key}.json`));
const unique = [...new Map(todo.map((t) => [t.key, t])).values()];
console.log(`products: ${groups.length} groups, ${unique.length} to translate`);

let done = 0;
let failed = 0;
await mapPool(unique, 4, async (t) => {
  const prompt = [
    `Product name (tr): ${t.name}`,
    t.values.length ? `Option values (tr): ${t.values.join(" | ")}` : "Option values: none (return an empty list)",
    `Description (tr):\n${t.description || "(none, return an empty string)"}`,
  ].join("\n\n");
  if (handOff) {
    exportWork.products.push({ key: t.key, name: t.name, values: t.values, description: t.description });
    return;
  }
  try {
    if (answers && !answers.products?.[t.key]) return;
    const out = answers ? productSchema.parse(answers.products[t.key]) : await structured({ schema: productSchema, system: SYSTEM, prompt, effort: "low" });
    writeJson(`translations/${t.key}.json`, { source: t, ...out });
  } catch (e) {
    failed++;
    console.log(`  ! ${t.name}: ${e.message}`);
  }
  if (++done % 20 === 0) console.log(`  ${done}/${unique.length}`, claudeUsage());
});
if (handOff) {
  const out = opts.export ?? "translate-work.json";
  writeFileSync(out, JSON.stringify(exportWork, null, 2));
  console.log(`${exportWork.categories.length} categories and ${exportWork.products.length} products need translating → ${out}`);
} else console.log({ translated: done - failed, failed }, claudeUsage());
