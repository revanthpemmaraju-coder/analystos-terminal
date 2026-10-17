import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getRazorpayClient, isPaymentProcessingConfigured } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  if (!isPaymentProcessingConfigured()) {
    return NextResponse.json(
      { error: "Paid subscriptions are temporarily unavailable." },
      { status: 503 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Payment service is temporarily unavailable." },
      { status: 503 }
    );
  }

  const accessToken = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("plan" in body)) {
    return NextResponse.json({ error: "A plan is required." }, { status: 400 });
  }

  const plan = body.plan;
  let amount: number;
  if (plan === "pro") {
    amount = 49_900;
  } else if (plan === "analyst") {
    amount = 149_900;
  } else {
    return NextResponse.json({ error: "Invalid plan option." }, { status: 400 });
  }

  try {
    const order = await getRazorpayClient().orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${user.id}_${Date.now()}`,
      notes: { userId: user.id, plan },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error(
      "Razorpay order creation failed:",
      error instanceof Error ? error.message : "Unknown provider error."
    );
    return NextResponse.json(
      { error: "Unable to create a payment order." },
      { status: 502 }
    );
  }
}
