// Stage 2: fold zoo's per-size / per-colour listings into products with options.
//
//   node scripts/zoo/group.mjs [--category "Kuru Kedi Maması"] [--ids ids.json] [--force]
//                              [--export work.json | --answers answers.json]
//
// Who does the grouping: with ANTHROPIC_API_KEY set, the Claude API. Without it, hand-off mode:
// --export writes every bucket that needs grouping (instructions + products) to a file, someone (a
// Claude Code session) writes {"<bucket>": {"groups": [...]}} in the same shape the API returns, and
// --answers feeds that file through the exact same verification before anything is saved.
//
// zoo lists "X Kedi Maması 1,5 kg", "X Kısır Kedi Maması 5 kg" and "X ve Y Kedi Maması 10 kg" as three
// products with drifting names, so string rules miss real siblings. Claude groups each brand+category
// bucket; code then verifies every grouping (each value must literally appear in the member's name,
// value combinations must be unique) and splits anything that fails back into single products.
// Writes .data/zoo/groups/<bucket>.json. A bucket is only re-sent when its membership changes, and the
// previous grouping is passed along so existing products stay stable.
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { structured, claudeUsage } from "./lib/claude.mjs";
import { AXIS_KEYS, bucketize, loadCatalog, looseKey, normalizeValue, sha } from "./lib/catalog.mjs";
import { mapPool } from "./lib/http.mjs";
import { args, readJson, writeJson } from "./lib/store.mjs";

const SYSTEM = `You organize the catalog of a Turkish pet shop. The shop lists every size and colour of an item as a separate product, and the names are written inconsistently. You receive all products of ONE brand in ONE category and decide which listings are the same item sold in different variants.

Group listings only when they are the same item and differ solely in:
- weight (e.g. 1,5 kg / 5 kg / 10 kg, 400 gr)
- volume (e.g. 250 ml, 5 lt)
- size or dimensions (e.g. Small / Medium / Large, 14 cm / 21 cm)
- colour (e.g. Gri / Mavi / Açık Mavi)
- pack count (e.g. 3'lü / 6'lı, 2 Adet)

Treat naming drift as the same item: abbreviations ("Kısır" = "Kısırlaştırılmış"), dropped or added connectors ("ve", "-"), reordered words, English vs Turkish words for the same thing, a trailing note such as an expiry date ("SKT: 11.2026").

Never group listings that differ in anything a shopper would call a different product: flavour or protein (tavuklu vs somonlu), life stage (yavru / yetişkin / yaşlı, kitten / adult), breed size (küçük ırk vs orta-büyük ırk), formula or line (tahılsız, düşük tahıllı, light, sterilised, hairball, sensitive), model, shape or material. When unsure, keep them apart: a wrong merge is worse than a missed one.

Rules for the output:
- Every product id appears in exactly one group. A product with no siblings is a group of one.
- For a group of two or more: "base_name" is the Turkish product name without the varying part, tidy and complete; "axes" lists what varies (at most two); every member gives one value per axis, copied exactly as it is written in that member's name; list members from smallest to largest (or lightest to darkest for colour).
- For a group of one: "base_name" is the product's name unchanged, "axes" is empty and "values" is empty.
- Two members of a group must never have the same combination of values.`;

const outputSchema = z.object({
  groups: z.array(
    z.object({
      base_name: z.string(),
      axes: z.array(z.enum(AXIS_KEYS)),
      members: z.array(
        z.object({
          id: z.number().int(),
          values: z.array(z.object({ axis: z.enum(AXIS_KEYS), value: z.string() })),
        }),
      ),
    }),
  ),
});

const opts = args();
const catalog = loadCatalog({ category: opts.category });
const buckets = bucketize(catalog);
if (opts.ids) {
  const ids = new Set(JSON.parse(readFileSync(opts.ids, "utf8")));
  for (const [key, products] of buckets) if (!products.some((p) => ids.has(p.externalId))) buckets.delete(key);
}
// Grouping already live in the store ({externalId: {product, name}}), written by sync.mjs. Used as the
// "keep these" hint when the local cache is cold (e.g. a fresh CI runner).
const live = readJson("live-groups.json", {});
const stats = { buckets: buckets.size, sent: 0, cached: 0, singles: 0, grouped: 0, variants: 0, rejected: 0, failed: 0, pending: 0 };
const answers = opts.answers ? JSON.parse(readFileSync(opts.answers, "utf8")) : null;
const exportWork = [];

await mapPool([...buckets.entries()], 4, async ([key, products]) => {
  const file = `groups/${sha(key)}.json`;
  const membership = sha(products.map((p) => `${p.externalId}:${p.contentHash}`).sort().join(","));
  const previous = readJson(file) ?? liveGrouping(products);
  if (previous?.membership === membership && !opts.force) {
    stats.cached++;
    return tally(previous.groups);
  }

  let groups;
  if (products.length === 1) {
    groups = [single(products[0])];
  } else {
    try {
      let result;
      if (answers) {
        if (!answers[key]) return void stats.pending++;
        result = outputSchema.parse(answers[key]);
      } else if (opts.export || !process.env.ANTHROPIC_API_KEY) {
        exportWork.push({ bucket: key, prompt: promptFor(products, previous) });
        return void stats.pending++;
      } else {
        result = await structured({ schema: outputSchema, system: SYSTEM, prompt: promptFor(products, previous), effort: "medium" });
        stats.sent++;
      }
      groups = verify(result.groups, products);
    } catch (e) {
      stats.failed++;
      console.log(`  ! ${key}: ${e.message}`);
      return;
    }
  }
  writeJson(file, { bucket: key, membership, groupedAt: new Date().toISOString(), groups });
  tally(groups);
});

if (exportWork.length) {
  const out = opts.export ?? "group-work.json";
  writeFileSync(out, JSON.stringify({ instructions: SYSTEM, answerShape: '{"<bucket>": {"groups": [{"base_name": str, "axes": [axis], "members": [{"id": int, "values": [{"axis": axis, "value": str}]}]}]}}', axes: AXIS_KEYS, buckets: exportWork }, null, 2));
  console.log(`${exportWork.length} buckets need grouping → ${out}`);
}
console.log(stats, claudeUsage());

function tally(groups) {
  for (const g of groups) {
    if (g.members.length > 1) {
      stats.grouped++;
      stats.variants += g.members.length;
    } else stats.singles++;
  }
}

function liveGrouping(products) {
  const byProduct = new Map();
  for (const p of products) {
    const hit = live[p.externalId];
    if (hit) byProduct.set(hit.product, { baseName: hit.name, members: [...(byProduct.get(hit.product)?.members ?? []), { externalId: p.externalId }] });
  }
  return byProduct.size ? { groups: [...byProduct.values()] } : null;
}

function single(p) {
  return { baseName: p.name, axes: [], members: [{ externalId: p.externalId, values: {} }] };
}

function promptFor(products, previous) {
  const lines = products.map((p) => `${p.externalId}\t${p.name}\t₺${(p.priceKurus / 100).toFixed(2)}`);
  let prompt = `Brand: ${products[0].brand ?? "(none)"}\nCategory: ${products[0].categories.map((c) => c.name).join(" > ")}\n\nid\tname\tprice\n${lines.join("\n")}`;
  if (previous?.groups?.some((g) => g.members.length > 1)) {
    const known = previous.groups
      .filter((g) => g.members.length > 1)
      .map((g) => `- ${g.baseName}: ${g.members.map((m) => m.externalId).join(", ")}`);
    prompt += `\n\nThese groups already exist in the shop. Keep them as they are unless a listing above clearly belongs to one of them:\n${known.join("\n")}`;
  }
  return prompt;
}

/** Trust nothing: rebuild groups from the model output and split any group that fails a check. */
function verify(rawGroups, products) {
  const byId = new Map(products.map((p) => [p.externalId, p]));
  const seen = new Set();
  const out = [];
  for (const g of rawGroups) {
    const members = g.members.filter((m) => byId.has(m.id) && !seen.has(m.id));
    members.forEach((m) => seen.add(m.id));
    if (!members.length) continue;
    if (members.length === 1) {
      out.push(single(byId.get(members[0].id)));
      continue;
    }
    const axes = [...new Set(g.axes)].slice(0, 2);
    const problems = [];
    const shaped = members.map((m) => {
      const name = looseKey(byId.get(m.id).name);
      const values = {};
      for (const axis of axes) {
        const raw = m.values.find((v) => v.axis === axis)?.value;
        if (!raw) problems.push(`${m.id} has no ${axis}`);
        else if (!name.includes(looseKey(raw)) && !name.includes(looseKey(normalizeValue(raw)))) problems.push(`${m.id}: "${raw}" not in name`);
        else values[axis] = normalizeValue(raw);
      }
      return { externalId: m.id, values };
    });
    const combos = new Set(shaped.map((m) => axes.map((a) => looseKey(m.values[a] ?? "")).join("|")));
    if (!axes.length) problems.push("no axes");
    if (combos.size !== shaped.length) problems.push("duplicate value combination");
    if (problems.length) {
      stats.rejected++;
      console.log(`  ~ split "${g.base_name}": ${problems.join("; ")}`);
      members.forEach((m) => out.push(single(byId.get(m.id))));
      continue;
    }
    out.push({ baseName: g.base_name.trim(), axes, members: shaped });
  }
  for (const p of products) if (!seen.has(p.externalId)) out.push(single(p));
  return out;
}
