// Local cache under .data/zoo (gitignored) so every stage is resumable and re-runs are cheap.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const DATA = join(ROOT, ".data", "zoo");

export function readJson(rel, fallback = null) {
  const p = join(DATA, rel);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback;
}

export function writeJson(rel, value) {
  const p = join(DATA, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(value, null, 2));
}

export function hasJson(rel) {
  return existsSync(join(DATA, rel));
}

/** Tiny argv parser: --flag, --key value. */
export function args() {
  const out = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) continue;
    const key = a[i].slice(2);
    out[key] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
  }
  return out;
}
