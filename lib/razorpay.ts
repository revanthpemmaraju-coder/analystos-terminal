import Razorpay from "razorpay";

type ErrorRecord = Record<string, unknown>;

export type RazorpayErrorDetails = {
  name?: string;
  message?: string;
  statusCode?: string | number;
  code?: string;
  description?: string;
  source?: string;
  step?: string;
  reason?: string;
};

function isErrorRecord(value: unknown): value is ErrorRecord {
  return typeof value === "object" && value !== null;
}

function getLogText(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.replace(/[\r\n\t]+/g, " ").slice(0, 300);
}

export function getRazorpayErrorDetails(error: unknown): RazorpayErrorDetails {
  if (!isErrorRecord(error)) {
    return { message: getLogText(String(error)) };
  }

  const providerError = isErrorRecord(error.error) ? error.error : undefined;
  const statusCode =
    typeof error.statusCode === "number" || typeof error.statusCode === "string"
      ? error.statusCode
      : undefined;
  const name = getLogText(error.name);
  const message = getLogText(error.message);
  const code = getLogText(providerError?.code);
  const description = getLogText(providerError?.description);
  const source = getLogText(providerError?.source);
  const step = getLogText(providerError?.step);
  const reason = getLogText(providerError?.reason);

  return {
    ...(name ? { name } : {}),
    ...(message ? { message } : {}),
    statusCode,
    ...(code ? { code } : {}),
    ...(description ? { description } : {}),
    ...(source ? { source } : {}),
    ...(step ? { step } : {}),
    ...(reason ? { reason } : {}),
  };
}

export function getRazorpayClient(): Razorpay {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

  if (!keyId || !keySecret) {
    throw new Error("Razorpay server credentials are not configured.");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}
