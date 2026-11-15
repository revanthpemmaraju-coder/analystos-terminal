import { createHmac, timingSafeEqual } from "node:crypto";

type JsonRecord = Record<string, unknown>;

export const SUBSCRIPTION_PRODUCTS = {
  starter_node: {
    amount: 250000,
    currency: "INR",
    entitlement: "pro",
    planIdEnv: "RAZORPAY_STARTER_PLAN_ID",
  },
  ai_copilot: {
    amount: 750000,
    currency: "INR",
    entitlement: "analyst",
    planIdEnv: "RAZORPAY_COPILOT_PLAN_ID",
  },
} as const;

export type SubscriptionProduct = keyof typeof SUBSCRIPTION_PRODUCTS;
export type EntitlementPlan = (typeof SUBSCRIPTION_PRODUCTS)[SubscriptionProduct]["entitlement"];

export const SUBSCRIPTION_CYCLE_COUNT = 100;

export interface StoredRazorpaySubscription {
  razorpay_subscription_id: string;
  razorpay_plan_id: string;
  user_id: string;
  product: SubscriptionProduct;
  entitlement: EntitlementPlan;
  amount: number;
  currency: string;
  status: string;
  paid_through: string | null;
}

export interface RazorpaySubscriptionEvent {
  eventId: string;
  eventType: string;
  subscriptionId: string;
  providerStatus: string;
  planId: string;
  paidCount: number;
  currentStart: string | null;
  currentEnd: string | null;
  endedAt: string | null;
  eventCreatedAt: string;
  paymentId: string | null;
  paymentAmount: number | null;
  currency: string;
}

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.completed",
  "subscription.updated",
  "subscription.pending",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.resumed",
]);

const SUBSCRIPTION_STATUSES = new Set([
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "cancelled",
  "paused",
  "resumed",
  "completed",
  "expired",
]);

export class SubscriptionValidationError extends Error {}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProviderId(value: unknown, prefix: string): value is string {
  return typeof value === "string" && new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value);
}

function unixSecondsToIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new SubscriptionValidationError("Subscription returned an invalid period timestamp.");
  }
  return new Date(value * 1000).toISOString();
}

export function isSubscriptionProduct(value: unknown): value is SubscriptionProduct {
  return value === "starter_node" || value === "ai_copilot";
}

export function getSubscriptionPlanId(
  product: SubscriptionProduct,
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  const planId = environment[SUBSCRIPTION_PRODUCTS[product].planIdEnv]?.trim();
  return planId && /^plan_[A-Za-z0-9]+$/.test(planId) ? planId : null;
}

export function verifySubscriptionSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  secret: string,
): boolean {
  if (
    !isProviderId(paymentId, "pay") ||
    !isProviderId(subscriptionId, "sub") ||
    !/^[a-f0-9]{64}$/i.test(signature) ||
    !secret
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function validateProviderSubscription(
  providerSubscription: unknown,
  storedSubscription: StoredRazorpaySubscription,
  authenticatedUserId: string,
): { status: string; currentStart: string | null; currentEnd: string | null; endedAt: string | null } {
  if (!isRecord(providerSubscription) || !isSubscriptionProduct(storedSubscription.product)) {
    throw new SubscriptionValidationError("Subscription record is invalid.");
  }

  const product = SUBSCRIPTION_PRODUCTS[storedSubscription.product];
  const notes = isRecord(providerSubscription.notes) ? providerSubscription.notes : {};
  const currentStart = unixSecondsToIso(providerSubscription.current_start);
  const currentEnd = unixSecondsToIso(providerSubscription.current_end);
  const endedAt = unixSecondsToIso(providerSubscription.ended_at);

  if (
    !isProviderId(storedSubscription.razorpay_subscription_id, "sub") ||
    providerSubscription.id !== storedSubscription.razorpay_subscription_id ||
    providerSubscription.plan_id !== storedSubscription.razorpay_plan_id ||
    notes.userId !== authenticatedUserId ||
    notes.product !== storedSubscription.product ||
    notes.entitlement !== storedSubscription.entitlement ||
    storedSubscription.user_id !== authenticatedUserId ||
    storedSubscription.entitlement !== product.entitlement ||
    storedSubscription.amount !== product.amount ||
    storedSubscription.currency !== product.currency ||
    !SUBSCRIPTION_STATUSES.has(String(providerSubscription.status))
  ) {
    throw new SubscriptionValidationError("Provider subscription does not match the registered account.");
  }

  if (currentStart && currentEnd && Date.parse(currentEnd) <= Date.parse(currentStart)) {
    throw new SubscriptionValidationError("Subscription billing period is invalid.");
  }

  return {
    status: String(providerSubscription.status),
    currentStart,
    currentEnd,
    endedAt,
  };
}

function parseCapturedPayment(
  value: unknown,
  expectedAmount: number,
  requirePlanAmount: boolean,
): { id: string; amount: number } | null {
  if (!isRecord(value)) return null;
  const isCaptured =
    value.status === "captured" &&
    (value.captured === true || value.captured === 1 || value.captured === "1");
  if (!isCaptured) return null;
  if (
    typeof value.amount !== "number" ||
    !Number.isSafeInteger(value.amount) ||
    value.currency !== "INR"
  ) {
    throw new SubscriptionValidationError("Subscription payment data is invalid.");
  }
  if (!requirePlanAmount && value.amount !== expectedAmount) return null;
  if (
    !isProviderId(value.id, "pay") ||
    value.amount !== expectedAmount
  ) {
    throw new SubscriptionValidationError("Captured subscription payment does not match its plan.");
  }
  return { id: value.id, amount: value.amount };
}

export function parseSubscriptionWebhook(
  payload: unknown,
  storedSubscription: StoredRazorpaySubscription,
  providerSubscription: unknown,
): RazorpaySubscriptionEvent | null {
  if (!isRecord(payload)) throw new SubscriptionValidationError("Invalid subscription webhook payload.");
  if (typeof payload.event !== "string" || !SUBSCRIPTION_EVENTS.has(payload.event)) return null;
  if (!isProviderId(payload.id, "evt")) {
    throw new SubscriptionValidationError("Missing subscription webhook event ID.");
  }

  const payloadData = isRecord(payload.payload) ? payload.payload : null;
  const subscriptionData = payloadData && isRecord(payloadData.subscription) ? payloadData.subscription : null;
  const subscription = subscriptionData && isRecord(subscriptionData.entity) ? subscriptionData.entity : null;
  if (!subscription || !isProviderId(subscription.id, "sub")) {
    throw new SubscriptionValidationError("Missing subscription webhook entity.");
  }
  if (!isRecord(providerSubscription)) {
    throw new SubscriptionValidationError("Unable to validate subscription with the provider.");
  }

  if (!isSubscriptionProduct(storedSubscription.product)) {
    throw new SubscriptionValidationError("Subscription product is invalid.");
  }
  const product = SUBSCRIPTION_PRODUCTS[storedSubscription.product];
  const notes = isRecord(providerSubscription.notes) ? providerSubscription.notes : {};
  if (
    providerSubscription.id !== subscription.id ||
    providerSubscription.plan_id !== storedSubscription.razorpay_plan_id ||
    notes.userId !== storedSubscription.user_id ||
    notes.product !== storedSubscription.product ||
    notes.entitlement !== storedSubscription.entitlement ||
    storedSubscription.entitlement !== product.entitlement ||
    storedSubscription.amount !== product.amount ||
    storedSubscription.currency !== product.currency ||
    !SUBSCRIPTION_STATUSES.has(String(providerSubscription.status))
  ) {
    throw new SubscriptionValidationError("Webhook subscription does not match the registered payment.");
  }

  const paymentData = payloadData && isRecord(payloadData.payment) ? payloadData.payment : null;
  const payment = paymentData && isRecord(paymentData.entity) ? paymentData.entity : null;
  const paymentCanExtendAccess = [
    "subscription.activated",
    "subscription.charged",
    "subscription.completed",
  ].includes(payload.event);
  const capturedPayment = paymentCanExtendAccess
    ? parseCapturedPayment(
        payment,
        product.amount,
        payload.event === "subscription.charged" ||
          payload.event === "subscription.completed",
      )
    : null;
  if (payload.event === "subscription.charged" && !capturedPayment) {
    throw new SubscriptionValidationError("A recurring charge event must contain a captured plan payment.");
  }

  if (typeof payload.created_at !== "number" || !Number.isSafeInteger(payload.created_at)) {
    throw new SubscriptionValidationError("Subscription webhook timestamp is invalid.");
  }
  const providerStatus = String(providerSubscription.status);
  const paidCount = providerSubscription.paid_count;
  if (
    typeof paidCount !== "number" ||
    !Number.isSafeInteger(paidCount) ||
    paidCount < 0 ||
    paidCount > SUBSCRIPTION_CYCLE_COUNT
  ) {
    throw new SubscriptionValidationError("Subscription billing count is invalid.");
  }
  const currentStart = unixSecondsToIso(providerSubscription.current_start);
  const currentEnd = unixSecondsToIso(providerSubscription.current_end);
  if (payload.event === "subscription.charged" && (!currentStart || !currentEnd)) {
    throw new SubscriptionValidationError("A recurring charge must include a provider-confirmed billing period.");
  }

  return {
    eventId: payload.id,
    eventType: payload.event,
    subscriptionId: subscription.id,
    providerStatus,
    planId: String(providerSubscription.plan_id),
    paidCount,
    currentStart,
    currentEnd,
    endedAt: unixSecondsToIso(providerSubscription.ended_at),
    eventCreatedAt: new Date(payload.created_at * 1000).toISOString(),
    paymentId: capturedPayment?.id ?? null,
    paymentAmount: capturedPayment?.amount ?? null,
    currency: product.currency,
  };
}

export async function processSubscriptionWebhook(
  payload: unknown,
  dependencies: {
    getStoredSubscription: (subscriptionId: string) => Promise<StoredRazorpaySubscription | null>;
    fetchProviderSubscription: (subscriptionId: string) => Promise<unknown>;
    fetchProviderPayment: (paymentId: string) => Promise<unknown>;
    recordEvent: (event: RazorpaySubscriptionEvent) => Promise<"recorded" | "duplicate">;
  },
): Promise<"ignored" | "recorded" | "duplicate"> {
  if (!isRecord(payload)) throw new SubscriptionValidationError("Invalid subscription webhook payload.");
  if (typeof payload.event !== "string" || !SUBSCRIPTION_EVENTS.has(payload.event)) return "ignored";
  if (!isProviderId(payload.id, "evt")) {
    throw new SubscriptionValidationError("Missing subscription webhook event ID.");
  }

  const payloadData = isRecord(payload.payload) ? payload.payload : null;
  const subscriptionData = payloadData && isRecord(payloadData.subscription) ? payloadData.subscription : null;
  const subscription = subscriptionData && isRecord(subscriptionData.entity) ? subscriptionData.entity : null;
  if (!subscription || !isProviderId(subscription.id, "sub")) {
    throw new SubscriptionValidationError("Missing subscription webhook entity.");
  }

  const storedSubscription = await dependencies.getStoredSubscription(subscription.id);
  if (!storedSubscription) {
    throw new SubscriptionValidationError("Subscription was not registered for an AnalystOS account.");
  }
  const providerSubscription = await dependencies.fetchProviderSubscription(subscription.id);
  const event = parseSubscriptionWebhook(payload, storedSubscription, providerSubscription);
  if (!event) return "ignored";
  if (event.paymentId) {
    const providerPayment = await dependencies.fetchProviderPayment(event.paymentId);
    if (
      !isRecord(providerPayment) ||
      providerPayment.id !== event.paymentId ||
      providerPayment.subscription_id !== event.subscriptionId ||
      providerPayment.status !== "captured" ||
      !(
        providerPayment.captured === true ||
        providerPayment.captured === 1 ||
        providerPayment.captured === "1"
      ) ||
      providerPayment.amount !== event.paymentAmount ||
      providerPayment.currency !== event.currency
    ) {
      throw new SubscriptionValidationError(
        "Recurring payment could not be verified against its subscription.",
      );
    }
  }
  return dependencies.recordEvent(event);
}
