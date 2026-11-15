import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { errorResponse } from "@/lib/api-utils";
import { getRazorpayClient } from "@/lib/razorpay";
import {
  processCapturedPayment,
  verifyRazorpaySignature,
  WebhookValidationError,
  type StoredPaymentOrder,
} from "@/lib/razorpay-payments";
import {
  getSubscriptionPlanId,
  isSubscriptionProduct,
  processSubscriptionWebhook,
  SUBSCRIPTION_PRODUCTS,
  SubscriptionValidationError,
  type StoredRazorpaySubscription,
} from "@/lib/razorpay-subscriptions";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (
    !supabaseUrl ||
    !serviceKey ||
    !webhookSecret ||
    !process.env.RAZORPAY_KEY_SECRET ||
    !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  ) {
    return NextResponse.json({ error: "Payment webhook is not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!verifyRazorpaySignature(rawBody, req.headers.get("x-razorpay-signature"), webhookSecret)) {
    return new NextResponse("Unauthorized Signature Failure", { status: 401 });
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch {
    return errorResponse("Invalid webhook payload.", 400);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    const eventType =
      typeof parsedPayload === "object" && parsedPayload !== null && "event" in parsedPayload
        ? parsedPayload.event
        : null;
    const result = typeof eventType === "string" && eventType.startsWith("subscription.")
      ? await processSubscriptionWebhook(parsedPayload, {
          getStoredSubscription: async (subscriptionId) => {
            const { data, error } = await supabase
              .from("razorpay_subscriptions")
              .select(
                "razorpay_subscription_id,razorpay_plan_id,user_id,product,entitlement,amount,currency,status,paid_through",
              )
              .eq("razorpay_subscription_id", subscriptionId)
              .maybeSingle();
            if (error) throw error;
            return data as StoredRazorpaySubscription | null;
          },
          fetchProviderSubscription: async (subscriptionId) => {
            const { data: storedData, error: storedError } = await supabase
              .from("razorpay_subscriptions")
              .select(
                "razorpay_subscription_id,razorpay_plan_id,user_id,product,entitlement,amount,currency,status,paid_through",
              )
              .eq("razorpay_subscription_id", subscriptionId)
              .maybeSingle();
            if (storedError) throw storedError;
            const stored = storedData as StoredRazorpaySubscription | null;
            if (!stored) throw new SubscriptionValidationError("Subscription was not registered.");
            if (!isSubscriptionProduct(stored.product)) {
              throw new SubscriptionValidationError("Subscription product is invalid.");
            }
            const expectedPlanId = getSubscriptionPlanId(stored.product);
            const product = SUBSCRIPTION_PRODUCTS[stored.product];
            if (!expectedPlanId) {
              throw new Error("Razorpay subscription plan is not configured.");
            }
            if (stored.razorpay_plan_id !== expectedPlanId) {
              throw new SubscriptionValidationError("Subscription plan configuration does not match.");
            }

            const razorpay = getRazorpayClient();
            const [subscription, plan] = await Promise.all([
              razorpay.subscriptions.fetch(subscriptionId),
              razorpay.plans.fetch(expectedPlanId),
            ]);
            if (
              plan.id !== expectedPlanId ||
              plan.period !== "monthly" ||
              plan.interval !== 1 ||
              plan.item.amount !== product.amount ||
              plan.item.currency !== product.currency
            ) {
              throw new SubscriptionValidationError("Razorpay plan configuration does not match.");
            }
            return subscription;
          },
          fetchProviderPayment: (paymentId) =>
            getRazorpayClient().payments.fetch(paymentId),
          recordEvent: async (event) => {
            const { data, error } = await supabase.rpc(
              "record_razorpay_subscription_event",
              {
                p_event_id: event.eventId,
                p_event_type: event.eventType,
                p_subscription_id: event.subscriptionId,
                p_provider_status: event.providerStatus,
                p_plan_id: event.planId,
                p_paid_count: event.paidCount,
                p_current_start: event.currentStart,
                p_current_end: event.currentEnd,
                p_ended_at: event.endedAt,
                p_event_created_at: event.eventCreatedAt,
                p_payment_id: event.paymentId,
                p_payment_amount: event.paymentAmount,
                p_currency: event.currency,
              },
            );
            if (error) throw error;
            if (data !== "recorded" && data !== "duplicate") {
              throw new Error("Unexpected subscription webhook result.");
            }
            return data;
          },
        })
      : await processCapturedPayment(parsedPayload, {
          getStoredOrder: async (orderId) => {
            const { data, error } = await supabase
              .from("payments")
              .select("razorpay_order_id,user_id,plan,amount,currency,status,razorpay_payment_id,event_id")
              .eq("razorpay_order_id", orderId)
              .maybeSingle();
            if (error) throw error;
            return data as StoredPaymentOrder | null;
          },
          fetchProviderOrder: (orderId) => getRazorpayClient().orders.fetch(orderId),
          recordCapture: async (payment, userId, plan) => {
            const { data, error } = await supabase.rpc("record_razorpay_capture", {
              p_payment_id: payment.paymentId,
              p_order_id: payment.orderId,
              p_event_id: payment.eventId,
              p_user_id: userId,
              p_plan: plan,
              p_amount: payment.amount,
              p_currency: payment.currency,
            });
            if (error) throw error;
            if (data !== "recorded" && data !== "duplicate") {
              throw new Error("Unexpected payment capture result.");
            }
            return data;
          },
        });
    return NextResponse.json({ status: result });
  } catch (error) {
    if (
      error instanceof WebhookValidationError ||
      error instanceof SubscriptionValidationError
    ) {
      return errorResponse(error.message, 400);
    }
    console.error(
      "Razorpay webhook processing failed:",
      error instanceof Error ? error.message : "Unknown payment processing error.",
    );
    return errorResponse("Unable to process verified payment.", 503);
  }
}
