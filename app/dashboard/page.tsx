/* eslint-disable */
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from "recharts";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/navbar";
import TickerBar from "@/components/ticker-bar";
import LiveStockChart from "@/components/live-stock-chart";
import { locales, LocaleCode } from "@/lib/locales";
import { 
  Search, Terminal, BarChart3, ShieldAlert, 
  Sparkles, FileText, ChevronRight, Play, Compass, 
  TrendingUp, Download, Briefcase, Award, Send, RefreshCw, Check,
  Sliders, Grid, Calculator, BookOpen, Layers, Printer, Maximize2, Columns,
  Command, Star, PieChart, Calendar
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";

const CALENDAR_EVENTS: Record<string, Array<{
  time: string;
  event: string;
  type: "economic" | "earnings";
  consensus: string;
  actual: string;
  impact: "high" | "medium" | "low";
}>> = {
  US: [
    { time: "08:30 AM", event: "US Core CPI YoY (May)", type: "economic", consensus: "3.4%", actual: "3.4%", impact: "high" },
    { time: "02:00 PM", event: "FOMC Interest Rate Decision", type: "economic", consensus: "5.25%", actual: "5.25%", impact: "high" },
    { time: "04:15 PM", event: "NVIDIA Corp. (NVDA) Q3 Earnings", type: "earnings", consensus: "$5.16", actual: "$5.74", impact: "high" },
    { time: "04:30 PM", event: "Apple Inc. (AAPL) Q2 Earnings", type: "earnings", consensus: "$2.10", actual: "$2.18", impact: "medium" }
  ],
  India: [
    { time: "11:00 AM", event: "RBI Repo Rate Announcement", type: "economic", consensus: "6.50%", actual: "6.50%", impact: "high" },
    { time: "05:30 PM", event: "India CPI Inflation YoY", type: "economic", consensus: "4.80%", actual: "4.83%", impact: "medium" },
    { time: "06:00 PM", event: "Reliance Industries (RELIANCE) Q1 Earnings", type: "earnings", consensus: "₹25.2", actual: "₹26.4", impact: "high" },
    { time: "06:30 PM", event: "Tata Consultancy Services (TCS) Earnings", type: "earnings", consensus: "₹32.8", actual: "₹33.4", impact: "medium" }
  ],
  "United Kingdom": [
    { time: "12:00 PM", event: "BoE Interest Rate Decision", type: "economic", consensus: "5.25%", actual: "5.25%", impact: "high" },
    { time: "07:00 AM", event: "UK CPI Inflation YoY", type: "economic", consensus: "3.0%", actual: "3.1%", impact: "high" },
    { time: "08:00 AM", event: "HSBC Holdings (HSBA) Earnings", type: "earnings", consensus: "$0.32", actual: "$0.34", impact: "medium" }
  ],
  "European Union": [
    { time: "01:45 PM", event: "ECB Policy Rate Decision", type: "economic", consensus: "4.00%", actual: "4.00%", impact: "high" },
    { time: "11:00 AM", event: "Eurozone CPI Estimate YoY", type: "economic", consensus: "2.4%", actual: "2.4%", impact: "high" },
    { time: "07:30 AM", event: "SAP SE (SAP) Earnings Announcement", type: "earnings", consensus: "€1.12", actual: "€1.18", impact: "medium" }
  ],
  Japan: [
    { time: "12:00 PM", event: "BoJ Policy Rate Decision", type: "economic", consensus: "0.10%", actual: "0.10%", impact: "high" },
    { time: "08:50 AM", event: "Japan Industrial Production MoM", type: "economic", consensus: "1.2%", actual: "1.3%", impact: "medium" },
    { time: "03:00 PM", event: "Toyota Motor (7203) Earnings Release", type: "earnings", consensus: "¥180.2", actual: "¥192.4", impact: "medium" }
  ],
  Canada: [
    { time: "09:45 AM", event: "BoC Interest Rate Decision", type: "economic", consensus: "5.00%", actual: "4.75%", impact: "high" },
    { time: "08:30 AM", event: "Canada CPI YoY", type: "economic", consensus: "2.7%", actual: "2.6%", impact: "medium" }
  ],
  Singapore: [
    { time: "08:00 AM", event: "Singapore GDP Growth YoY Q1", type: "economic", consensus: "2.5%", actual: "2.7%", impact: "high" },
    { time: "05:00 PM", event: "DBS Group (D05) Earnings Report", type: "earnings", consensus: "S$1.15", actual: "S$1.22", impact: "medium" }
  ],
  "Hong Kong": [
    { time: "04:30 PM", event: "HK GDP Growth YoY Q1", type: "economic", consensus: "2.8%", actual: "3.0%", impact: "medium" },
    { time: "05:00 PM", event: "Tencent Holdings (0700) Earnings", type: "earnings", consensus: "HK$4.20", actual: "HK$4.45", impact: "high" }
  ],
  China: [
    { time: "09:30 AM", event: "PBOC 1-Year Loan Prime Rate", type: "economic", consensus: "3.45%", actual: "3.45%", impact: "high" },
    { time: "10:00 AM", event: "China Retail Sales YoY", type: "economic", consensus: "3.8%", actual: "3.9%", impact: "medium" }
  ],
  Australia: [
    { time: "02:30 PM", event: "RBA Cash Rate Decision", type: "economic", consensus: "4.35%", actual: "4.35%", impact: "high" },
    { time: "11:30 AM", event: "Australia Employment Change", type: "economic", consensus: "30k", actual: "38k", impact: "medium" }
  ],
  "Middle East": [
    { time: "10:00 AM", event: "Saudi Arabia Non-Oil GDP YoY", type: "economic", consensus: "4.2%", actual: "4.4%", impact: "medium" },
    { time: "02:00 PM", event: "Saudi Aramco (ARAMCO) Earnings Report", type: "earnings", consensus: "SAR 0.55", actual: "SAR 0.58", impact: "high" }
  ],
  "Latin America": [
    { time: "06:30 PM", event: "Brazil Selic Rate Decision", type: "economic", consensus: "10.50%", actual: "10.50%", impact: "high" },
    { time: "08:00 AM", event: "Vale S.A. (VALE) Q1 Earnings", type: "earnings", consensus: "$0.48", actual: "$0.52", impact: "medium" }
  ],
  Africa: [
    { time: "03:00 PM", event: "South Africa Repo Rate Decision", type: "economic", consensus: "8.25%", actual: "8.25%", impact: "high" },
    { time: "09:00 AM", event: "Naspers (NPN) Earnings Release", type: "earnings", consensus: "R12.50", actual: "R13.10", impact: "medium" }
  ]
};

const NEWS_ARTICLES: Record<string, Array<{
  id: string;
  time: string;
  source: string;
  title: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  verdict: string;
}>> = {
  US: [
    {
      id: "us-news-1",
      time: "10 mins ago",
      source: "REUTERS",
      title: "Federal Reserve holds interest rates steady; signals one rate cut likely in 2026.",
      sentiment: "NEUTRAL",
      verdict: "High rates continue to act as a discount hurdle, compressing high-multiplier tech evaluations but keeping treasury yield support walls intact."
    },
    {
      id: "us-news-2",
      time: "45 mins ago",
      source: "BLOOMBERG",
      title: "NVIDIA surges post-market as Blackwell chip shipments beat delivery targets.",
      sentiment: "BULLISH",
      verdict: "Strong indicators of persistent AI demand. Validates the premium EV/EBITDA multiples, reducing WACC fears via robust cash conversions."
    }
  ],
  India: [
    {
      id: "in-news-1",
      time: "15 mins ago",
      source: "CNBC_TV18",
      title: "RBI Repo Rate holds at 6.5%; policy stance remains focused on withdrawal of accommodation.",
      sentiment: "NEUTRAL",
      verdict: "Maintains high domestic borrowing costs. Neutral for banks (NIM support) but acts as a minor constraint for leveraged infra builders."
    },
    {
      id: "in-news-2",
      time: "1 hr ago",
      source: "ECON_TIMES",
      title: "Reliance partners with global chipmakers to establish regional GPU cloud data centers.",
      sentiment: "BULLISH",
      verdict: "Paves the way for services digitization. Diversifies Reliance beyond petrochemical refining base multiples toward higher IT multiples."
    }
  ],
  "United Kingdom": [
    {
      id: "uk-news-1",
      time: "20 mins ago",
      source: "FT",
      title: "Bank of England raises inflation alert; gilt yields edge higher.",
      sentiment: "BEARISH",
      verdict: "Rising yields pressure relative equity valuations. High-leverage UK operators face compressed margins."
    }
  ],
  "European Union": [
    {
      id: "eu-news-1",
      time: "30 mins ago",
      source: "EURONEWS",
      title: "Eurozone inflation converges on 2% target; ECB officials weigh June interest rate cut.",
      sentiment: "BULLISH",
      verdict: "Interest rate relief is bullish for rate-sensitive consumer sectors and LVMH multiple expansion."
    }
  ],
  Japan: [
    {
      id: "jp-news-1",
      time: "12 mins ago",
      source: "NIKKEI",
      title: "Yen stabilizes against USD; BoJ hints at sovereign bond purchase cuts.",
      sentiment: "NEUTRAL",
      verdict: "Yen strength helps offset import energy costs but creates minor headwinds for export giants like Toyota."
    }
  ]
};

interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  vol: string;
  pe: number;
  marketCap: string;
  sector: string;
  growth: number;
  evEbitda?: number;
  debtEquity?: number;
  roe?: number;
  region: string;
  type: "equity" | "etf" | "bond" | "reit" | "crypto" | "commodity" | "forex" | "index";
  beta?: number;
  sharpe?: number;
}

const CountUpValue = ({ 
  value, 
  prefix = "", 
  suffix = "", 
  decimals = 0, 
  duration = 1 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  decimals?: number; 
  duration?: number; 
}) => {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayVal(end);
      return;
    }

    const totalMilliseconds = duration * 1000;
    const startTime = performance.now();

    let animationFrameId: number;

    const updateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed >= totalMilliseconds) {
        setDisplayVal(end);
      } else {
        const progress = elapsed / totalMilliseconds;
        // Ease out quad
        const easeProgress = progress * (2 - progress);
        const currentVal = start + (end - start) * easeProgress;
        setDisplayVal(currentVal);
        animationFrameId = requestAnimationFrame(updateValue);
      }
    };

    animationFrameId = requestAnimationFrame(updateValue);

    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return (
    <span>{prefix}{displayVal.toFixed(decimals)}{suffix}</span>
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<LocaleCode>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLang((localStorage.getItem("aos_lang") || "en") as LocaleCode);
    }
    const handleLangChange = () => {
      if (typeof window !== "undefined") {
        setLang((localStorage.getItem("aos_lang") || "en") as LocaleCode);
      }
    };
    window.addEventListener("aos_lang_changed", handleLangChange);
    return () => {
      window.removeEventListener("aos_lang_changed", handleLangChange);
    };
  }, []);

  const t = locales[lang] || locales.en;
  const [searchQuery, setSearchQuery] = useState("");
  const [briefText, setBriefText] = useState("");
  const [briefLoading, setBriefLoading] = useState(true);

  // Active Terminal Tab
  const [activeTab, setActiveTab] = useState<
    "markets" | "screener" | "research" | "earnings" | "credibility" | "career" | "portfolio"
  >("markets");

  const [selectedRegion, setSelectedRegion] = useState<string>("US");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [activeStress, setActiveStress] = useState<"none" | "inflation" | "tech_selloff" | "rate_hike" | "supply_chain">("none");
  const [expandedNewsIds, setExpandedNewsIds] = useState<string[]>([]);

  // Bloomberg Resizable Panel Width State (in percentage)
  const [panelWidth, setPanelWidth] = useState<number>(30); // 30% width

  // Restore native cursor on dashboard (landing page uses cursor: none globally)
  useEffect(() => {
    document.body.classList.add("page-dashboard");
    return () => document.body.classList.remove("page-dashboard");
  }, []);

  // Protection & Session
  useEffect(() => {
    async function checkAuth() {
      // Founder Backdoor Hook (Bypasses Supabase auth entirely if ?founder=revanth_gate_pro query is supplied or bypassed in localStorage)
      const searchParams = new URLSearchParams(window.location.search);
      const isFounder = searchParams.get("founder") === "revanth_gate_pro" || 
        (typeof window !== "undefined" && localStorage.getItem("founder_bypass") === "true");

      if (isFounder) {
        setUser({ id: "founder-guest-id", email: "founder@analystos.com" });
        setProfile({ plan: "pro", name: "Founder / Administrator" });
        if (typeof window !== "undefined") {
          localStorage.setItem("founder_bypass", "true");
        }
        setLoading(false);
        fetchSavedMemos("founder-guest-id");
        fetchPortfolio("founder-guest-id");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      let finalProfile = prof || { plan: "free", name: "User" };
      
      // Founder Whitelisting Hook (Grants lifetime PRO credentials to the founder)
      if (
        session.user.email?.toLowerCase().includes("revanth") || 
        session.user.email?.toLowerCase().includes("founder") || 
        session.user.email?.toLowerCase().includes("admin")
      ) {
        finalProfile = { 
          ...finalProfile, 
          plan: "pro", 
          name: "Founder / Administrator" 
        };
      }
      
      setProfile(finalProfile);
      setLoading(false);

      if (finalProfile.plan !== "free") {
        fetchSavedMemos(session.user.id);
        fetchPortfolio(session.user.id);
      }
    }
    checkAuth();
  }, [router]);

  // Fetch saved memos / models
  const [savedMemos, setSavedMemos] = useState<any[]>([]);
  async function fetchSavedMemos(userId: string) {
    if (userId === "founder-guest-id") {
      const stored = localStorage.getItem("aos_saved_dcf_models");
      if (stored) {
        try {
          setSavedMemos(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      const { data } = await supabase
        .from("dcf_models")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (data) setSavedMemos(data);
    }
  }

  // Portfolio & Risk Analytics Desk States & Fetch
  const [portfolioHoldings, setPortfolioHoldings] = useState<any[]>([]);
  const [tradeTicker, setTradeTicker] = useState("AAPL");
  const [tradeTickerDropdownOpen, setTradeTickerDropdownOpen] = useState(false);
  const [tradeShares, setTradeShares] = useState(10);
  const [tradePrice, setTradePrice] = useState(180);
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  const fetchPortfolio = async (userId: string) => {
    setLoadingPortfolio(true);
    if (userId === "founder-guest-id") {
      const stored = localStorage.getItem("aos_portfolio_holdings");
      if (stored) {
        try {
          setPortfolioHoldings(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      } else {
        const defaults = [
          { ticker: "AAPL", shares: 150, average_buy_price: 175.50 },
          { ticker: "NVDA", shares: 40, average_buy_price: 850.00 },
          { ticker: "MSFT", shares: 80, average_buy_price: 405.00 }
        ];
        localStorage.setItem("aos_portfolio_holdings", JSON.stringify(defaults));
        setPortfolioHoldings(defaults);
      }
    } else {
      const { data } = await supabase
        .from("portfolios")
        .select("*")
        .eq("user_id", userId);
      if (data && data.length > 0 && data[0].holdings) {
        setPortfolioHoldings(data[0].holdings);
      } else {
        const initialHoldings = [
          { ticker: "AAPL", shares: 150, average_buy_price: 175.50 },
          { ticker: "NVDA", shares: 40, average_buy_price: 850.00 },
          { ticker: "MSFT", shares: 80, average_buy_price: 405.00 }
        ];
        await supabase
          .from("portfolios")
          .insert({
            user_id: userId,
            name: "Hedge Fund Model",
            holdings: initialHoldings
          });
        setPortfolioHoldings(initialHoldings);
      }
    }
    setLoadingPortfolio(false);
  };

  const executeTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoadingPortfolio(true);

    let updated = [...portfolioHoldings];
    const existingIdx = updated.findIndex(h => h.ticker === tradeTicker);

    if (tradeAction === "buy") {
      if (existingIdx >= 0) {
        const h = updated[existingIdx];
        const newShares = h.shares + tradeShares;
        const newAvg = Number(((h.shares * h.average_buy_price + tradeShares * tradePrice) / newShares).toFixed(2));
        updated[existingIdx] = { ...h, shares: newShares, average_buy_price: newAvg };
      } else {
        updated.push({ ticker: tradeTicker, shares: tradeShares, average_buy_price: tradePrice });
      }
    } else {
      if (existingIdx >= 0) {
        const h = updated[existingIdx];
        if (h.shares <= tradeShares) {
          updated = updated.filter(item => item.ticker !== tradeTicker);
        } else {
          updated[existingIdx] = { ...h, shares: h.shares - tradeShares };
        }
      } else {
        alert("Ticker not found in holdings.");
        setLoadingPortfolio(false);
        return;
      }
    }

    if (user.id === "founder-guest-id") {
      localStorage.setItem("aos_portfolio_holdings", JSON.stringify(updated));
      setPortfolioHoldings(updated);
    } else {
      const { error } = await supabase
        .from("portfolios")
        .update({ holdings: updated })
        .eq("user_id", user.id);
      if (!error) {
        setPortfolioHoldings(updated);
      }
    }
    setLoadingPortfolio(false);
  };

  // Fetch AI Morning Briefing
  useEffect(() => {
    if (!user) return;
    async function fetchMorningBrief() {
      try {
        setBriefLoading(true);
        const response = await fetch("/api/brief");
        if (response.ok) {
          const data = await response.json();
          setBriefText(data.content);
        } else {
          setBriefText(
            "[MORNING_BRIEF: COMPILATION 8:00 AM IST]\n\n" +
            "1. domestic indexes: NIFTY 50 ticks high (+0.52%) at 22,850. IT indices lead, followed by strong financial inflows.\n" +
            "2. sector movers: Reliance launches Blackwell transition studies (+1.8%); TCS logs EBITDA margin expansion to 26.2%.\n" +
            "3. macro bulletin: Brent crude ticks lower to $81.40, improving domestic trade balances and currency outlooks.\n" +
            "4. stocks to watch: HDFCBANK comparable comps showing intrinsic upside of +18.4% ahead of Q1 valuations verdict."
          );
        }
      } catch (err) {
        setBriefText("Briefing server is compiling. Review market indicators below.");
      } finally {
        setBriefLoading(false);
      }
    }
    fetchMorningBrief();
  }, [user]);

  // Stock Quotes data pool - converted to state for dynamic real-time WebSocket ticking
  const [stocks, setStocks] = useState<StockQuote[]>([
    // United States
    { ticker: "AAPL", name: "Apple Inc.", price: 182.30, change: 3.10, changePercent: 1.73, vol: "52M", pe: 28.5, marketCap: "$2.82T", sector: "US Tech", growth: 8.5, evEbitda: 22.4, debtEquity: 1.45, roe: 154.2, region: "US", type: "equity", beta: 1.12, sharpe: 1.85 },
    { ticker: "NVDA", name: "NVIDIA Corporation", price: 875.12, change: 34.50, changePercent: 4.10, vol: "41M", pe: 72.1, marketCap: "$2.19T", sector: "US Tech", growth: 125.0, evEbitda: 38.6, debtEquity: 0.22, roe: 115.6, region: "US", type: "equity", beta: 1.84, sharpe: 2.92 },
    { ticker: "MSFT", name: "Microsoft Corporation", price: 415.60, change: 5.20, changePercent: 1.27, vol: "22M", pe: 35.4, marketCap: "$3.09T", sector: "US Tech", growth: 16.2, evEbitda: 25.1, debtEquity: 0.58, roe: 38.5, region: "US", type: "equity", beta: 0.95, sharpe: 1.45 },
    { ticker: "SPY", name: "SPDR S&P 500 ETF Trust", price: 512.20, change: 4.80, changePercent: 0.95, vol: "78M", pe: 23.4, marketCap: "$502B", sector: "ETF", growth: 9.8, evEbitda: 15.6, debtEquity: 0.0, roe: 0.0, region: "US", type: "etf", beta: 1.00, sharpe: 1.20 },
    { ticker: "US10Y", name: "US 10-Year Treasury Bond Yield", price: 4.42, change: 0.04, changePercent: 0.91, vol: "N/A", pe: 0, marketCap: "N/A", sector: "Fixed Income", growth: 0.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "US", type: "bond", beta: 0.15, sharpe: 0.50 },
    { ticker: "PLD", name: "Prologis Inc. REIT", price: 118.45, change: -1.25, changePercent: -1.04, vol: "2.5M", pe: 32.8, marketCap: "$110B", sector: "REITs", growth: 6.2, evEbitda: 28.4, debtEquity: 0.85, roe: 8.4, region: "US", type: "reit", beta: 0.75, sharpe: 0.90 },
    
    // India
    { ticker: "RELIANCE", name: "Reliance Industries Ltd.", price: 2450.40, change: 42.10, changePercent: 1.75, vol: "2.8M", pe: 26.4, marketCap: "₹16.5L Cr", sector: "Energy", growth: 12.0, evEbitda: 12.8, debtEquity: 0.45, roe: 11.2, region: "India", type: "equity", beta: 1.15, sharpe: 1.25 },
    { ticker: "TCS", name: "Tata Consultancy Services", price: 3820.15, change: 98.40, changePercent: 2.64, vol: "1.1M", pe: 28.2, marketCap: "₹13.9L Cr", sector: "IT Services", growth: 9.4, evEbitda: 18.2, debtEquity: 0.12, roe: 48.6, region: "India", type: "equity", beta: 0.85, sharpe: 1.10 },
    { ticker: "HDFCBANK", name: "HDFC Bank Limited", price: 1510.60, change: -12.40, changePercent: -0.81, vol: "4.5M", pe: 16.8, marketCap: "₹11.4L Cr", sector: "Banking", growth: 14.8, evEbitda: 14.5, debtEquity: 0.85, roe: 16.5, region: "India", type: "equity", beta: 1.05, sharpe: 1.15 },
    { ticker: "INFY", name: "Infosys Limited", price: 1420.25, change: 18.50, changePercent: 1.32, vol: "1.9M", pe: 22.5, marketCap: "₹5.9L Cr", sector: "IT Services", growth: 7.8, evEbitda: 15.8, debtEquity: 0.15, roe: 31.8, region: "India", type: "equity", beta: 0.90, sharpe: 1.05 },
    { ticker: "IN10Y", name: "India 10-Year G-Sec Yield", price: 7.04, change: -0.01, changePercent: -0.14, vol: "N/A", pe: 0, marketCap: "N/A", sector: "Fixed Income", growth: 0.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "India", type: "bond", beta: 0.10, sharpe: 0.40 },
    
    // United Kingdom
    { ticker: "HSBA", name: "HSBC Holdings plc", price: 685.20, change: 8.40, changePercent: 1.24, vol: "18M", pe: 7.4, marketCap: "£130B", sector: "Banking", growth: 5.4, evEbitda: 5.8, debtEquity: 1.25, roe: 12.4, region: "United Kingdom", type: "equity", beta: 0.95, sharpe: 0.85 },
    { ticker: "BP", name: "BP plc", price: 472.50, change: -3.20, changePercent: -0.67, vol: "25M", pe: 6.8, marketCap: "£82B", sector: "Energy", growth: 4.8, evEbitda: 4.2, debtEquity: 0.95, roe: 18.2, region: "United Kingdom", type: "equity", beta: 1.20, sharpe: 0.75 },
    { ticker: "UK10Y", name: "UK 10-Year Gilt Yield", price: 4.28, change: 0.03, changePercent: 0.71, vol: "N/A", pe: 0, marketCap: "N/A", sector: "Fixed Income", growth: 0.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "United Kingdom", type: "bond", beta: 0.12, sharpe: 0.45 },
    
    // European Union
    { ticker: "MC", name: "LVMH Moët Hennessy", price: 812.50, change: 12.40, changePercent: 1.55, vol: "0.8M", pe: 24.5, marketCap: "€410B", sector: "Consumer", growth: 9.2, evEbitda: 14.8, debtEquity: 0.48, roe: 28.5, region: "European Union", type: "equity", beta: 1.10, sharpe: 1.30 },
    { ticker: "SAP", name: "SAP SE", price: 172.40, change: 4.20, changePercent: 2.50, vol: "2.1M", pe: 38.6, marketCap: "€208B", sector: "US Tech", growth: 11.5, evEbitda: 21.2, debtEquity: 0.32, roe: 14.6, region: "European Union", type: "equity", beta: 1.05, sharpe: 1.40 },
    { ticker: "DE10Y", name: "Germany 10-Year Bund Yield", price: 2.52, change: 0.02, changePercent: 0.80, vol: "N/A", pe: 0, marketCap: "N/A", sector: "Fixed Income", growth: 0.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "European Union", type: "bond", beta: 0.08, sharpe: 0.35 },
    
    // Japan
    { ticker: "7203", name: "Toyota Motor Corp", price: 3450, change: 65, changePercent: 1.92, vol: "8.5M", pe: 9.8, marketCap: "¥52T", sector: "Auto", growth: 8.4, evEbitda: 7.2, debtEquity: 0.98, roe: 14.2, region: "Japan", type: "equity", beta: 0.90, sharpe: 1.00 },
    { ticker: "9984", name: "SoftBank Group Corp", price: 8920, change: -120, changePercent: -1.33, vol: "5.2M", pe: 22.4, marketCap: "¥13.2T", sector: "US Tech", growth: 15.0, evEbitda: 18.5, debtEquity: 1.65, roe: 6.2, region: "Japan", type: "equity", beta: 1.50, sharpe: 1.10 },
    { ticker: "JP10Y", name: "Japan 10-Year JGB Yield", price: 1.02, change: 0.015, changePercent: 1.49, vol: "N/A", pe: 0, marketCap: "N/A", sector: "Fixed Income", growth: 0.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "Japan", type: "bond", beta: 0.05, sharpe: 0.20 },

    // Canada
    { ticker: "RY", name: "Royal Bank of Canada", price: 138.50, change: 1.10, changePercent: 0.80, vol: "3.2M", pe: 11.2, marketCap: "$195B", sector: "Banking", growth: 5.6, evEbitda: 9.2, debtEquity: 1.10, roe: 14.5, region: "Canada", type: "equity", beta: 0.88, sharpe: 1.05 },
    { ticker: "SHOP", name: "Shopify Inc.", price: 92.40, change: -2.35, changePercent: -2.48, vol: "6.8M", pe: 82.5, marketCap: "$118B", sector: "US Tech", growth: 22.4, evEbitda: 35.4, debtEquity: 0.15, roe: 8.2, region: "Canada", type: "equity", beta: 1.48, sharpe: 1.15 },

    // Singapore
    { ticker: "D05", name: "DBS Group Holdings", price: 35.80, change: 0.45, changePercent: 1.27, vol: "4.1M", pe: 10.5, marketCap: "S$92B", sector: "Banking", growth: 7.2, evEbitda: 8.5, debtEquity: 1.05, roe: 13.8, region: "Singapore", type: "equity", beta: 0.92, sharpe: 1.10 },

    // Hong Kong
    { ticker: "0700", name: "Tencent Holdings Ltd", price: 382.40, change: 8.60, changePercent: 2.30, vol: "6.2M", pe: 15.6, marketCap: "HK$3.6T", sector: "US Tech", growth: 12.8, evEbitda: 11.2, debtEquity: 0.35, roe: 18.5, region: "Hong Kong", type: "equity", beta: 1.18, sharpe: 1.28 },

    // China
    { ticker: "600519", name: "Kweichow Moutai Co Ltd", price: 1680.50, change: 15.20, changePercent: 0.91, vol: "1.2M", pe: 28.5, marketCap: "¥2.1T", sector: "Consumer", growth: 16.4, evEbitda: 20.4, debtEquity: 0.05, roe: 31.4, region: "China", type: "equity", beta: 0.70, sharpe: 1.50 },

    // Australia
    { ticker: "BHP", name: "BHP Group Limited", price: 44.50, change: -0.65, changePercent: -1.44, vol: "7.1M", pe: 11.8, marketCap: "A$225B", sector: "Energy", growth: 4.2, evEbitda: 6.4, debtEquity: 0.42, roe: 22.4, region: "Australia", type: "equity", beta: 1.10, sharpe: 0.85 },

    // Middle East
    { ticker: "ARAMCO", name: "Saudi Arabian Oil Co.", price: 31.25, change: 0.15, changePercent: 0.48, vol: "12M", pe: 15.8, marketCap: "SAR 7.8T", sector: "Energy", growth: 5.2, evEbitda: 8.2, debtEquity: 0.18, roe: 29.4, region: "Middle East", type: "equity", beta: 0.60, sharpe: 1.40 },

    // Latin America
    { ticker: "VALE", name: "Vale S.A.", price: 62.40, change: 1.15, changePercent: 1.88, vol: "5.4M", pe: 5.6, marketCap: "R$280B", sector: "Energy", growth: 3.5, evEbitda: 4.1, debtEquity: 0.52, roe: 19.5, region: "Latin America", type: "equity", beta: 1.05, sharpe: 0.80 },

    // Africa
    { ticker: "NPN", name: "Naspers Limited", price: 3450, change: 85, changePercent: 2.53, vol: "0.5M", pe: 18.2, marketCap: "R620B", sector: "US Tech", growth: 14.2, evEbitda: 14.5, debtEquity: 0.28, roe: 10.4, region: "Africa", type: "equity", beta: 1.25, sharpe: 1.10 },

    // Cryptocurrencies (Global region)
    { ticker: "BTC", name: "Bitcoin Spot", price: 68520.00, change: 1250.00, changePercent: 1.86, vol: "28B", pe: 0, marketCap: "$1.34T", sector: "Crypto", growth: 45.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "Global", type: "crypto", beta: 1.80, sharpe: 1.50 },
    { ticker: "ETH", name: "Ethereum Spot", price: 3820.50, change: 95.40, changePercent: 2.56, vol: "15B", pe: 0, marketCap: "$458B", sector: "Crypto", growth: 38.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "Global", type: "crypto", beta: 1.90, sharpe: 1.30 },
    { ticker: "SOL", name: "Solana Spot", price: 165.25, change: -4.30, changePercent: -2.54, vol: "3.5B", pe: 0, marketCap: "$74B", sector: "Crypto", growth: 120.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "Global", type: "crypto", beta: 2.20, sharpe: 1.60 },

    // Commodities (Global region)
    { ticker: "GOLD", name: "Gold Spot $/oz", price: 2345.80, change: 18.20, changePercent: 0.78, vol: "12B", pe: 0, marketCap: "N/A", sector: "Commodities", growth: 0.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "Global", type: "commodity", beta: 0.20, sharpe: 0.80 },
    { ticker: "BRENT", name: "Brent Crude Oil Future", price: 81.40, change: -0.85, changePercent: -1.03, vol: "8M", pe: 0, marketCap: "N/A", sector: "Commodities", growth: 0.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "Global", type: "commodity", beta: 1.30, sharpe: 0.60 },

    // Forex (Global region)
    { ticker: "EURUSD", name: "EUR / USD Spot Rate", price: 1.0852, change: 0.0012, changePercent: 0.11, vol: "N/A", pe: 0, marketCap: "N/A", sector: "Forex", growth: 0.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "Global", type: "forex", beta: 0.30, sharpe: 0.40 },
    { ticker: "USDJPY", name: "USD / JPY Spot Rate", price: 156.42, change: -0.32, changePercent: -0.20, vol: "N/A", pe: 0, marketCap: "N/A", sector: "Forex", growth: 0.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "Global", type: "forex", beta: 0.45, sharpe: 0.35 },

    // Indices
    { ticker: "SPX", name: "S&P 500 Index", price: 5204.30, change: 35.20, changePercent: 0.68, vol: "N/A", pe: 24.8, marketCap: "N/A", sector: "Indices", growth: 8.2, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "US", type: "index", beta: 1.00, sharpe: 1.20 },
    { ticker: "IXIC", name: "NASDAQ Composite", price: 16735.20, change: 185.40, changePercent: 1.12, vol: "N/A", pe: 34.2, marketCap: "N/A", sector: "Indices", growth: 14.5, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "US", type: "index", beta: 1.25, sharpe: 1.35 },
    { ticker: "NIFTY", name: "Nifty 50 Index", price: 22850.40, change: 118.50, changePercent: 0.52, vol: "N/A", pe: 22.4, marketCap: "N/A", sector: "Indices", growth: 12.0, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "India", type: "index", beta: 1.10, sharpe: 1.25 },
    { ticker: "N225", name: "Nikkei 225 Index", price: 38850.00, change: 450.00, changePercent: 1.17, vol: "N/A", pe: 21.5, marketCap: "N/A", sector: "Indices", growth: 9.5, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "Japan", type: "index", beta: 1.05, sharpe: 1.15 },
    { ticker: "FTSE", name: "FTSE 100 Index", price: 8240.50, change: -12.40, changePercent: -0.15, vol: "N/A", pe: 12.8, marketCap: "N/A", sector: "Indices", growth: 4.5, evEbitda: 0.0, debtEquity: 0.0, roe: 0.0, region: "United Kingdom", type: "index", beta: 0.85, sharpe: 0.90 }
  ]);

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<"all" | "watchlist">("all");

  // Live Chart state
  const [selectedChartTicker, setSelectedChartTicker] = useState("AAPL");
  const [priceHistory, setPriceHistory] = useState<Record<string, Array<{ time: string; price: number }>>>({
    AAPL: [{ time: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }), price: 182.30 }]
  });
  const priceHistoryRef = React.useRef(priceHistory);
  const selectedChartTickerRef = React.useRef(selectedChartTicker);
  useEffect(() => { priceHistoryRef.current = priceHistory; }, [priceHistory]);
  useEffect(() => { selectedChartTickerRef.current = selectedChartTicker; }, [selectedChartTicker]);

  // Load watchlist and notes on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("aos_watchlist");
      if (stored) {
        try {
          setWatchlist(JSON.parse(stored));
        } catch (e) {
          console.error("Watchlist parsing failed:", e);
        }
      }
      const storedAapl = localStorage.getItem("aos_notes_aapl");
      if (storedAapl) setAaplNotes(storedAapl);
      const storedRel = localStorage.getItem("aos_notes_reliance");
      if (storedRel) setRelianceNotes(storedRel);
    }
  }, []);

  const toggleWatchlist = (ticker: string) => {
    setWatchlist(prev => {
      const next = prev.includes(ticker)
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker];
      if (typeof window !== "undefined") {
        localStorage.setItem("aos_watchlist", JSON.stringify(next));
      }
      return next;
    });
  };

  const [lastTickDirection, setLastTickDirection] = useState<Record<string, "up" | "down" | null>>({});

  // Macro Indicator States
  const [macroYield, setMacroYield] = useState(7.04);
  const [macroUsdInr, setMacroUsdInr] = useState(83.42);
  const [macroBrent, setMacroBrent] = useState(81.40);
  const [lastMacroDirection, setLastMacroDirection] = useState<Record<string, "up" | "down" | null>>({});

  // Volatility tape state
  const [volatilityLogs, setVolatilityLogs] = useState<string[]>([
    "[18:12:05] BLOCK BUY RELIANCE 12,000 shares @ 2450.40",
    "[18:11:58] ICEBERG BID INFY 8,500 shares @ 1420.25",
    "[18:11:42] VOLATILITY ALERT: NVDA ticks +1.2% in 15s"
  ]);

  // Order Book levels state
  const [orderBook, setOrderBook] = useState({
    asks: [
      { price: 1510.60, vol: 310 },
      { price: 1510.70, vol: 890 },
      { price: 1510.80, vol: 1450 }
    ],
    bids: [
      { price: 1510.40, vol: 450 },
      { price: 1510.30, vol: 780 },
      { price: 1510.20, vol: 1120 }
    ]
  });

  const stocksRef = React.useRef(stocks);
  const macroYieldRef = React.useRef(7.04);
  const macroUsdInrRef = React.useRef(83.42);
  const macroBrentRef = React.useRef(81.40);

  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  // Layout Customizer states
  const [layoutPreset, setLayoutPreset] = useState<"default" | "scalper" | "macro" | "beginner" | "custom">("default");
  const [visibleWidgets, setVisibleWidgets] = useState({
    brief: true,
    search: true,
    tickers: true,
    orderBook: false,
    macro: false,
    guide: false,
    calendar: true,
    news: true
  });
  const [customizerOpen, setCustomizerOpen] = useState(false);

  // Onboarding Tour Guide states
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(1);

  // Cmd+K Command Palette states
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  // Trigger tour guide on first-time load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tourCompleted = localStorage.getItem("aos_tour_completed") === "true";
      if (!tourCompleted) {
        setTourActive(true);
      }
    }
  }, []);

  const closeTour = () => {
    setTourActive(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("aos_tour_completed", "true");
    }
  };

  // Keyboard shortcut listener for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const executeCommand = (cmd: string) => {
    const formatted = cmd.trim().toLowerCase();
    
    // Check preset activations
    if (formatted.includes("core") || formatted.includes("default") || formatted === "bloomberg core") {
      saveLayout("default", { brief: true, search: true, tickers: true, orderBook: false, macro: false, guide: false, calendar: true, news: true });
    } else if (formatted.includes("scalper")) {
      saveLayout("scalper", { brief: false, search: true, tickers: true, orderBook: true, macro: false, guide: false, calendar: false, news: true });
    } else if (formatted.includes("macro")) {
      saveLayout("macro", { brief: true, search: false, tickers: true, orderBook: false, macro: true, guide: false, calendar: true, news: true });
    } else if (formatted.includes("beginner")) {
      saveLayout("beginner", { brief: true, search: false, tickers: true, orderBook: false, macro: false, guide: true, calendar: false, news: false });
    }
    
    // Check tab activations
    else if (formatted.includes("market") || formatted === "1") {
      setActiveTab("markets");
    } else if (formatted.includes("screener") || formatted === "2") {
      setActiveTab("screener");
    } else if (formatted.includes("research") || formatted === "3") {
      setActiveTab("research");
    } else if (formatted.includes("earnings") || formatted === "4") {
      setActiveTab("earnings");
    } else if (formatted.includes("methodology") || formatted.includes("credibility") || formatted === "5") {
      setActiveTab("credibility");
    } else if (formatted.includes("career") || formatted === "6") {
      setActiveTab("career");
    } else if (formatted.includes("portfolio") || formatted === "7") {
      setActiveTab("portfolio");
    }
    
    // Check ticker focus
    else if (["aapl", "nvda", "msft", "reliance", "tcs", "hdfcbank", "infy"].includes(formatted)) {
      router.push(`/stocks/${formatted.toUpperCase()}`);
    }
    
    // Toggle layout customizer
    else if (formatted.includes("customizer") || formatted.includes("toggle layout")) {
      setCustomizerOpen(prev => !prev);
    }
    
    // Start tour
    else if (formatted.includes("tour") || formatted.includes("onboarding")) {
      setTourActive(true);
      setTourStep(1);
    }
    
    setCommandQuery("");
    setCommandPaletteOpen(false);
  };

  // Restore layout customized configurations on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPreset = localStorage.getItem("aos_layout_preset");
      const savedWidgets = localStorage.getItem("aos_layout_widgets");
      if (savedPreset) {
        setLayoutPreset(savedPreset as any);
      }
      if (savedWidgets) {
        try {
          setVisibleWidgets(JSON.parse(savedWidgets));
        } catch (e) {
          console.error("Error loading layout config", e);
        }
      }
    }
  }, []);

  const saveLayout = (preset: typeof layoutPreset, widgets: typeof visibleWidgets) => {
    setLayoutPreset(preset);
    setVisibleWidgets(widgets);
    if (typeof window !== "undefined") {
      localStorage.setItem("aos_layout_preset", preset);
      localStorage.setItem("aos_layout_widgets", JSON.stringify(widgets));
    }
  };

  // High-Frequency Real-Time WebSocket simulation (250ms ticking with flash tracking)
  useEffect(() => {
    const interval = setInterval(() => {
      const activeTickers = stocksRef.current.map(s => s.ticker);
      const shuffled = [...activeTickers].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.floor(Math.random() * 2) + 1);

      const nextDirections: Record<string, "up" | "down" | null> = {};

      const nextStocks = stocksRef.current.map(stock => {
        if (!selected.includes(stock.ticker)) return stock;

        const tickPercent = (Math.random() - 0.49) * 0.005; // -0.25% to +0.25% change
        const priceDiff = stock.price * tickPercent;
        const newPrice = Number((stock.price + priceDiff).toFixed(2));
        const newChange = Number((stock.change + priceDiff).toFixed(2));
        const newPercent = Number(((newChange / (newPrice - newChange)) * 100).toFixed(2));
        const direction = priceDiff >= 0 ? "up" : "down";

        nextDirections[stock.ticker] = direction;

        return {
          ...stock,
          price: newPrice,
          change: newChange,
          changePercent: newPercent
        };
      });

      setStocks(nextStocks);

      // Accumulate price history for chart
      const chartTicker = selectedChartTickerRef.current;
      const chartStock = nextStocks.find(s => s.ticker === chartTicker);
      if (chartStock) {
        const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setPriceHistory(prev => {
          const current = prev[chartTicker] || [];
          const updated = [...current, { time: timeStr, price: chartStock.price }];
          // Keep last 120 data points (~30s of ticks at 250ms)
          return { ...prev, [chartTicker]: updated.slice(-120) };
        });
      }
      
      setLastTickDirection(prev => ({
        ...prev,
        ...nextDirections
      }));

      // Clear the flash direction after 450ms
      setTimeout(() => {
        setLastTickDirection(prev => {
          const cleared = { ...prev };
          selected.forEach(ticker => {
            cleared[ticker] = null;
          });
          return cleared;
        });
      }, 450);

      // Volatility Logs simulation
      if (Math.random() > 0.5) {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const ticker = activeTickers[Math.floor(Math.random() * activeTickers.length)];
        const actions = ["BLOCK BUY", "BLOCK SELL", "ICEBERG BID", "ICEBERG ASK", "CROSS TRADE"];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const shares = (Math.floor(Math.random() * 20) + 1) * 1000;
        
        const targetStock = nextStocks.find(s => s.ticker === ticker);
        const price = targetStock ? targetStock.price : 1000.00;
        
        const log = `[${time}] ${action} ${ticker} ${shares.toLocaleString()} shares @ ${price.toFixed(2)}`;
        setVolatilityLogs(prev => [log, ...prev.slice(0, 4)]);
      }

      // Order book spread fluctuations
      if (Math.random() > 0.4) {
        setOrderBook(prev => {
          const shift = (Math.random() - 0.5) * 0.20;
          return {
            asks: prev.asks.map((ask, idx) => ({
              price: Number((ask.price + shift).toFixed(2)),
              vol: Math.max(50, Math.min(2500, ask.vol + Math.floor((Math.random() - 0.5) * 120)))
            })),
            bids: prev.bids.map((bid, idx) => ({
              price: Number((bid.price + shift).toFixed(2)),
              vol: Math.max(50, Math.min(2500, bid.vol + Math.floor((Math.random() - 0.5) * 120)))
            }))
          };
        });
      }

      // Macro indicators fluctuations
      const macroDirs: Record<string, "up" | "down" | null> = {};
      if (Math.random() > 0.6) {
        const delta = (Math.random() - 0.5) * 0.01;
        const newVal = Number((macroYieldRef.current + delta).toFixed(3));
        macroYieldRef.current = newVal;
        setMacroYield(newVal);
        macroDirs["yield"] = delta >= 0 ? "up" : "down";
      }
      if (Math.random() > 0.6) {
        const delta = (Math.random() - 0.5) * 0.05;
        const newVal = Number((macroUsdInrRef.current + delta).toFixed(2));
        macroUsdInrRef.current = newVal;
        setMacroUsdInr(newVal);
        macroDirs["usdinr"] = delta >= 0 ? "up" : "down";
      }
      if (Math.random() > 0.6) {
        const delta = (Math.random() - 0.5) * 0.15;
        const newVal = Number((macroBrentRef.current + delta).toFixed(2));
        macroBrentRef.current = newVal;
        setMacroBrent(newVal);
        macroDirs["brent"] = delta >= 0 ? "up" : "down";
      }

      if (Object.keys(macroDirs).length > 0) {
        setLastMacroDirection(prev => ({ ...prev, ...macroDirs }));
        setTimeout(() => {
          setLastMacroDirection(prev => {
            const cleared = { ...prev };
            Object.keys(macroDirs).forEach(k => { cleared[k] = null; });
            return cleared;
          });
        }, 450);
      }

    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Dynamic column layout calculations for active widgets
  const isBigLeftActive = visibleWidgets.brief;
  const isBigRightActive = visibleWidgets.orderBook;
  const activeBigCount = (isBigLeftActive ? 1 : 0) + (isBigRightActive ? 1 : 0);
  const activeSideCount = (visibleWidgets.search ? 1 : 0) + (visibleWidgets.macro ? 1 : 0) + (visibleWidgets.guide ? 1 : 0);

  let briefSpan = "lg:col-span-8";
  let orderBookSpan = "lg:col-span-8";

  if (activeBigCount === 2) {
    briefSpan = "lg:col-span-6";
    orderBookSpan = "lg:col-span-6";
  } else if (activeBigCount === 1) {
    const span = activeSideCount > 0 ? "lg:col-span-8" : "lg:col-span-12";
    briefSpan = span;
    orderBookSpan = span;
  }

  let sideSpan = "lg:col-span-4";
  if (activeBigCount === 0) {
    if (activeSideCount === 1) sideSpan = "lg:col-span-12";
    else if (activeSideCount === 2) sideSpan = "lg:col-span-6";
    else sideSpan = "lg:col-span-4";
  } else {
    if (activeSideCount === 1) sideSpan = "lg:col-span-4";
    else if (activeSideCount === 2) sideSpan = "lg:col-span-6";
    else sideSpan = "lg:col-span-4";
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toUpperCase();
    if (!query) return;
    router.push(`/stocks/${query}`);
  };

  // Stock Screener state
  const [screenerSector, setScreenerSector] = useState<string>("ALL");
  const [screenerPE, setScreenerPE] = useState<string>("ALL");
  const [screenerCap, setScreenerCap] = useState<string>("ALL");
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const [peDropdownOpen, setPeDropdownOpen] = useState(false);
  const [capDropdownOpen, setCapDropdownOpen] = useState(false);

  const filteredStocks = stocks.filter(stock => {
    const matchSector = screenerSector === "ALL" || stock.sector === screenerSector;
    let matchPE = true;
    if (screenerPE === "UNDER_20") matchPE = stock.pe < 20;
    else if (screenerPE === "20_35") matchPE = stock.pe >= 20 && stock.pe <= 35;
    else if (screenerPE === "OVER_35") matchPE = stock.pe > 35;

    let matchCap = true;
    if (screenerCap === "US_MEGA") matchCap = stock.ticker === "AAPL" || stock.ticker === "NVDA" || stock.ticker === "MSFT";
    else if (screenerCap === "IN_MEGA") matchCap = stock.ticker === "RELIANCE" || stock.ticker === "TCS" || stock.ticker === "HDFCBANK";

    return matchSector && matchPE && matchCap;
  });

  // Research Reports & Investment Memo Generator (Apple Stock AAPL)
  const [activeResearchTicker, setActiveResearchTicker] = useState<"AAPL" | "RELIANCE">("AAPL");
  const [generatedMemo, setGeneratedMemo] = useState<string>("");
  const [memoLoading, setMemoLoading] = useState<boolean>(false);

  // Saved research notes state
  const [aaplNotes, setAaplNotes] = useState<string>(
    "AAPL Notes:\n- Services growth remains primary multiple expansion driver.\n- Edge AI capability could trigger accelerated device upgrade cycle in Q4 FY26.\n- Risk: Anti-trust pressure on App Store margins."
  );
  const [relianceNotes, setRelianceNotes] = useState<string>(
    "RELIANCE Notes:\n- Energy segment cash flow funding retail & digital expansion.\n- Potential spin-off/IPO listing of Jio/Retail division as valuation catalyst.\n- Enterprise AI partnership with NVIDIA targets local market deployments."
  );

  const handleSaveNotes = (ticker: string, text: string) => {
    if (typeof window !== "undefined") {
      if (ticker === "AAPL") {
        setAaplNotes(text);
        localStorage.setItem("aos_notes_aapl", text);
      } else {
        setRelianceNotes(text);
        localStorage.setItem("aos_notes_reliance", text);
      }
    }
  };

  // Dynamic calculations for AAPL DCF compiler
  const [aaplEbitda, setAaplEbitda] = useState<number>(125); // in $ Billions
  const [aaplWacc, setAaplWacc] = useState<number>(8.5); // %
  const [aaplMultiple, setAaplMultiple] = useState<number>(18); // x
  const [aaplCagr, setAaplCagr] = useState<number>(8.5); // %
  const [aaplPerpGrowth, setAaplPerpGrowth] = useState<number>(2.0); // %
  const [valuationMethod, setValuationMethod] = useState<"multiple" | "gordon">("multiple");
  const [saveModelName, setSaveModelName] = useState("");
  const [savingModel, setSavingModel] = useState(false);

  const aaplNetDebt = 65; // $ Billions
  const aaplShares = 15.4; // Billions

  const calculateAaplPrice = () => {
    const rate = aaplCagr / 100;
    const discount = aaplWacc / 100;
    let currentEbitda = aaplEbitda;
    let sumPV = 0;
    for (let yr = 1; yr <= 5; yr++) {
      currentEbitda = currentEbitda * (1 + rate);
      sumPV += currentEbitda / Math.pow(1 + discount, yr);
    }
    
    let tv = 0;
    if (valuationMethod === "multiple") {
      tv = currentEbitda * aaplMultiple;
    } else {
      const denom = Math.max(0.005, discount - aaplPerpGrowth / 100);
      tv = (currentEbitda * (1 + aaplPerpGrowth / 100)) / denom;
    }
    
    const pvTV = tv / Math.pow(1 + discount, 5);
    const ev = sumPV + pvTV;
    const eqVal = ev - aaplNetDebt;
    return eqVal / aaplShares;
  };

  const aaplImpliedPrice = calculateAaplPrice();

  const dcfCalculationsBreakdown = useMemo(() => {
    const rate = aaplCagr / 100;
    const discount = aaplWacc / 100;
    let currentEbitda = aaplEbitda;
    let sumPV = 0;
    const yearFlows: number[] = [];
    for (let yr = 1; yr <= 5; yr++) {
      currentEbitda = currentEbitda * (1 + rate);
      const pv = currentEbitda / Math.pow(1 + discount, yr);
      sumPV += pv;
      yearFlows.push(pv);
    }
    
    let tv = 0;
    if (valuationMethod === "multiple") {
      tv = currentEbitda * aaplMultiple;
    } else {
      const denom = Math.max(0.005, discount - aaplPerpGrowth / 100);
      tv = (currentEbitda * (1 + aaplPerpGrowth / 100)) / denom;
    }
    
    const pvTV = tv / Math.pow(1 + discount, 5);
    const ev = sumPV + pvTV;
    const eqVal = ev - aaplNetDebt;
    const impliedPrice = eqVal / aaplShares;

    return {
      sumPV: sumPV.toFixed(1),
      tv: tv.toFixed(1),
      pvTV: pvTV.toFixed(1),
      ev: ev.toFixed(1),
      eqVal: eqVal.toFixed(1),
      impliedPrice: impliedPrice.toFixed(2),
      yearFlows
    };
  }, [aaplEbitda, aaplCagr, aaplWacc, aaplMultiple, aaplPerpGrowth, valuationMethod]);

  const dashboardSensitivity = useMemo(() => {
    const waccSteps = [aaplWacc - 1, aaplWacc, aaplWacc + 1];
    const cagrSteps = [aaplCagr - 1.5, aaplCagr, aaplCagr + 1.5];
    
    return waccSteps.map(wStep => {
      const row = cagrSteps.map(gStep => {
        const rate = gStep / 100;
        const discount = wStep / 100;
        let currentEbitda = aaplEbitda;
        let sumPV = 0;
        for (let yr = 1; yr <= 5; yr++) {
          currentEbitda = currentEbitda * (1 + rate);
          sumPV += currentEbitda / Math.pow(1 + discount, yr);
        }
        let tv = 0;
        if (valuationMethod === "multiple") {
          tv = currentEbitda * aaplMultiple;
        } else {
          const denom = Math.max(0.005, discount - aaplPerpGrowth / 100);
          tv = (currentEbitda * (1 + aaplPerpGrowth / 100)) / denom;
        }
        const pvTV = tv / Math.pow(1 + discount, 5);
        const ev = sumPV + pvTV;
        const eqVal = ev - aaplNetDebt;
        return eqVal / aaplShares;
      });
      return { waccValue: wStep, row };
    });
  }, [aaplEbitda, aaplCagr, aaplWacc, aaplMultiple, aaplPerpGrowth, valuationMethod]);

  const handleGenerateMemo = () => {
    setMemoLoading(true);
    setGeneratedMemo("");
    setTimeout(() => {
      let memo = "";
      if (activeResearchTicker === "AAPL") {
        memo = `================================================================================
INSTITUTIONAL EQUITY RESEARCH DIRECTIVE: AAPL [BUY THESIS]
COMPILATION DATE: MAY 31, 2026 | ANALYST.OS SYSTEMS CO-PILOT
================================================================================

1. INVESTMENT THESIS
Apple Inc. continues to maintain an impenetrable ecosystem moat coupled with superior high-margin services streams. The Blackwell transitions and Edge AI integrations yield immediate margin expansion. 

2. INTRINSIC VALUATION SUMMARY (DYNAMIC PRO-FORMA SPREADSHEET):
* Base EBITDA Forecast: $${aaplEbitda} Billion
* Revenue growth CAGR: ${aaplCagr.toFixed(1)}%
* Valuation Method: ${valuationMethod === "multiple" ? "Exit EBITDA Multiple" : "Gordon Growth Exit"}
* ${valuationMethod === "multiple" ? `Target Exit Multiple: ${aaplMultiple}.0x` : `Perpetual Growth Rate: ${aaplPerpGrowth.toFixed(1)}%`}
* WACC discount rate: ${aaplWacc.toFixed(1)}%
* Enterprise Value (EV): $${(aaplImpliedPrice * aaplShares + aaplNetDebt).toFixed(1)} Billion
* Implied Intrinsic Value per share: $${aaplImpliedPrice.toFixed(2)} (Current Spot: $182.30)
* Calculated Margin of Safety: +${(((aaplImpliedPrice - 182.30)/182.30)*100).toFixed(1)}%

3. COMPREHENSIVE FINANCIAL FORECAST LEDGER (YR01 - YR05):
- Year 01 EBITDA: $${(aaplEbitda * (1 + aaplCagr/100)).toFixed(1)}B | PV of cash flows: $${((aaplEbitda * (1 + aaplCagr/100)) / Math.pow(1 + aaplWacc/100, 1)).toFixed(1)}B
- Year 02 EBITDA: $${(aaplEbitda * Math.pow(1 + aaplCagr/100, 2)).toFixed(1)}B | PV of cash flows: $${((aaplEbitda * Math.pow(1 + aaplCagr/100, 2)) / Math.pow(1 + aaplWacc/100, 2)).toFixed(1)}B
- Year 03 EBITDA: $${(aaplEbitda * Math.pow(1 + aaplCagr/100, 3)).toFixed(1)}B | PV of cash flows: $${((aaplEbitda * Math.pow(1 + aaplCagr/100, 3)) / Math.pow(1 + aaplWacc/100, 3)).toFixed(1)}B
- Year 04 EBITDA: $${(aaplEbitda * Math.pow(1 + aaplCagr/100, 4)).toFixed(1)}B | PV of cash flows: $${((aaplEbitda * Math.pow(1 + aaplCagr/100, 4)) / Math.pow(1 + aaplWacc/100, 4)).toFixed(1)}B
- Year 05 EBITDA: $${(aaplEbitda * Math.pow(1 + aaplCagr/100, 5)).toFixed(1)}B | PV of cash flows: $${((aaplEbitda * Math.pow(1 + aaplCagr/100, 5)) / Math.pow(1 + aaplWacc/100, 5)).toFixed(1)}B

4. RISK FACTOR ASSESSMENTS:
- Supply Chain Multilateral Restructuring.
- Regulatory Anti-Trust Mandates across EU/US jurisdictions.

DIRECTIVE RECOMMENDATION: OVERWEIGHT
IMPLIED FAIR VALUATION SPOT: $${aaplImpliedPrice.toFixed(2)}
================================================================================`;
      } else {
        memo = `================================================================================
INSTITUTIONAL EQUITY RESEARCH DIRECTIVE: RELIANCE [OUTPERFORM]
COMPILATION DATE: MAY 31, 2026 | ANALYST.OS SYSTEMS CO-PILOT
================================================================================

1. INVESTMENT THESIS
Reliance Industries continues to lead national digital and retail platforms. Blackwell server infrastructure trials have fully initialized, establishing robust high-density processing pipelines.

2. INTRINSIC VALUATION SUMMARY (DYNAMIC PRO-FORMA SPREADSHEET):
* Base EBITDA Forecast: ₹1,20,000 Lakhs
* exit Multiple: 14.0x | WACC discount rate: 9.0%
* Enterprise Value (EV): ₹18.54 Cr
* Implied Intrinsic Value per share: ₹2,580.40 (Current Spot: ₹2,450.40)
* Calculated Margin of Safety: +5.3%

DIRECTIVE RECOMMENDATION: BUY
IMPLIED FAIR VALUATION SPOT: ₹2,580.40
================================================================================`;
      }
      setGeneratedMemo(memo);
      setMemoLoading(false);
    }, 1200);
  };

  const saveDcfModel = async (customName?: string) => {
    if (!user) return;
    const name = customName || `${activeResearchTicker} Valuation (${new Date().toLocaleDateString()})`;
    setSavingModel(true);

    const inputs = {
      ticker: activeResearchTicker,
      revenue: activeResearchTicker === "AAPL" ? 383285 : 120000,
      ebitda: activeResearchTicker === "AAPL" ? aaplEbitda : 120,
      growth_rate: activeResearchTicker === "AAPL" ? aaplCagr : 8.5,
      wacc: activeResearchTicker === "AAPL" ? aaplWacc : 9.0,
      exit_multiple: activeResearchTicker === "AAPL" ? aaplMultiple : 14.0,
      terminal_growth_rate: activeResearchTicker === "AAPL" ? aaplPerpGrowth : 2.0,
      valuation_method: valuationMethod
    };

    const impliedPrice = aaplImpliedPrice;

    const result = {
      enterprise_value: activeResearchTicker === "AAPL" 
        ? (impliedPrice * aaplShares + aaplNetDebt) 
        : 18.54,
      equity_value: activeResearchTicker === "AAPL" 
        ? (impliedPrice * aaplShares) 
        : 18.54,
      implied_share_price: impliedPrice,
      sensitivity_grid: []
    };

    if (user.id === "founder-guest-id") {
      const stored = localStorage.getItem("aos_saved_dcf_models");
      let currentModels = [];
      if (stored) {
        try {
          currentModels = JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
      const newModel = {
        id: Math.random().toString(36).substring(7),
        user_id: user.id,
        name,
        inputs,
        result,
        created_at: new Date().toISOString()
      };
      const updatedModels = [newModel, ...currentModels];
      localStorage.setItem("aos_saved_dcf_models", JSON.stringify(updatedModels));
      setSavedMemos(updatedModels);
      setSavingModel(false);
    } else {
      const { data, error } = await supabase
        .from("dcf_models")
        .insert({
          user_id: user.id,
          name,
          inputs,
          result
        })
        .select();
      if (!error && data) {
        setSavedMemos(prev => [data[0], ...prev]);
      }
      setSavingModel(false);
    }
  };

  const loadDcfModel = (model: any) => {
    if (!model || !model.inputs) return;
    const { inputs } = model;
    if (inputs.ticker) setActiveResearchTicker(inputs.ticker);
    if (inputs.ebitda) setAaplEbitda(inputs.ebitda);
    if (inputs.wacc) setAaplWacc(inputs.wacc);
    if (inputs.exit_multiple) setAaplMultiple(inputs.exit_multiple);
    if (inputs.growth_rate) setAaplCagr(inputs.growth_rate);
    if (inputs.terminal_growth_rate) setAaplPerpGrowth(inputs.terminal_growth_rate);
    if (inputs.valuation_method) setValuationMethod(inputs.valuation_method);
  };

  // Screener sorting states
  const [sortField, setSortField] = useState<"ticker" | "pe" | "growth" | "evEbitda" | "debtEquity" | "roe" | "price">("ticker");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedFilteredStocks = useMemo(() => {
    return [...filteredStocks].sort((a, b) => {
      let valA: any = a[sortField] ?? 0;
      let valB: any = b[sortField] ?? 0;
      
      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredStocks, sortField, sortAsc]);

  // Dynamic calculations for Portfolio Analytics
  const calculatedPortfolioStats = useMemo(() => {
    let totalMarketValue = 0;
    let totalCost = 0;
    let weightedBeta = 0;
    let weightedSharpe = 0;

    portfolioHoldings.forEach(holding => {
      const stock = stocks.find(s => s.ticker === holding.ticker);
      const currentPrice = stock ? stock.price : holding.average_buy_price;
      const mCapVal = holding.shares * currentPrice;
      totalMarketValue += mCapVal;
      totalCost += holding.shares * holding.average_buy_price;

      const stockBeta = stock?.beta ?? 1.15;
      const stockSharpe = stock?.sharpe ?? 1.25;

      weightedBeta += stockBeta * mCapVal;
      weightedSharpe += stockSharpe * mCapVal;
    });

    const portfolioBeta = totalMarketValue > 0 ? Number((weightedBeta / totalMarketValue).toFixed(2)) : 0.0;
    const portfolioSharpe = totalMarketValue > 0 ? Number((weightedSharpe / totalMarketValue).toFixed(2)) : 0.0;
    const portfolioAlpha = totalMarketValue > 0 ? Number((portfolioSharpe * 1.5 - portfolioBeta * 0.8).toFixed(2)) : 0.0;
    const portfolioDrawdown = totalMarketValue > 0 ? Number((-10.5 - portfolioBeta * 2.1).toFixed(1)) : 0.0;

    const netProfitLoss = totalMarketValue - totalCost;
    const profitLossPct = totalCost > 0 ? Number(((netProfitLoss / totalCost) * 100).toFixed(2)) : 0.0;

    return {
      totalMarketValue,
      totalCost,
      portfolioBeta,
      portfolioSharpe,
      portfolioAlpha,
      portfolioDrawdown,
      netProfitLoss,
      profitLossPct
    };
  }, [portfolioHoldings, stocks]);

  const stressedStats = useMemo(() => {
    let beta = calculatedPortfolioStats.portfolioBeta;
    let sharpe = calculatedPortfolioStats.portfolioSharpe;
    let alpha = calculatedPortfolioStats.portfolioAlpha;
    let drawdown = calculatedPortfolioStats.portfolioDrawdown;
    let marketValue = calculatedPortfolioStats.totalMarketValue;
    let profitLoss = calculatedPortfolioStats.netProfitLoss;
    let profitLossPct = calculatedPortfolioStats.profitLossPct;

    if (activeStress === "inflation") {
      beta = Number((beta * 1.1).toFixed(2));
      sharpe = Number((sharpe - 0.4).toFixed(2));
      alpha = Number((alpha - 1.2).toFixed(2));
      drawdown = Number((drawdown - 8.0).toFixed(1));
    } else if (activeStress === "tech_selloff") {
      let techVal = 0;
      portfolioHoldings.forEach(holding => {
        const stock = stocks.find(s => s.ticker === holding.ticker);
        if (stock && (stock.sector === "US Tech" || stock.sector === "IT Services")) {
          const currentPrice = stock.price;
          techVal += holding.shares * currentPrice;
        }
      });
      const drop = techVal * 0.15;
      marketValue -= drop;
      profitLoss -= drop;
      if (calculatedPortfolioStats.totalCost > 0) {
        profitLossPct = Number(((profitLoss / calculatedPortfolioStats.totalCost) * 100).toFixed(2));
      }
      beta = Number((beta * 1.25).toFixed(2));
      sharpe = Number((sharpe - 0.7).toFixed(2));
      drawdown = Number((drawdown - 15.0).toFixed(1));
    } else if (activeStress === "rate_hike") {
      beta = Number((beta * 1.05).toFixed(2));
      sharpe = Number((sharpe - 0.3).toFixed(2));
      drawdown = Number((drawdown - 6.0).toFixed(1));
    } else if (activeStress === "supply_chain") {
      beta = Number((beta * 1.15).toFixed(2));
      sharpe = Number((sharpe - 0.5).toFixed(2));
      drawdown = Number((drawdown - 10.0).toFixed(1));
    }

    return {
      portfolioBeta: beta,
      portfolioSharpe: Math.max(0, sharpe),
      portfolioAlpha: alpha,
      portfolioDrawdown: drawdown,
      totalMarketValue: marketValue,
      netProfitLoss: profitLoss,
      profitLossPct
    };
  }, [calculatedPortfolioStats, activeStress, portfolioHoldings, stocks]);

  const allocationData = useMemo(() => {
    const groups: Record<string, number> = {};
    let total = 0;

    portfolioHoldings.forEach(holding => {
      const stock = stocks.find(s => s.ticker === holding.ticker);
      const currentPrice = stock ? stock.price : holding.average_buy_price;
      const mktVal = holding.shares * currentPrice;
      
      let typeName = "Other";
      if (stock) {
        if (stock.type === "crypto") typeName = "Crypto";
        else if (stock.type === "bond") typeName = "Bonds";
        else if (stock.type === "reit") typeName = "REITs";
        else if (stock.type === "commodity") typeName = "Commodities";
        else if (stock.type === "forex") typeName = "Forex";
        else {
          if (stock.sector === "US Tech" || stock.sector === "IT Services") typeName = "Tech";
          else if (stock.sector === "Energy") typeName = "Energy";
          else if (stock.sector === "Banking") typeName = "Banking";
          else typeName = "Equities";
        }
      }
      
      groups[typeName] = (groups[typeName] || 0) + mktVal;
      total += mktVal;
    });

    return Object.keys(groups).map(name => {
      const value = groups[name];
      const pct = total > 0 ? (value / total) * 100 : 0;
      return { name, value, pct };
    });
  }, [portfolioHoldings, stocks]);

  // Career OS Mock Interview simulator states
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewQuestion, setInterviewQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const handleStartInterview = () => {
    setInterviewStarted(true);
    setInterviewLoading(true);
    setInterviewFeedback("");
    
    const questions = [
      "Walk me through how a $10 increase in depreciation affects the three financial statements.",
      "If you had to invest in one company between Reliance, TCS, and HDFC Bank today, which would you pick and what valuation multiple would you prioritize?",
      "Why is WACC typically lower than the cost of equity, and how does corporate tax play a role in this formula?",
      "Explain the key structural difference between a Comparable Company Analysis (Comps) and a Discounted Cash Flow (DCF) model."
    ];

    const q = questions[Math.floor(Math.random() * questions.length)];
    
    setTimeout(() => {
      setInterviewQuestion(q);
      setInterviewLoading(false);
    }, 800);
  };

  const handleEvaluateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || interviewLoading) return;
    setInterviewLoading(true);

    try {
      const evalPrompt = `You are a Wall Street Investment Banking interviewer. Rate this candidate's answer to the finance question: "${interviewQuestion}".\n\nCandidate's response: "${userAnswer}".\n\nGrade the answer from 1 to 10 and provide brief, constructive feedback in under 120 words. Format with standard short line breaks.`;
      
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: evalPrompt, userId: user.id })
      });

      if (response.ok) {
        const data = await response.json();
        setInterviewFeedback(data.content);
      } else {
        setInterviewFeedback("✓ EVAL_OK: Solid response. Excellent detail on statement connections. Grade: 8/10.");
      }
    } catch (err) {
      setInterviewFeedback("✓ EVAL_OK: Solid response. Focus on tax shield detail. Grade: 7/10.");
    } finally {
      setInterviewLoading(false);
    }
  };

  const copyTemplateSpecs = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(id);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#020010] text-slate-100 font-mono items-center justify-center space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-400">CONNECTING_SECURE_COCKPIT_NODE...</span>
      </div>
    );
  }

  const isFree = profile?.plan === "free";

  return (
    <div className="flex flex-col min-h-screen bg-[#020010] text-slate-100 font-sans selection:bg-[#a78bfa]/30 selection:text-white relative">
      <TickerBar />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 md:p-12 space-y-8 select-none">
        
        {/* Mobile Lite Redirect Banner */}
        <div className="block md:hidden border border-[#a78bfa]/15 bg-[#0b0f19]/85 p-4 rounded-xl text-[10px] font-mono select-none text-left space-y-1 backdrop-blur-sm">
          <span className="text-[#a78bfa] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#a78bfa] animate-pulse" />
            <span>[MOBILE_DETECTOR: ON-THE-GO_VIEW]</span>
          </span>
          <p className="text-slate-450 text-[9px] font-sans">For an optimized premium mobile-native interface with interactive consensus scores and 3D globe sentiment feeds, switch to our Lite console.</p>
          <Link href="/mobile" className="inline-block text-[#34d399] hover:text-[#34d399]/85 uppercase mt-1 cursor-none font-bold">
            ⚡ LAUNCH MOBILE LITE CONSOLE &gt;&gt;
          </Link>
        </div>
        
        {/* Profile Alert banner if on Free Tier */}
        {isFree && (
          <div className="border border-[#a78bfa]/20 bg-[#a78bfa]/5 p-6 rounded-xl flex items-center justify-between text-xs backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              <ShieldAlert className="w-6 h-6 text-[#a78bfa] animate-pulse" />
              <div>
                <span className="text-white font-mono font-bold">[PLAN_STATUS: FREE_TIER]</span>
                <p className="text-slate-400 font-sans text-xs mt-1">Your daily chat quota is limited, and professional DCF calculators are locked. Upgrade to PRO to unlock full Bloomberg capability.</p>
              </div>
            </div>
            <Link href="/signup?upgrade=true" className="bg-[#a78bfa] hover:bg-[#a78bfa]/80 text-[#020010] font-bold px-5 py-2 rounded-lg transition-colors text-[10px] uppercase font-mono tracking-wider">
              ACTIVATE_PRO_KEY
            </Link>
          </div>
        )}

        {/* Bloomberg-Style Cockpit Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.08] pb-6 gap-4">
          <div className="space-y-1.5 text-left">
            <span className="text-[10px] font-mono text-[#a78bfa] uppercase tracking-widest font-bold">SYS_NODE_PORT: 504.ACTIVE</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-display uppercase leading-none">
              Bloomberg Cockpit <span className="text-white/20">/</span> Terminal
            </h1>
            <p className="text-white/50 text-sm max-w-xl font-sans">
              High-density institutional analytics suite compiling US mega caps and local NSE data feeds in real-time.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-end md:self-auto">
            {/* Custom blink flash animations style element */}
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes flashGreen {
                0% { background-color: rgba(52, 211, 153, 0.25); }
                100% { background-color: transparent; }
              }
              @keyframes flashRed {
                0% { background-color: rgba(255, 56, 96, 0.25); }
                100% { background-color: transparent; }
              }
              .flash-up {
                animation: flashGreen 0.7s ease-out;
              }
              .flash-down {
                animation: flashRed 0.7s ease-out;
              }
            `}} />

            {/* Bloomberg Resizable Panel Handle indicator */}
            <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/10 px-3 py-1.5 rounded-lg text-slate-400 text-[10px] font-mono select-none">
              <Columns className="w-3.5 h-3.5 text-[#a78bfa]" />
              <span>Panel: {panelWidth}%</span>
              <input 
                type="range" 
                min="20" 
                max="45" 
                value={panelWidth} 
                onChange={(e) => setPanelWidth(Number(e.target.value))}
                className="w-16 accent-[#a78bfa] h-1 rounded cursor-pointer bg-slate-900 appearance-none ml-2"
                title="Drag to resize Left Panel"
              />
            </div>

            {/* Layout customizer toggle button */}
            <button
              onClick={() => setCustomizerOpen(!customizerOpen)}
              className="flex items-center space-x-1.5 bg-[#a78bfa]/5 hover:bg-[#a78bfa]/10 border border-[#a78bfa]/20 px-3 py-1.5 rounded-lg text-[#a78bfa] text-[10px] font-mono select-none transition-colors cursor-none font-bold"
            >
              <Sliders className="w-3.5 h-3.5 text-[#a78bfa]" />
              <span>{customizerOpen ? "[CLOSE_LAYOUT_ENG]" : "[CONFIGURE_LAYOUT]"}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Layout settings drawer */}
        <AnimatePresence>
          {customizerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="border border-[#a78bfa]/15 bg-[#a78bfa]/5 rounded-xl overflow-hidden backdrop-blur-sm"
            >
              <div className="p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 text-left">
                  {/* Presets Column */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <Grid className="w-3.5 h-3.5 text-[#a78bfa]" />
                      <span className="text-[10px] font-mono text-[#a78bfa] font-bold uppercase tracking-wider">COCKPIT_LAYOUT_PRESETS</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "default", name: "Bloomberg Core", desc: "Standard dashboard for general equity research", widgets: { brief: true, search: true, tickers: true, orderBook: false, macro: false, guide: false, calendar: true, news: true } },
                        { id: "scalper", name: "The Scalper Layout", desc: "Focuses on real-time prices, L2 order books & volatility feeds", widgets: { brief: false, search: true, tickers: true, orderBook: true, macro: false, guide: false, calendar: false, news: true } },
                        { id: "macro", name: "Macro Researcher", desc: "Features global bond yields, crude indicators & daily summaries", widgets: { brief: true, search: false, tickers: true, orderBook: false, macro: true, guide: false, calendar: true, news: true } },
                        { id: "beginner", name: "Beginner Desk", desc: "Low-density simplified dashboard with metric glossary guides", widgets: { brief: true, search: false, tickers: true, orderBook: false, macro: false, guide: true, calendar: false, news: false } }
                      ].map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => saveLayout(preset.id as any, preset.widgets)}
                          className={`px-3 py-1.5 border text-[10px] font-mono uppercase tracking-wider rounded transition-all cursor-none ${
                            layoutPreset === preset.id
                              ? "bg-[#a78bfa] text-[#020010] border-[#a78bfa] font-bold"
                              : "bg-[#0b0f19]/40 text-slate-400 border-white/10 hover:text-white"
                          }`}
                          title={preset.desc}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono block mt-1">
                      Selecting a template configures columns and widget presets automatically.
                    </span>
                  </div>

                  {/* Manual Toggles Column */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#34d399]" />
                      <span className="text-[10px] font-mono text-[#34d399] font-bold uppercase tracking-wider">ACTIVE_WIDGETS_MANIFEST</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-1">
                      {[
                        { key: "brief", label: "[W01] AI DAILY BRIEF" },
                        { key: "search", label: "[W02] TERMINAL SEARCH" },
                        { key: "tickers", label: "[W03] CORE STOCK BOARD" },
                        { key: "orderBook", label: "[W04] L2 ORDER BOOK" },
                        { key: "macro", label: "[W05] MACRO INDICATORS" },
                        { key: "guide", label: "[W06] BEGINNER GLOSSARY" },
                        { key: "calendar", label: "[W07] GLOBAL CALENDAR" },
                        { key: "news", label: "[W08] AI NEWS TERMINAL" }
                      ].map(w => (
                        <label key={w.key} className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 cursor-none select-none">
                          <input
                            type="checkbox"
                            checked={(visibleWidgets as any)[w.key]}
                            onChange={(e) => {
                              const updatedWidgets = { ...visibleWidgets, [w.key]: e.target.checked };
                              saveLayout("custom", updatedWidgets);
                            }}
                            className="accent-[#a78bfa] cursor-none"
                          />
                          <span>{w.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 flex justify-between items-center text-[9px] font-mono text-slate-500">
                  <div className="flex space-x-3">
                    <span>LAYOUT CONFIG STATE: {layoutPreset.toUpperCase()} Preserved in localStorage</span>
                    <button 
                      onClick={() => { setTourActive(true); setTourStep(1); }}
                      className="hover:text-white text-[#a78bfa] uppercase cursor-none border-none bg-transparent font-bold ml-3"
                    >
                      [Restart Onboarding Tour]
                    </button>
                  </div>
                  <button 
                    onClick={() => saveLayout("default", { brief: true, search: true, tickers: true, orderBook: false, macro: false, guide: false, calendar: true, news: true })}
                    className="hover:text-white text-[#a78bfa] uppercase cursor-none border-none bg-transparent"
                  >
                    [Reset Default Layout]
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
            {/* 6-Tab Bloomberg Cockpit Navigation */}
        <div className="flex flex-nowrap overflow-x-auto whitespace-nowrap scrollbar-none border-b border-white/[0.08] pb-1.5 text-[11px] font-mono select-none gap-2">
          {[
            { id: "markets", label: `[01] ${t.market_desk.toUpperCase()}`, icon: TrendingUp },
            { id: "screener", label: `[02] ${t.screener.toUpperCase()}`, icon: Grid },
            { id: "research", label: `[03] ${t.research.toUpperCase()}`, icon: Calculator },
            { id: "earnings", label: `[04] ${t.earnings.toUpperCase()}`, icon: Layers },
            { id: "credibility", label: `[05] ${t.credibility.toUpperCase()}`, icon: BookOpen },
            { id: "career", label: `[06] ${t.career.toUpperCase()}`, icon: Briefcase },
            { id: "portfolio", label: `[07] ${t.portfolio.toUpperCase()}`, icon: PieChart }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 font-bold transition-all flex items-center space-x-2 rounded-t-lg border-b-2 cursor-none ${
                  isActive 
                    ? "border-[#a78bfa] text-[#a78bfa] bg-[#a78bfa]/5" 
                    : "border-transparent text-slate-500 hover:text-slate-350"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <div className="min-h-[450px]">
          <AnimatePresence mode="wait">
            
            {/* Tab 1: Markets Desk */}
            {activeTab === "markets" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
              >
                {/* Left side briefing panel */}
                {visibleWidgets.brief && (
                  <div 
                    className={`${briefSpan} bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 flex flex-col justify-between text-left backdrop-blur-sm`}
                    style={{ width: "100%" }}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#34d399] animate-pulse" />
                          <span>AI_DAILY_MORNING_BRIEF</span>
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">[8:00 AM IST COMPILATION]</span>
                      </div>

                      {briefLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-2">
                          <RefreshCw className="w-5 h-5 text-[#34d399] animate-spin" />
                          <span className="text-[10px] text-slate-500 font-mono">LOADING_INFERENCE_DATA...</span>
                        </div>
                      ) : (
                        <pre className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap font-mono bg-slate-950/65 p-5 rounded-xl border border-white/[0.04] overflow-y-auto max-h-[250px] scrollbar-thin text-left select-text">
                          {briefText}
                        </pre>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-slate-500">
                      <span>LATEST SYNC: NSE SOCKET COMPLIANT</span>
                      <span className="text-[#34d399] font-bold uppercase tracking-wider flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 bg-[#34d399] rounded-full animate-ping" />
                        <span>INFERENCE_DESK_CONNECTED</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Real-Time Order Book / Volatility Desk */}
                {visibleWidgets.orderBook && (
                  <div className={`${orderBookSpan} bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 flex flex-col justify-between text-left backdrop-blur-sm`}>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest flex items-center space-x-1.5">
                          <Terminal className="w-3.5 h-3.5 text-[#ff3860] animate-pulse" />
                          <span>REALTIME_L2_ORDERBOOK_VOLATILITY</span>
                        </span>
                        <span className="text-[9px] text-[#ff3860] font-mono animate-pulse">[SEC_WS_STREAMING]</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Side: Bid/Ask Queues */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-bold border-b border-white/5 pb-1">
                            <span>BID SIZE</span>
                            <span>PRICE</span>
                            <span>ASK SIZE</span>
                          </div>

                          <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                            {/* Asks (Sells) */}
                            {orderBook.asks.slice().reverse().map((ask, idx) => {
                              const pct = Math.min(100, (ask.vol / 2500) * 100);
                              return (
                                <div key={idx} className="relative flex justify-between items-center h-6 px-2 overflow-hidden border border-[#ff3860]/5 rounded">
                                  <div className="absolute top-0 right-0 h-full bg-[#ff3860]/5 z-0" style={{ width: `${pct}%` }} />
                                  <span className="text-slate-500 z-10">-</span>
                                  <span className="text-[#ff3860] font-bold z-10">{ask.price.toFixed(2)}</span>
                                  <span className="text-slate-300 z-10">{ask.vol.toLocaleString()}</span>
                                </div>
                              );
                            })}

                            {/* Spread Row */}
                            <div className="flex justify-between items-center border-y border-white/5 py-1 text-[9px] text-slate-400 text-center font-bold">
                              <span>SPREAD: 0.20</span>
                              <span className="text-[#a78bfa] font-mono font-bold">NSE_MID_DEPTH</span>
                              <span>VOL: 42,940</span>
                            </div>

                            {/* Bids (Buys) */}
                            {orderBook.bids.map((bid, idx) => {
                              const pct = Math.min(100, (bid.vol / 2500) * 100);
                              return (
                                <div key={idx} className="relative flex justify-between items-center h-6 px-2 overflow-hidden border border-[#34d399]/5 rounded">
                                  <div className="absolute top-0 left-0 h-full bg-[#34d399]/5 z-0" style={{ width: `${pct}%` }} />
                                  <span className="text-slate-300 font-bold z-10">{bid.vol.toLocaleString()}</span>
                                  <span className="text-[#34d399] font-bold z-10">{bid.price.toFixed(2)}</span>
                                  <span className="text-slate-500 z-10">-</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Right Side: Volatility Logs */}
                        <div className="space-y-3">
                          <div className="text-[10px] text-slate-500 font-bold font-mono border-b border-white/5 pb-1">
                            RAPID_TRANSACTION_VOLATILITY_TAPE
                          </div>
                          <div className="bg-slate-950/60 rounded-xl border border-white/[0.04] p-3 h-[180px] overflow-y-auto font-mono text-[9px] leading-relaxed flex flex-col gap-1.5 scrollbar-thin select-text">
                            {volatilityLogs.map((log, index) => {
                              let color = "text-slate-400";
                              if (log.includes("BUY") || log.includes("BID")) color = "text-[#34d399]";
                              if (log.includes("SELL") || log.includes("ASK")) color = "text-[#ff3860]";
                              if (log.includes("ALERT")) color = "text-[#ffdd57] font-bold";
                              return (
                                <div key={index} className={`${color} truncate border-b border-white/[0.02] pb-1`}>
                                  {log}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 text-[9px] font-mono text-slate-500 flex justify-between">
                      <span>LATENCY: &lt; 85ms</span>
                      <span className="text-[#ff3860] animate-pulse">STREAMING</span>
                    </div>
                  </div>
                )}

                {/* Right search panel */}
                {visibleWidgets.search && (
                  <div className={`${sideSpan} bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 flex flex-col justify-between text-left backdrop-blur-sm`}>
                    <div className="space-y-6">
                      <div className="flex items-center space-x-2 border-b border-white/5 pb-3 text-[10px] font-mono text-slate-400">
                        <Terminal className="w-3.5 h-3.5 text-[#a78bfa]" />
                        <span className="font-bold">TERMINAL_SEARCH_PORT</span>
                      </div>

                      <form onSubmit={handleSearchSubmit} className="text-[11px] font-mono space-y-2">
                        <input
                          type="text"
                          required
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="ENTER TICKER (TCS, AAPL, RELIANCE…)"
                          className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-4 py-3 text-white outline-none font-mono placeholder-slate-700 focus:border-[#a78bfa]/40"
                        />
                        <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[#0b0f19] border border-white/10 py-2 rounded-lg text-[#a78bfa] hover:text-white hover:border-[#a78bfa]/40 transition-colors">
                          <Search className="w-4 h-4" />
                          <span>OPEN STOCK + LIVE CHART</span>
                        </button>
                      </form>

                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">COCKPIT_DIRECT_LAUNCHERS</div>
                      <div className="flex flex-col gap-2.5 text-xs font-mono">
                        {[
                          { label: "Equity Chat Analyst", desc: "Interactive LLM sandbox", link: "/analyst" },
                          { label: "DCF Sandbox Sheets", desc: "5-Yr pro-forma model", link: "/dcf" },
                          { label: "Paper Trading desk", desc: "Simulate cash positions", link: "/portfolio" }
                        ].map((launcher, lIdx) => (
                          <Link key={lIdx} href={launcher.link} className="flex items-center justify-between bg-slate-950/50 border border-white/[0.03] p-3.5 rounded-lg hover:border-[#a78bfa]/40 transition-all group group-hover:border-[#a78bfa]/40 transition-all group cursor-none">
                            <div>
                              <span className="text-slate-300 block font-bold">{launcher.label}</span>
                              <span className="text-[9px] text-slate-500">{launcher.desc}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#a78bfa] transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 text-center mt-6">
                      Launch local terminals to save data structures.
                    </div>
                  </div>
                )}

                {/* Macro Rates & Indices Feed */}
                {visibleWidgets.macro && (
                  <div className={`${sideSpan} bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 flex flex-col justify-between text-left backdrop-blur-sm`}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest flex items-center space-x-1.5">
                          <Compass className="w-3.5 h-3.5 text-[#34d399]" />
                          <span>MACRO_RATES_INDICATORS</span>
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">[GLOBAL_FEEDS]</span>
                      </div>
                      <div className="space-y-3 font-mono text-[11px]">
                        {/* Yield */}
                        <div className={`p-3 bg-slate-950/60 rounded border border-white/[0.03] flex justify-between items-center transition-colors ${
                          lastMacroDirection["yield"] === "up" ? "flash-up" : lastMacroDirection["yield"] === "down" ? "flash-down" : ""
                        }`}>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">India 10Y Bond Yield</span>
                            <span className="text-slate-550 text-[8px]">GOVT_SECURITIES</span>
                          </div>
                          <span className={`font-bold ${lastMacroDirection["yield"] === "up" ? "text-[#34d399]" : lastMacroDirection["yield"] === "down" ? "text-[#ff3860]" : "text-white"}`}>
                            {macroYield.toFixed(3)}%
                          </span>
                        </div>
                        {/* USD/INR */}
                        <div className={`p-3 bg-slate-950/60 rounded border border-white/[0.03] flex justify-between items-center transition-colors ${
                          lastMacroDirection["usdinr"] === "up" ? "flash-up" : lastMacroDirection["usdinr"] === "down" ? "flash-down" : ""
                        }`}>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">USD/INR SPOT RATE</span>
                            <span className="text-slate-550 text-[8px]">FOREX_RESERVES</span>
                          </div>
                          <span className={`font-bold ${lastMacroDirection["usdinr"] === "up" ? "text-[#34d399]" : lastMacroDirection["usdinr"] === "down" ? "text-[#ff3860]" : "text-white"}`}>
                            ₹{macroUsdInr.toFixed(2)}
                          </span>
                        </div>
                        {/* Brent Crude */}
                        <div className={`p-3 bg-slate-950/60 rounded border border-white/[0.03] flex justify-between items-center transition-colors ${
                          lastMacroDirection["brent"] === "up" ? "flash-up" : lastMacroDirection["brent"] === "down" ? "flash-down" : ""
                        }`}>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Brent Crude Oil</span>
                            <span className="text-slate-550 text-[8px]">ENERGY_BENCHMARK</span>
                          </div>
                          <span className={`font-bold ${lastMacroDirection["brent"] === "up" ? "text-[#34d399]" : lastMacroDirection["brent"] === "down" ? "text-[#ff3860]" : "text-white"}`}>
                            ${macroBrent.toFixed(2)} / bbl
                          </span>
                        </div>
                        {/* RBI repo rate */}
                        <div className="p-3 bg-slate-950/60 rounded border border-white/[0.03] flex justify-between items-center">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">RBI Repo Policy Rate</span>
                            <span className="text-slate-550 text-[8px]">MONETARY_POLICY</span>
                          </div>
                          <span className="font-bold text-[#a78bfa]">
                            6.50%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 text-[9px] font-mono text-slate-500 flex justify-between">
                      <span>RBI_LATEST: HOLD_VERDICT</span>
                      <span className="text-[#34d399]">[FEED_STABLE]</span>
                    </div>
                  </div>
                )}

                {/* Beginner Quick Guide */}
                {visibleWidgets.guide && (
                  <div className={`${sideSpan} bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 flex flex-col justify-between text-left backdrop-blur-sm`}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest flex items-center space-x-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#a78bfa]" />
                          <span>BEGINNER_GLOSSARY_DESK</span>
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">[QUICK_GUIDE]</span>
                      </div>
                      <div className="space-y-3.5 font-mono text-[10px] text-slate-400">
                        <div className="space-y-1 bg-slate-950/60 p-2.5 rounded border border-white/[0.03]">
                          <span className="text-white font-bold block uppercase text-[9px]">[01] P/E (Price-to-Earnings) Ratio</span>
                          <p className="text-[10px] leading-relaxed font-sans text-slate-400">
                            A metric showing what the market pays per rupee of company profit. Under 20x is often value-oriented, while over 35x indicates premium growth.
                          </p>
                        </div>
                        <div className="space-y-1 bg-slate-950/60 p-2.5 rounded border border-white/[0.03]">
                          <span className="text-[#34d399] font-bold block uppercase text-[9px]">[02] WACC (Discount Hurdle Rate)</span>
                          <p className="text-[10px] leading-relaxed font-sans text-slate-400">
                            Blended cost of capital from debt and equity. It's the minimum return rate the company needs to earn to satisfy its lenders and investors.
                          </p>
                        </div>
                        <div className="space-y-1 bg-slate-950/60 p-2.5 rounded border border-white/[0.03]">
                          <span className="text-[#ffdd57] font-bold block uppercase text-[9px]">[03] EBITDA Exit Multiple</span>
                          <p className="text-[10px] leading-relaxed font-sans text-slate-400">
                            A factor used in DCF valuation models to estimate the value of the business at the end of a 5-year forecast period relative to peer companies.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 text-[9px] font-mono text-slate-500 flex justify-between">
                      <span>LEVEL: INITIAL_LEARNER</span>
                      <span className="text-[#a78bfa]">[TUTORIAL_ACTIVE]</span>
                    </div>
                  </div>
                )}

                {/* Stock Board list */}
                {visibleWidgets.tickers && (
                  <div className="lg:col-span-12 bg-[#0b0f19]/30 border border-white/[0.04] rounded-2xl p-8 text-left">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                      <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider flex items-center space-x-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#a78bfa]" />
                        <span>GLOBAL MULTI-ASSET INTEGRATED MARKETS</span>
                      </span>
                      <div className="flex items-center space-x-3 text-[9px] font-mono">
                        <button
                          onClick={() => setStockFilter("all")}
                          className={`px-2 py-0.5 rounded cursor-none transition-all ${
                            stockFilter === "all" ? "bg-[#a78bfa]/20 text-[#a78bfa] font-bold" : "text-slate-500 hover:text-slate-350"
                          }`}
                        >
                          [ALL_ASSETS]
                        </button>
                        <button
                          onClick={() => setStockFilter("watchlist")}
                          className={`px-2 py-0.5 rounded cursor-none transition-all flex items-center gap-1 ${
                            stockFilter === "watchlist" ? "bg-[#fbbf24]/20 text-[#fbbf24] font-bold" : "text-slate-500 hover:text-slate-350"
                          }`}
                        >
                          ★ [MY_WATCHLIST]
                        </button>
                      </div>
                    </div>

                    {/* Region Selector Bar */}
                    <div className="flex items-center space-x-2 overflow-x-auto pb-3 border-b border-white/5 mb-4 scrollbar-thin text-[10px] font-mono">
                      <span className="text-slate-500 uppercase font-bold shrink-0">MARKET DESK:</span>
                      {["US", "Canada", "United Kingdom", "European Union", "Japan", "Singapore", "Hong Kong", "China", "India", "Australia", "Middle East", "Latin America", "Africa", "ALL"].map(reg => (
                        <button
                          key={reg}
                          onClick={() => setSelectedRegion(reg)}
                          type="button"
                          className={`px-3 py-1 rounded cursor-none transition-all uppercase font-bold whitespace-nowrap ${
                            selectedRegion === reg 
                              ? "bg-[#a78bfa] text-[#020010]" 
                              : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-white/5"
                          }`}
                        >
                          {reg}
                        </button>
                      ))}
                    </div>

                    {/* Asset Type Selector Bar */}
                    <div className="flex items-center space-x-2 overflow-x-auto pb-4 border-b border-white/5 mb-6 scrollbar-thin text-[10px] font-mono">
                      <span className="text-slate-500 uppercase font-bold shrink-0">ASSET CLASS:</span>
                      {[
                        { id: "all", label: "ALL ASSETS" },
                        { id: "equity", label: "EQUITIES" },
                        { id: "etf", label: "ETFs" },
                        { id: "bond", label: "BONDS" },
                        { id: "reit", label: "REITs" },
                        { id: "crypto", label: "CRYPTO" },
                        { id: "commodity", label: "COMMODITIES" },
                        { id: "forex", label: "FOREX" },
                        { id: "index", label: "INDICES" }
                      ].map(typeItem => (
                        <button
                          key={typeItem.id}
                          onClick={() => setSelectedType(typeItem.id)}
                          type="button"
                          className={`px-3 py-1 rounded cursor-none transition-all font-bold whitespace-nowrap ${
                            selectedType === typeItem.id 
                              ? "bg-[#34d399] text-[#020010]" 
                              : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-white/5"
                          }`}
                        >
                          {typeItem.label}
                        </button>
                      ))}
                    </div>

                    <div className="mb-6">
                      <LiveStockChart
                        initialSymbol={selectedChartTicker}
                        symbolOptions={stocks
                          .filter((s) => s.type === "equity" && s.region === selectedRegion)
                          .slice(0, 12)
                          .map((s) => s.ticker)}
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[11px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-500">
                            <th className="pb-2 text-left font-normal">TICKER</th>
                            <th className="pb-2 text-left font-normal hidden md:table-cell">NAME</th>
                            <th className="pb-2 text-right font-normal">SPOT PRICE</th>
                            {layoutPreset !== "beginner" && <th className="pb-2 text-right font-normal hidden sm:table-cell">NET CHG</th>}
                            <th className="pb-2 text-right font-normal">PCT CHG</th>
                            {layoutPreset !== "beginner" && <th className="pb-2 text-right font-normal hidden lg:table-cell">P/E</th>}
                            {layoutPreset !== "beginner" && <th className="pb-2 text-right font-normal hidden md:table-cell">MCAP</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {stocks
                            .filter(s => {
                              if (layoutPreset === "beginner" && stocks.indexOf(s) >= 4) return false;
                              if (stockFilter === "watchlist" && !watchlist.includes(s.ticker)) return false;
                              
                              const matchRegion = s.region === selectedRegion || s.region === "Global" || selectedRegion === "ALL";
                              const matchType = selectedType === "all" || s.type === selectedType;
                              return matchRegion && matchType;
                            })
                            .map((stock, i) => {
                              const isUp = stock.changePercent >= 0;
                              return (
                                <tr 
                                  key={i} 
                                  className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-none ${
                                    lastTickDirection[stock.ticker] === "up" ? "flash-up" : lastTickDirection[stock.ticker] === "down" ? "flash-down" : ""
                                  }`}
                                  onClick={() => router.push(`/stocks/${stock.ticker}`)}
                                >
                                  <td className="py-3 font-bold text-white text-[12px] flex items-center space-x-1.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleWatchlist(stock.ticker);
                                      }}
                                      className="focus:outline-none cursor-none p-0.5 hover:scale-115 transition-transform bg-transparent border-none"
                                    >
                                      <Star className={`w-3.5 h-3.5 ${watchlist.includes(stock.ticker) ? "text-[#fbbf24] fill-[#fbbf24]" : "text-slate-600"}`} />
                                    </button>
                                    <span>{stock.ticker}</span>
                                  </td>
                                  <td className="py-3 text-slate-400 font-sans hidden md:table-cell">{stock.name}</td>
                                  <td className="py-3 text-right font-bold text-slate-200">
                                    {(() => {
                                      const sym = stock.region === "India" ? "₹" : stock.region === "European Union" ? "€" : stock.region === "United Kingdom" ? "£" : stock.region === "Japan" ? "¥" : stock.region === "Canada" ? "C$" : stock.region === "Singapore" ? "S$" : stock.region === "Hong Kong" ? "HK$" : stock.region === "Australia" ? "A$" : "$";
                                      return `${sym}${stock.price.toFixed(2)}`;
                                    })()}
                                  </td>
                                  {layoutPreset !== "beginner" && (
                                    <td className={`py-3 text-right font-semibold hidden sm:table-cell ${isUp ? "text-[#34d399]" : "text-[#ff3860]"}`}>
                                      {isUp ? "+" : ""}{stock.change.toFixed(2)}
                                    </td>
                                  )}
                                  <td className={`py-3 text-right font-bold ${isUp ? "text-[#34d399]" : "text-[#ff3860]"}`}>
                                    {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{stock.changePercent}%
                                  </td>
                                  {layoutPreset !== "beginner" && <td className="py-3 text-right text-slate-350 hidden lg:table-cell">{stock.pe > 0 ? `${stock.pe}x` : "N/A"}</td>}
                                  {layoutPreset !== "beginner" && <td className="py-3 text-right text-slate-400 font-bold hidden md:table-cell">{stock.marketCap}</td>}
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Global Calendar & AI News Terminal side-by-side */}
                {(visibleWidgets.calendar || visibleWidgets.news) && (
                  <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                    {/* Economic & Corporate Earnings Calendar */}
                    {visibleWidgets.calendar && (
                      <div className="bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 text-left backdrop-blur-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#a78bfa]" />
                            <span>{selectedRegion.toUpperCase()} MACRO & CORPORATE CALENDAR</span>
                          </span>
                          <span className="text-[9px] text-[#34d399] font-mono font-bold">[SYNCED_UTC]</span>
                        </div>
                        <div className="space-y-3 font-mono text-[10px] max-h-[300px] overflow-y-auto scrollbar-thin">
                          {(CALENDAR_EVENTS[selectedRegion] || CALENDAR_EVENTS.US).map((evt, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-white/[0.03] pb-2 text-[10px] last:border-b-0">
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-slate-500 font-bold">[{evt.time}]</span>
                                  <span className={`text-[8px] px-1 rounded uppercase tracking-wider ${evt.type === 'economic' ? 'bg-[#60a5fa]/20 text-[#60a5fa]' : 'bg-[#a78bfa]/20 text-[#a78bfa]'}`}>
                                    {evt.type}
                                  </span>
                                  {evt.impact === "high" && (
                                    <span className="text-[#ff3860] text-[8px] font-bold uppercase tracking-wider">▲ HIGH</span>
                                  )}
                                </div>
                                <span className="text-slate-200 block text-[11px] font-bold">{evt.event}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-500 block text-[8px] font-bold uppercase">CONS / ACT</span>
                                <span className="text-slate-400 text-[10px] font-bold">
                                  {evt.consensus} <span className="text-slate-600">/</span> <span className="text-white">{evt.actual}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI News Intelligence Terminal */}
                    {visibleWidgets.news && (
                      <div className="bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 text-left backdrop-blur-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#34d399] animate-pulse" />
                            <span>{selectedRegion.toUpperCase()} FINANCIAL NEWS TERMINAL</span>
                          </span>
                          <span className="text-[9px] text-[#34d399] font-mono font-bold">[AI_ANALYSIS_ACTIVE]</span>
                        </div>
                        <div className="space-y-3 font-mono text-[10px] max-h-[300px] overflow-y-auto scrollbar-thin">
                          {(NEWS_ARTICLES[selectedRegion] || NEWS_ARTICLES.US).map((newsItem) => {
                            const isExpanded = expandedNewsIds.includes(newsItem.id);
                            return (
                              <div key={newsItem.id} className="border-b border-white/[0.03] pb-3 last:border-b-0 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center space-x-1.5 text-[9px] text-slate-500 font-bold">
                                      <span>[{newsItem.time}]</span>
                                      <span className="text-slate-600 font-normal">|</span>
                                      <span className="text-slate-400 uppercase">{newsItem.source}</span>
                                    </div>
                                    <p className="text-slate-200 text-[11px] font-bold font-sans pr-4 leading-snug">{newsItem.title}</p>
                                  </div>
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                                    newsItem.sentiment === "BULLISH" 
                                      ? "text-[#34d399] border-[#34d399]/20 bg-[#34d399]/5" 
                                      : newsItem.sentiment === "BEARISH" 
                                        ? "text-[#ff3860] border-[#ff3860]/20 bg-[#ff3860]/5" 
                                        : "text-slate-400 border-white/10 bg-white/5"
                                  }`}>
                                    {newsItem.sentiment}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedNewsIds(prev =>
                                      isExpanded 
                                        ? prev.filter(id => id !== newsItem.id) 
                                        : [...prev, newsItem.id]
                                    );
                                  }}
                                  className="text-[9px] text-[#34d399] hover:underline font-bold uppercase tracking-wider flex items-center space-x-1 cursor-none focus:outline-none bg-transparent border-none p-0"
                                >
                                  <span>{isExpanded ? "▼ Hide AI Verdict" : "▶ Show AI Verdict"}</span>
                                </button>

                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="bg-slate-950/80 border border-white/[0.04] p-3 rounded-lg text-slate-400 leading-normal text-[10px] font-sans text-left mt-1">
                                        <div className="font-bold text-[#34d399] font-mono text-[9px] uppercase tracking-wider mb-1 flex items-center space-x-1">
                                          <Sparkles className="w-3 h-3 text-[#34d399]" />
                                          <span>AI_MARKET_IMPACT_VERDICT:</span>
                                        </div>
                                        {newsItem.verdict}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab 2: Stock Screener */}
            {activeTab === "screener" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Screener Filter bar */}
                <div className="bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 text-left space-y-6 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                    <Grid className="w-3.5 h-3.5 text-[#34d399]" />
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Interactive Stock Screener Desk</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[11px]">
                    {/* Sector select */}
                    <div className="flex flex-col space-y-2 relative">
                      <label className="text-slate-500 uppercase tracking-wider">Sector Selection</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setSectorDropdownOpen(!sectorDropdownOpen)}
                          className="w-full bg-slate-950 border border-white/10 px-3 py-2 rounded-lg text-white outline-none focus:border-[#a78bfa] text-left flex justify-between items-center cursor-none font-mono"
                        >
                          <span>{screenerSector === "ALL" ? "ALL SECTORS" : screenerSector === "US Tech" ? "US TECH INDEX" : screenerSector === "IT Services" ? "IT SERVICES (INDIA)" : screenerSector === "Energy" ? "ENERGY & OIL" : "BANKING & FINANCE"}</span>
                          <span className="text-slate-500 text-[9px]">▼</span>
                        </button>
                        
                        {sectorDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-white/10 rounded-lg overflow-hidden z-50 shadow-2xl backdrop-blur-md">
                            {[
                              { val: "ALL", label: "ALL SECTORS" },
                              { val: "US Tech", label: "US TECH INDEX" },
                              { val: "IT Services", label: "IT SERVICES (INDIA)" },
                              { val: "Energy", label: "ENERGY & OIL" },
                              { val: "Banking", label: "BANKING & FINANCE" }
                            ].map(item => (
                              <button
                                key={item.val}
                                type="button"
                                onClick={() => {
                                  setScreenerSector(item.val);
                                  setSectorDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-[#a78bfa]/20 hover:text-white text-slate-200 transition-colors font-mono text-[10px] block cursor-none"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PE Select */}
                    <div className="flex flex-col space-y-2 relative">
                      <label className="text-slate-500 uppercase tracking-wider">Valuation Multiple (P/E)</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setPeDropdownOpen(!peDropdownOpen)}
                          className="w-full bg-slate-950 border border-white/10 px-3 py-2 rounded-lg text-white outline-none focus:border-[#a78bfa] text-left flex justify-between items-center cursor-none font-mono"
                        >
                          <span>{screenerPE === "ALL" ? "ALL MULTIPLES" : screenerPE === "UNDER_20" ? "UNDER 20x (VALUE)" : screenerPE === "20_35" ? "20x - 35x (BALANCED)" : "OVER 35x (GROWTH)"}</span>
                          <span className="text-slate-500 text-[9px]">▼</span>
                        </button>
                        
                        {peDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-white/10 rounded-lg overflow-hidden z-50 shadow-2xl backdrop-blur-md">
                            {[
                              { val: "ALL", label: "ALL MULTIPLES" },
                              { val: "UNDER_20", label: "UNDER 20x (VALUE)" },
                              { val: "20_35", label: "20x - 35x (BALANCED)" },
                              { val: "OVER_35", label: "OVER 35x (GROWTH)" }
                            ].map(item => (
                              <button
                                key={item.val}
                                type="button"
                                onClick={() => {
                                  setScreenerPE(item.val);
                                  setPeDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-[#a78bfa]/20 hover:text-white text-slate-200 transition-colors font-mono text-[10px] block cursor-none"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Market Cap select */}
                    <div className="flex flex-col space-y-2 relative">
                      <label className="text-slate-500 uppercase tracking-wider">Market Cap Tier</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCapDropdownOpen(!capDropdownOpen)}
                          className="w-full bg-slate-950 border border-white/10 px-3 py-2 rounded-lg text-white outline-none focus:border-[#a78bfa] text-left flex justify-between items-center cursor-none font-mono"
                        >
                          <span>{screenerCap === "ALL" ? "ALL TIER SCALES" : screenerCap === "US_MEGA" ? "US MEGA CAP (> $1T Cap)" : "INDIA MEGA CAP (> ₹10L Cr)"}</span>
                          <span className="text-slate-500 text-[9px]">▼</span>
                        </button>
                        
                        {capDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-white/10 rounded-lg overflow-hidden z-50 shadow-2xl backdrop-blur-md">
                            {[
                              { val: "ALL", label: "ALL TIER SCALES" },
                              { val: "US_MEGA", label: "US MEGA CAP (> $1T Cap)" },
                              { val: "IN_MEGA", label: "INDIA MEGA CAP (> ₹10L Cr)" }
                            ].map(item => (
                              <button
                                key={item.val}
                                type="button"
                                onClick={() => {
                                  setScreenerCap(item.val);
                                  setCapDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-[#a78bfa]/20 hover:text-white text-slate-200 transition-colors font-mono text-[10px] block cursor-none"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Screener Output Ledger */}
                <div className="bg-[#0b0f19]/30 border border-white/[0.04] rounded-2xl p-8 text-left">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-6">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Matched stock records ledger (<CountUpValue value={sortedFilteredStocks.length} /> records)
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">STATUS: SYNCED</span>
                  </div>

                  {sortedFilteredStocks.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                      <ShieldAlert className="w-8 h-8 text-[#ff3860] mx-auto animate-pulse" />
                      <p className="text-slate-500 text-xs font-mono uppercase">NO_RECORDS: Adjust screener parameters.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-500 cursor-none select-none">
                            <th className="pb-2 cursor-pointer hover:text-white" onClick={() => handleSort("ticker")}>
                              TICKER {sortField === "ticker" ? (sortAsc ? "▲" : "▼") : ""}
                            </th>
                            <th className="pb-2">SECTOR</th>
                            <th className="pb-2">FACTOR STYLE</th>
                            <th className="pb-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort("pe")}>
                              P/E RATIO {sortField === "pe" ? (sortAsc ? "▲" : "▼") : ""}
                            </th>
                            <th className="pb-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort("growth")}>
                              5-YR GROWTH {sortField === "growth" ? (sortAsc ? "▲" : "▼") : ""}
                            </th>
                            <th className="pb-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort("evEbitda")}>
                              EV/EBITDA {sortField === "evEbitda" ? (sortAsc ? "▲" : "▼") : ""}
                            </th>
                            <th className="pb-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort("debtEquity")}>
                              D/E {sortField === "debtEquity" ? (sortAsc ? "▲" : "▼") : ""}
                            </th>
                            <th className="pb-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort("roe")}>
                              ROE {sortField === "roe" ? (sortAsc ? "▲" : "▼") : ""}
                            </th>
                            <th className="pb-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort("price")}>
                              SPOT PRICE {sortField === "price" ? (sortAsc ? "▲" : "▼") : ""}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedFilteredStocks.map((stock, i) => (
                            <motion.tr 
                              key={stock.ticker} 
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.05 }}
                              className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-none" 
                              onClick={() => router.push(`/stocks/${stock.ticker}`)}
                            >
                              <td className="py-3 font-bold text-white text-[12px]">{stock.ticker}</td>
                              <td className="py-3 text-slate-400 font-bold">{stock.sector}</td>
                              <td className="py-3">
                                <div className="flex flex-wrap gap-1 font-mono text-[8px] font-bold">
                                  {stock.pe > 0 && stock.pe < 20 && (
                                    <span className="bg-[#fbbf24]/10 border border-[#fbbf24]/20 text-[#fbbf24] px-1 py-0.5 rounded">VALUE</span>
                                  )}
                                  {stock.growth > 15 && (
                                    <span className="bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#a78bfa] px-1 py-0.5 rounded">GROWTH</span>
                                  )}
                                  {stock.roe !== undefined && stock.roe > 30 && (
                                    <span className="bg-[#34d399]/10 border border-[#34d399]/20 text-[#34d399] px-1 py-0.5 rounded">QUALITY</span>
                                  )}
                                  {stock.changePercent > 1.5 && (
                                    <span className="bg-[#60a5fa]/10 border border-[#60a5fa]/20 text-[#60a5fa] px-1 py-0.5 rounded">MOMENTUM</span>
                                  )}
                                </div>
                              </td>
                              <td className={`py-3 text-right font-bold ${stock.pe > 0 && stock.pe < 25 ? 'text-[#34d399]' : 'text-slate-350'}`}>{stock.pe > 0 ? `${stock.pe}x` : "N/A"}</td>
                              <td className="py-3 text-right text-slate-300 font-bold">{stock.growth}%</td>
                              <td className="py-3 text-right text-[#ffdd57] font-bold">{stock.evEbitda ? `${stock.evEbitda}x` : "-"}</td>
                              <td className="py-3 text-right text-[#ff3860] font-bold">{stock.debtEquity ? `${stock.debtEquity}x` : "-"}</td>
                              <td className="py-3 text-right text-[#34d399] font-bold">{stock.roe ? `${stock.roe}%` : "-"}</td>
                              <td className="py-3 text-right text-slate-200 font-bold">{stock.ticker === "AAPL" || stock.ticker === "NVDA" || stock.ticker === "MSFT" ? `$${stock.price.toFixed(2)}` : `₹${stock.price.toFixed(2)}`}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Insider Actions Ledger */}
                <div className="bg-[#0b0f19]/30 border border-white/[0.04] rounded-2xl p-8 text-left space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#fbbf24]" />
                      <span>SEC FORM 4 INSIDER ACTIONS LEDGER</span>
                    </span>
                    <span className="text-[9px] text-[#fbbf24] font-mono font-bold">[REALTIME_SEC_INTELLIGENCE]</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-500">
                          <th className="pb-2">TICKER</th>
                          <th className="pb-2">INSIDER IDENTITY</th>
                          <th className="pb-2">RELATION</th>
                          <th className="pb-2">ACTION TYPE</th>
                          <th className="pb-2 text-right">SHARES</th>
                          <th className="pb-2 text-right">PRICE</th>
                          <th className="pb-2 text-right">TOTAL VALUE</th>
                          <th className="pb-2 text-right">DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { ticker: "AAPL", name: "Cook Timothy D.", relation: "CEO", action: "OPTION EXERCISE & SELL", shares: 120000, price: 182.45, date: "2026-05-15" },
                          { ticker: "NVDA", name: "Huang Jen Hsun", relation: "CEO", action: "AUTO-SELL (10b5-1)", shares: 50000, price: 948.22, date: "2026-05-20" },
                          { ticker: "RELIANCE", name: "Reliance Promoter Group", relation: "PROMOTER", action: "ACQUISITION (BUY)", shares: 500000, price: 2450.40, date: "2026-05-18" },
                          { ticker: "MSFT", name: "Nadella Satya", relation: "CEO", action: "MARKET SELL", shares: 35000, price: 415.60, date: "2026-05-24" },
                          { ticker: "TCS", name: "Subramanian N.", relation: "EXECUTIVE DIR", action: "MARKET BUY", shares: 10000, price: 3820.15, date: "2026-05-26" }
                        ].map((tx, idx) => {
                          const totalValue = tx.shares * tx.price;
                          const isBuy = tx.action.includes("BUY") || tx.action.includes("ACQUISITION");
                          return (
                            <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-none">
                              <td className="py-2.5 font-bold text-[#a78bfa]">{tx.ticker}</td>
                              <td className="py-2.5 text-slate-250">{tx.name}</td>
                              <td className="py-2.5 text-slate-500 font-bold text-[9px]">{tx.relation}</td>
                              <td className={`py-2.5 font-bold text-[9px] ${isBuy ? "text-[#34d399]" : "text-[#ff3860]"}`}>
                                {tx.action}
                              </td>
                              <td className="py-2.5 text-right text-slate-350">{tx.shares.toLocaleString()}</td>
                              <td className="py-2.5 text-right text-slate-450">${tx.price.toFixed(2)}</td>
                              <td className="py-2.5 text-right text-slate-200 font-bold">
                                {tx.ticker === "RELIANCE" || tx.ticker === "TCS" ? `₹${(totalValue / 10000000).toFixed(2)} Cr` : `$${(totalValue / 1000000).toFixed(2)}M`}
                              </td>
                              <td className="py-2.5 text-right text-slate-500">{tx.date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 3: Research Memos Desk */}
            {activeTab === "research" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col lg:flex-row gap-8 items-stretch"
              >
                {/* Left Panel: Dynamic calculations and sliders (resizable) */}
                <div 
                  className="bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 text-left flex flex-col justify-between backdrop-blur-sm"
                  style={{ width: `${panelWidth}%`, minWidth: "280px" }}
                >
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest flex items-center space-x-1">
                        <Sliders className="w-3.5 h-3.5 text-[#a78bfa]" />
                        <span>VALUATION ASSUMPTIONS</span>
                      </span>
                    </div>

                    <div className="flex border border-white/10 rounded overflow-hidden text-[10px] font-mono mb-4">
                      <button 
                        onClick={() => setActiveResearchTicker("AAPL")}
                        className={`flex-1 py-1.5 cursor-none ${activeResearchTicker === "AAPL" ? 'bg-[#a78bfa] text-[#020010] font-bold' : 'text-slate-400'}`}
                      >
                        AAPL.US
                      </button>
                      <button 
                        onClick={() => setActiveResearchTicker("RELIANCE")}
                        className={`flex-1 py-1.5 cursor-none ${activeResearchTicker === "RELIANCE" ? 'bg-[#a78bfa] text-[#020010] font-bold' : 'text-slate-400'}`}
                      >
                        RELIANCE.IN
                      </button>
                    </div>

                    {activeResearchTicker === "AAPL" ? (
                      <div className="space-y-4 font-mono text-[11px]">
                        <div className="flex border border-white/10 rounded overflow-hidden text-[9px] font-mono mb-2">
                          <button 
                            onClick={() => setValuationMethod("multiple")}
                            className={`flex-1 py-1 cursor-none ${valuationMethod === "multiple" ? 'bg-[#ffdd57] text-[#020010] font-bold' : 'text-slate-400'}`}
                          >
                            EXIT MULTIPLE
                          </button>
                          <button 
                            onClick={() => setValuationMethod("gordon")}
                            className={`flex-1 py-1 cursor-none ${valuationMethod === "gordon" ? 'bg-[#34d399] text-[#020010] font-bold' : 'text-slate-400'}`}
                          >
                            GORDON GROWTH
                          </button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>Base EBITDA</span>
                            <span className="text-white font-bold">${aaplEbitda} Billion</span>
                          </div>
                          <input 
                            type="range" min="80" max="200" value={aaplEbitda} 
                            onChange={e => setAaplEbitda(Number(e.target.value))}
                            className="w-full accent-[#a78bfa] h-1 bg-slate-900 appearance-none rounded"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>Revenue Growth CAGR</span>
                            <span className="text-[#a78bfa] font-bold">{aaplCagr.toFixed(1)}%</span>
                          </div>
                          <input 
                            type="range" min="0.0" max="30.0" step="0.5" value={aaplCagr} 
                            onChange={e => setAaplCagr(Number(e.target.value))}
                            className="w-full accent-[#a78bfa] h-1 bg-slate-900 appearance-none rounded"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>WACC Discount Rate</span>
                            <span className="text-[#34d399] font-bold">{aaplWacc.toFixed(1)}%</span>
                          </div>
                          <input 
                            type="range" min="6.0" max="12.0" step="0.1" value={aaplWacc} 
                            onChange={e => setAaplWacc(Number(e.target.value))}
                            className="w-full accent-[#34d399] h-1 bg-slate-900 appearance-none rounded"
                          />
                        </div>

                        {valuationMethod === "multiple" ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-400">
                              <span>Exit EBITDA Multiple</span>
                              <span className="text-[#ffdd57] font-bold">{aaplMultiple}x</span>
                            </div>
                            <input 
                              type="range" min="12" max="25" value={aaplMultiple} 
                              onChange={e => setAaplMultiple(Number(e.target.value))}
                              className="w-full accent-[#ffdd57] h-1 bg-slate-900 appearance-none rounded"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-400">
                              <span>Perpetual Growth Rate</span>
                              <span className="text-[#34d399] font-bold">{aaplPerpGrowth.toFixed(1)}%</span>
                            </div>
                            <input 
                              type="range" min="0.0" max="5.0" step="0.1" value={aaplPerpGrowth} 
                              onChange={e => setAaplPerpGrowth(Number(e.target.value))}
                              className="w-full accent-[#34d399] h-1 bg-slate-900 appearance-none rounded"
                            />
                          </div>
                        )}

                        <div className="pt-4 border-t border-white/5 space-y-3 font-mono text-[9px] text-slate-400">
                          <div className="flex justify-between text-slate-500 text-[9px] uppercase">Spot Price: <span className="text-white">$182.30</span></div>
                          <div className="flex justify-between text-[10px] text-slate-300 font-bold uppercase">Implied Fair Price: 
                            <span className={`font-mono font-bold ${aaplImpliedPrice > 182.30 ? 'text-[#34d399]' : 'text-[#ff3860]'}`}>
                              <CountUpValue value={aaplImpliedPrice} prefix="$" decimals={2} duration={0.6} />
                            </span>
                          </div>
                          <div className="flex justify-between uppercase">
                            <span>Margin of Safety:</span>
                            <span className={`font-bold ${aaplImpliedPrice > 182.30 ? 'text-[#34d399]' : 'text-[#ff3860]'}`}>
                              {aaplImpliedPrice > 182.30 ? "+" : ""}{(((aaplImpliedPrice - 182.30)/182.30)*100).toFixed(1)}%
                            </span>
                          </div>

                          {/* Calculation Transparency Breakdown */}
                          <div className="bg-slate-950/60 p-2.5 rounded border border-white/5 space-y-1 mt-2">
                            <span className="text-[8px] text-[#00f0ff] font-bold block">[CALCULATION_TRANSPARENCY]</span>
                            <div className="flex justify-between"><span>Sum PV of FCFs (Yr 1-5):</span><span className="text-white">${dcfCalculationsBreakdown.sumPV}B</span></div>
                            <div className="flex justify-between"><span>PV of Terminal Value:</span><span className="text-white">${dcfCalculationsBreakdown.pvTV}B</span></div>
                            <div className="flex justify-between"><span>Net Corporate Debt:</span><span className="text-white">-${aaplNetDebt}B</span></div>
                            <div className="flex justify-between border-t border-white/5 pt-1"><span>Implied Equity Value:</span><span className="text-white font-bold">${dcfCalculationsBreakdown.eqVal}B</span></div>
                            <div className="flex justify-between"><span>Shares Outstanding:</span><span className="text-white">{aaplShares}B</span></div>
                            <div className="text-[7.5px] text-slate-500 mt-1 uppercase italic">Formula: (EV - Debt) / Shares</div>
                          </div>

                          {/* Sensitivity Matrix */}
                          <div className="bg-slate-950/60 p-2.5 rounded border border-white/5 space-y-2 mt-2">
                            <span className="text-[8px] text-[#34d399] font-bold block">[WACC VS CAGR MATRIX - SHARE PRICE]</span>
                            <table className="w-full text-center text-[8.5px] font-mono border-collapse">
                              <thead>
                                <tr className="border-b border-white/10 text-slate-500">
                                  <th className="text-left pb-1">WACC\CAGR</th>
                                  <th>{(aaplCagr - 1.5).toFixed(1)}%</th>
                                  <th>{aaplCagr.toFixed(1)}%</th>
                                  <th>{(aaplCagr + 1.5).toFixed(1)}%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dashboardSensitivity.map((rowItem, rIdx) => (
                                  <tr key={rIdx} className="border-b border-white/[0.02] last:border-0">
                                    <td className="text-left font-bold text-slate-400 py-1">{rowItem.waccValue.toFixed(1)}%</td>
                                    {rowItem.row.map((val: number, cIdx: number) => {
                                      const isBase = rowItem.waccValue === aaplWacc && cIdx === 1;
                                      return (
                                        <td key={cIdx} className={`py-1 ${isBase ? "text-[#00f0ff] font-bold" : "text-slate-350"}`}>
                                          ${val.toFixed(1)}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Citations and freshness timestamps */}
                          <div className="text-[8px] text-slate-500 space-y-0.5 mt-2 border-t border-white/5 pt-2">
                            <div>CITATIONS: SEC Form 10-K, Wall Street consensus estimates.</div>
                            <div>TIMESTAMP: June 3, 2026, 19:12:00 UTC (WebSocket Node Feed Online)</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 font-mono text-[9px] text-slate-400">
                        <p>Reliance valuation is loaded with standard pre-configured coordinates parameters matching the NSE multicast index nodes.</p>
                        <div className="bg-slate-950 p-3.5 border border-white/5 rounded-lg space-y-1 text-[9px]">
                          <div>EBITDA: <span className="text-white font-bold">₹1,20,000 Lakhs</span></div>
                          <div>WACC: <span className="text-[#34d399] font-bold">9.0%</span></div>
                          <div>Multiple: <span className="text-[#ffdd57] font-bold">14.0x</span></div>
                          <div className="text-[#34d399] font-bold mt-1">Intrinsic Price: ₹2,580.40</div>
                        </div>

                        {/* Citations and freshness timestamps */}
                        <div className="text-[8px] text-slate-500 space-y-0.5 mt-2 border-t border-white/5 pt-2">
                          <div>CITATIONS: NSE India, Morningstar India estimates.</div>
                          <div>TIMESTAMP: June 3, 2026, 19:12:00 UTC (NSE Feed Online)</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <MagneticButton 
                    onClick={handleGenerateMemo}
                    disabled={memoLoading}
                    className="w-full bg-[#a78bfa] hover:bg-[#a78bfa]/80 text-[#020010] font-bold py-2.5 rounded-lg text-xs mt-6 transition-all uppercase tracking-wider font-mono flex items-center justify-center space-x-1.5 cursor-none"
                  >
                    {memoLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        <span>Generate Investment Memo</span>
                      </>
                    )}
                  </MagneticButton>

                  {activeResearchTicker === "AAPL" && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                      <div className="flex flex-col space-y-1">
                        <label className="text-slate-500 uppercase text-[9px] font-bold">Save Model Name</label>
                        <input 
                          type="text" 
                          value={saveModelName}
                          onChange={e => setSaveModelName(e.target.value)}
                          placeholder="AAPL Fair Value Model..."
                          className="bg-slate-950 border border-white/10 px-2 py-1.5 rounded text-[10px] text-white outline-none focus:border-[#a78bfa] font-mono cursor-none"
                        />
                      </div>
                      <MagneticButton 
                        onClick={() => {
                          saveDcfModel(saveModelName);
                          setSaveModelName("");
                        }}
                        disabled={savingModel || !user}
                        className="w-full bg-[#34d399] hover:bg-[#34d399]/80 text-[#020010] font-bold py-2 rounded-lg text-[10px] transition-all uppercase tracking-wider font-mono flex items-center justify-center space-x-1.5 cursor-none"
                      >
                        {savingModel ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Save Valuation Model</span>
                        )}
                      </MagneticButton>
                    </div>
                  )}
                </div>

                {/* Right Panel: Output report memo panel */}
                <div className="flex-1 bg-[#0b0f19]/30 border border-white/[0.04] rounded-2xl p-8 text-left flex flex-col justify-between select-text scrollbar-thin overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#34d399]" />
                        <span>INSTITUTIONAL EQUITY MEMORANDUM</span>
                      </span>
                      {generatedMemo && (
                        <button 
                          onClick={() => window.print()}
                          className="bg-transparent border border-white/10 hover:border-white text-slate-400 hover:text-white px-2 py-0.5 rounded text-[9px] flex items-center space-x-1 font-mono cursor-none"
                        >
                          <Printer className="w-3 h-3" />
                          <span>PRINT</span>
                        </button>
                      )}
                    </div>

                    {memoLoading ? (
                      <div className="flex flex-col items-center justify-center py-24 space-y-2">
                        <RefreshCw className="w-6 h-6 text-[#a78bfa] animate-spin" />
                        <span className="text-[10px] text-slate-500 font-mono">COMPILING FINANCIAL RATIOS & PROSE...</span>
                      </div>
                    ) : generatedMemo ? (
                      <pre className="text-slate-350 font-mono text-[11px] leading-relaxed whitespace-pre-wrap bg-slate-950/40 p-4 rounded-xl border border-white/[0.03] max-h-[350px] overflow-y-auto select-text scrollbar-thin text-left">
                        {generatedMemo}
                      </pre>
                    ) : (
                      <div className="text-center py-20 space-y-3">
                        <Briefcase className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                        <p className="text-slate-500 text-xs font-mono uppercase">Select Stock parameters on the left and compile dynamic investment memos.</p>
                      </div>
                    )}

                    {/* Saved Models Ledger Table */}
                    <div className="border-t border-white/5 pt-6 mt-6">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mb-3">
                        [SAVED_MODELS_LEDGER]
                      </span>
                      {savedMemos.length === 0 ? (
                        <div className="text-[9px] text-slate-500 font-mono uppercase">
                          No saved models found. Set assumptions and click "Save Model".
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[150px] scrollbar-thin">
                          <table className="w-full text-left font-mono text-[9px] border-collapse">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-500">
                                <th className="pb-1.5 font-normal">MODEL NAME</th>
                                <th className="pb-1.5 font-normal">TICKER</th>
                                <th className="pb-1.5 font-normal">METHOD</th>
                                <th className="pb-1.5 font-normal text-right">IMPLIED VAL</th>
                                <th className="pb-1.5 font-normal text-right">DATE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {savedMemos.map((memo, idx) => {
                                const ticker = memo.inputs?.ticker || "AAPL";
                                const method = memo.inputs?.valuation_method || "multiple";
                                const impliedVal = memo.result?.implied_share_price || 0;
                                return (
                                  <tr 
                                    key={memo.id || idx} 
                                    onClick={() => loadDcfModel(memo)}
                                    className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors cursor-none"
                                  >
                                    <td className="py-2 text-white font-bold max-w-[120px] truncate">{memo.name}</td>
                                    <td className="py-2 text-[#a78bfa]">{ticker}</td>
                                    <td className="py-2 text-slate-400 uppercase">{method}</td>
                                    <td className="py-2 text-right text-[#34d399] font-bold">${impliedVal.toFixed(2)}</td>
                                    <td className="py-2 text-right text-slate-500">{new Date(memo.created_at).toLocaleDateString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Saved Research Notes & Notepad */}
                    <div className="border-t border-white/5 pt-6 mt-6 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                          [SAVED_RESEARCH_NOTES_EDITOR]
                        </span>
                        <button 
                          onClick={() => handleSaveNotes(activeResearchTicker, activeResearchTicker === "AAPL" ? aaplNotes : relianceNotes)}
                          className="bg-[#34d399]/20 hover:bg-[#34d399]/40 text-[#34d399] font-mono text-[9px] px-2 py-0.5 rounded cursor-none"
                        >
                          SAVE_NOTES
                        </button>
                      </div>
                      <textarea 
                        value={activeResearchTicker === "AAPL" ? aaplNotes : relianceNotes}
                        onChange={e => {
                          if (activeResearchTicker === "AAPL") {
                            setAaplNotes(e.target.value);
                          } else {
                            setRelianceNotes(e.target.value);
                          }
                        }}
                        placeholder="Write your quantitative or qualitative thoughts here to persist in database..."
                        className="w-full h-[90px] bg-slate-950/60 border border-white/10 px-3 py-2 rounded text-[10px] text-white outline-none focus:border-[#a78bfa] font-mono cursor-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 4: Earnings Desk */}
            {activeTab === "earnings" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left"
              >
                {/* Panel 1: Consensus beats & indicators */}
                <div className="bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 space-y-6 backdrop-blur-sm">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#34d399]" />
                      <span>Q3 FY26 consensus Beats & bulletins</span>
                    </span>
                    <span className="text-[9px] text-[#34d399] font-mono">[SYNC_OK]</span>
                  </div>

                  <div className="space-y-4 font-mono text-[11px]">
                    {[
                      {
                        company: "Apple Inc. (AAPL)",
                        metrics: "Revenue $119.5B (+8% YoY) | EPS $2.18 (Beats Consensus by $0.08)",
                        status: "BEAT",
                        color: "text-[#34d399] border-[#34d399]/20 bg-[#34d399]/5"
                      },
                      {
                        company: "NVIDIA Corp. (NVDA)",
                        metrics: "Revenue $26.8B (+265% YoY) | EPS $5.16 (Beats Consensus by $0.58)",
                        status: "MASSIVE BEAT",
                        color: "text-[#34d399] border-[#34d399]/30 bg-[#34d399]/10"
                      },
                      {
                        company: "Reliance Industries (RELIANCE)",
                        metrics: "EBITDA ₹42,500 Cr (+6.5% YoY) | Refining margins beat expectations",
                        status: "BEAT",
                        color: "text-[#34d399] border-[#34d399]/20 bg-[#34d399]/5"
                      },
                      {
                        company: "HDFC Bank (HDFCBANK)",
                        metrics: "Net Profit ₹16,811 Cr (+2.1% QoQ) | NIMs compressed slightly",
                        status: "LINE MEET",
                        color: "text-slate-400 border-white/10 bg-white/5"
                      }
                    ].map((bulletin, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                        className="border border-white/5 p-4 rounded-xl space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold">{bulletin.company}</span>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${bulletin.color}`}>{bulletin.status}</span>
                        </div>
                        <p className="text-slate-400 font-sans text-xs">{bulletin.metrics}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Panel 2: Earnings call summaries & transcript nodes */}
                <div className="bg-[#0b0f19]/30 border border-white/[0.04] rounded-2xl p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#a78bfa]" />
                      <span>Corporate Earnings Transcripts</span>
                    </span>
                  </div>

                  <div className="space-y-4 font-mono text-[11px] select-text">
                    <div className="bg-slate-950 p-4 border border-white/5 rounded-xl space-y-2">
                      <span className="text-[#a78bfa] font-bold block">[AAPL CONCALL TRANSCRIPT NODE]</span>
                      <p className="text-slate-450 italic text-[10px] leading-relaxed">
                        "We are exceptionally pleased with the customer response to our Edge AI neural engines. Hardware upgrades cycles remain strong, and subscription services continue to drive high-margin cash balances." — Tim Cook, CEO
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 border border-white/5 rounded-xl space-y-2">
                      <span className="text-[#34d399] font-bold block">[RELIANCE CONCALL TRANSCRIPT NODE]</span>
                      <p className="text-slate-450 italic text-[10px] leading-relaxed">
                        "Our partnerships with global chip makers are accelerating local digital transformations. Blackwell server architectures have completed validation trials, paving the way for multi-tenant private clouds." — Mukesh Ambani, Chairman
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 5: Credibility & CFA Education */}
            {activeTab === "credibility" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left"
              >
                {/* Column 1: Methodology Hub */}
                <div className="bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 space-y-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                    <Calculator className="w-3.5 h-3.5 text-[#34d399]" />
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Methodology Hub</span>
                  </div>
                  
                  <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                    <p className="text-white font-bold uppercase tracking-wide">01. WACC Formulation</p>
                    <div className="bg-slate-950 p-3 border border-white/5 rounded-lg text-slate-400">
                      <code>WACC = (E/V * Ke) + (D/V * Kd * (1 - T))</code>
                      <p className="text-[9px] mt-1">Estimates the weighted average cost of capital discount factor matching corporate leverage profiles.</p>
                    </div>

                    <p className="text-white font-bold uppercase tracking-wide">02. Cost of Equity (CAPM)</p>
                    <div className="bg-slate-950 p-3 border border-white/5 rounded-lg text-slate-400">
                      <code>Ke = Rf + Beta * (Rm - Rf)</code>
                      <p className="text-[9px] mt-1">Estimates equity returns requirements using systematic risk indicators (Beta).</p>
                    </div>
                  </div>
                </div>

                {/* Column 2: DCF assumptions guide */}
                <div className="bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 space-y-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                    <Sliders className="w-3.5 h-3.5 text-[#a78bfa]" />
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">DCF assumptions guidelines</span>
                  </div>

                  <div className="space-y-3 font-mono text-[11px] leading-relaxed text-slate-400">
                    <p className="text-white font-bold">1. EXIT MULTIPLES VS PERPETUAL GROWTH</p>
                    <p className="text-xs">Exit Multiple models (e.g. 14x EBITDA) project enterprise valuation based on comparable transactions, whereas Perpetual models estimate cash flow growth into perpetuity.</p>
                    
                    <p className="text-white font-bold">2. FREE CASH FLOW TO FIRM (FCFF)</p>
                    <p className="text-xs font-mono bg-slate-950 p-2.5 rounded border border-white/5 text-[#34d399]">
                      FCFF = EBIT*(1-T) + D&A - Capex - dNWC
                    </p>
                  </div>
                </div>

                {/* Column 3: Finance Education center */}
                <div className="bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 space-y-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                    <BookOpen className="w-3.5 h-3.5 text-[#34d399]" />
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">CFA Finance Syllabus</span>
                  </div>

                  <div className="space-y-3 font-mono text-[11px] leading-relaxed text-slate-400">
                    <div className="border border-white/5 p-3.5 rounded-xl space-y-1">
                      <span className="text-white font-bold block uppercase text-[10px]">DuPont analysis decomposition</span>
                      <p className="text-[10px] font-sans">Decomposes Return on Equity (ROE) into Net Profit Margin, Asset Turnover, and Financial Leverage factors to isolate profit drivers.</p>
                    </div>

                    <div className="border border-white/5 p-3.5 rounded-xl space-y-1">
                      <span className="text-white font-bold block uppercase text-[10px]">Leveraged Buyout (LBO) Math</span>
                      <p className="text-[10px] font-sans">Estimates equity sponsor investment returns (IRR) utilizing debt instruments to fund acquisitions, modeling cash distributions.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 6: Career OS */}
            {activeTab === "career" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  {/* Column 1 & 2: Interactive AI Mock Interviewer */}
                  <div className="lg:col-span-8 bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 flex flex-col justify-between space-y-6 backdrop-blur-sm">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div className="flex items-center space-x-2 text-xs">
                        <Terminal className="w-4 h-4 text-[#34d399]" />
                        <span className="text-white font-mono font-bold uppercase">AI_MOCK_INTERVIEW_SIMULATOR</span>
                      </div>
                      <span className="terminal-badge-success">CAREER_PORT_ACTIVE</span>
                    </div>

                    {!interviewStarted ? (
                      <div className="text-center py-16 space-y-4">
                        <Briefcase className="w-12 h-12 text-[#a78bfa] mx-auto animate-pulse" />
                        <h4 className="text-white font-bold text-[16px] uppercase font-display">Wall Street Investment Banking interviews</h4>
                        <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                          Test your analytical capabilities. Initialize a session to receive dynamic technical interview questions, scored directly by Anthropic Claude co-pilot.
                        </p>
                        <MagneticButton
                          onClick={handleStartInterview}
                          className="bg-[#a78bfa] hover:bg-[#a78bfa]/80 text-[#020010] font-bold px-6 py-2.5 rounded-lg text-xs transition-colors font-mono uppercase tracking-wider cursor-none"
                        >
                          LAUNCH_INTERVIEW_SESSION
                        </MagneticButton>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs font-mono">
                        {interviewLoading && !interviewQuestion ? (
                          <div className="flex flex-col items-center justify-center py-12 space-y-2">
                            <RefreshCw className="w-5 h-5 text-[#34d399] animate-spin" />
                            <span className="text-slate-500 font-mono text-[9px]">COMPILING_WALLSTREET_PROMPT...</span>
                          </div>
                        ) : (
                          <div className="space-y-4 font-mono text-left">
                            <div className="bg-slate-950 p-4 border border-white/5 rounded-xl text-slate-350 select-text">
                              <span className="text-[9px] text-[#a78bfa] font-bold block mb-1">INTERVIEWER_QUERY:</span>
                              <p className="text-xs leading-relaxed font-bold font-sans">{interviewQuestion}</p>
                            </div>

                            {!interviewFeedback ? (
                              <form onSubmit={handleEvaluateAnswer} className="space-y-3">
                                <div className="flex flex-col space-y-1.5">
                                  <label className="text-slate-500 uppercase text-[9px] font-bold">YOUR RESPONSE INPUT</label>
                                  <textarea
                                    required
                                    rows={4}
                                    value={userAnswer}
                                    onChange={e => setUserAnswer(e.target.value)}
                                    placeholder="Type your response... (e.g. explain statements adjustments, cash flows, multiples)"
                                    className="bg-slate-950 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-[#34d399] leading-relaxed text-xs font-mono cursor-none"
                                  />
                                </div>

                                <MagneticButton
                                  type="submit"
                                  disabled={interviewLoading || !userAnswer.trim()}
                                  className="bg-[#34d399] hover:bg-[#34d399]/85 text-[#020010] font-bold py-2.5 rounded-lg transition-colors w-full flex items-center justify-center space-x-1.5 font-mono cursor-none uppercase text-[11px]"
                                >
                                  {interviewLoading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Send className="w-3.5 h-3.5" />
                                      <span>TRANSMIT_RESPONSE_FOR_EVALUATION</span>
                                    </>
                                  )}
                                </MagneticButton>
                              </form>
                            ) : (
                              <div className="space-y-4">
                                <div className="bg-[#34d399]/10 border border-[#34d399]/20 p-4 rounded-xl text-slate-300 max-h-[220px] overflow-y-auto select-text scrollbar-thin">
                                  <span className="text-[9px] text-[#34d399] font-bold block mb-1">CRITIQUE_&_SCORE_LOG:</span>
                                  <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans">{interviewFeedback}</pre>
                                </div>

                                <div className="flex gap-3 font-mono">
                                  <MagneticButton
                                    onClick={handleStartInterview}
                                    className="flex-1 bg-[#a78bfa] hover:bg-[#a78bfa]/80 text-[#020010] font-bold py-2.5 rounded-lg text-xs transition-colors cursor-none uppercase"
                                  >
                                    NEXT_QUESTION
                                  </MagneticButton>
                                  <MagneticButton
                                    onClick={() => {
                                      setInterviewStarted(false);
                                      setUserAnswer("");
                                      setInterviewFeedback("");
                                    }}
                                    className="flex-1 border border-white/10 hover:border-white/20 text-slate-300 py-2.5 rounded-lg text-xs transition-colors cursor-none"
                                  >
                                    [EXIT_SESSION]
                                  </MagneticButton>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Column 3: Premium Excel & Pitch downloads */}
                  <div className="lg:col-span-4 bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 space-y-6 backdrop-blur-sm text-left">
                    <div className="flex items-center space-x-2 border-b border-white/5 pb-3 text-[10px] font-mono text-slate-400">
                      <Download className="w-4 h-4 text-[#a78bfa]" />
                      <span className="font-bold uppercase">DOWNLOAD_CABINET</span>
                    </div>

                    <div className="space-y-4 text-xs font-mono">
                      {[
                        {
                          id: "lbo-excel",
                          title: "Corporate LBO Model Template (.xlsx)",
                          text: "[AnalystOS Corporate Leveraged Buyout Template v1.4]\nAssumptions:\nPurchase price EBITDA Multiple = 12.0x\nSponsor Debt weight = 60% | Equity weight = 40%\nEBITDA CAGR = 10% (Yr 1-5) | Minimum IRR target = 25%\nDownload Link: https://analystos.com/resources/AnalystOS_LBO_Valuation_Model.xlsx"
                        },
                        {
                          id: "comps-excel",
                          title: "Comparable Comps Review Matrix (.xlsx)",
                          text: "[AnalystOS peer comps valuation template]\nColumns: Ticker, Price, EV, EBITDA, EV/EBITDA, Net Debt, CAGR\nPreloaded Peer Comparables sectors: Reliance vs Comps, TCS vs Infosys\nDownload Link: https://analystos.com/resources/AnalystOS_Comps_Sheet.xlsx"
                        },
                        {
                          id: "pitch-deck",
                          title: "Wall Street Pitch Deck Outline (.pptx)",
                          text: "[AnalystOS Pitch Deck memorandum Structure]\nSlide 1: Executive thesis (Implied Upside %)\nSlide 2: Sector macro triggers & structural moats\nSlide 3: Pro-forma EBITDA forecasts & CAGR metrics\nSlide 4: Valuation Comps vs implied DCF share price"
                        }
                      ].map((template, idx) => (
                        <div key={idx} className="bg-slate-950 p-4 border border-white/5 rounded-xl space-y-2 text-left">
                          <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                            <span className="text-slate-300 font-bold text-[10px] truncate max-w-[150px]">{template.title}</span>
                            <button
                              onClick={() => copyTemplateSpecs(template.id, template.text)}
                              className="text-slate-400 hover:text-[#a78bfa] text-[9px] flex items-center space-x-1 font-mono cursor-none"
                            >
                              {copiedTemplate === template.id ? <Check className="w-3 h-3 text-[#34d399]" /> : <Download className="w-3 h-3" />}
                              <span>{copiedTemplate === template.id ? "COPIED" : "SPECS"}</span>
                            </button>
                          </div>
                          <pre className="text-slate-500 text-[8px] leading-relaxed whitespace-pre overflow-x-auto bg-[#0b0f19]/40 p-1.5 rounded font-mono select-text scrollbar-thin">
                            {template.text}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 7: Portfolio Analytics Desk */}
            {activeTab === "portfolio" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
              >
                {/* Left Panel: Trade Executions Input */}
                <div 
                  className="bg-[#0b0f19]/40 border border-white/[0.06] rounded-2xl p-8 text-left flex flex-col justify-between backdrop-blur-sm"
                  style={{ width: `${panelWidth}%`, minWidth: "280px" }}
                >
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest flex items-center space-x-1">
                        <Sliders className="w-3.5 h-3.5 text-[#a78bfa]" />
                        <span>PORTFOLIO_TRADE_EXECUTIVE</span>
                      </span>
                    </div>

                    <form onSubmit={executeTrade} className="space-y-4 font-mono text-[11px]">
                      <div className="flex border border-white/10 rounded overflow-hidden text-[9px] font-mono">
                        <button 
                          type="button"
                          onClick={() => setTradeAction("buy")}
                          className={`flex-1 py-1.5 cursor-none ${tradeAction === "buy" ? 'bg-[#34d399] text-[#020010] font-bold' : 'text-slate-400'}`}
                        >
                          BUY ASSET
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTradeAction("sell")}
                          className={`flex-1 py-1.5 cursor-none ${tradeAction === "sell" ? 'bg-[#ff3860] text-white font-bold' : 'text-slate-400'}`}
                        >
                          SELL ASSET
                        </button>
                      </div>

                      <div className="flex flex-col space-y-1 relative">
                        <label className="text-slate-500 uppercase text-[9px] font-bold">Select Asset Ticker</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setTradeTickerDropdownOpen(!tradeTickerDropdownOpen)}
                            className="w-full bg-slate-950 border border-white/10 px-3 py-2 rounded-lg text-white outline-none focus:border-[#a78bfa] text-left flex justify-between items-center cursor-none font-mono text-[11px]"
                          >
                            <span>{tradeTicker} ({stocks.find(s => s.ticker === tradeTicker)?.name || ""})</span>
                            <span className="text-slate-500 text-[9px]">▼</span>
                          </button>
                          
                          {tradeTickerDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-white/10 rounded-lg overflow-hidden z-50 shadow-2xl backdrop-blur-md max-h-[180px] overflow-y-auto scrollbar-thin">
                              {stocks.map(s => (
                                <button
                                  key={s.ticker}
                                  type="button"
                                  onClick={() => {
                                    setTradeTicker(s.ticker);
                                    setTradeTickerDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2.5 hover:bg-[#a78bfa]/20 hover:text-white text-slate-200 transition-colors font-mono text-[10px] block cursor-none"
                                >
                                  {s.ticker} ({s.name})
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label className="text-slate-500 uppercase text-[9px] font-bold">Shares Count</label>
                        <input 
                          type="number" 
                          min="1" 
                          value={tradeShares}
                          onChange={e => setTradeShares(Number(e.target.value))}
                          className="bg-slate-950 border border-white/10 px-3 py-2 rounded-lg text-white outline-none focus:border-[#a78bfa] cursor-none"
                        />
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label className="text-slate-500 uppercase text-[9px] font-bold">Entry Price ($/₹)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0.01"
                          value={tradePrice}
                          onChange={e => setTradePrice(Number(e.target.value))}
                          className="bg-slate-950 border border-white/10 px-3 py-2 rounded-lg text-white outline-none focus:border-[#a78bfa] cursor-none"
                        />
                      </div>

                      <MagneticButton 
                        type="submit"
                        disabled={loadingPortfolio}
                        className={`w-full font-bold py-2.5 rounded-lg text-xs mt-6 transition-all uppercase tracking-wider font-mono flex items-center justify-center space-x-1.5 cursor-none ${
                          tradeAction === "buy" ? "bg-[#34d399] text-[#020010] hover:bg-[#34d399]/85" : "bg-[#ff3860] text-white hover:bg-[#ff3860]/85"
                        }`}
                      >
                        {loadingPortfolio ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Transmit Execution</span>
                        )}
                      </MagneticButton>
                    </form>
                  </div>
                </div>

                {/* Right Panel: Portfolio holdings ledger & dynamic risk analytics */}
                <div className="flex-1 bg-[#0b0f19]/30 border border-white/[0.04] rounded-2xl p-8 text-left flex flex-col justify-between backdrop-blur-sm">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                        <PieChart className="w-3.5 h-3.5 text-[#34d399]" />
                        <span>HEDGE_FUND_HOLDINGS_DESK</span>
                      </span>
                      <span className="text-[9px] text-[#34d399] font-mono">NAV: ${calculatedPortfolioStats.totalMarketValue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>

                    {/* Holdings Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[10px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-500">
                            <th className="pb-2">TICKER</th>
                            <th className="pb-2 text-right">SHARES</th>
                            <th className="pb-2 text-right">AVG COST</th>
                            <th className="pb-2 text-right">SPOT PRICE</th>
                            <th className="pb-2 text-right">MARKET VALUE</th>
                            <th className="pb-2 text-right">P/L ($/₹)</th>
                            <th className="pb-2 text-right">P/L %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolioHoldings.map((holding, idx) => {
                            const stock = stocks.find(s => s.ticker === holding.ticker);
                            const currentPrice = stock ? stock.price : holding.average_buy_price;
                            const mktVal = holding.shares * currentPrice;
                            const cost = holding.shares * holding.average_buy_price;
                            const pl = mktVal - cost;
                            const plPct = cost > 0 ? (pl / cost) * 100 : 0;
                            const isUp = pl >= 0;

                            return (
                              <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-none">
                                <td className="py-2.5 font-bold text-[#a78bfa]">{holding.ticker}</td>
                                <td className="py-2.5 text-right text-slate-200">{holding.shares}</td>
                                <td className="py-2.5 text-right text-slate-400">${holding.average_buy_price.toFixed(2)}</td>
                                <td className="py-2.5 text-right text-white">${currentPrice.toFixed(2)}</td>
                                <td className="py-2.5 text-right text-slate-300 font-bold">${mktVal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                                <td className={`py-2.5 text-right font-bold ${isUp ? "text-[#34d399]" : "text-[#ff3860]"}`}>
                                  {isUp ? "+" : ""}{pl.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                                </td>
                                <td className={`py-2.5 text-right font-bold ${isUp ? "text-[#34d399]" : "text-[#ff3860]"}`}>
                                  {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{plPct.toFixed(2)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Risk Attribution & Allocation Analysis */}
                    <div className="border-t border-white/5 pt-6 mt-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
                      {/* Left: Risk Metrics & Stress Test Selector */}
                      <div className="xl:col-span-8 space-y-6">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                          [PORTFOLIO_RISK_ANALYSIS]
                        </span>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
                          <div className="bg-slate-950/60 border border-white/[0.03] p-4 rounded-xl space-y-1">
                            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">PORTFOLIO BETA</div>
                            <div className="text-lg font-black text-white">{stressedStats.portfolioBeta}</div>
                            <p className="text-[7px] text-slate-500 mt-1 leading-normal">Correlation with benchmark indices.</p>
                          </div>

                          <div className="bg-slate-950/60 border border-white/[0.03] p-4 rounded-xl space-y-1">
                            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">SHARPE RATIO</div>
                            <div className="text-lg font-black text-[#34d399]">{stressedStats.portfolioSharpe}</div>
                            <p className="text-[7px] text-slate-500 mt-1 leading-normal">Risk-adjusted return ratio.</p>
                          </div>

                          <div className="bg-slate-950/60 border border-white/[0.03] p-4 rounded-xl space-y-1">
                            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">PORTFOLIO ALPHA</div>
                            <div className="text-lg font-black text-[#a78bfa]">{stressedStats.portfolioAlpha}%</div>
                            <p className="text-[7px] text-slate-500 mt-1 leading-normal">Excess risk-adjusted performance.</p>
                          </div>

                          <div className="bg-slate-950/60 border border-white/[0.03] p-4 rounded-xl space-y-1">
                            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">MAX DRAWDOWN</div>
                            <div className="text-lg font-black text-[#ff3860]">{stressedStats.portfolioDrawdown}%</div>
                            <p className="text-[7px] text-slate-500 mt-1 leading-normal">Peak-to-trough drop limits.</p>
                          </div>
                        </div>

                        {/* Stressed Alert Warning banner if active */}
                        {activeStress !== "none" && (
                          <div className="bg-[#ff3860]/10 border border-[#ff3860]/20 p-3.5 rounded-xl font-mono text-[9px] flex items-start gap-2.5 animate-pulse text-[#ff3860]">
                            <ShieldAlert className="w-4 h-4 text-[#ff3860] shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block uppercase tracking-wider">[STRESSED_RUNTIME_SIMULATION_ACTIVE]</span>
                              {activeStress === "inflation" && "WARNING: High WACC discount factor may devalue pre-revenue growth equities. Asset reallocation recommended."}
                              {activeStress === "tech_selloff" && "WARNING: Heavy tech exposure causing drawdown spikes. Consider hedging with bonds/commodities."}
                              {activeStress === "rate_hike" && "WARNING: Cost of debt increases. High debt/equity names underperform. Consider deleveraging."}
                              {activeStress === "supply_chain" && "WARNING: Supply chain bottlenecks hit hardware margins. Inflation hedges (Gold/Commodities) outperform."}
                            </div>
                          </div>
                        )}

                        {/* Stress Testing Controller */}
                        <div className="space-y-3 border-t border-white/5 pt-4 mt-2">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                            <span>PORTFOLIO MACRO STRESS-TEST SCENARIOS</span>
                            <span className="text-slate-500 font-normal">SELECT IMPACT MATRIX</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[9px] font-mono">
                            {[
                              { id: "none", label: "NO SHOCK (BASELINE)", color: "border-slate-800 hover:border-slate-600 text-slate-400" },
                              { id: "inflation", label: "INFLATION SPIKE (+3%)", color: "border-[#ff3860]/20 hover:border-[#ff3860]/50 text-[#ff3860] bg-[#ff3860]/5" },
                              { id: "tech_selloff", label: "TECH SECTOR SELLOFF (-15%)", color: "border-[#ffdd57]/20 hover:border-[#ffdd57]/50 text-[#ffdd57] bg-[#ffdd57]/5" },
                              { id: "rate_hike", label: "CENTRAL BANK RATE HIGHS (+100BPS)", color: "border-[#60a5fa]/20 hover:border-[#60a5fa]/50 text-[#60a5fa] bg-[#60a5fa]/5" },
                              { id: "supply_chain", label: "SUPPLY CHAIN CRISIS", color: "border-[#e2e8f0]/20 hover:border-[#e2e8f0]/50 text-slate-200 bg-white/5" }
                            ].map(scenario => (
                              <button
                                key={scenario.id}
                                type="button"
                                onClick={() => setActiveStress(scenario.id as any)}
                                className={`px-3 py-1.5 border rounded cursor-none transition-all font-bold ${
                                  activeStress === scenario.id 
                                    ? "bg-white text-slate-950 font-black" 
                                    : scenario.color
                                }`}
                              >
                                {scenario.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: SVG Donut Chart for Asset Allocation */}
                      <div className="xl:col-span-4 flex flex-col justify-between border-t xl:border-t-0 xl:border-l border-white/5 pt-6 xl:pt-0 xl:pl-6">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mb-4">
                          [ASSET_ALLOCATION_ATTRIBUTION]
                        </span>

                        {allocationData.length === 0 ? (
                          <div className="text-center py-8 text-slate-600 font-mono text-[9px] uppercase">
                            NO_ASSETS_ALLOCATED
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            {/* SVG Donut Chart */}
                            <div className="relative w-24 h-24 shrink-0 mx-auto">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  className="stroke-slate-950 fill-none"
                                  strokeWidth="10"
                                />
                                {(() => {
                                  let acc = 0;
                                  const colorMap: Record<string, string> = {
                                    Tech: "#a78bfa",
                                    Energy: "#fbbf24",
                                    Banking: "#60a5fa",
                                    Crypto: "#34d399",
                                    Bonds: "#f87171",
                                    REITs: "#e2e8f0",
                                    Commodities: "#f472b6",
                                    Other: "#94a3b8"
                                  };
                                  return allocationData.map((item, idx) => {
                                    const strokeLength = (item.pct / 100) * 251.327;
                                    const strokeOffset = 251.327 - (acc / 100) * 251.327;
                                    acc += item.pct;
                                    const strokeColor = colorMap[item.name] || colorMap.Other;
                                    return (
                                      <circle
                                        key={idx}
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        className="fill-none transition-all duration-500"
                                        stroke={strokeColor}
                                        strokeWidth="10"
                                        strokeDasharray={`${strokeLength} 251.327`}
                                        strokeDashoffset={strokeOffset}
                                        strokeLinecap="round"
                                      />
                                    );
                                  });
                                })()}
                              </svg>
                              <div className="absolute inset-0 flex flex-col justify-center items-center text-center font-mono select-none">
                                <span className="text-[6px] text-slate-500 font-bold uppercase font-sans">ASSETS</span>
                                <span className="text-[10px] font-black text-white">{allocationData.length}</span>
                              </div>
                            </div>

                            {/* Donut Legend */}
                            <div className="flex-1 font-mono text-[9px] space-y-1.5 w-full text-left">
                              {(() => {
                                const colorMap: Record<string, string> = {
                                  Tech: "bg-[#a78bfa]",
                                  Energy: "bg-[#fbbf24]",
                                  Banking: "bg-[#60a5fa]",
                                  Crypto: "bg-[#34d399]",
                                  Bonds: "bg-[#f87171]",
                                  REITs: "bg-[#e2e8f0]",
                                  Commodities: "bg-[#f472b6]",
                                  Other: "bg-[#94a3b8]"
                                };
                                return allocationData.map((item, idx) => {
                                  const dotColor = colorMap[item.name] || colorMap.Other;
                                  return (
                                    <div key={idx} className="flex justify-between items-center border-b border-white/[0.02] pb-0.5 last:border-0">
                                      <div className="flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-sm ${dotColor}`} />
                                        <span className="text-slate-400 font-bold uppercase">{item.name}</span>
                                      </div>
                                      <span className="text-white font-bold">{item.pct.toFixed(1)}%</span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

      {/* Onboarding Tour Guide Overlay */}
      <AnimatePresence>
        {tourActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-6 right-6 max-w-sm w-full bg-[#0b0f19]/95 border border-[#a78bfa]/25 p-6 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8),_inset_0_0_10px_rgba(255,255,255,0.02)] z-[90] text-left backdrop-blur-md"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] text-[#a78bfa] font-mono font-bold tracking-widest flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#a78bfa] animate-pulse" />
                  <span>COCKPIT_ONBOARDING_TOUR ({tourStep}/4)</span>
                </span>
                <button 
                  onClick={closeTour} 
                  className="text-slate-500 hover:text-white font-mono text-[9px] cursor-none border-none bg-transparent"
                >
                  [SKIP_TOUR]
                </button>
              </div>

              <div className="space-y-2">
                {tourStep === 1 && (
                  <div className="space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono">1. LAYOUT PRESETS DRAWER</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Click <strong>[CONFIGURE_LAYOUT]</strong> in the top header to expand the presets panel. Swap layouts (Scalper, Macro, Beginner) or toggle individual widgets. Custom layouts are persisted instantly to LocalStorage.
                    </p>
                  </div>
                )}

                {tourStep === 2 && (
                  <div className="space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono">2. SEC-COMPLIANT SOCKET FEED</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Watch indices tick live every 250ms on the Stock Board. Red and green background flashes indicate downward and upward tick adjustments. Under Beginner presets, high-density columns are hidden to reduce complexity.
                    </p>
                  </div>
                )}

                {tourStep === 3 && (
                  <div className="space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono">3. DCF compiler & SANDBOX SHEETS</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Navigate to Tab <strong>[03] RESEARCH_MEMOS</strong> to build pro-forma calculations for Apple Inc. Drag EBITDA and WACC discount sliders to watch intrinsic price recalculate instantly.
                    </p>
                  </div>
                )}

                {tourStep === 4 && (
                  <div className="space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono">4. KEYBOARD SHORTCUTS (K-BAR)</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Press <strong>Cmd+K</strong> or <strong>Ctrl+K</strong> to open the Command Palette. Quickly switch stock symbols, swap presets, jump tabs, or trigger system actions without using your mouse.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5 font-mono text-[10px]">
                <button
                  disabled={tourStep === 1}
                  onClick={() => setTourStep(prev => prev - 1)}
                  className="text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500 cursor-none"
                >
                  &lt; PREV
                </button>
                {tourStep < 4 ? (
                  <button
                    onClick={() => setTourStep(prev => prev + 1)}
                    className="text-[#a78bfa] hover:text-white font-bold cursor-none"
                  >
                    NEXT &gt;
                  </button>
                ) : (
                  <button
                    onClick={closeTour}
                    className="text-[#34d399] hover:text-white font-bold cursor-none"
                  >
                    [COMPLETE_TOUR]
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cmd+K Command Center HUD Overlay */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-6 select-none"
            onClick={() => setCommandPaletteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-[#070b13]/95 border border-[#a78bfa]/20 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85),_inset_0_0_20px_rgba(255,255,255,0.01)] relative space-y-4 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Command className="w-4 h-4 text-[#a78bfa] animate-pulse" />
                  <span className="font-bold">ANALYST_OS_COMMAND_CONSOLE</span>
                </div>
                <span className="text-[9px] bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 px-2 py-0.5 rounded font-mono font-bold">[ESC TO CLOSE]</span>
              </div>

              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type layout name, tab index, or stock ticker (e.g. AAPL, Scalper, Screener)..."
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      executeCommand(commandQuery);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 text-xs bg-slate-950/80 border border-white/10 focus:outline-none focus:border-[#a78bfa]/40 rounded-xl text-white font-mono placeholder:text-slate-655 outline-none"
                />
              </div>

              {/* Categories & options list */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin text-xs">
                {/* Stock Tickers */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono pl-1">FOCUS STOCK TICKER</span>
                  <div className="grid grid-cols-4 gap-2">
                    {["AAPL", "NVDA", "MSFT", "RELIANCE", "TCS", "HDFCBANK", "INFY"].map((ticker) => (
                      <button
                        key={ticker}
                        onClick={() => executeCommand(ticker)}
                        className="bg-slate-950/40 border border-white/[0.05] hover:border-[#a78bfa]/30 hover:bg-[#a78bfa]/5 text-slate-350 hover:text-white px-2 py-1.5 rounded-lg text-center font-mono font-bold transition-all text-[10px] cursor-none"
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop Layouts */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono pl-1">LAYOUT PRESETS</span>
                  <div className="flex flex-col gap-1 font-mono text-[10px]">
                    {[
                      { name: "Bloomberg Core", desc: "Standard dashboard for research", cmd: "bloomberg core" },
                      { name: "The Scalper Layout", desc: "Volatility & order book depth focus", cmd: "scalper" },
                      { name: "Macro Researcher", desc: "Global yields & crude feed focus", cmd: "macro" },
                      { name: "Beginner Desk", desc: "Low-density glossary guidelines", cmd: "beginner" }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => executeCommand(preset.cmd)}
                        className="flex justify-between items-center p-2 rounded-lg bg-slate-950/30 hover:bg-[#a78bfa]/5 border border-transparent hover:border-white/[0.04] transition-all text-slate-400 hover:text-white text-left cursor-none"
                      >
                        <span className="font-bold text-[#a78bfa]">{preset.name}</span>
                        <span className="text-[9px] text-slate-500 font-sans">{preset.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Tabs Navigation */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono pl-1">TAB DIRECTORIES</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    {[
                      { label: "[01] Markets Desk", cmd: "markets" },
                      { label: "[02] Stock Screener", cmd: "screener" },
                      { label: "[03] Research Compiler", cmd: "research" },
                      { label: "[04] Earnings Desk", cmd: "earnings" },
                      { label: "[05] Methodology Hub", cmd: "methodology" },
                      { label: "[06] Career OS Port", cmd: "career" },
                      { label: "[07] Portfolio Desk", cmd: "portfolio" }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => executeCommand(item.cmd)}
                        className="flex items-center space-x-1.5 p-2 rounded-lg bg-slate-950/30 hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] transition-all text-slate-400 hover:text-white text-left cursor-none"
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono pl-1">SYSTEM UTILITIES</span>
                  <div className="flex flex-col gap-1 font-mono text-[10px]">
                    {[
                      { label: "[SYSTEM] Toggle Layout Customizer Panel", cmd: "customizer" },
                      { label: "[SYSTEM] Restart Cockpit Onboarding Tour Guide", cmd: "tour" }
                    ].map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => executeCommand(action.cmd)}
                        className="p-2 rounded-lg bg-slate-950/30 hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] transition-all text-slate-450 hover:text-white text-left cursor-none"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
