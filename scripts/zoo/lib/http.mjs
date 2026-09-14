// Polite fetch for zoo.com.tr: identifying UA, bounded concurrency, retry with backoff on 429/5xx.
export const USER_AGENT = "Mozilla/5.0 (compatible; PetatiCatalogSync/1.0; +https://petitati.vercel.app)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(url, { attempts = 4, as = "text", redirect = "follow" } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect, signal: AbortSignal.timeout(60_000) });
      if (res.status === 404 || res.status === 410) return { status: res.status, body: null };
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return { status: res.status, body: null };
      const body = as === "json" ? await res.json() : as === "buffer" ? Buffer.from(await res.arrayBuffer()) : await res.text();
      return { status: res.status, body, contentType: res.headers.get("content-type") };
    } catch (e) {
      lastError = e;
      await sleep(1000 * 2 ** i);
    }
  }
  throw new Error(`${url}: ${lastError?.message}`);
}

/** Run `fn` over `items` with at most `concurrency` in flight and `delayMs` between starts. */
export async function mapPool(items, concurrency, fn, { delayMs = 0 } = {}) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
      if (delayMs) await sleep(delayMs);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
