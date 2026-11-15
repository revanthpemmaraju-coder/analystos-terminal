import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  processCapturedPayment,
  validateCheckoutPayment,
  verifyRazorpaySignature,
  verifyCheckoutSignature,
  WebhookValidationError,
} from "../lib/razorpay-payments.ts";
import {
  getSubscriptionPlanId,
  processSubscriptionWebhook,
  SUBSCRIPTION_CYCLE_COUNT,
  SUBSCRIPTION_PRODUCTS,
  SubscriptionValidationError,
  verifySubscriptionSignature,
} from "../lib/razorpay-subscriptions.ts";

const userId = "9a7b6c5d-4e3f-2a1b-8c7d-6e5f4a3b2c1d";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const payload = {
  id: "evt_capture123",
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_capture123",
        order_id: "order_test123",
        amount: 49900,
        currency: "INR",
        status: "captured",
        captured: true,
      },
    },
  },
};

function storedOrder(overrides = {}) {
  return {
    razorpay_order_id: "order_test123",
    user_id: userId,
    plan: "pro",
    amount: 49900,
    currency: "INR",
    status: "created",
    razorpay_payment_id: null,
    event_id: null,
    ...overrides,
  };
}

function providerOrder(overrides = {}) {
  return {
    id: "order_test123",
    amount: 49900,
    amount_paid: 49900,
    currency: "INR",
    status: "paid",
    notes: { userId, plan: "pro" },
    ...overrides,
  };
}

function deps(overrides = {}) {
  return {
    getStoredOrder: async () => storedOrder(),
    fetchProviderOrder: async () => providerOrder(),
    recordCapture: async () => "recorded",
    ...overrides,
  };
}

const subscriptionRow = {
  razorpay_subscription_id: "sub_test123",
  razorpay_plan_id: "plan_starter123",
  user_id: userId,
  product: "starter_node",
  entitlement: "pro",
  amount: 250000,
  currency: "INR",
  status: "created",
  paid_through: null,
};

function providerSubscription(overrides = {}) {
  return {
    id: subscriptionRow.razorpay_subscription_id,
    plan_id: subscriptionRow.razorpay_plan_id,
    status: "active",
    current_start: 1794700000,
    current_end: 1797292000,
    ended_at: null,
    paid_count: 1,
    notes: { userId, product: "starter_node", entitlement: "pro" },
    ...overrides,
  };
}

function subscriptionWebhook(event, overrides = {}) {
  const payment = event === "subscription.charged"
    ? {
        id: "pay_subscription123",
        amount: 250000,
        currency: "INR",
        status: "captured",
        captured: "1",
      }
    : undefined;
  return {
    id: "evt_subscription123",
    event,
    created_at: 1794700100,
    payload: {
      subscription: { entity: { id: subscriptionRow.razorpay_subscription_id } },
      ...(payment ? { payment: { entity: payment } } : {}),
    },
    ...overrides,
  };
}

test("webhook signature verifies the exact raw body and rejects invalid signatures", () => {
  const rawBody = JSON.stringify(payload);
  const valid = createHmac("sha256", "test-secret").update(rawBody).digest("hex");
  assert.equal(verifyRazorpaySignature(rawBody, valid, "test-secret"), true);
  assert.equal(verifyRazorpaySignature(rawBody, "0".repeat(64), "test-secret"), false);
  assert.equal(verifyRazorpaySignature(rawBody, null, "test-secret"), false);
});

test("checkout signature verifies order_id|payment_id and rejects invalid values", () => {
  const orderId = "order_test123";
  const paymentId = "pay_capture123";
  const secret = "checkout-test-secret";
  const signature = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  assert.equal(verifyCheckoutSignature(orderId, paymentId, signature, secret), true);
  assert.equal(verifyCheckoutSignature(orderId, paymentId, "0".repeat(64), secret), false);
  assert.equal(verifyCheckoutSignature(orderId, paymentId, signature, "wrong-secret"), false);
  assert.equal(verifyCheckoutSignature("order_wrong", paymentId, signature, secret), false);
  assert.equal(verifyCheckoutSignature(orderId, paymentId, "bad-signature", secret), false);
});

test("checkout verification accepts only matching captured payments or pending captures", () => {
  const captured = {
    id: "pay_capture123",
    order_id: "order_test123",
    amount: 49900,
    currency: "INR",
    status: "captured",
    captured: true,
  };
  assert.deepEqual(
    validateCheckoutPayment(
      captured,
      providerOrder(),
      storedOrder(),
      userId,
      "order_test123",
      "pay_capture123",
    ),
    { userId, plan: "pro", captured: true },
  );

  assert.deepEqual(
    validateCheckoutPayment(
      { ...captured, status: "authorized", captured: false },
      providerOrder({ status: "attempted", amount_paid: 0 }),
      storedOrder(),
      userId,
      "order_test123",
      "pay_capture123",
    ),
    { userId, plan: "pro", captured: false },
  );
  assert.throws(
    () =>
      validateCheckoutPayment(
        captured,
        providerOrder(),
        storedOrder(),
        "11111111-1111-4111-8111-111111111111",
        "order_test123",
        "pay_capture123",
      ),
    WebhookValidationError,
  );
  assert.throws(
    () =>
      validateCheckoutPayment(
        { ...captured, status: "failed", captured: false },
        providerOrder(),
        storedOrder(),
        userId,
        "order_test123",
        "pay_capture123",
      ),
    WebhookValidationError,
  );
});

test("duplicate capture deliveries return duplicate and do not grant the plan twice", async () => {
  let order = storedOrder();
  let grants = 0;
  const dependencies = deps({
    getStoredOrder: async () => order,
    recordCapture: async (payment, user, plan) => {
      if (order.status === "captured") return "duplicate";
      order = storedOrder({
        status: "captured",
        razorpay_payment_id: payment.paymentId,
        event_id: payload.id,
      });
      assert.equal(user, userId);
      assert.equal(plan, "pro");
      grants += 1;
      return "recorded";
    },
  });

  assert.equal(await processCapturedPayment(payload, dependencies), "recorded");
  assert.equal(await processCapturedPayment(payload, dependencies), "duplicate");
  assert.equal(grants, 1);
});

test("incorrect payment amount is rejected before recording", async () => {
  const wrongAmount = structuredClone(payload);
  wrongAmount.payload.payment.entity.amount = 50000;
  await assert.rejects(
    processCapturedPayment(wrongAmount, deps()),
    WebhookValidationError,
  );
});

test("incorrect currency and failed captures are rejected before recording", async () => {
  const wrongCurrency = structuredClone(payload);
  wrongCurrency.payload.payment.entity.currency = "USD";
  await assert.rejects(processCapturedPayment(wrongCurrency, deps()), WebhookValidationError);

  const failedPayment = structuredClone(payload);
  failedPayment.payload.payment.entity.status = "failed";
  failedPayment.payload.payment.entity.captured = false;
  await assert.rejects(processCapturedPayment(failedPayment, deps()), WebhookValidationError);
});

test("the same payment delivered with another event ID cannot grant a second time", async () => {
  let recordedPaymentId;
  let grants = 0;
  const dependencies = deps({
    recordCapture: async (payment) => {
      if (recordedPaymentId === payment.paymentId) return "duplicate";
      recordedPaymentId = payment.paymentId;
      grants += 1;
      return "recorded";
    },
  });
  const laterEvent = { ...payload, id: "evt_capture456" };
  assert.equal(await processCapturedPayment(payload, dependencies), "recorded");
  assert.equal(await processCapturedPayment(laterEvent, dependencies), "duplicate");
  assert.equal(grants, 1);
});

test("order metadata for a different user is rejected", async () => {
  await assert.rejects(
    processCapturedPayment(
      payload,
      deps({ fetchProviderOrder: async () => providerOrder({ notes: { userId: "11111111-1111-4111-8111-111111111111", plan: "pro" } }) }),
    ),
    WebhookValidationError,
  );
});

test("missing webhook or order metadata is rejected", async () => {
  const missingEvent = { ...payload, id: undefined };
  await assert.rejects(
    processCapturedPayment(missingEvent, deps()),
    WebhookValidationError,
  );
  await assert.rejects(
    processCapturedPayment(
      payload,
      deps({ fetchProviderOrder: async () => providerOrder({ notes: {} }) }),
    ),
    WebhookValidationError,
  );
});

test("database failure is propagated so the provider can retry", async () => {
  await assert.rejects(
    processCapturedPayment(payload, deps({
      recordCapture: async () => {
        throw new Error("database unavailable");
      },
    })),
    /database unavailable/,
  );
});

test("unexpected events are acknowledged without touching payment state", async () => {
  const dependencies = deps({
    getStoredOrder: async () => {
      throw new Error("should not query");
    },
  });
  assert.equal(await processCapturedPayment({ id: "evt_refund123", event: "refund.created" }, dependencies), "ignored");
});

test("migration enforces canonical plans, payment idempotency, RLS and atomic capture", () => {
  const migration = readFileSync(
    resolve(root, "supabase/migrations/20261104_razorpay_payment_idempotency.sql"),
    "utf8",
  );
  assert.match(migration, /index_count <> 2/);
  assert.match(migration, /index_table\.relname = 'user_plans_pkey'/);
  assert.match(migration, /index_table\.relname = 'user_plans_user_id_unique_idx'/);
  assert.match(migration, /user_id_index_predicate_mismatch/);
  assert.doesNotMatch(migration, /CREATE UNIQUE INDEX user_plans_user_id_unique_idx/);
  assert.match(migration, /CREATE TABLE public\.payments/);
  assert.match(migration, /DO \$existing_objects_preflight\$/);
  assert.match(migration, /Existing public\.payments constraints do not match the ten validated production constraints/);
  assert.match(migration, /payments_user_id_created_at_idx/);
  assert.match(migration, /service_role must retain SELECT and INSERT on payments/);
  assert.doesNotMatch(migration, /has the expected column shape but already exists; inspect constraints/);
  assert.match(migration, /DO \$create_payments_if_absent\$/);
  assert.match(migration, /DO \$create_ai_usage_if_absent\$/);
  assert.match(migration, /Existing public\.ai_usage constraints do not match/);
  assert.match(migration, /ai_usage_pkey/);
  assert.match(migration, /ai_usage_questions_used_check/);
  assert.match(migration, /ai_usage_user_id_fkey/);
  assert.match(migration, /object_rls_forced/);
  assert.match(migration, /relforcerowsecurity/);
  assert.match(migration, /information_schema\.role_table_grants/);
  assert.match(migration, /information_schema\.column_privileges/);
  assert.match(migration, /ai_usage table ACL must match the postgres-only seven grantable privilege inventory/);
  assert.match(migration, /ai_usage column ACL must match postgres INSERT\/REFERENCES\/SELECT\/UPDATE grantable on every column/);
  assert.match(migration, /usage_acl_count <> 7 OR usage_acl_distinct_count <> 7/);
  assert.match(migration, /usage_acl_count <> 12 OR usage_acl_distinct_count <> 12/);
  assert.match(migration, /pg_options_to_table\(p\.proconfig\)/);
  assert.match(migration, /consume_function_owner <> 'postgres'::regrole::oid/);
  assert.match(migration, /capture_function_owner <> 'postgres'::regrole::oid/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.consume_ai_question\(\) TO authenticated, service_role/);
  assert.match(migration, /has_function_privilege\('service_role', 'public\.consume_ai_question\(\)', 'EXECUTE'\)/);
  assert.match(migration, /has_function_privilege\('authenticated', p\.oid, 'EXECUTE'\)/);
  assert.match(migration, /NOT pg_catalog\.has_function_privilege\('authenticated', p\.oid, 'EXECUTE'\)/);
  assert.match(migration, /razorpay_payment_id TEXT UNIQUE/);
  assert.match(migration, /razorpay_order_id TEXT NOT NULL UNIQUE/);
  assert.match(migration, /event_id TEXT UNIQUE/);
  assert.match(migration, /CREATE TABLE public\.ai_usage/);
  assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE public\.user_plans FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /policy\.roles = ARRAY\['authenticated'\]::name\[\]/);
  assert.match(migration, /policy\.cmd = 'SELECT'/);
  assert.match(migration, /regexp_replace\(policy\.qual, '\[\[:space:\]\]\+', '', 'g'\)/);
  assert.match(migration, /policy\.with_check IS NULL/);
  assert.match(migration, /user_plans_policy_count <> 1/);
  assert.doesNotMatch(migration, /DROP POLICY "own plan"/);
  assert.doesNotMatch(migration, /CREATE POLICY "own plan"/);
  assert.match(migration, /ALTER TABLE public\.payments ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE public\.payments FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.record_razorpay_capture/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.record_razorpay_capture[\s\S]+TO service_role/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.consume_ai_question/);
  assert.match(migration, /SET search_path = ''/);
  assert.match(migration, /constraint_count <> 3/);
  assert.match(migration, /pg_get_expr\(c\.conbin, c\.conrelid\)/);
  assert.match(migration, /COALESCE\(\(%s\), TRUE\) IS DISTINCT FROM probe\.expected/);
  assert.match(migration, /user_plans_valid_plan_ck/);
  assert.doesNotMatch(migration, /pg_get_constraintdef\(c\.oid,\s*TRUE\)/);
  assert.doesNotMatch(migration, /ADD CONSTRAINT user_plans_valid_plan_ck/);
  assert.doesNotMatch(migration, /UPDATE\s+public\.profiles/);
});

test("checkout requires a verified user and derives all price fields server-side", () => {
  const route = readFileSync(resolve(root, "app/api/payments/route.ts"), "utf8");
  assert.match(route, /getAuthenticatedUser\(req\)/);
  assert.match(route, /if \(!authUser\) return errorResponse\("Unauthorized", 401\)/);
  assert.match(route, /SUBSCRIPTION_PRODUCTS\[product\]/);
  assert.match(route, /razorpay\.subscriptions\.create/);
  assert.match(route, /register_razorpay_subscription/);
  assert.doesNotMatch(route, /body\.amount|body\.user_id|body\.userId/);
});

test("subscription creation validates provider plan and keeps legacy one-time order creation", () => {
  const route = readFileSync(resolve(root, "app/api/payments/route.ts"), "utf8");
  assert.match(route, /if \(!authUser\) return errorResponse\("Unauthorized", 401\)/);
  assert.match(route, /providerPlan\.period !== "monthly"/);
  assert.match(route, /providerPlan\.interval !== 1/);
  assert.match(route, /total_count: SUBSCRIPTION_CYCLE_COUNT/);
  assert.match(route, /register_razorpay_subscription/);
  assert.match(route, /p_user_id: authUser\.id/);
  assert.match(route, /orders\.create/);
  assert.match(route, /RAZORPAY_PLANS\[plan\]/);
  assert.match(route, /\.from\("payments"\)\.insert/);
  assert.doesNotMatch(route, /body\.userId|body\.user_id|body\.amount/);
});

test("subscription RPC argument names match the migration", () => {
  const route = readFileSync(resolve(root, "app/api/payments/webhook/route.ts"), "utf8");
  const migration = readFileSync(
    resolve(root, "supabase/migrations/20261115_razorpay_recurring_subscriptions.sql"),
    "utf8",
  );
  for (const parameter of [
    "p_event_id",
    "p_event_type",
    "p_subscription_id",
    "p_provider_status",
    "p_plan_id",
    "p_paid_count",
    "p_current_start",
    "p_current_end",
    "p_ended_at",
    "p_event_created_at",
    "p_payment_id",
    "p_payment_amount",
    "p_currency",
  ]) {
    assert.match(route, new RegExp(`${parameter}:`));
    assert.match(migration, new RegExp(`${parameter} `));
  }
});

test("checkout callback is authenticated, signature-verified, and uses the capture RPC", () => {
  const route = readFileSync(resolve(root, "app/api/payments/verify/route.ts"), "utf8");
  assert.match(route, /const eventId = `evt_checkout\$\{paymentId\.slice\(4\)\}`/);
  const paymentId = "pay_capture123";
  const eventId = `evt_checkout${paymentId.slice(4)}`;
  assert.match(eventId, /^evt_[A-Za-z0-9]+$/);
  assert.equal(eventId, `evt_checkout${paymentId.slice(4)}`);
  assert.match(route, /getAuthenticatedUser\(req\)/);
  assert.match(route, /verifyCheckoutSignature\(orderId, paymentId, signature, keySecret\)/);
  assert.match(route, /\.eq\("user_id", authUser\.id\)/);
  assert.match(route, /razorpay\.payments\.fetch\(paymentId\)/);
  assert.match(route, /razorpay\.orders\.fetch\(orderId\)/);
  assert.match(route, /supabase\.rpc\("record_razorpay_capture"/);
  assert.match(route, /p_payment_id:/);
  assert.match(route, /p_order_id:/);
  assert.match(route, /p_event_id:/);
  assert.match(route, /p_user_id:/);
  assert.match(route, /p_plan:/);
  assert.match(route, /p_amount:/);
  assert.match(route, /p_currency:/);
});

test("paid signup resumes after email confirmation and checkout waits for verification", () => {
  const signup = readFileSync(resolve(root, "app/signup/page.tsx"), "utf8");
  const login = readFileSync(resolve(root, "app/login/page.tsx"), "utf8");
  assert.match(signup, /login\?upgrade=true&plan=\$\{selectedPlan\}/);
  assert.match(signup, /fetchWithAuth\("\/api\/payments\/subscriptions\/verify"/);
  assert.match(signup, /verification\?\.status === "active"/);
  assert.match(signup, /Subscription activation is still pending/);
  assert.match(login, /getPostLoginPath/);
  assert.match(login, /signup\?upgrade=true&plan=\$\{plan\}/);
});

test("cancelled checkout does not grant paid access", () => {
  const signup = readFileSync(resolve(root, "app/signup/page.tsx"), "utf8");
  const dismissHandler = signup.match(/ondismiss:\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\},/);
  assert.ok(dismissHandler);
  assert.match(dismissHandler[1], /account remains on its current plan/i);
  assert.doesNotMatch(dismissHandler[1], /plan\s*=|user_plans|record_razorpay_capture/);
});

test("original monthly products map to existing entitlements at exact paise prices", () => {
  assert.deepEqual(SUBSCRIPTION_PRODUCTS.starter_node, {
    amount: 250000,
    currency: "INR",
    entitlement: "pro",
    planIdEnv: "RAZORPAY_STARTER_PLAN_ID",
  });
  assert.deepEqual(SUBSCRIPTION_PRODUCTS.ai_copilot, {
    amount: 750000,
    currency: "INR",
    entitlement: "analyst",
    planIdEnv: "RAZORPAY_COPILOT_PLAN_ID",
  });
  assert.equal(SUBSCRIPTION_CYCLE_COUNT, 100);
  assert.equal(
    getSubscriptionPlanId("starter_node", { RAZORPAY_STARTER_PLAN_ID: "plan_starter123" }),
    "plan_starter123",
  );
  assert.equal(getSubscriptionPlanId("ai_copilot", {}), null);
});

test("Institutional is custom-priced and has no self-service destination", () => {
  const pricing = readFileSync(resolve(root, "components/pricing-coin.tsx"), "utf8");
  const envExample = readFileSync(resolve(root, ".env.example"), "utf8");
  assert.match(pricing, /title: "INSTITUTIONAL"/);
  assert.match(pricing, /price: "Custom"/);
  assert.match(pricing, /cta: "CONTACT SALES"/);
  assert.match(pricing, /href: null/);
  assert.match(pricing, /aria-disabled=\{!card\.href\}/);
  assert.match(envExample, /^RAZORPAY_STARTER_PLAN_ID=/m);
  assert.match(envExample, /^RAZORPAY_COPILOT_PLAN_ID=/m);
});

test("subscription callback signature verifies payment_id|subscription_id", () => {
  const secret = "subscription-test-secret";
  const paymentId = "pay_subscription123";
  const subscriptionId = "sub_test123";
  const signature = createHmac("sha256", secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");

  assert.equal(verifySubscriptionSignature(paymentId, subscriptionId, signature, secret), true);
  assert.equal(verifySubscriptionSignature(paymentId, subscriptionId, "0".repeat(64), secret), false);
  assert.equal(verifySubscriptionSignature(paymentId, subscriptionId, signature, "wrong-secret"), false);
  assert.equal(verifySubscriptionSignature("pay_bad", subscriptionId, signature, secret), false);
});

test("browser callback verification cannot write entitlements", () => {
  const route = readFileSync(
    resolve(root, "app/api/payments/subscriptions/verify/route.ts"),
    "utf8",
  );
  assert.match(route, /getAuthenticatedUser\(req\)/);
  assert.match(route, /verifySubscriptionSignature/);
  assert.match(route, /\.eq\("user_id", authUser\.id\)/);
  assert.match(route, /stored\.paid_through/);
  assert.doesNotMatch(route, /\.rpc\(/);
  assert.doesNotMatch(route, /\.update\(/);
});

test("subscription webhook duplicate delivery records payment access only once", async () => {
  const processed = new Set();
  let grants = 0;
  const dependencies = {
    getStoredSubscription: async () => subscriptionRow,
    fetchProviderSubscription: async () => providerSubscription(),
    fetchProviderPayment: async () => ({
      id: "pay_subscription123",
      subscription_id: "sub_test123",
      amount: 250000,
      currency: "INR",
      status: "captured",
      captured: true,
    }),
    recordEvent: async (event) => {
      if (processed.has(event.eventId)) return "duplicate";
      processed.add(event.eventId);
      assert.equal(event.eventType, "subscription.charged");
      assert.equal(event.paymentId, "pay_subscription123");
      assert.equal(event.paymentAmount, 250000);
      grants += 1;
      return "recorded";
    },
  };

  assert.equal(
    await processSubscriptionWebhook(subscriptionWebhook("subscription.charged"), dependencies),
    "recorded",
  );
  assert.equal(
    await processSubscriptionWebhook(subscriptionWebhook("subscription.charged"), dependencies),
    "duplicate",
  );
  assert.equal(grants, 1);
});

test("recurring capture rejects mismatched server-fetched payment details", async () => {
  const invalidPayments = [
    { subscription_id: "sub_another123" },
    { amount: 249999 },
    { currency: "USD" },
    { status: "authorized", captured: false },
  ];

  for (const invalidPayment of invalidPayments) {
    let recorded = false;
    await assert.rejects(
      processSubscriptionWebhook(subscriptionWebhook("subscription.charged"), {
        getStoredSubscription: async () => subscriptionRow,
        fetchProviderSubscription: async () => providerSubscription(),
        fetchProviderPayment: async () => ({
          id: "pay_subscription123",
          subscription_id: "sub_test123",
          amount: 250000,
          currency: "INR",
          status: "captured",
          captured: true,
          ...invalidPayment,
        }),
        recordEvent: async () => {
          recorded = true;
          return "recorded";
        },
      }),
      SubscriptionValidationError,
    );
    assert.equal(recorded, false);
  }
});

test("failed renewals update status without advancing paid access", async () => {
  const event = subscriptionWebhook("subscription.pending");
  let recordedEvent;
  assert.equal(
    await processSubscriptionWebhook(event, {
      getStoredSubscription: async () => ({
        ...subscriptionRow,
        status: "active",
        paid_through: "2026-12-01T00:00:00.000Z",
      }),
      fetchProviderSubscription: async () => providerSubscription({ status: "pending" }),
      recordEvent: async (value) => {
        recordedEvent = value;
        return "recorded";
      },
    }),
    "recorded",
  );
  assert.equal(recordedEvent.providerStatus, "pending");
  assert.equal(recordedEvent.paymentId, null);
  assert.equal(recordedEvent.paymentAmount, null);
  assert.equal(
    recordedEvent.currentEnd,
    new Date(1797292000 * 1000).toISOString(),
  );
});

test("cancellation, pause, resume, and completion events preserve the confirmed paid period", async () => {
  for (const [eventType, providerStatus] of [
    ["subscription.cancelled", "cancelled"],
    ["subscription.paused", "paused"],
    ["subscription.resumed", "resumed"],
    ["subscription.completed", "completed"],
  ]) {
    let eventRecorded;
    await processSubscriptionWebhook(subscriptionWebhook(eventType), {
      getStoredSubscription: async () => ({
        ...subscriptionRow,
        status: "active",
        paid_through: "2026-12-01T00:00:00.000Z",
      }),
      fetchProviderSubscription: async () => providerSubscription({ status: providerStatus }),
      recordEvent: async (event) => {
        eventRecorded = event;
        return "recorded";
      },
    });
    assert.equal(eventRecorded.providerStatus, providerStatus);
    assert.equal(eventRecorded.paymentId, null);
  }
});

test("legacy one-time payment verification remains wired to the existing capture RPC", () => {
  const route = readFileSync(resolve(root, "app/api/payments/verify/route.ts"), "utf8");
  const webhook = readFileSync(resolve(root, "app/api/payments/webhook/route.ts"), "utf8");
  assert.match(route, /supabase\.rpc\("record_razorpay_capture"/);
  assert.match(webhook, /processCapturedPayment/);
  assert.match(webhook, /supabase\.rpc\("record_razorpay_capture"/);
});

test("new migration adds subscriptions without changing one-time payment history", () => {
  const migration = readFileSync(
    resolve(root, "supabase/migrations/20261115_razorpay_recurring_subscriptions.sql"),
    "utf8",
  );
  assert.match(migration, /CREATE TABLE public\.razorpay_subscriptions/);
  assert.match(migration, /CREATE TABLE public\.razorpay_subscription_events/);
  assert.match(migration, /record_razorpay_subscription_event/);
  assert.match(migration, /register_razorpay_subscription/);
  assert.match(migration, /get_effective_user_plan/);
  assert.match(migration, /paid_through > pg_catalog\.statement_timestamp\(\)/);
  assert.match(migration, /WHEN 'starter_node' THEN 250000/);
  assert.match(migration, /WHEN 'ai_copilot' THEN 750000/);
  assert.match(migration, /WHERE up\.user_id = current_user_id/);
  assert.match(migration, /UNION ALL/);
  assert.match(migration, /ALTER TABLE public\.razorpay_subscriptions OWNER TO postgres/);
  assert.match(migration, /ALTER TABLE public\.razorpay_subscription_events OWNER TO postgres/);
  assert.equal((migration.match(/^BEGIN;$/gm) || []).length, 1);
  assert.match(migration, /COMMIT;\s*$/);
  assert.doesNotMatch(migration, /UPDATE\s+public\.user_plans/);
  assert.doesNotMatch(
    migration,
    /\bDROP\s+TABLE\b|\bTRUNCATE\s+(?:TABLE\s+)?public\.|\bDELETE\s+FROM\s+public\./i,
  );
  assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.record_razorpay_capture/);
});

test("subscription management requests authenticate ownership and preserve paid periods", () => {
  const route = readFileSync(
    resolve(root, "app/api/payments/subscriptions/manage/route.ts"),
    "utf8",
  );
  const component = readFileSync(
    resolve(root, "components/subscription-management.tsx"),
    "utf8",
  );
  assert.match(route, /getAuthenticatedUser\(req\)/);
  assert.match(route, /\.eq\("user_id", authUser\.id\)/);
  assert.match(route, /export async function GET/);
  assert.match(route, /subscriptions\.cancel\(subscriptionId, paidPeriodRemains\)/);
  assert.match(route, /subscriptions\.pause\(subscriptionId, \{ pause_at: "now" \}\)/);
  assert.match(route, /subscriptions\.resume\(subscriptionId, \{ resume_at: "now" \}\)/);
  assert.match(component, /Cancel subscription/);
  assert.match(component, /already-paid period remains accessible/);
  assert.match(component, /manage\("pause"\)/);
  assert.match(component, /manage\("resume"\)/);
});
