import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRazorpayClient } from "@/lib/razorpay";
import { getAuthenticatedUser } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/api-utils";
import {
  getSubscriptionPlanId,
  isSubscriptionProduct,
  SUBSCRIPTION_CYCLE_COUNT,
  SUBSCRIPTION_PRODUCTS,
} from "@/lib/razorpay-subscriptions";
import { isPaidPlan, RAZORPAY_PLANS } from "@/lib/razorpay-payments";

const rateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 10 });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (!rateLimiter.check(ip).allowed) {
    return errorResponse("Too Many Requests", 429);
  }

  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse("Unauthorized", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!supabaseUrl || !serviceKey || !keyId || !keySecret) {
    return errorResponse("Payment processing is not configured.", 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid subscription request.", 400);
  }
  const requestedProduct =
    typeof body === "object" && body !== null && "product" in body
      ? body.product
      : null;
  const requestedPlan =
    typeof body === "object" && body !== null && "plan" in body
      ? body.plan
      : null;

  if (requestedProduct !== null && requestedPlan !== null) {
    return errorResponse("Invalid subscription option.", 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (isPaidPlan(requestedPlan)) {
    const plan = requestedPlan;
    const { amount, currency } = RAZORPAY_PLANS[plan];
    try {
      const order = await getRazorpayClient().orders.create({
        amount,
        currency,
        receipt: `aos_${authUser.id.slice(0, 8)}_${Date.now()}`,
        notes: { userId: authUser.id, plan },
      });
      if (
        !/^order_[A-Za-z0-9]+$/.test(order.id) ||
        order.amount !== amount ||
        order.currency !== currency
      ) {
        return errorResponse("Payment provider returned an invalid order.", 502);
      }

      const { error: recordError } = await admin.from("payments").insert({
        razorpay_order_id: order.id,
        user_id: authUser.id,
        plan,
        amount,
        currency,
        status: "created",
      });
      if (recordError) {
        console.error("Payment order persistence failed:", recordError.message);
        return errorResponse("Unable to securely register the payment order.", 503);
      }
      return NextResponse.json(order);
    } catch (error) {
      console.error(
        "Razorpay order creation failed:",
        error instanceof Error ? error.message : "Unknown payment provider error.",
      );
      return errorResponse("Unable to create a payment order.", 503);
    }
  }

  if (!isSubscriptionProduct(requestedProduct)) {
    return errorResponse("Invalid payment option.", 400);
  }
  if (!webhookSecret) {
    return errorResponse("Subscription processing is not configured.", 503);
  }

  const product = requestedProduct;
  const productConfig = SUBSCRIPTION_PRODUCTS[product];
  const planId = getSubscriptionPlanId(product);
  if (!planId) {
    return errorResponse("The selected Razorpay subscription plan is not configured.", 503);
  }

  try {
    const razorpay = getRazorpayClient();
    const providerPlan = await razorpay.plans.fetch(planId);
    if (
      providerPlan.id !== planId ||
      providerPlan.period !== "monthly" ||
      providerPlan.interval !== 1 ||
      providerPlan.item.amount !== productConfig.amount ||
      providerPlan.item.currency !== productConfig.currency
    ) {
      console.error("Razorpay plan configuration does not match the selected product.");
      return errorResponse("The selected subscription plan is not configured correctly.", 503);
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: SUBSCRIPTION_CYCLE_COUNT,
      quantity: 1,
      customer_notify: true,
      notes: {
        userId: authUser.id,
        product,
        entitlement: productConfig.entitlement,
      },
    });

    if (
      !/^sub_[A-Za-z0-9]+$/.test(subscription.id) ||
      subscription.plan_id !== planId ||
      subscription.status !== "created"
    ) {
      return errorResponse("Razorpay returned an invalid subscription.", 502);
    }

    const { error: recordError } = await admin.rpc("register_razorpay_subscription", {
      p_subscription_id: subscription.id,
      p_plan_id: planId,
      p_user_id: authUser.id,
      p_product: product,
      p_entitlement: productConfig.entitlement,
      p_amount: productConfig.amount,
      p_currency: productConfig.currency,
      p_status: subscription.status,
      p_total_count: SUBSCRIPTION_CYCLE_COUNT,
    });

    if (recordError) {
      try {
        await razorpay.subscriptions.cancel(subscription.id, false);
      } catch (cancelError) {
        console.error(
          "Unable to cancel an unregistered Razorpay subscription:",
          cancelError instanceof Error ? cancelError.message : "Unknown cancellation error.",
        );
      }
      console.error("Subscription persistence failed:", recordError.message);
      if (recordError.message.includes("already has a subscription")) {
        return errorResponse(
          "An existing subscription is active or awaiting confirmation.",
          409,
        );
      }
      return errorResponse("Unable to securely register the subscription.", 503);
    }

    return NextResponse.json({
      id: subscription.id,
      subscription_id: subscription.id,
      amount: productConfig.amount,
      currency: productConfig.currency,
      product,
    });
  } catch (error) {
    console.error(
      "Razorpay subscription creation failed:",
      error instanceof Error ? error.message : "Unknown subscription provider error.",
    );
    return errorResponse("Unable to create a subscription.", 503);
  }
}
