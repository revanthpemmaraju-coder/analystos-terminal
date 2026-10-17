import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("paid signup stays unavailable and never simulates a payment", () => {
  const signup = read("app/signup/page.tsx");
  assert.match(signup, /Paid subscriptions are temporarily unavailable/);
  assert.match(signup, /disabled=\{opt\.id !== "free"\}/);
  assert.doesNotMatch(signup, /rzp_test|triggerRazorpayPayment|plan:\s*selectedPlan/);
  assert.match(signup, /if \(!data\.session\)/);
});

test("payment orders require complete configuration and a verified account", () => {
  const config = read("lib/razorpay.ts");
  const orders = read("app/api/payments/route.ts");
  for (const name of [
    "NEXT_PUBLIC_RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    assert.ok(config.includes(name), `missing payment config guard for ${name}`);
  }
  assert.match(orders, /isPaymentProcessingConfigured\(\)/);
  assert.match(orders, /auth\.getUser\(accessToken\)/);
  assert.match(orders, /notes:\s*\{\s*userId:\s*user\.id/);
  assert.doesNotMatch(orders, /body\.userId|const \{\s*plan,\s*userId\s*\}/);
});

test("payment webhook fails closed without an admin key and verifies signatures", () => {
  const webhook = read("app/api/payments/webhook/route.ts");
  assert.match(webhook, /!serviceRoleKey/);
  assert.match(webhook, /timingSafeEqual/);
  assert.match(webhook, /plan !== "pro" && plan !== "analyst"/);
  assert.doesNotMatch(webhook, /NEXT_PUBLIC_SUPABASE_ANON_KEY|webhookSecret\s*===\s*""/);
});

test("the landing scene and pricing coin defer Three.js and respect reduced motion", () => {
  const landing = read("app/page.tsx");
  const coin = read("components/pricing-coin.tsx");
  assert.match(landing, /dynamic\(\(\) => import\("@\/components\/pricing-coin"\)/);
  assert.match(landing, /activeSection === 4 \?\s*\(\s*<PricingCoin \/>/);
  assert.match(landing, /window\.addEventListener\("pointerdown", handlePointerDown\)/);
  assert.match(landing, /pointercancel/);
  assert.match(landing, /prefers-reduced-motion: reduce/);
  assert.match(landing, /clock\.dispose\(\)/);
  assert.match(coin, /new THREE\.Timer\(\)/);
  assert.match(coin, /touchcancel/);
  assert.match(coin, /clock\.dispose\(\)/);
});

test("market ticker lookup overlaps the quote and stale hard-coded prices are absent", () => {
  const route = read("app/api/market/route.ts");
  const ticker = read("components/ticker-bar.tsx");
  const searchStart = route.indexOf("const searchResultsPromise = searchStocks(ticker)");
  const quoteStart = route.indexOf("const quote = await fetchQuote(ticker)", searchStart);
  const searchAwait = route.indexOf("const searchResults = await searchResultsPromise", quoteStart);
  assert.ok(searchStart >= 0 && quoteStart > searchStart && searchAwait > quoteStart);
  assert.doesNotMatch(ticker, /const FALLBACK:\s*IndexTick\[\]/);
  assert.match(ticker, /MARKETS_UNAVAILABLE/);
  assert.match(ticker, /Live market data unavailable/);
});
