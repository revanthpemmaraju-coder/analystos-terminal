import { NextRequest, NextResponse } from "next/server";
import { razorpayClient } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const { plan, userId } = await req.json();

    if (!plan || !userId) {
      return new NextResponse("Bad Request: 'plan' and 'userId' are required.", { status: 400 });
    }

    // Determine billing amount based on plan
    let amount = 0;
    if (plan === "pro") {
      amount = 49900; // ₹499 in paise
    } else if (plan === "analyst") {
      amount = 149900; // ₹1499 in paise
    } else {
      return new NextResponse("Invalid Plan Option", { status: 400 });
    }

    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: {
        userId,
        plan
      }
    };

    // Create secure transaction order token using Razorpay bindings
    const order = await razorpayClient.orders.create(options);

    return NextResponse.json(order);

  } catch (err: any) {
    console.error("Razorpay order compilation failed:", err);
    return new NextResponse("Internal Razorpay Server Error", { status: 500 });
  }
}
