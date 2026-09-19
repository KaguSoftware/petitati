#!/usr/bin/env node
/**
 * Reproduces the measurements from the 2026-09-19 performance audit against a running deployment.
 *
 *   node scripts/perf-probe.mjs [baseUrl]       # default https://petitati.vercel.app
 *
 * It exists because the numbers quoted in HANDOFF.md came from scripts under `node_modules/.qa/`,
 * which any clean install wipes — so none of them could be re-checked. This one is in the repo.
 *
 * Reports, per route: TTFB, total time, and both wire and decoded bytes; then the first-load JS for
 * the storefront home, split into what modern browsers execute and the `nomodule` polyfill they
 * skip; then how much of the i18n catalogue reaches the client, by namespace. That last section is
 * the regression test for the message split in src/i18n/namespaces.ts, and it sets the exit code.
 *
 * No dependencies, no browser. Core Web Vitals still need Lighthouse: this measures bytes and time
 * to last byte, not LCP/CLS/INP.
 */
import { readFileSync } from "node:fs";
import { request } from "node:https";
import { gunzipSync, brotliDecompressSync, inflateSync } from "node:zlib";

const base = (process.argv[2] ?? "https://petitati.vercel.app").replace(/\/$/, "");
const ROUTES = ["/en", "/en/shop", "/en/shop?page=2&sort=price_desc", "/fa", "/en/brands"];
const OFF_LIMITS = new Set(["admin", "stores", "courier"]);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

/**
 * A GET that reports the bytes that actually crossed the wire.
 *
 * `fetch` decompresses transparently and Vercel serves chunked (no content-length), so the only
 * honest way to size a brotli response is to take the socket bytes ourselves and decode afterwards.
 */
function get(url) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    let ttfb = null;
    const req = request(url, { headers: { "accept-encoding": "br, gzip, deflate" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(new URL(res.headers.location, url).toString()));
      }
      const chunks = [];
      res.on("data", (c) => {
        if (ttfb === null) ttfb = performance.now() - t0;
        chunks.push(c);
      });
      res.on("end", () => {
        const wire = Buffer.concat(chunks);
        const encoding = res.headers["content-encoding"] ?? "identity";
        let body = wire;
        try {
          if (encoding === "br") body = brotliDecompressSync(wire);
          else if (encoding === "gzip") body = gunzipSync(wire);
          else if (encoding === "deflate") body = inflateSync(wire);
        } catch {
          // Keep the compressed bytes if they will not decode; sizes stay useful either way.
        }
        resolve({
          status: res.statusCode,
          ttfb: ttfb ?? performance.now() - t0,
          total: performance.now() - t0,
          wire: wire.length,
          raw: body.length,
          encoding,
          cache: res.headers["x-vercel-cache"] ?? "-",
          prerender: res.headers["x-nextjs-prerender"] ?? "-",
          body: body.toString("utf8"),
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

console.log(`\n=== ${base} ===\n`);
console.log("Routes  (second hit of each, so the edge cache is warm)");
const docs = {};
for (const route of ROUTES) {
  await get(base + route); // warm
  const r = await get(base + route);
  docs[route] = r;
  console.log(
    `  ${route.padEnd(32)} ${r.status}  ttfb ${r.ttfb.toFixed(0).padStart(4)} ms  total ${r.total.toFixed(0).padStart(5)} ms  ` +
      `wire ${kb(r.wire).padStart(9)}  raw ${kb(r.raw).padStart(9)}  ${r.encoding}  cache ${r.cache}  prerender ${r.prerender}`,
  );
}

// ---- first-load JS on the storefront home --------------------------------------------------
const home = docs["/en"].body;
const scripts = [...new Set([...home.matchAll(/<script[^>]*src="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
const noModule = new Set(
  [...home.matchAll(/<script[^>]*src="(\/_next\/static\/[^"]+)"[^>]*noModule/gi)].map((m) => m[1]),
);
let modernWire = 0;
let modernRaw = 0;
let legacyWire = 0;
for (const src of scripts) {
  const { wire, raw } = await get(base + src);
  if (noModule.has(src)) legacyWire += wire;
  else {
    modernWire += wire;
    modernRaw += raw;
  }
}
console.log(`\nFirst-load JS on /en  (${scripts.length} scripts, ${noModule.size} of them nomodule)`);
console.log(`  modern browsers  : ${kb(modernWire)} over the wire, ${kb(modernRaw)} parsed`);
console.log(`  nomodule polyfill: ${kb(legacyWire)} (modern browsers skip it)`);

// ---- i18n payload --------------------------------------------------------------------------
// The whole catalogue used to be serialized into every page. Anything from `admin`, `stores` or
// `courier` on a storefront route means the split in src/i18n/namespaces.ts has regressed.
const en = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf8"));
const escaped = (v) => JSON.stringify(JSON.stringify(v)).slice(1, -1);
console.log("\ni18n namespaces reaching the client on /en");
let shipped = 0;
let leaked = 0;
for (const ns of Object.keys(en)) {
  const probe = escaped({ [ns]: en[ns] }).slice(1, -1).slice(0, 120);
  const present = home.includes(probe);
  const bytes = Buffer.byteLength(escaped(en[ns]));
  if (present) {
    shipped += bytes;
    if (OFF_LIMITS.has(ns)) leaked += bytes;
  }
  const flag = present && OFF_LIMITS.has(ns) ? "   <-- REGRESSION: never usable on a storefront" : "";
  console.log(`  ${present ? "yes" : " no"}  ${ns.padEnd(12)} ${kb(bytes).padStart(9)}${flag}`);
}
console.log(`\n  shipped to the client: ${kb(shipped)}`);
console.log(`  of which off-limits  : ${kb(leaked)}`);
console.log(leaked > 0 ? "\nFAIL: admin/stores/courier strings are reaching the public storefront.\n" : "\nOK: the storefront carries shop strings only.\n");
process.exitCode = leaked > 0 ? 1 : 0;
