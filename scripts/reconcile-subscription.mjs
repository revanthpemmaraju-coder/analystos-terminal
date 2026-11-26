// One-off / reusable secure reconciliation for a stuck Razorpay subscription.
//
// It verifies the subscription directly with Razorpay (subscription status, plan
// configuration against the securely stored registration values, ownership via the
// subscription notes, and a real captured payment) and then activates the matching
// user through the same SECURITY DEFINER RPC the webhook uses
// (record_razorpay_subscription_event). It never writes tables directly, never
// trusts browser input, is idempotent (deterministic evt_ id + monotonic
// paid_through), and prints no secrets.
//
// Usage: node scripts/reconcile-subscription.mjs [razorpay_subscription_id]

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = {};
  for (const file of [".env", ".env.local"]) {
    let text;
    try {
      text = readFileSync(resolve(root, file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function maskId(value) {
  if (typeof value !== "string") return String(value);
  return value.length <= 8 ? value : `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const SUBSCRIPTION_PRODUCTS = {
  starter_node: { amount: 250000, currency: "INR", entitlement: "pro" },
  ai_copilot: { amount: 750000, currency: "INR", entitlement: "analyst" },
};

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const keyId = env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  for (const [name, value] of Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: keyId,
    RAZORPAY_KEY_SECRET: keySecret,
  })) {
    if (!value) {
      console.error(`[reconcile] missing required env: ${name}`);
      process.exit(2);
    }
  }

  const subscriptionId = process.argv[2] || "sub_U4KEhznOepCi7z";
  if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) {
    console.error("[reconcile] invalid subscription id");
    process.exit(2);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const { data: stored, error: storedError } = await admin
    .from("razorpay_subscriptions")
    .select(
      "razorpay_subscription_id,razorpay_plan_id,user_id,product,entitlement,amount,currency,status,paid_through",
    )
    .eq("razorpay_subscription_id", subscriptionId)
    .maybeSingle();
  if (storedError) throw storedError;
  if (!stored) {
    console.error("[reconcile] subscription is not registered in this database");
    process.exit(1);
  }

  const product = SUBSCRIPTION_PRODUCTS[stored.product];
  if (!product || stored.entitlement !== product.entitlement || stored.amount !== product.amount || stored.currency !== product.currency) {
    console.error("[reconcile] stored subscription does not match a known product");
    process.exit(1);
  }

  // Stored registration is the source of truth for reconciliation and is printed
  // before any provider call so a key/ownership mismatch is diagnosable.
  console.log(
    JSON.stringify({
      step: "stored",
      subscriptionId,
      user: maskId(stored.user_id),
      product: stored.product,
      entitlement: stored.entitlement,
      storedPlanId: stored.razorpay_plan_id,
      storedStatus: stored.status,
      storedPaidThrough: stored.paid_through,
    }),
  );

  let subscription;
  try {
    subscription = await razorpay.subscriptions.fetch(subscriptionId);
  } catch (error) {
    console.error(
      "[reconcile] provider fetch failed (key/account mismatch?):",
      JSON.stringify({
        statusCode: error && error.statusCode,
        code: error && error.error && error.error.code,
        description: error && error.error && error.error.description,
      }),
    );
    process.exit(1);
  }
  const notes = isRecord(subscription.notes) ? subscription.notes : {};
  if (
    subscription.id !== stored.razorpay_subscription_id ||
    subscription.plan_id !== stored.razorpay_plan_id ||
    notes.userId !== stored.user_id ||
    notes.product !== stored.product ||
    notes.entitlement !== stored.entitlement
  ) {
    console.error("[reconcile] provider subscription does not match the registered account");
    process.exit(1);
  }

  const plan = await razorpay.plans.fetch(stored.razorpay_plan_id);
  if (
    plan.id !== stored.razorpay_plan_id ||
    plan.period !== "monthly" ||
    plan.interval !== 1 ||
    plan.item.amount !== product.amount ||
    plan.item.currency !== product.currency
  ) {
    console.error("[reconcile] provider plan configuration does not match the product");
    process.exit(1);
  }

  const currentStart = subscription.current_start
    ? new Date(subscription.current_start * 1000).toISOString()
    : null;
  const currentEnd = subscription.current_end
    ? new Date(subscription.current_end * 1000).toISOString()
    : null;
  const endedAt =
    subscription.ended_at && subscription.ended_at > 0
      ? new Date(subscription.ended_at * 1000).toISOString()
      : null;

  console.log(
    JSON.stringify({
      subscriptionId,
      user: maskId(stored.user_id),
      product: stored.product,
      providerStatus: subscription.status,
      paidCount: subscription.paid_count,
      currentStart,
      currentEnd,
      storedPaidThrough: stored.paid_through,
    }),
  );

  const isMatchingCapturedPayment = (payment) =>
    isRecord(payment) &&
    payment.subscription_id === subscriptionId &&
    payment.status === "captured" &&
    (payment.captured === true || payment.captured === 1 || payment.captured === "1") &&
    payment.amount === product.amount &&
    payment.currency === product.currency &&
    /^pay_[A-Za-z0-9]+$/.test(String(payment.id));

  let captured;
  const invoiceList = await razorpay.invoices.all({ subscription_id: subscriptionId, count: 100 });
  for (const invoice of invoiceList.items || []) {
    if (!isRecord(invoice) || typeof invoice.payment_id !== "string" || !/^pay_[A-Za-z0-9]+$/.test(invoice.payment_id)) {
      continue;
    }
    const payment = await razorpay.payments.fetch(invoice.payment_id);
    if (isMatchingCapturedPayment(payment)) {
      captured = payment;
      break;
    }
  }
  if (!captured) {
    captured = (await razorpay.payments.all({ count: 100 })).items.find(isMatchingCapturedPayment);
  }

  if (!captured || !currentEnd) {
    console.log(
      JSON.stringify({
        subscriptionId,
        activated: false,
        reason: captured ? "missing_confirmed_billing_period" : "no_captured_payment_found",
      }),
    );
    return;
  }

  const eventId = `evt_${createHash("sha256")
    .update(`reconcile:${subscriptionId}:${captured.id}`)
    .digest("hex")}`;

  const paidCount =
    Number.isSafeInteger(subscription.paid_count) &&
    subscription.paid_count >= 0 &&
    subscription.paid_count <= 100
      ? subscription.paid_count
      : 0;

  const { data: rpcResult, error: rpcError } = await admin.rpc(
    "record_razorpay_subscription_event",
    {
      p_event_id: eventId,
      p_event_type: "subscription.charged",
      p_subscription_id: subscriptionId,
      p_provider_status: String(subscription.status),
      p_plan_id: stored.razorpay_plan_id,
      p_paid_count: paidCount,
      p_current_start: currentStart,
      p_current_end: currentEnd,
      p_ended_at: endedAt,
      p_event_created_at: new Date().toISOString(),
      p_payment_id: captured.id,
      p_payment_amount: product.amount,
      p_currency: product.currency,
    },
  );
  if (rpcError) {
    console.error(JSON.stringify({ subscriptionId, rpcError: rpcError.message }));
    process.exit(1);
  }

  const { data: refreshed } = await admin
    .from("razorpay_subscriptions")
    .select("paid_through,status")
    .eq("razorpay_subscription_id", subscriptionId)
    .maybeSingle();

  console.log(
    JSON.stringify({
      subscriptionId,
      rpcResult,
      payment: maskId(captured.id),
      status: refreshed?.status,
      paidThrough: refreshed?.paid_through,
      activated: Boolean(refreshed?.paid_through && Date.parse(refreshed.paid_through) > Date.now()),
    }),
  );
}

main().catch((error) => {
  const details = isRecord(error)
    ? {
        message: error.message,
        statusCode: error.statusCode,
        code: error.error && error.error.code,
        description: error.error && error.error.description,
        source: error.error && error.error.source,
        step: error.error && error.error.step,
        reason: error.error && error.error.reason,
      }
    : { message: String(error) };
  console.error("[reconcile] failed:", JSON.stringify(details));
  process.exit(1);
});