import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

interface RazorpayWebhook {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        order_id?: string;
        notes?: {
          userId?: string;
          plan?: string;
        };
      };
    };
  };
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Payment processing is temporarily unavailable." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!/^[a-f\d]{64}$/i.test(signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: RazorpayWebhook;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (payload.event !== "payment.captured") {
    return NextResponse.json({ status: "ignored" });
  }

  const payment = payload.payload?.payment?.entity;
  const userId = payment?.notes?.userId;
  const plan = payment?.notes?.plan;
  if (
    !payment?.order_id ||
    !userId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ||
    (plan !== "pro" && plan !== "analyst")
  ) {
    return NextResponse.json({ error: "Invalid payment details." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase
    .from("profiles")
    .update({ plan })
    .eq("id", userId);

  if (error) {
    console.error("Payment entitlement update failed:", error.message);
    return NextResponse.json(
      { error: "Unable to update the subscription." },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "success" });
}
