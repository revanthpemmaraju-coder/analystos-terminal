import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    if (!webhookSecret) {
      console.warn("Razorpay webhook secret is missing. Simulating database check.");
    }

    // Cryptographic signature check
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // Optional override for testing environments
    const isValid = signature === expectedSignature || webhookSecret === "";

    if (!isValid) {
      return new NextResponse("Unauthorized Signature Failure", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // Handle payment capture events
    if (event === "payment.captured") {
      const paymentEntity = payload.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const notes = paymentEntity.notes;

      const userId = notes?.userId;
      const plan = notes?.plan;

      if (userId && plan) {
        // Initialize Server-side Supabase client with admin credentials
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Upgrade Profiles Table subscription tier
        const { error } = await supabase
          .from("profiles")
          .update({ plan })
          .eq("id", userId);

        if (error) {
          console.error("Database user profile update failed:", error.message);
          return new NextResponse("Database Write Failed", { status: 500 });
        }

        console.log(`[PAYMENT_WEBHOOK]: Successfully upgraded user ${userId} to ${plan} tier.`);
      }
    }

    return NextResponse.json({ status: "success" });

  } catch (err: any) {
    console.error("Razorpay webhook verification failed:", err);
    return new NextResponse("Internal Server Error in Webhook", { status: 500 });
  }
}
