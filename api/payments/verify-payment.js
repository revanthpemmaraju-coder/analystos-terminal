import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // CORS Headers for secure transaction validation
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, userId, simulation } = req.body;

  // Handle local Simulation Mode for testing before adding live keys
  if (simulation || !keyId || !keySecret || keyId === "your-razorpay-key-id") {
    console.warn("Verify Payment triggered in Simulation Mode.");
    
    if (supabaseUrl && supabaseAnonKey && supabaseUrl !== "your-supabase-url" && userId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { error } = await supabase
          .from("profiles")
          .update({ is_premium: true })
          .eq("id", userId);
        
        if (error) {
          console.error("Failed to update profile to premium in simulation:", error.message);
        }
      } catch (err) {
        console.error("Supabase connection failed in simulation:", err);
      }
    }
    
    return res.status(200).json({
      verified: true,
      message: "Simulation: Payment verified and membership activated!"
    });
  }

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).send("Bad Request: Missing transaction signatures.");
  }

  try {
    // Generate signature using strict SHA-256 HMAC
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("Security mismatch on payment signature verification.");
      return res.status(400).send("Signature validation mismatch. Payment rejected.");
    }

    // Update user profile status in Supabase
    if (supabaseUrl && supabaseAnonKey && userId) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("id", userId);

      if (error) {
        console.error("Payment verified but Supabase profile update failed:", error.message);
        return res.status(500).send("Payment verified but profile update failed.");
      }
    }

    return res.status(200).json({
      verified: true,
      message: "Payment successfully verified and subscription activated!"
    });

  } catch (error) {
    console.error("Payment Verification crashed:", error);
    return res.status(500).send("Internal validation error.");
  }
}
