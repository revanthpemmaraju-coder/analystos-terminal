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
    validateProviderSubscription(providerSubscription, stored, authUser.id);
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

    const activated = Boolean(
      stored.paid_through && Date.parse(stored.paid_through) > Date.now(),
    );
    const terminal = ["cancelled", "completed", "expired"].includes(stored.status);
    return NextResponse.json({
      status: activated ? "active" : terminal ? "inactive" : "pending",
      subscriptionStatus: stored.status,
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
