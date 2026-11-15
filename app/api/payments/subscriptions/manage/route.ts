import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { getAuthenticatedUser } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { getRazorpayClient } from "@/lib/razorpay";

const rateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 10 });

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (!rateLimiter.check(ip).allowed) {
    return errorResponse("Too Many Requests", 429);
  }

  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse("Unauthorized", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return errorResponse("Subscription management is not configured.", 503);
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin
      .from("razorpay_subscriptions")
      .select("razorpay_subscription_id,product,status,paid_through")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({
      subscription: data
        ? {
            id: data.razorpay_subscription_id,
            product: data.product,
            status: data.status,
            paidThrough: data.paid_through,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Razorpay subscription lookup failed:",
      error instanceof Error ? error.message : "Unknown subscription lookup error.",
    );
    return errorResponse("Unable to load subscription details.", 503);
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (!rateLimiter.check(ip).allowed) {
    return errorResponse("Too Many Requests", 429);
  }

  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse("Unauthorized", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return errorResponse("Subscription management is not configured.", 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid subscription management request.", 400);
  }
  if (typeof body !== "object" || body === null) {
    return errorResponse("Invalid subscription management request.", 400);
  }

  const request = body as Record<string, unknown>;
  const subscriptionId = request.subscriptionId;
  const action = request.action;
  if (
    typeof subscriptionId !== "string" ||
    !/^sub_[A-Za-z0-9]+$/.test(subscriptionId) ||
    (action !== "cancel" && action !== "pause" && action !== "resume")
  ) {
    return errorResponse("Invalid subscription management request.", 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: subscription, error } = await admin
      .from("razorpay_subscriptions")
      .select("razorpay_subscription_id,paid_through")
      .eq("razorpay_subscription_id", subscriptionId)
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (error) throw error;
    if (!subscription) {
      return errorResponse("Subscription was not found for this account.", 404);
    }

    const razorpay = getRazorpayClient();
    const paidPeriodRemains = Boolean(
      subscription.paid_through &&
      Date.parse(subscription.paid_through) > Date.now(),
    );
    const result = action === "cancel"
      ? await razorpay.subscriptions.cancel(subscriptionId, paidPeriodRemains)
      : action === "pause"
        ? await razorpay.subscriptions.pause(subscriptionId, { pause_at: "now" })
        : await razorpay.subscriptions.resume(subscriptionId, { resume_at: "now" });

    return NextResponse.json({
      status: result.status,
      message: "Request sent to Razorpay. Access changes only after verified webhook events.",
    });
  } catch (error) {
    console.error(
      "Razorpay subscription management failed:",
      error instanceof Error ? error.message : "Unknown subscription management error.",
    );
    return errorResponse("Unable to update the subscription with the provider.", 503);
  }
}
