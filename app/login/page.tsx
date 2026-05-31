/* eslint-disable */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Shield, Mail, Lock, RefreshCw } from "lucide-react";
import TickerBar from "@/components/ticker-bar";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Re-verify if session is already active and redirect
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push("/dashboard");
      }
    }
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setErrorMsg("All fields are required.");
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("✓ Welcome back. Redirecting to terminal cockpit...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Session connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) setErrorMsg(error.message);
    } catch (err: any) {
      setErrorMsg(err.message || "OAuth connection failed.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />

      <div className="flex-1 flex flex-col items-center justify-center p-6 select-none">
        <div className="w-full max-w-md bg-[#0b0f19] border border-[#00f0ff]/15 rounded-lg p-8 space-y-6 shadow-2xl relative">
          <div className="flex items-center space-x-2 text-xs text-slate-500 justify-center">
            <span className="pulse-blue"></span>
            <span>ANALYSTOS_SECURE_AUTH_NODE</span>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">Welcome Back</h2>
            <p className="text-slate-400 text-xs font-sans">Connect credentials to resume analysis.</p>
          </div>

          {errorMsg && (
            <div className="bg-[#ff3860]/10 border border-[#ff3860]/20 text-[#ff3860] px-4 py-2.5 rounded text-xs leading-relaxed text-center">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-[#00e676]/10 border border-[#00e676]/20 text-[#00e676] px-4 py-2.5 rounded text-xs leading-relaxed text-center">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
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

            <div className="flex flex-col space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-slate-400 font-bold uppercase text-[10px]">PASSWORD</label>
                <Link href="/login" className="text-[10px] text-[#00f0ff] hover:underline hover:text-[#00f0ff]/80">
                  FORGOT_KEYS?
                </Link>
              </div>
              <div className="flex items-center bg-[#05070a] border border-[#00f0ff]/15 rounded overflow-hidden">
                <span className="bg-[#0b0f19] px-3 py-2.5 text-slate-500 border-r border-[#00f0ff]/10">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent px-3 py-2.5 text-white outline-none border-none"
                />
              </div>
            </div>

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
                  <span>ESTABLISH SECURE LINK →</span>
                </>
              )}
            </button>
          </form>

          <div className="relative flex py-2 items-center text-[10px] text-slate-500">
            <div className="flex-grow border-t border-slate-900"></div>
            <span className="flex-shrink mx-4 uppercase">OR SECURE OAUTH</span>
            <div className="flex-grow border-t border-slate-900"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full border border-slate-800 hover:border-[#00f0ff] bg-transparent text-slate-300 hover:text-white font-bold py-2.5 rounded text-xs transition-colors"
          >
            CONNECT_GOOGLE_KEY
          </button>

          <div className="text-center text-[10px] text-slate-400 font-sans pt-2">
            No account configured?{" "}
            <Link href="/signup" className="text-[#00f0ff] hover:underline font-mono">
              [SIGN_UP_NOW]
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
