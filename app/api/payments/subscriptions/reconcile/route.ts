import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";
import { createRateLimiter } from "@/lib/rate-limit";
import { getRazorpayClient } from "@/lib/razorpay";
import {
  isSubscriptionProduct,
  SUBSCRIPTION_PRODUCTS,
  SubscriptionValidationError,
  type StoredRazorpaySubscription,
} from "@/lib/razorpay-subscriptions";

export const dynamic = "force-dynamic";

const rateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 6 });

const OPEN_STATUSES = [
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "paused",
  "resumed",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unixSecondsToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return null;
  return new Date(value * 1000).toISOString();
}

type ReconcileResult = {
  subscriptionId: string;
  outcome: "activated" | "already_paid" | "no_capture" | "mismatch" | "error";
  paidThrough?: string | null;
  reason?: string;
};

// Authenticated, server-side reconciliation for subscriptions whose activation
// never landed (delayed/missing webhook, or a verify callback that 400'd before
// c91354). It re-verifies every open subscription directly with Razorpay and, only
// when a real captured payment and a valid current billing period exist, activates
// the matching user through the same idempotent SECURITY DEFINER RPC the webhook
// uses. The browser supplies nothing but its own session; plan id, amount, status,
// ownership, and the payment are all verified server-side. Safe by default: no
// captured payment => no write.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (!rateLimiter.check(ip).allowed) {
    return errorResponse("Too Many Requests", 429);
  }

  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse("Unauthorized", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return errorResponse("Subscription reconciliation is not configured.", 503);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error: rowsError } = await admin
    .from("razorpay_subscriptions")
    .select(
      "razorpay_subscription_id,razorpay_plan_id,user_id,product,entitlement,amount,currency,status,paid_through",
    )
    .eq("user_id", authUser.id)
    .in("status", OPEN_STATUSES)
    .order("created_at", { ascending: true });
  if (rowsError) {
    console.error("[SUBSCRIPTION_RECONCILE_QUERY_FAILED]", JSON.stringify({ reason: rowsError.message }));
    return errorResponse("Unable to reconcile subscriptions right now.", 503);
  }

  const results: ReconcileResult[] = [];
  const razorpay = getRazorpayClient();

  for (const raw of rows ?? []) {
    const stored = raw as StoredRazorpaySubscription;
    const subscriptionId = stored.razorpay_subscription_id;
    try {
      if (stored.paid_through && Date.parse(stored.paid_through) > Date.now()) {
        results.push({ subscriptionId, outcome: "already_paid", paidThrough: stored.paid_through });
        continue;
      }
      if (!isSubscriptionProduct(stored.product)) {
        results.push({ subscriptionId, outcome: "mismatch", reason: "invalid_product" });
        continue;
      }
      const product = SUBSCRIPTION_PRODUCTS[stored.product];

      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const notes = isRecord(subscription.notes) ? subscription.notes : {};
      if (
        subscription.id !== stored.razorpay_subscription_id ||
        subscription.plan_id !== stored.razorpay_plan_id ||
        notes.userId !== authUser.id ||
        notes.product !== stored.product ||
        notes.entitlement !== stored.entitlement
      ) {
        results.push({ subscriptionId, outcome: "mismatch", reason: "provider_account_mismatch" });
        continue;
      }

      const plan = await razorpay.plans.fetch(stored.razorpay_plan_id);
      if (
        plan.id !== stored.razorpay_plan_id ||
        plan.period !== "monthly" ||
        plan.interval !== 1 ||
        plan.item.amount !== product.amount ||
        plan.item.currency !== product.currency
      ) {
        results.push({ subscriptionId, outcome: "mismatch", reason: "plan_config_mismatch" });
        continue;
      }

      const currentStart = unixSecondsToIso(subscription.current_start);
      const currentEnd = unixSecondsToIso(subscription.current_end);
      const endedAt = unixSecondsToIso(subscription.ended_at);
      const providerStatus = String(subscription.status);

      // The SDK types payments.all() as a callback-or-promise overload without a
      // subscription_id filter; the runtime returns a promise of { items }.
      const paymentList = (await (
        razorpay.payments.all as unknown as (params: Record<string, unknown>) => Promise<{ items: unknown[] }>
      )({ subscription_id: subscriptionId, count: 100 }));
      const captured = paymentList.items.find(
        (payment) =>
          isRecord(payment) &&
          payment.subscription_id === subscriptionId &&
          payment.status === "captured" &&
          (payment.captured === true || payment.captured === 1 || payment.captured === "1") &&
          payment.amount === product.amount &&
          payment.currency === product.currency &&
          typeof payment.id === "string" &&
          /^pay_[A-Za-z0-9]+$/.test(payment.id),
      );

      if (!captured || !currentEnd) {
        results.push({
          subscriptionId,
          outcome: "no_capture",
          reason: captured ? "missing_billing_period" : "no_captured_payment",
        });
        continue;
      }

      const paymentId = (captured as { id: string }).id;
      const eventId = `evt_${createHash("sha256")
        .update(`reconcile:${subscriptionId}:${paymentId}`)
        .digest("hex")}`;
      const paidCount =
        Number.isSafeInteger(subscription.paid_count) &&
        (subscription.paid_count as number) >= 0 &&
        (subscription.paid_count as number) <= 100
          ? (subscription.paid_count as number)
          : 0;

      const { error: rpcError } = await admin.rpc("record_razorpay_subscription_event", {
        p_event_id: eventId,
        p_event_type: "subscription.charged",
        p_subscription_id: subscriptionId,
        p_provider_status: providerStatus,
        p_plan_id: stored.razorpay_plan_id,
        p_paid_count: paidCount,
        p_current_start: currentStart,
        p_current_end: currentEnd,
        p_ended_at: endedAt,
        p_event_created_at: new Date().toISOString(),
        p_payment_id: paymentId,
        p_payment_amount: product.amount,
        p_currency: product.currency,
      });
      if (rpcError) {
        console.error(
          "[SUBSCRIPTION_RECONCILE_RPC_FAILED]",
          JSON.stringify({ subscriptionId, reason: rpcError.message }),
        );
        results.push({ subscriptionId, outcome: "error", reason: "rpc_failed" });
        continue;
      }

      const { data: refreshed } = await admin
        .from("razorpay_subscriptions")
        .select("paid_through")
        .eq("razorpay_subscription_id", subscriptionId)
        .eq("user_id", authUser.id)
        .maybeSingle();
      const paidThrough = refreshed?.paid_through ?? currentEnd;
      results.push({ subscriptionId, outcome: "activated", paidThrough });
    } catch (error) {
      const reason =
        error instanceof SubscriptionValidationError ? error.message : "provider_error";
      console.error(
        "[SUBSCRIPTION_RECONCILE_ERROR]",
        JSON.stringify({ subscriptionId, reason }),
      );
      results.push({ subscriptionId, outcome: "error", reason });
    }
  }

  const activated = results.some((entry) => entry.outcome === "activated");
  return NextResponse.json({ activated, results });
}