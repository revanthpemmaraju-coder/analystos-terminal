/* eslint-disable */
"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth, supabase } from "@/lib/supabase";
import { getAuthErrorMessage, validateSignupInput } from "@/lib/auth-errors";
import { Shield, Mail, Lock, User, RefreshCw, Sparkles, CheckCircle } from "lucide-react";
import TickerBar from "@/components/ticker-bar";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [upgradeUser, setUpgradeUser] = useState<{ email?: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "analyst">("free");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Restore native cursor (landing page hides it globally via cursor: none)
  useEffect(() => {
    document.body.classList.add("page-signup");
    return () => document.body.classList.remove("page-signup");
  }, []);

  // Sync plan upgrade request if routed with ?upgrade=true
  useEffect(() => {
    const requestedPlan = searchParams.get("plan");
    const plan = requestedPlan === "free" || requestedPlan === "pro" || requestedPlan === "analyst"
      ? requestedPlan
      : null;
    if (searchParams.get("upgrade") === "true") {
      setSelectedPlan(plan === "pro" || plan === "analyst" ? plan : "pro");
    } else if (plan) {
      setSelectedPlan(plan);
    }
  }, [searchParams]);

  // If session is already active, redirect
  useEffect(() => {
    let active = true;
    async function checkSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        if (active) setErrorMsg(getAuthErrorMessage(error, "signup"));
        return;
      }
      if (session?.user) {
        if (searchParams.get("upgrade") === "true") {
          setUpgradeUser({ email: session.user.email });
          setEmail(session.user.email || "");
          setFullName(session.user.user_metadata?.full_name || "");
          const requestedPlan = searchParams.get("plan");
          setSelectedPlan(requestedPlan === "analyst" ? "analyst" : "pro");
        } else {
          router.replace("/dashboard");
        }
      }
    }
    void checkSession().catch((error: unknown) => {
      if (active) setErrorMsg(getAuthErrorMessage(error, "signup"));
    });
    return () => {
      active = false;
    };
  }, [router, searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (upgradeUser) {
      if (selectedPlan === "free") {
        setErrorMsg("Select a paid plan to continue with your upgrade.");
        return;
      }
      setErrorMsg("");
      setSuccessMsg("✓ Connecting to secure payment node...");
      setLoading(true);
      try {
        await triggerRazorpayPayment(upgradeUser, selectedPlan);
      } catch (error: unknown) {
        setErrorMsg(getAuthErrorMessage(error, "signup"));
      } finally {
        setLoading(false);
      }
      return;
    }

    const validationMessage = validateSignupInput(fullName, email, password);
    if (validationMessage) return setErrorMsg(validationMessage);
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: selectedPlan === "free"
            ? `${window.location.origin}/login`
            : `${window.location.origin}/login?upgrade=true&plan=${selectedPlan}`,
          data: {
            full_name: fullName.trim(),
          }
        }
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("The authentication provider did not return an account.");
      }
      if (data.user.identities?.length === 0) {
        setErrorMsg("An account with this email may already exist. Try signing in instead.");
        return;
      }
      if (!data.session) {
        setSuccessMsg(
          selectedPlan === "free"
            ? "✓ Registration complete. Check your email to confirm your account, then sign in."
            : `✓ Registration complete. Confirm your email, then sign in to resume your ${selectedPlan.toUpperCase()} checkout.`,
        );
        return;
      }

      if (selectedPlan !== "free") {
        setSuccessMsg("✓ Credentials configured! Connecting payment node...");
        await triggerRazorpayPayment(data.user, selectedPlan);
      } else {
        setSuccessMsg("✓ Registration successful! Redirecting to terminal cockpit...");
        window.setTimeout(() => router.replace("/dashboard"), 1500);
      }
    
} catch (error: unknown) {
  console.error("[SIGNUP_ERROR]", error);
  setErrorMsg(
    error instanceof Error ? error.message : String(error)
  );
    } finally {
      setLoading(false);
    }
  };

  const triggerRazorpayPayment = async (user: { email?: string }, plan: "pro" | "analyst") => {
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) throw new Error("Payment checkout is not configured.");

    const product = plan === "pro" ? "starter_node" : "ai_copilot";
    const expectedAmount = plan === "pro" ? 250000 : 750000;
    const orderResponse = await fetchWithAuth("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    });
    const subscription = await orderResponse.json().catch(() => null);
    if (!orderResponse.ok) {
      if (orderResponse.status === 503) {
        throw new Error("Payment processing is temporarily unavailable.");
      }
      throw new Error(subscription?.error || "Unable to create a secure subscription.");
    }
    if (
      typeof subscription?.subscription_id !== "string" ||
      subscription.product !== product ||
      subscription.amount !== expectedAmount ||
      subscription.currency !== "INR"
    ) {
      throw new Error("The payment service returned an invalid subscription.");
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        try {
          const checkout = new (window as any).Razorpay({
            key,
            subscription_id: subscription.subscription_id,
            name: "AnalystOS Terminal",
            description: plan === "pro" ? "Starter Node monthly subscription" : "AI Co-Pilot monthly subscription",
            prefill: { email: user.email, name: fullName.trim() },
            theme: { color: "#00f0ff" },
            handler: async (response: {
              razorpay_subscription_id?: string;
              razorpay_payment_id?: string;
              razorpay_signature?: string;
            }) => {
              try {
                if (
                  response.razorpay_subscription_id !== subscription.subscription_id ||
                  !response.razorpay_payment_id ||
                  !response.razorpay_signature
                ) {
                  throw new Error("The payment provider returned incomplete verification details.");
                }

                setSuccessMsg("Authorization received. Waiting for server-confirmed subscription activation...");
                for (let attempt = 0; attempt < 15; attempt += 1) {
                  const verificationResponse = await fetchWithAuth("/api/payments/subscriptions/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(response),
                  });
                  const verification = await verificationResponse.json().catch(() => null);
                  if (
                    verificationResponse.ok &&
                    verification?.status === "active"
                  ) {
                    setSuccessMsg("✓ Subscription payment verified and access is active. Redirecting...");
                    router.replace("/dashboard");
                    resolve();
                    return;
                  }
                  if (!verificationResponse.ok) {
                    throw new Error(
                      verification?.error || "Unable to verify the subscription. Your plan was not changed.",
                    );
                  }
                  if (verification?.status === "inactive") {
                    throw new Error(
                      "The subscription did not activate. Your account remains on its current plan.",
                    );
                  }

                  setSuccessMsg(
                    "Subscription authorization is confirmed. Waiting for the verified billing event...",
                  );
                  await new Promise((wait) => window.setTimeout(wait, 2000));
                }

                setSuccessMsg("");
                throw new Error(
                  "Subscription activation is still pending. Your plan has not been changed yet; please check back shortly.",
                );
              } catch (error) {
                reject(error);
              }
            },
            modal: {
              ondismiss: () => {
                setSuccessMsg("");
                reject(
                  new Error("Checkout was closed before subscription confirmation. Your account remains on its current plan."),
                );
              },
            },
          });
          checkout.on("payment.failed", () => {
            setSuccessMsg("");
            reject(new Error("Subscription authorization could not be completed. Your account has not been upgraded."));
            checkout.close();
          });
          checkout.open();
        } catch (error) {
          reject(error);
        }
      };
      script.onerror = () => reject(new Error("Failed to load the secure payment checkout."));
      document.body.appendChild(script);
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />

      <div className="flex-grow flex items-center justify-center p-6 select-none my-6">
        <div className="w-full max-w-lg bg-[#0b0f19] border border-[#00f0ff]/15 rounded-lg p-8 space-y-6 shadow-2xl relative">
          <div className="flex items-center space-x-2 text-xs text-slate-500 justify-center">
            <span className="pulse-blue"></span>
            <span>ANALYSTOS_SECURE_AUTH_NODE</span>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">
              {upgradeUser ? "Upgrade Subscription" : "Configure Credentials"}
            </h2>
            <p className="text-slate-400 text-xs font-sans">
              {upgradeUser ? "Choose a plan and complete secure payment." : "Initialize access nodes and subscription plans."}
            </p>
          </div>

          {errorMsg && (
            <div className="bg-[#ff3860]/10 border border-[#ff3860]/20 text-[#ff3860] px-4 py-2.5 rounded text-xs text-center">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-[#00e676]/10 border border-[#00e676]/20 text-[#00e676] px-4 py-2.5 rounded text-xs text-center">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4 text-xs">
            
            {!upgradeUser && (
              <div className="flex flex-col space-y-1.5">
                <label className="text-slate-400 font-bold uppercase text-[10px]">FULL NAME</label>
                <div className="flex items-center bg-[#05070a] border border-[#00f0ff]/15 rounded overflow-hidden">
                  <span className="bg-[#0b0f19] px-3 py-2.5 text-slate-500 border-r border-[#00f0ff]/10">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="flex-1 bg-transparent px-3 py-2.5 text-white outline-none border-none"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-slate-400 font-bold uppercase text-[10px]">EMAIL ADDRESS</label>
              <div className="flex items-center bg-[#05070a] border border-[#00f0ff]/15 rounded overflow-hidden">
                <span className="bg-[#0b0f19] px-3 py-2.5 text-slate-500 border-r border-[#00f0ff]/10">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  readOnly={Boolean(upgradeUser)}
                  placeholder="you@firm.com"
                  className="flex-1 bg-transparent px-3 py-2.5 text-white outline-none border-none"
                />
              </div>
            </div>

            {!upgradeUser && (
              <div className="flex flex-col space-y-1.5">
                <label className="text-slate-400 font-bold uppercase text-[10px]">PASSWORD</label>
                <div className="flex items-center bg-[#05070a] border border-[#00f0ff]/15 rounded overflow-hidden">
                  <span className="bg-[#0b0f19] px-3 py-2.5 text-slate-500 border-r border-[#00f0ff]/10">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="flex-1 bg-transparent px-3 py-2.5 text-white outline-none border-none"
                  />
                </div>
              </div>
            )}

            {/* Subscription Tiers Grid */}
            <div className="flex flex-col space-y-1.5 pt-2">
              <label className="text-slate-400 font-bold uppercase text-[10px]">SELECT SUBSCRIPTION PLAN</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "free", name: "FREE", desc: "₹0/mo", detail: "5 AI/day" },
                  { id: "pro", name: "STARTER NODE", desc: "₹2,500/mo", detail: "Live Recalculations, client database, fundamental screenings" },
                  { id: "analyst", name: "AI CO-PILOT", desc: "₹7,500/mo", detail: "Flagship terminal, 12ms WebSocket tickers, AI Chat connections" }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedPlan(opt.id as any)}
                    className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${
                      selectedPlan === opt.id
                        ? "border-[#00f0ff] bg-[#00f0ff]/10 text-white font-bold"
                        : "border-slate-800 bg-[#05070a] text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold">{opt.name}</span>
                    <span className="text-xs font-bold text-white mt-1">{opt.desc}</span>
                    <span className="text-[8px] mt-1 text-slate-500 font-sans">{opt.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paid tier badge indicator */}
            {selectedPlan !== "free" && (
              <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/20 p-3 rounded text-center text-[10px] text-[#00f0ff] flex items-center justify-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>PAID CHECKOUT AVAILABILITY DEPENDS ON PAYMENT CONFIGURATION</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold py-3 rounded text-xs transition-colors flex items-center justify-center space-x-2 border border-transparent"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>{upgradeUser ? "CONTINUE TO SECURE PAYMENT →" : "INITIALIZE SUBSCRIBER KEY →"}</span>
                </>
              )}
            </button>
          </form>

          {!upgradeUser && <div className="text-center text-[10px] text-slate-400 font-sans pt-2">
            Already configured credentials?{" "}
            <Link href="/login" className="text-[#00f0ff] hover:underline font-mono">
              [LOG_IN]
            </Link>
          </div>}
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono items-center justify-center space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-400">CONNECTING_SECURE_AUTH_NODE...</span>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
