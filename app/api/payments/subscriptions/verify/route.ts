import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";
import { createRateLimiter } from "@/lib/rate-limit";
import { getRazorpayClient } from "@/lib/razorpay";
import {
  getSubscriptionPlanId,
  isSubscriptionProduct,
  SUBSCRIPTION_PRODUCTS,
  validateProviderSubscription,
  verifySubscriptionSignature,
  SubscriptionValidationError,
  type StoredRazorpaySubscription,
} from "@/lib/razorpay-subscriptions";

const rateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 20 });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (!rateLimiter.check(ip).allowed) {
    return errorResponse("Too Many Requests", 429);
  }

  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse("Unauthorized", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!supabaseUrl || !serviceKey || !keySecret) {
    return errorResponse("Subscription verification is not configured.", 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid subscription verification request.", 400);
  }
  if (typeof body !== "object" || body === null) {
    return errorResponse("Invalid subscription verification request.", 400);
  }

  const callback = body as Record<string, unknown>;
  const subscriptionId = callback.razorpay_subscription_id;
  const paymentId = callback.razorpay_payment_id;
  const signature = callback.razorpay_signature;
  if (
    typeof subscriptionId !== "string" ||
    typeof paymentId !== "string" ||
    typeof signature !== "string" ||
    !verifySubscriptionSignature(paymentId, subscriptionId, signature, keySecret)
  ) {
    return errorResponse("Subscription signature verification failed.", 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: storedSubscription, error: subscriptionError } = await admin
      .from("razorpay_subscriptions")
      .select(
        "razorpay_subscription_id,razorpay_plan_id,user_id,product,entitlement,amount,currency,status,paid_through",
      )
      .eq("razorpay_subscription_id", subscriptionId)
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!storedSubscription) {
      return errorResponse("Subscription was not found for this account.", 404);
    }

    const stored = storedSubscription as StoredRazorpaySubscription;
    if (!isSubscriptionProduct(stored.product)) {
      throw new SubscriptionValidationError("Subscription product is invalid.");
    }
    const expectedPlanId = getSubscriptionPlanId(stored.product);
    const product = SUBSCRIPTION_PRODUCTS[stored.product];
    if (!expectedPlanId) {
      return errorResponse("The selected Razorpay subscription plan is not configured.", 503);
    }
    if (stored.razorpay_plan_id !== expectedPlanId) {
      throw new SubscriptionValidationError("Subscription plan configuration no longer matches.");
    }

    const razorpay = getRazorpayClient();
    const [providerSubscription, providerPlan, providerPayment] = await Promise.all([
      razorpay.subscriptions.fetch(subscriptionId),
      razorpay.plans.fetch(expectedPlanId),
      razorpay.payments.fetch(paymentId),
    ]);
    const providerState = validateProviderSubscription(providerSubscription, stored, authUser.id);
    if (
      providerPayment.id !== paymentId ||
      providerPayment.subscription_id !== subscriptionId ||
      (providerPayment.status !== "authorized" &&
        providerPayment.status !== "captured")
    ) {
      throw new SubscriptionValidationError(
        "Checkout payment does not match the registered subscription.",
      );
    }
    if (
      providerPlan.id !== expectedPlanId ||
      providerPlan.period !== "monthly" ||
      providerPlan.interval !== 1 ||
      providerPlan.item.amount !== product.amount ||
      providerPlan.item.currency !== product.currency
    ) {
      throw new SubscriptionValidationError("Razorpay plan configuration does not match the product.");
    }

    // Durable activation. Everything above is verified server-side: the HMAC
    // signature over payment_id|subscription_id, a fresh provider re-fetch of the
    // subscription, plan, and payment, an exact plan-configuration match, and
    // ownership bound to the authenticated user via .eq("user_id", authUser.id).
    // Persist activation through the same hardened, idempotent, service_role-only
    // SECURITY DEFINER RPC the webhook uses, so a paying customer is activated even
    // when the asynchronous webhook is delayed, unconfigured, or not subscribed to
    // subscription.charged (the only event that carries the captured payment which
    // advances paid_through). The deterministic event id makes a later real webhook
    // delivery a harmless no-op, and the RPC advances paid_through monotonically
    // (GREATEST), so retries never double-extend access. No browser-supplied plan
    // or amount is trusted; the subscription row is only ever read, never written
    // directly.
    let paidThrough = stored.paid_through;
    let subscriptionStatus = stored.status;
    const providerPaidCount = (providerSubscription as { paid_count?: unknown }).paid_count;
    if (providerPayment.status === "captured" && providerState.currentEnd) {
      const eventId = `evt_${createHash("sha256")
        .update(`verify:${subscriptionId}:${paymentId}`)
        .digest("hex")}`;
      const { error: activationError } = await admin.rpc(
        "record_razorpay_subscription_event",
        {
          p_event_id: eventId,
          p_event_type: "subscription.charged",
          p_subscription_id: subscriptionId,
          p_provider_status: providerState.status,
          p_plan_id: expectedPlanId,
          p_paid_count:
            typeof providerPaidCount === "number" &&
            Number.isSafeInteger(providerPaidCount) &&
            providerPaidCount >= 0 &&
            providerPaidCount <= 100
              ? providerPaidCount
              : 0,
          p_current_start: providerState.currentStart,
          p_current_end: providerState.currentEnd,
          p_ended_at: providerState.endedAt,
          p_event_created_at: new Date().toISOString(),
          p_payment_id: paymentId,
          p_payment_amount: product.amount,
          p_currency: product.currency,
        },
      );
      if (activationError) {
        // Never fail the callback on a persistence error: the webhook remains the
        // authoritative writer and will reconcile. Surface a safe, secret-free log.
        console.error(
          "[SUBSCRIPTION_VERIFY_ACTIVATION_FAILED]",
          JSON.stringify({ subscriptionId, reason: activationError.message }),
        );
      } else {
        const { data: refreshed } = await admin
          .from("razorpay_subscriptions")
          .select("paid_through,status")
          .eq("razorpay_subscription_id", subscriptionId)
          .eq("user_id", authUser.id)
          .maybeSingle();
        if (refreshed) {
          paidThrough = refreshed.paid_through;
          subscriptionStatus = refreshed.status;
        }
        console.info(
          "[SUBSCRIPTION_VERIFY_ACTIVATED]",
          JSON.stringify({ subscriptionId, userId: authUser.id }),
        );
      }
    }

    const activated = Boolean(paidThrough && Date.parse(paidThrough) > Date.now());
    const terminal = ["cancelled", "completed", "expired"].includes(subscriptionStatus);
    return NextResponse.json({
      status: activated ? "active" : terminal ? "inactive" : "pending",
      subscriptionStatus,
      message: activated
        ? "Subscription is active through the confirmed billing period."
        : terminal
          ? "The subscription ended without an active paid period."
          : "Subscription authorization is awaiting server-confirmed payment events.",
    });
  } catch (error) {
    if (error instanceof SubscriptionValidationError) {
      console.error(
        "[SUBSCRIPTION_VERIFY_REJECTED]",
        JSON.stringify({ subscriptionId, reason: error.message }),
      );
      return errorResponse(error.message, 400);
    }
    console.error(
      "Razorpay subscription verification failed:",
      error instanceof Error ? error.message : "Unknown subscription verification error.",
    );
    return errorResponse("Unable to verify the subscription with the provider.", 503);
  }
}
