/* eslint-disable */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import * as THREE from "three";
import { 
  Terminal, Shield, ArrowRight, Lock, Unlock, Copy, Check, 
  ExternalLink, Search, BarChart3, LineChart, Cpu, BookOpen, 
  DollarSign, FileText, ChevronRight, RefreshCw, Send, CheckSquare,
  Sparkles, Plus, Award, TrendingUp, AlertTriangle, Command
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TickerBar from "@/components/ticker-bar";
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import PricingCoin from "@/components/pricing-coin";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";


const formatIndianCurrency = (num: number) => {
  if (num >= 10000000) {
    return '₹' + (num / 10000000).toFixed(2) + ' Cr';
  } else if (num >= 100000) {
    return '₹' + (num / 100000).toFixed(2) + ' Lakh';
  }
  return '₹' + num.toLocaleString('en-IN');
};

const TiltCard = ({ children, className, style }: { children: React.ReactNode; className?: string; style?: any }) => {
  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 22 });
  const spotlightX = useMotionValue(0);
  const spotlightY = useMotionValue(0);
  const [opacity, setOpacity] = useState(0);

  const spotlightBg = useMotionTemplate`radial-gradient(350px circle at ${spotlightX}px ${spotlightY}px, rgba(167, 139, 250, 0.15), transparent 80%)`;

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    spotlightX.set(x);
    spotlightY.set(y);
    setOpacity(1);

    const mouseX = x - width / 2;
    const mouseY = y - height / 2;
    rotateX.set(-(mouseY / (height / 2)) * 6);
    rotateY.set((mouseX / (width / 2)) * 6);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
    setOpacity(0);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: "1000px",
        position: "relative",
        ...style
      }}
      className={`${className} overflow-hidden`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-inherit z-10 transition-opacity duration-300"
        style={{
          opacity,
          background: spotlightBg,
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </motion.div>
  );
};

const FloatingStatCard = ({ 
  label, val, sub, className, delay, duration 
}: { 
  label: string; 
  val: string; 
  sub: string; 
  className?: string; 
  delay: number;
  duration: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ 
        opacity: 1,
        y: [0, -15, 0],
        rotateX: [-2, 2, -2],
        rotateY: [2, -2, 2]
      }}
      viewport={{ once: true }}
      transition={{
        opacity: { delay: delay, duration: 0.8 },
        y: { repeat: Infinity, duration: duration, ease: "easeInOut" },
        rotateX: { repeat: Infinity, duration: duration, ease: "easeInOut" },
        rotateY: { repeat: Infinity, duration: duration, ease: "easeInOut" }
      }}
      style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
      className={`w-[160px] bg-white/[0.03] border border-white/[0.08] rounded-2xl flex flex-col justify-between p-4 backdrop-blur-[4px] text-left hover:border-[#a78bfa]/35 hover:bg-white/[0.06] transition-all select-none ${className}`}
    >
      <span className="text-[9px] uppercase tracking-[0.15em] text-white/30 font-sans">{label}</span>
      <span className="text-[22px] font-bold text-white font-display mt-1 leading-none">{val}</span>
      <span className="text-[10px] text-[#a78bfa] font-sans font-normal mt-2">{sub}</span>
    </motion.div>
  );
};

const MagneticButton = ({ 
  children, 
  className, 
  onClick, 
  href, 
  type = "button", 
  disabled = false 
}: { 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void; 
  href?: string; 
  type?: "button" | "submit" | "reset"; 
  disabled?: boolean; 
}) => {
  const x = useSpring(useMotionValue(0), { stiffness: 120, damping: 15 });
  const y = useSpring(useMotionValue(0), { stiffness: 120, damping: 15 });

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    x.set(mouseX * 0.35);
    y.set(mouseY * 0.35);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  if (href) {
    return (
      <motion.a
        href={href}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ x, y }}
        className={className}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ x, y }}
      className={className}
    >
      {children}
    </motion.button>
  );
};

const AnimatedTerminalPreview = () => {
  const [lines, setLines] = useState<string[]>([]);
  
  useEffect(() => {
    const scripts = [
      ">> ANALYST.OS SYSTEMS CONNECTING SECURE CLIENT NODE...",
      ">> CONNECTED DIRECTLY TO NSE MULTICAST INDEX SOCKETS",
      ">> NSE_NODE LIVE STREAM CHANNEL ONLINE [12ms LATENCY]",
      ">> CORE_VALUATION_ENGINE INITIALIZED IN WEBASSEMBLY",
      ">> SYS_COMPILE: Scanning active Reliance assumptions...",
      "   - EBITDA: ₹1,20,000 Lakhs | exit Multiple: 14.0x",
      "   - Discount rate (WACC): 9.0% | Cash flow CAGR: 15.0%",
      ">> COMPILING SENSITIVITY GRADIENT MODELS AT 60 FPS",
      ">> INTRINSIC PROJECTION: Fair market share price: ₹2,580.40",
      ">> TASK_STATUS: COMPLETED [SECURE VAULT ACCESS GRANTED]",
      "",
      ">> ANALYST.OS > ask why NVDA moved today and what's my exposure?",
      "NVDA: +3.85% ($1,225.40)",
      "News Trigger: Reuters - Nvidia unveils new Blackwell B200 AI chip, boosting data center capabilities. (10:30 AM ET)",
      "Portfolio Impact: +$124,875",
      "AI Explanation: Nvidia's surge today is driven by the Blackwell B200 AI chip announcement, exceeding market expectations for performance and efficiency. This mirrors the initial excitement around the Hopper H100 launch in 2022, which saw sustained upside as adoption scaled. Your long positions in SMCI and AMD are also seeing positive correlation, benefiting from the broader AI sector uplift. Expect continued volatility as the market digests competitive implications and initial order book details emerge.",
      "",
      ">> ANALYST.OS > "
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < scripts.length) {
        setLines((prev) => [...prev, scripts[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150); // Adjust typing speed here
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-4xl h-[400px] bg-black/80 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden font-mono text-sm">
      <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(to_bottom,transparent_10%,white_100%)]" />
      <div className="relative z-10 p-4 h-full flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.1]">
          <div className="flex space-x-1">
            <span className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="w-3 h-3 bg-green-500 rounded-full" />
          </div>
          <span className="text-white/50 text-xs">AnalystOS Terminal</span>
          <div className="flex space-x-2">
            <Minimize size={14} className="text-white/50" />
            <Maximize size={14} className="text-white/50" />
            <X size={14} className="text-white/50" />
          </div>
        </div>
        <div className="flex-grow overflow-y-auto pt-4 text-green-400 leading-relaxed">
          {lines.map((line, index) => (
            <p key={index} className="whitespace-pre-wrap">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

const Minimize = ({ size, className }: { size: number; className: string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/></svg>;
const Maximize = ({ size, className }: { size: number; className: string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>;
const X = ({ size, className }: { size: number; className: string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18M6 6l12 12"/></svg>;


export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handlePrimaryCtaClick = () => {
    router.push("/auth/signup");
  };

  const handleSecondaryCtaClick = () => {
    router.push("/features"); // Assuming a features page exists
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden">
      <TickerBar />
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20 opacity-50" />
        <div className="absolute inset-0 bg-grid-white/[0.03]" />
      </div>

      <header className="relative z-10 flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <Command className="text-[#a78bfa]" size={24} />
          <span className="font-display text-xl font-bold">AnalystOS</span>
        </div>
        <nav className="space-x-6 hidden md:flex">
          <Link href="/dashboard" className="text-white/70 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/analyst" className="text-white/70 hover:text-white transition-colors">Stock AI</Link>
          <Link href="/feed" className="text-white/70 hover:text-white transition-colors">AI Feed</Link>
          <Link href="/flow" className="text-white/70 hover:text-white transition-colors">Flow</Link>
          <Link href="/portfolio" className="text-white/70 hover:text-white transition-colors">Portfolio</Link>
        </nav>
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="w-20 h-8 bg-white/10 rounded-md animate-pulse" />
          ) : user ? (
            <Link href="/dashboard" className="bg-[#a78bfa] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#906ee7] transition-colors">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth/signin" className="text-white/70 hover:text-white transition-colors text-sm">Sign In</Link>
              <MagneticButton
                onClick={handlePrimaryCtaClick}
                className="bg-[#a78bfa] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#906ee7] transition-colors"
              >
                Sign Up
              </MagneticButton>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-24 text-center">
        {/* Hero Section */}
        <section className="mb-24">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-7xl font-display font-extrabold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-[#a78bfa]"
          >
            Market intelligence, instantly.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/80 mb-8 max-w-3xl mx-auto"
          >
            Stop switching tools for answers. AnalystOS fuses live data, news, and AI reasoning into one platform. Get actionable insights on your positions, in seconds.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4"
          >
            <MagneticButton
              onClick={handlePrimaryCtaClick}
              className="bg-[#a78bfa] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#906ee7] transition-colors shadow-lg"
            >
              Request a demo
            </MagneticButton>
            <MagneticButton
              onClick={handleSecondaryCtaClick}
              className="bg-white/10 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-white/20 transition-colors border border-white/20"
            >
              Explore features
            </MagneticButton>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 text-white/50 text-sm"
          >
            Built by ex-hedge fund quants.
          </motion.p>
        </section>

        {/* 10-second demo */}
        <section className="mb-24">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-12">10-second demo</h2>
          <div className="flex flex-col items-center space-y-8">
            <div className="w-full max-w-4xl bg-black/80 border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden font-mono text-sm">
              <div className="p-4 border-b border-white/[0.1] flex items-center justify-between">
                <div className="flex space-x-1">
                  <span className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="w-3 h-3 bg-green-500 rounded-full" />
                </div>
                <span className="text-white/50 text-xs">AnalystOS Terminal</span>
                <div className="flex space-x-2">
                  <Minimize size={14} className="text-white/50" />
                  <Maximize size={14} className="text-white/50" />
                  <X size={14} className="text-white/50" />
                </div>
              </div>
              <div className="p-6 text-left">
                <p className="text-green-400 mb-4">&gt;&gt; ANALYST.OS &gt; ask why NVDA moved today and what's my exposure?</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/[0.05] p-4 rounded-lg border border-white/[0.1]">
                    <p className="text-white/70 text-xs uppercase">Price/Move</p>
                    <p className="text-white text-xl font-bold">NVDA: +3.85%</p>
                    <p className="text-white/50 text-sm">$1,225.40</p>
                  </div>
                  <div className="bg-white/[0.05] p-4 rounded-lg border border-white/[0.1]">
                    <p className="text-white/70 text-xs uppercase">News Trigger</p>
                    <p className="text-white text-xl font-bold">Reuters: Nvidia unveils new Blackwell B200 AI chip...</p>
                    <p className="text-white/50 text-sm">10:30 AM ET</p>
                  </div>
                  <div className="bg-white/[0.05] p-4 rounded-lg border border-white/[0.1]">
                    <p className="text-white/70 text-xs uppercase">Portfolio Impact</p>
                    <p className="text-white text-xl font-bold">+$124,875</p>
                    <p className="text-white/50 text-sm">P&L Change</p>
                  </div>
                </div>
                <p className="text-white leading-relaxed">
                  <span className="text-[#a78bfa] font-bold">AI Explanation:</span> Nvidia's surge today is driven by the Blackwell B200 AI chip announcement, exceeding market expectations for performance and efficiency. This mirrors the initial excitement around the Hopper H100 launch in 2022, which saw sustained upside as adoption scaled. Your long positions in SMCI and AMD are also seeing positive correlation, benefiting from the broader AI sector uplift. Expect continued volatility as the market digests competitive implications and initial order book details emerge.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Competitor Comparison */}
        <section className="mb-24">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-12">Why AnalystOS instead of your current stack?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">ChatGPT</h3>
              <p className="text-white/70 mb-2">Good at: General knowledge, creative text generation.</p>
              <p className="text-red-400 mb-2">Gap: Lacks real-time market data and portfolio context.</p>
              <p className="text-green-400">AnalystOS fills: Integrates live data and your actual positions.</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">TradingView</h3>
              <p className="text-white/70 mb-2">Good at: Advanced charting, technical analysis.</p>
              <p className="text-red-400 mb-2">Gap: Provides no AI-driven explanation or synthesis.</p>
              <p className="text-green-400">AnalystOS fills: Explains market moves with AI reasoning and news.</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Google Finance</h3>
              <p className="text-white/70 mb-2">Good at: Basic quotes, news aggregation, company profiles.</p>
              <p className="text-red-400 mb-2">Gap: Offers no personalized portfolio impact or deep analysis.</p>
              <p className="text-green-400">AnalystOS fills: Delivers P&L impact and contextualized insights instantly.</p>
            </div>
          </div>
          <p className="mt-12 text-white/80 text-lg max-w-3xl mx-auto">
            Relying on a fragmented stack forces analysts to manually synthesize disparate information. AnalystOS connects these dots, transforming raw data into actionable intelligence.
          </p>
        </section>

        {/* Three Feature Pillars */}
        <section className="mb-24">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-12">Core feature pillars</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Live data, AI reasoning, one response.</h3>
              <p className="text-white/70 mb-4">The old way meant toggling between a terminal, a news feed, and a chatbot. AnalystOS delivers live prices, breaking news, and AI-driven explanations in a single, coherent answer.</p>
              <p className="text-[#a78bfa] mb-2">Example: Ask why your short is moving against you and get the news catalyst, the sector move, and your exact P&L impact in one place.</p>
              <p className="text-white/50 text-sm">Competitor gap: ChatGPT lacks live data and market context.</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Answers filtered by your positions.</h3>
              <p className="text-white/70 mb-4">Generic market commentary offers limited value. AnalystOS understands your actual holdings, filtering every insight through the lens of your portfolio.</p>
              <p className="text-[#a78bfa] mb-2">Example: Query a sector trend and immediately see which of your long and short positions are most affected, with P&L projections.</p>
              <p className="text-white/50 text-sm">Competitor gap: All tools lack real-time portfolio impact.</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Question to actionable answer.</h3>
              <p className="text-white/70 mb-4">Wasting minutes piecing together information costs alpha. AnalystOS cuts through the noise, delivering precise, actionable answers in seconds.</p>
              <p className="text-[#a78bfa] mb-2">Example: Get a full breakdown of a sudden price spike, including news, sentiment, and your exposure, before the market reacts fully.</p>
              <p className="text-white/50 text-sm">Competitor gap: Manual synthesis is slow and error-prone.</p>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="mb-24">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-12">Credibility without the hype</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Early access program</h3>
              <p className="text-white/70">Join a select group of hedge fund analysts shaping the future of market intelligence.</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Industry validation</h3>
              <p className="text-white/70">Developed in collaboration with leading quantitative research teams.</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Private beta testimonials</h3>
              <p className="text-white/70">"AnalystOS cuts my research time in half." – Head of Equities, $500M Hedge Fund (Name withheld for privacy).</p>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="mb-24">
          <h2 className="text-3xl md:text-4xl font-display font-bold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-[#a78bfa]">
            Stop reacting. Start anticipating.
          </h2>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-3xl mx-auto">
            Gain an unfair advantage with intelligence that moves at the speed of the market.
          </p>
          <MagneticButton
            onClick={handlePrimaryCtaClick}
            className="bg-[#a78bfa] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#906ee7] transition-colors shadow-lg"
          >
            Request a demo
          </MagneticButton>
        </section>
      </main>

      <footer className="relative z-10 p-6 text-center text-white/50 text-sm">
        &copy; {new Date().getFullYear()} AnalystOS. All rights reserved.
      </footer>
    </div>
  );
}
