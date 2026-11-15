import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";
import { createRateLimiter } from "@/lib/rate-limit";
import { getRazorpayClient } from "@/lib/razorpay";
import {
  isPaidPlan,
  validateCheckoutPayment,
  verifyCheckoutSignature,
  WebhookValidationError,
  type StoredPaymentOrder,
} from "@/lib/razorpay-payments";

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
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!supabaseUrl || !serviceKey || !keyId || !keySecret) {
    return errorResponse("Payment verification is not configured.", 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid payment verification request.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("Invalid payment verification request.", 400);
  }
  const callback = body as Record<string, unknown>;
  const orderId = callback.razorpay_order_id;
  const paymentId = callback.razorpay_payment_id;
  const signature = callback.razorpay_signature;
  if (
    typeof orderId !== "string" ||
    typeof paymentId !== "string" ||
    typeof signature !== "string" ||
    !verifyCheckoutSignature(orderId, paymentId, signature, keySecret)
  ) {
    return errorResponse("Payment signature verification failed.", 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: storedOrder, error: orderError } = await supabase
      .from("payments")
      .select(
        "razorpay_order_id,user_id,plan,amount,currency,status,razorpay_payment_id,event_id",
      )
      .eq("razorpay_order_id", orderId)
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!storedOrder || !isPaidPlan(storedOrder.plan)) {
      return errorResponse("Payment order was not found for this account.", 404);
    }

    const razorpay = getRazorpayClient();
    const [providerPayment, providerOrder] = await Promise.all([
      razorpay.payments.fetch(paymentId),
      razorpay.orders.fetch(orderId),
    ]);
    const verified = validateCheckoutPayment(
      providerPayment,
      providerOrder,
      storedOrder as StoredPaymentOrder,
      authUser.id,
      orderId,
      paymentId,
    );
    if (!verified.captured) {
      return NextResponse.json(
        { status: "pending", message: "Waiting for payment capture confirmation." },
        { status: 202 },
      );
    }

    // The deterministic checkout event key makes callback retries idempotent.
    // A later webhook for the same payment is independently deduplicated by the RPC.
    const eventId = `evt_checkout${paymentId.slice(4)}`;
    const { data, error } = await supabase.rpc("record_razorpay_capture", {
      p_payment_id: paymentId,
      p_order_id: orderId,
      p_event_id: eventId,
      p_user_id: verified.userId,
      p_plan: verified.plan,
      p_amount: providerPayment.amount,
      p_currency: providerPayment.currency,
    });
    if (error) throw error;
    if (data !== "recorded" && data !== "duplicate") {
      throw new Error("Unexpected payment capture result.");
    }
    return NextResponse.json({ status: data });
  } catch (error) {
    if (error instanceof WebhookValidationError) {
      return errorResponse(error.message, 400);
    }
    console.error(
      "Razorpay checkout verification failed:",
      error instanceof Error ? error.message : "Unknown payment verification error.",
    );
    return errorResponse("Unable to verify payment with the provider.", 503);
  }
}
