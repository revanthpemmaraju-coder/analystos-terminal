import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

export default async function handler(req, res) {
  // CORS Headers for global payment gateways
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

  // Graceful fallback to simulation mode if keys aren't configured yet
  if (!keyId || !keySecret || keyId === "your-razorpay-key-id") {
    console.warn("Razorpay credentials missing. Generating order in Simulation Mode.");
    return res.status(200).json({
      id: "order_simulated_" + Math.random().toString(36).substring(2, 12),
      amount: 49900,
      currency: "INR",
      simulation: true
    });
  }

  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const options = {
      amount: 49900, // ₹499 in paise
      currency: "INR",
      receipt: "receipt_order_" + Math.random().toString(36).substring(2, 10),
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);

  } catch (error) {
    console.error("Razorpay Order Creation Failed:", error);
    return res.status(500).send("Payment Gateway initialization error.");
  }
}
