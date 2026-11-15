export type AuthAction = "signup" | "login";

export function getAuthErrorMessage(error: unknown, action: AuthAction): string {
  const authError = error as { code?: string; name?: string; message?: string } | null;
  const code = authError?.code?.toLowerCase();
  const message = authError?.message?.toLowerCase() || "";

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the verification link.";
  }
  if (["user_already_exists", "email_exists", "user_exists"].includes(code || "")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (code === "weak_password") {
    return "Choose a stronger password and try again.";
  }
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return "Too many authentication attempts. Wait a moment, then try again.";
  }
  if (code === "signup_disabled") {
    return "New account registration is currently unavailable.";
  }
  if (code === "email_address_invalid" || code === "validation_failed") {
    return "Enter a valid email address.";
  }
  if (
    authError?.name === "TypeError" ||
    authError?.name === "AuthRetryableFetchError" ||
    /network|fetch|timeout|load failed/.test(message)
  ) {
    return "Unable to reach the authentication service. Check your connection and try again.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (/^(payment|checkout|the payment provider|unable to create a secure payment order|the payment service|unable to verify payment)/i.test(authError?.message || "")) {
    return authError?.message || "Payment processing is temporarily unavailable.";
  }

  return action === "signup"
    ? "Unable to create your account right now. Please try again."
    : "Unable to sign in right now. Please try again.";
}

export function validateSignupInput(fullName: string, email: string, password: string): string | null {
  if (!fullName.trim() || !email.trim() || !password) {
    return "All fields are required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

export function validateLoginInput(email: string, password: string): string | null {
  if (!email.trim() || !password) {
    return "Email and password are required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address.";
  }
  return null;
}
