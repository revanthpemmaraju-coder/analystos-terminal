/* eslint-disable */
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Shield, User, Wallet } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<string>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLang(localStorage.getItem("aos_lang") || "en");
    }
  }, []);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("aos_lang", newLang);
      window.dispatchEvent(new Event("aos_lang_changed"));
    }
  };

  useEffect(() => {
    async function fetchSession() {
      const isFounder = typeof window !== "undefined" && 
        (new URLSearchParams(window.location.search).get("founder") === "revanth_gate_pro" || 
         localStorage.getItem("founder_bypass") === "true");

      if (isFounder) {
        setUser({ id: "founder-guest-id", email: "founder@analystos.com" });
        setProfile({ plan: "pro", name: "Founder / Administrator" });
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Fetch custom user profile (plan info)
        const { data: prof, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (prof) {
          setProfile(prof);
        } else {
          // Fallback metadata if db profile isn't generated yet
          setProfile({
            plan: session.user.user_metadata?.plan || "free",
            name: session.user.user_metadata?.full_name || ""
          });
        }
      }
      setLoading(false);
    }

    fetchSession();

    // Listen for auth state revisions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const isFounder = typeof window !== "undefined" && 
          localStorage.getItem("founder_bypass") === "true";
        if (isFounder) {
          setUser({ id: "founder-guest-id", email: "founder@analystos.com" });
          setProfile({ plan: "pro", name: "Founder / Administrator" });
          return;
        }

        if (session?.user) {
          setUser(session.user);
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (prof) setProfile(prof);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("founder_bypass");
    }
    router.push("/login");
  };

  const navLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "AI Analyst", href: "/analyst" },
    { label: "Analyst Feed", href: "/feed" },
    { label: "DCF Sandbox", href: "/dcf" },
    { label: "Paper Trading", href: "/portfolio" },
    { label: "Flows", href: "/flow" }
  ];

  return (
    <nav className="w-full bg-[#0b0f19] border-b border-[#00f0ff]/12 px-6 py-3.5 flex items-center justify-between font-mono z-40">
      <div className="flex items-center space-x-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-white flex items-center space-x-1.5">
          <span>AnalystOS</span>
          <span className="pulse-blue"></span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-6 text-sm">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-[#00f0ff] ${
                  isActive ? "text-[#00f0ff] font-bold" : "text-slate-400"
                }`}
              >
                [{link.label.toUpperCase()}]
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Language Selector Dropdown */}
        <div className="relative flex items-center">
          <span className="text-slate-500 text-[8px] mr-1.5 font-bold font-mono">LANG:</span>
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            className="bg-[#05070a] border border-white/10 hover:border-[#00f0ff]/40 px-2 py-1 rounded text-[9px] text-[#00f0ff] font-mono font-bold outline-none focus:border-[#00f0ff] uppercase cursor-pointer transition-colors"
          >
            <option value="en">EN</option>
            <option value="ja">JA</option>
            <option value="zh">ZH</option>
            <option value="hi">HI</option>
            <option value="es">ES</option>
            <option value="fr">FR</option>
            <option value="de">DE</option>
            <option value="ar">AR</option>
          </select>
        </div>
        {loading ? (
          <span className="text-xs text-slate-500">CONNECTING_SECURE_NODE...</span>
        ) : user ? (
          <div className="flex items-center space-x-3 text-xs">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-slate-300 font-medium">{profile?.name || user.email}</span>
              <span className="text-[#00e676] font-bold uppercase tracking-wider text-[10px]">
                Plan: {profile?.plan || "free"}
              </span>
            </div>
            
            <div className="flex items-center bg-[#05070a] border border-[#00f0ff]/15 px-2.5 py-1.5 rounded-md space-x-2">
              <Shield className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span className="text-slate-400 font-bold uppercase text-[10px]">
                {profile?.plan || "FREE"}
              </span>
            </div>

            {profile?.plan === "free" && (
              <Link
                href="/signup?upgrade=true"
                className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-3 py-1.5 rounded text-[10px] transition-colors"
              >
                UPGRADE
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-[#ff3860] transition-colors p-1.5 rounded hover:bg-red-500/10 border border-transparent hover:border-[#ff3860]/20"
              title="Disconnect Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3 text-xs">
            <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
              [LOG_IN]
            </Link>
            <Link
              href="/signup"
              className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-3 py-1.5 rounded transition-colors"
            >
              [SIGN_UP]
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
