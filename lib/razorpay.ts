import Razorpay from "razorpay";

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

export const razorpayClient = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});
