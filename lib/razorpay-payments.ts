import { createHmac, timingSafeEqual } from "node:crypto";

type JsonRecord = Record<string, unknown>;

export const RAZORPAY_PLANS = {
  pro: { amount: 49900, currency: "INR" },
  analyst: { amount: 149900, currency: "INR" },
} as const;

export type PaidPlan = keyof typeof RAZORPAY_PLANS;

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "pro" || value === "analyst";
}

export interface StoredPaymentOrder {
  razorpay_order_id: string;
  user_id: string;
  plan: PaidPlan;
  amount: number;
  currency: string;
  status: "created" | "captured";
  razorpay_payment_id: string | null;
  event_id: string | null;
}

export interface CapturedPayment {
  eventId: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
}

export class WebhookValidationError extends Error {}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isId(value: unknown, prefix: string): value is string {
  return typeof value === "string" && new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value);
}

export function verifyRazorpaySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature) || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  if (
    !isId(orderId, "order") ||
    !isId(paymentId, "pay") ||
    !/^[a-f0-9]{64}$/i.test(signature) ||
    !secret
  ) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function validateCheckoutPayment(
  providerPayment: unknown,
  providerOrder: unknown,
  storedOrder: StoredPaymentOrder | null,
  authenticatedUserId: string,
  expectedOrderId: string,
  expectedPaymentId: string,
): { userId: string; plan: PaidPlan; captured: boolean } {
  if (
    !storedOrder ||
    !isRecord(providerPayment) ||
    !isRecord(providerOrder) ||
    !isPaidPlan(storedOrder.plan)
  ) {
    throw new WebhookValidationError("Payment order was not found or is invalid.");
  }

  const plan = storedOrder.plan;
  const product = RAZORPAY_PLANS[plan];
  const notes = isRecord(providerOrder.notes) ? providerOrder.notes : {};
  const captured = providerPayment.status === "captured" && providerPayment.captured === true;
  const pending =
    (providerPayment.status === "authorized" && providerPayment.captured === false) ||
    (providerPayment.status === "created" && providerPayment.captured === false);

  if (
    (!captured && !pending) ||
    storedOrder.user_id !== authenticatedUserId ||
    storedOrder.razorpay_order_id !== expectedOrderId ||
    storedOrder.amount !== product.amount ||
    storedOrder.currency !== product.currency ||
    providerPayment.id !== expectedPaymentId ||
    providerPayment.order_id !== expectedOrderId ||
    providerPayment.amount !== product.amount ||
    providerPayment.currency !== product.currency ||
    providerOrder.id !== expectedOrderId ||
    providerOrder.amount !== product.amount ||
    providerOrder.currency !== product.currency ||
    notes.userId !== authenticatedUserId ||
    notes.plan !== plan ||
    (captured &&
      (providerOrder.status !== "paid" ||
        providerOrder.amount_paid !== product.amount)) ||
    (pending && providerOrder.status === "paid")
  ) {
    throw new WebhookValidationError(
      "Captured payment does not match its authenticated order.",
    );
  }

  return { userId: storedOrder.user_id, plan, captured };
}

export function parseCapturedPayment(payload: unknown): CapturedPayment | null {
  if (!isRecord(payload)) throw new WebhookValidationError("Invalid webhook payload.");
  if (payload.event !== "payment.captured") return null;
  if (!isId(payload.id, "evt")) throw new WebhookValidationError("Missing webhook event ID.");

  const payloadData = isRecord(payload.payload) ? payload.payload : null;
  const paymentData = payloadData && isRecord(payloadData.payment) ? payloadData.payment : null;
  const payment = paymentData && isRecord(paymentData.entity) ? paymentData.entity : null;
  if (!payment) throw new WebhookValidationError("Missing captured payment data.");

  const orderId = payment.order_id;
  const paymentId = payment.id;
  const amount = payment.amount;
  const currency = payment.currency;
  if (
    !isId(paymentId, "pay") ||
    !isId(orderId, "order") ||
    payment.status !== "captured" ||
    payment.captured !== true ||
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    typeof currency !== "string"
  ) {
    throw new WebhookValidationError("Invalid captured payment data.");
  }

  return {
    eventId: payload.id,
    paymentId,
    orderId,
    amount,
    currency,
  };
}

export function validateCapturedPaymentOrder(
  payment: CapturedPayment,
  storedOrder: StoredPaymentOrder | null,
  providerOrder: unknown,
): { userId: string; plan: PaidPlan } {
  if (!storedOrder || !isRecord(providerOrder)) {
    throw new WebhookValidationError("Payment order was not found.");
  }

  if (!isPaidPlan(storedOrder.plan)) {
    throw new WebhookValidationError("Payment order has an invalid plan.");
  }
  const plan = storedOrder.plan;
  const product = RAZORPAY_PLANS[plan];
  const notes = isRecord(providerOrder.notes) ? providerOrder.notes : {};
  const validUserId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    !validUserId.test(storedOrder.user_id) ||
    (storedOrder.status !== "created" && storedOrder.status !== "captured") ||
    storedOrder.razorpay_order_id !== payment.orderId ||
    storedOrder.amount !== product.amount ||
    storedOrder.currency !== product.currency ||
    payment.amount !== product.amount ||
    payment.currency !== product.currency ||
    providerOrder.id !== payment.orderId ||
    providerOrder.amount !== product.amount ||
    providerOrder.currency !== product.currency ||
    providerOrder.status !== "paid" ||
    providerOrder.amount_paid !== product.amount ||
    notes.userId !== storedOrder.user_id ||
    notes.plan !== plan
  ) {
    throw new WebhookValidationError("Captured payment does not match its authenticated order.");
  }

  return { userId: storedOrder.user_id, plan };
}

export async function processCapturedPayment(
  payload: unknown,
  dependencies: {
    getStoredOrder: (orderId: string) => Promise<StoredPaymentOrder | null>;
    fetchProviderOrder: (orderId: string) => Promise<unknown>;
    recordCapture: (payment: CapturedPayment, userId: string, plan: PaidPlan) => Promise<"recorded" | "duplicate">;
  },
): Promise<"ignored" | "recorded" | "duplicate"> {
  const payment = parseCapturedPayment(payload);
  if (!payment) return "ignored";

  const storedOrder = await dependencies.getStoredOrder(payment.orderId);
  if (!storedOrder) throw new WebhookValidationError("Payment order was not found.");
  const providerOrder = await dependencies.fetchProviderOrder(payment.orderId);
  const { userId, plan } = validateCapturedPaymentOrder(payment, storedOrder, providerOrder);
  return dependencies.recordCapture(payment, userId, plan);
}
