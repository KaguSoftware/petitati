/**
 * Does the message-namespace split (src/i18n/namespaces.ts) leave any surface rendering raw keys?
 * Guest + staff, en + fa. The staff path is the one that matters: the "Edit product" drawer mounts
 * the real admin editors on a storefront page, and the storefront provider omits `admin`.
 *   node node_modules/.qa/i18n-split-check.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "https://petitati.vercel.app";
const KEY_RE = /\b(admin|common|nav|shop|product|cart|checkout|account|auth|footer|order|stores|courier|deliver|home|brands|category|orderStatus)\.[a-zA-Z][a-zA-Z0-9.]{2,}\b/g;
const PILL = { en: "Edit product", fa: "ویرایش محصول" };
const TABS = { en: ["Details", "Prices & stock", "Photos"], fa: ["مشخصات", "قیمت و موجودی", "عکس‌ها"] };

const browser = await chromium.launch({ channel: "msedge" });
const failures = [];

async function scan(page, label, expect = []) {
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  const text = await page.locator("body").innerText();
  const raw = [...new Set(text.match(KEY_RE) ?? [])];
  const missing = errs.filter((e) => /MISSING_MESSAGE|IntlError/i.test(e));
  const absent = expect.filter((s) => !text.includes(s));
  const bad = raw.length || missing.length || absent.length;
  if (bad) failures.push(label);
  console.log(`${bad ? "FAIL" : "ok  "}  ${label.padEnd(44)} rawKeys=${raw.length} missingMsg=${missing.length} consoleErr=${errs.length}${expect.length ? ` expectedStringsMissing=${absent.length}` : ""}`);
  if (raw.length) console.log("        raw keys:", raw.slice(0, 8).join(", "));
  if (missing.length) console.log("        intl:", missing.slice(0, 2).join(" | "));
  if (absent.length) console.log("        expected but not found:", absent.join(", "));
}

// ---------- guest ----------
for (const loc of ["en", "fa"]) {
  for (const path of ["", "/shop", "/brands", "/cart"]) {
    const page = await browser.newPage();
    await page.goto(`${BASE}/${loc}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    await scan(page, `guest ${loc}${path || "/"}`);
    await page.close();
  }
}

const probe = await browser.newPage();
await probe.goto(`${BASE}/en/shop`, { waitUntil: "networkidle", timeout: 60000 });
const href = await probe.locator('a[href*="/p/"]').first().getAttribute("href");
await probe.close();
console.log(`\nproduct page under test: ${href}\n`);

for (const loc of ["en", "fa"]) {
  const page = await browser.newPage();
  await page.goto(`${BASE}${href.replace(/^\/en/, "/" + loc)}`, { waitUntil: "networkidle", timeout: 60000 });
  await scan(page, `guest ${loc} product page`);
  const pill = await page.getByText(PILL[loc], { exact: false }).count();
  if (pill !== 0) { failures.push(`guest ${loc} sees staff pill`); console.log(`FAIL    guest ${loc}: staff edit pill is visible to a guest (${pill})`); }
  else console.log(`ok      guest ${loc}: no staff pill (correct)`);
  await page.close();
}

// ---------- staff ----------
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${BASE}/en/sign-in`, { waitUntil: "networkidle", timeout: 60000 });
await page.fill('input[name="email"]', "testuser@gmail.com");
await page.fill('input[type="password"]', "12345678");
await Promise.all([
  page.waitForURL((u) => !u.pathname.includes("sign-in"), { timeout: 60000 }),
  page.click('button[type="submit"]'),
]);
await page.waitForLoadState("networkidle", { timeout: 60000 });
console.log(`\nsigned in -> ${page.url()}`);
if (page.url().includes("sign-in")) { console.log("!! sign-in failed; staff checks would be meaningless"); await browser.close(); process.exit(2); }

for (const loc of ["en", "fa"]) {
  await page.goto(`${BASE}${href.replace(/^\/en/, "/" + loc)}`, { waitUntil: "networkidle", timeout: 60000 });
  await scan(page, `staff ${loc} product page (closed)`, [PILL[loc]]);
  const pill = page.getByText(PILL[loc], { exact: false }).first();
  if (await pill.count()) {
    await pill.click();
    await page.waitForTimeout(3000);
    // The drawer is where `admin` strings must resolve. Assert its three tab labels render.
    await scan(page, `staff ${loc} product page (DRAWER OPEN)`, TABS[loc]);
  } else {
    failures.push(`staff ${loc}: no edit pill`);
    console.log(`FAIL    staff ${loc}: edit pill not found`);
  }
}

await browser.close();
console.log(`\n${failures.length ? "FAILED: " + failures.join("; ") : "ALL SURFACES CLEAN (guest + staff, en + fa, drawer open)"}`);
process.exitCode = failures.length ? 1 : 0;
