/* eslint-disable */
"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Shield, Mail, Lock, User, RefreshCw, Sparkles, CheckCircle } from "lucide-react";
import TickerBar from "@/components/ticker-bar";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (searchParams.get("upgrade") === "true") {
      setSelectedPlan("pro");
    }
  }, [searchParams]);

  // If session is already active, redirect
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push("/dashboard");
      }
    }
    checkSession();
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return setErrorMsg("All fields are required.");
    if (password.length < 8) return setErrorMsg("Password must be at least 8 characters.");
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // 1. Sign up user via Supabase Auth client
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            plan: selectedPlan
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // 2. Add profile metadata row inside public.profiles
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              id: data.user.id,
              email: email,
              name: fullName,
              plan: selectedPlan,
              questions_used_today: 0,
              created_at: new Date()
            }
          ]);

        if (profileError) {
          console.warn("DB profile insert warning:", profileError.message);
        }

        // 3. Paid plan transition handler
        if (selectedPlan !== "free") {
          setSuccessMsg("✓ Credentials configured! Connecting payment node...");
          setTimeout(() => {
            triggerRazorpayPayment(data.user, selectedPlan);
          }, 1000);
        } else {
          setSuccessMsg("✓ Registration successful! Redirecting to terminal cockpit...");
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed creating credentials node.");
      setLoading(false);
    }
  };

  const triggerRazorpayPayment = (user: any, plan: "pro" | "analyst") => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_XXXXXXXXXXXXXXXX",
        amount: plan === "pro" ? 49900 : 149900,
        currency: "INR",
        name: "AnalystOS Terminal",
        description: `${plan.toUpperCase()} Tier Professional Subscription`,
        prefill: {
          email: user.email,
          name: fullName
        },
        theme: {
          color: "#00f0ff"
        },
        handler: async function (response: any) {
          // Record successful plan state inside Supabase
          const { error: saveError } = await supabase
            .from("profiles")
            .upsert({
              id: user.id,
              email: user.email,
              name: fullName,
              plan: plan,
              created_at: new Date()
            });

          if (saveError) {
            console.error("Failed to update profile to paid tier:", saveError.message);
          }

          setSuccessMsg(`✓ ${plan.toUpperCase()} plan active. Launching dashboard...`);
          setTimeout(() => {
            router.push("/dashboard");
          }, 1200);
        },
        modal: {
          ondismiss: function () {
            setSuccessMsg("✓ Profile generated on FREE tier. Upgrade anytime via dashboard.");
            setTimeout(() => {
              router.push("/dashboard");
            }, 2000);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };
    script.onerror = () => {
      setErrorMsg("Failed loading secure Razorpay checkout script.");
      setLoading(false);
    };
    document.body.appendChild(script);
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
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">Configure Credentials</h2>
            <p className="text-slate-400 text-xs font-sans">Initialize access nodes and subscription plans.</p>
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
            
            {/* Full Name */}
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
                  placeholder="you@firm.com"
                  className="flex-1 bg-transparent px-3 py-2.5 text-white outline-none border-none"
                />
              </div>
            </div>

            {/* Password */}
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

            {/* Subscription Tiers Grid */}
            <div className="flex flex-col space-y-1.5 pt-2">
              <label className="text-slate-400 font-bold uppercase text-[10px]">SELECT SUBSCRIPTION PLAN</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "free", name: "FREE", desc: "₹0/mo", detail: "5 AI/day" },
                  { id: "pro", name: "PRO", desc: "₹499/mo", detail: "Unlimited AI" },
                  { id: "analyst", name: "ANALYST", desc: "₹1,499/mo", detail: "Elite Career OS" }
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
                <span>PAYMENT VIA SECURE RAZORPAY PORTAL AFTER REGISTRATION</span>
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
                  <span>INITIALIZE SUBSCRIBER KEY →</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center text-[10px] text-slate-400 font-sans pt-2">
            Already configured credentials?{" "}
            <Link href="/login" className="text-[#00f0ff] hover:underline font-mono">
              [LOG_IN]
            </Link>
          </div>
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
