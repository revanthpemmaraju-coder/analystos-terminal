/* eslint-disable */
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Compass, 
  Search, 
  MessageSquare, 
  Cpu, 
  PieChart, 
  Layers, 
  Globe, 
  Activity, 
  Terminal, 
  Settings, 
  DollarSign, 
  AlertCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Percent, 
  Briefcase, 
  Calendar, 
  Zap, 
  BookOpen, 
  Award, 
  Sparkles, 
  Command, 
  Share2, 
  RotateCcw, 
  Volume2, 
  Lock, 
  Unlock, 
  Wifi, 
  Battery, 
  ArrowUpRight, 
  ArrowDownRight,
  Maximize2,
  ChevronRight,
  Send,
  Eye,
  SlidersHorizontal,
  Bookmark,
  Play,
  Moon,
  Sun,
  Star,
  Sliders,
  FileText,
  Printer,
  ShieldAlert
} from "lucide-react";

import { locales, LocaleCode } from "@/lib/locales";

// Mock data structures
type StockTicker = string;

interface StockProfile {
  name: string;
  ticker: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: string;
  peRatio: number;
  evEbitda: number;
  debtEquity: number;
  roe: number;
  beta: number;
  sharpe: number;
  drawdown: number;
  history: number[];
  statements: {
    revenue: number[];
    netIncome: number[];
    freeCashFlow: number[];
    cash: number;
    debt: number;
  };
  region: string;
  type: "equity" | "etf" | "bond" | "reit" | "crypto" | "commodity" | "forex" | "index";
  sector: string;
}

const STOCK_DATA: Record<string, StockProfile> = {
  AAPL: {
    name: "Apple Inc.",
    ticker: "AAPL",
    price: 182.45,
    change: 2.15,
    changePct: 1.19,
    marketCap: "2.85T",
    peRatio: 28.4,
    evEbitda: 22.4,
    debtEquity: 1.60,
    roe: 145.4,
    beta: 1.12,
    sharpe: 1.85,
    drawdown: -14.2,
    history: [178, 179.2, 177.5, 180.1, 181.3, 179.8, 182.45],
    statements: {
      revenue: [383285, 394328, 385706, 401200], // In millions (past 4 years)
      netIncome: [96995, 99803, 96995, 102100],
      freeCashFlow: [104300, 110500, 99200, 108400],
      cash: 67300,
      debt: 108000,
    },
    region: "US",
    type: "equity",
    sector: "US Tech"
  },
  NVDA: {
    name: "NVIDIA Corporation",
    ticker: "NVDA",
    price: 948.22,
    change: 41.35,
    changePct: 4.56,
    marketCap: "2.37T",
    peRatio: 74.8,
    evEbitda: 38.6,
    debtEquity: 0.22,
    roe: 115.6,
    beta: 1.84,
    sharpe: 2.92,
    drawdown: -22.5,
    history: [890, 902.5, 915.2, 898.1, 922.3, 935.6, 948.22],
    statements: {
      revenue: [26974, 27114, 60922, 110200],
      netIncome: [9752, 4368, 29760, 58400],
      freeCashFlow: [8100, 3800, 27000, 52300],
      cash: 25900,
      debt: 9700,
    },
    region: "US",
    type: "equity",
    sector: "US Tech"
  },
  TSLA: {
    name: "Tesla, Inc.",
    ticker: "TSLA",
    price: 174.60,
    change: -3.85,
    changePct: -2.16,
    marketCap: "556.2B",
    peRatio: 42.1,
    evEbitda: 28.5,
    debtEquity: 0.10,
    roe: 24.5,
    beta: 1.55,
    sharpe: 1.15,
    drawdown: -48.3,
    history: [186, 182.1, 179.4, 181.2, 178.6, 175.2, 174.60],
    statements: {
      revenue: [53823, 81462, 96773, 102400],
      netIncome: [5519, 12587, 14974, 13100],
      freeCashFlow: [5015, 7566, 4358, 5900],
      cash: 29100,
      debt: 2800,
    },
    region: "US",
    type: "equity",
    sector: "US Tech"
  },
  RELIANCE: {
    name: "Reliance Industries Ltd.",
    ticker: "RELIANCE",
    price: 2450.40,
    change: 42.10,
    changePct: 1.75,
    marketCap: "₹16.5L Cr",
    peRatio: 26.4,
    evEbitda: 12.8,
    debtEquity: 0.45,
    roe: 11.2,
    beta: 1.15,
    sharpe: 1.25,
    drawdown: -12.4,
    history: [2410, 2425, 2408, 2432, 2445, 2438, 2450.40],
    statements: {
      revenue: [200000, 215000, 230000, 245000],
      netIncome: [45000, 48000, 52000, 56000],
      freeCashFlow: [32000, 35000, 38000, 42000],
      cash: 15000,
      debt: 35000
    },
    region: "India",
    type: "equity",
    sector: "Energy"
  },
  TCS: {
    name: "Tata Consultancy Services",
    ticker: "TCS",
    price: 3820.15,
    change: 98.40,
    changePct: 2.64,
    marketCap: "₹13.9L Cr",
    peRatio: 28.2,
    evEbitda: 18.2,
    debtEquity: 0.12,
    roe: 48.6,
    beta: 0.85,
    sharpe: 1.10,
    drawdown: -8.5,
    history: [3750, 3768, 3745, 3782, 3805, 3798, 3820.15],
    statements: {
      revenue: [120000, 132000, 145000, 158000],
      netIncome: [32000, 35000, 38000, 41000],
      freeCashFlow: [28000, 31000, 33000, 36000],
      cash: 12000,
      debt: 2000
    },
    region: "India",
    type: "equity",
    sector: "IT Services"
  },
  SPY: {
    name: "SPDR S&P 500 ETF Trust",
    ticker: "SPY",
    price: 512.20,
    change: 4.80,
    changePct: 0.95,
    marketCap: "502B",
    peRatio: 23.4,
    evEbitda: 15.6,
    debtEquity: 0.0,
    roe: 0.0,
    beta: 1.00,
    sharpe: 1.20,
    drawdown: -15.5,
    history: [505, 507.2, 504.5, 508.1, 509.3, 507.8, 512.20],
    statements: {
      revenue: [0, 0, 0, 0],
      netIncome: [0, 0, 0, 0],
      freeCashFlow: [0, 0, 0, 0],
      cash: 0,
      debt: 0
    },
    region: "US",
    type: "etf",
    sector: "ETF"
  },
  BTC: {
    name: "Bitcoin Spot",
    ticker: "BTC",
    price: 68520.00,
    change: 1250.00,
    changePct: 1.86,
    marketCap: "1.34T",
    peRatio: 0,
    evEbitda: 0,
    debtEquity: 0,
    roe: 0,
    beta: 1.80,
    sharpe: 1.50,
    drawdown: -33.4,
    history: [67100, 67450, 66800, 67900, 68120, 67850, 68520],
    statements: {
      revenue: [0, 0, 0, 0],
      netIncome: [0, 0, 0, 0],
      freeCashFlow: [0, 0, 0, 0],
      cash: 0,
      debt: 0
    },
    region: "Global",
    type: "crypto",
    sector: "Crypto"
  },
  GOLD: {
    name: "Gold Spot $/oz",
    ticker: "GOLD",
    price: 2345.80,
    change: 18.20,
    changePct: 0.78,
    marketCap: "N/A",
    peRatio: 0,
    evEbitda: 0,
    debtEquity: 0,
    roe: 0,
    beta: 0.20,
    sharpe: 0.80,
    drawdown: -8.2,
    history: [2315, 2328, 2310, 2335, 2340, 2338, 2345.80],
    statements: {
      revenue: [0, 0, 0, 0],
      netIncome: [0, 0, 0, 0],
      freeCashFlow: [0, 0, 0, 0],
      cash: 0,
      debt: 0
    },
    region: "Global",
    type: "commodity",
    sector: "Commodities"
  },
  BRENT: {
    name: "Brent Crude Oil",
    ticker: "BRENT",
    price: 81.40,
    change: -0.85,
    changePct: -1.03,
    marketCap: "N/A",
    peRatio: 0,
    evEbitda: 0,
    debtEquity: 0,
    roe: 0,
    beta: 1.30,
    sharpe: 0.60,
    drawdown: -18.2,
    history: [82.5, 83.1, 81.8, 82.4, 82.2, 80.9, 81.40],
    statements: {
      revenue: [0, 0, 0, 0],
      netIncome: [0, 0, 0, 0],
      freeCashFlow: [0, 0, 0, 0],
      cash: 0,
      debt: 0
    },
    region: "Global",
    type: "commodity",
    sector: "Commodities"
  },
  EURUSD: {
    name: "EUR / USD Spot",
    ticker: "EURUSD",
    price: 1.0852,
    change: 0.0012,
    changePct: 0.11,
    marketCap: "N/A",
    peRatio: 0,
    evEbitda: 0,
    debtEquity: 0,
    roe: 0,
    beta: 0.30,
    sharpe: 0.40,
    drawdown: -4.5,
    history: [1.081, 1.083, 1.082, 1.084, 1.085, 1.084, 1.0852],
    statements: {
      revenue: [0, 0, 0, 0],
      netIncome: [0, 0, 0, 0],
      freeCashFlow: [0, 0, 0, 0],
      cash: 0,
      debt: 0
    },
    region: "Global",
    type: "forex",
    sector: "Forex"
  }
};

export default function AnalystOSMobile() {
  const router = useRouter();

  // Navigation and mode states
  const [activeTab, setActiveTab] = useState<"home" | "workspace" | "committee" | "portfolio">("home");
  const [activeStock, setActiveStock] = useState<StockTicker>("AAPL");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [hedgeFundMode, setHedgeFundMode] = useState(false);
  const [isSimulator, setIsSimulator] = useState(true);
  const [aiVoiceActive, setAiVoiceActive] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"ai" | "dcf" | "financials" | "news" | "forex">("ai");

  // User Auth & Profiles
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedRegion, setSelectedRegion] = useState<string>("US");
  const [activeStress, setActiveStress] = useState<"none" | "inflation" | "tech_selloff" | "rate_hike" | "supply_chain">("none");
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

  // High Frequency stocks state
  const [stocks, setStocks] = useState<Record<StockTicker, StockProfile>>(STOCK_DATA);

  // Watchlist states
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<"all" | "watchlist">("all");

  // Saved research notes state
  const [aaplNotes, setAaplNotes] = useState<string>(
    "AAPL Notes:\n- Services growth remains primary multiple expansion driver.\n- Edge AI capability could trigger accelerated device upgrade cycle in Q4 FY26.\n- Risk: Anti-trust pressure on App Store margins."
  );
  const [relianceNotes, setRelianceNotes] = useState<string>(
    "RELIANCE Notes:\n- Energy segment cash flow funding retail & digital expansion.\n- Potential spin-off/IPO listing of Jio/Retail division as valuation catalyst.\n- Enterprise AI partnership with NVIDIA targets local market deployments."
  );

  const handleSaveNotes = (ticker: string, text: string) => {
    if (typeof window !== "undefined") {
      if (ticker === "AAPL" || ticker === "NVDA" || ticker === "TSLA") {
        setAaplNotes(text);
        localStorage.setItem("aos_notes_aapl", text);
      } else {
        setRelianceNotes(text);
        localStorage.setItem("aos_notes_reliance", text);
      }
      alert(`✓ Research notes for ${ticker} saved successfully!`);
    }
  };

  // DCF Save/Load states
  const [savedMemos, setSavedMemos] = useState<any[]>([]);
  const [saveModelName, setSaveModelName] = useState("");
  const [savingModel, setSavingModel] = useState(false);

  // Portfolio & Transaction states
  const [portfolioHoldings, setPortfolioHoldings] = useState<any[]>([]);
  const [tradeTicker, setTradeTicker] = useState<StockTicker>("AAPL");
  const [mobileTradeTickerDropdownOpen, setMobileTradeTickerDropdownOpen] = useState(false);
  const [tradeShares, setTradeShares] = useState(10);
  const [tradePrice, setTradePrice] = useState(180);
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  // Onboarding Tour Guide states
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(1);
  const [showTourInvite, setShowTourInvite] = useState(false);

  // DCF Editable parameters
  const [growthRate, setGrowthRate] = useState(12); // Growth years 1-5 (%)
  const [growthRate6to10, setGrowthRate6to10] = useState(6); // Growth years 6-10 (%)
  const [discountRate, setDiscountRate] = useState(8.5); // Discount rate / WACC (%)
  const [terminalGrowthRate, setTerminalGrowthRate] = useState(2.2); // Perpetual growth rate (%)
  const [sharesOutstanding, setSharesOutstanding] = useState(15.4); // Billions of shares

  // AI Chat History state
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "AI Analyst",
      text: "Portfolio tracking activated. Apple, Nvidia, and Tesla models loaded. How shall we allocate today's capital flows?",
      timestamp: "13:04"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [forexMessages, setForexMessages] = useState([
    {
      sender: "ForexAI",
      text: "Welcome to ForexAI Desk. Ask me about EUR/USD trends, currency correlations, or central bank macro policies.",
      timestamp: "13:04"
    }
  ]);
  const [forexInput, setForexInput] = useState("");
  const [isTypingForex, setIsTypingForex] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const forexEndRef = useRef<HTMLDivElement>(null);

  // 3D Canvas properties
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationAngle = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const startDragCoords = useRef({ x: 0, y: 0 });

  // Handle local time update
  const [currentTime, setCurrentTime] = useState("09:41");
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Responsive device simulator check
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSimulator(false);
      } else {
        setIsSimulator(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Trigger mobile tour guide on first load after short delay
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tourCompleted = localStorage.getItem("aos_mobile_tour_completed") === "true";
      if (!tourCompleted) {
        const timer = setTimeout(() => {
          setShowTourInvite(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Keyboard shortcut listener (Cmd+K for command palette, 1-4 for tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }

      if (hedgeFundMode) {
        if (e.key === "1") setActiveTab("home");
        if (e.key === "2") setActiveTab("workspace");
        if (e.key === "3") setActiveTab("committee");
        if (e.key === "4") setActiveTab("portfolio");
        if (e.key.toLowerCase() === "h") setHedgeFundMode(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hedgeFundMode]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // 3D Market Sphere Particle rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const width = canvas.width;
    const height = canvas.height;

    // Generate random nodes
    const particleCount = 75;
    const particles: Array<{
      x: number;
      y: number;
      z: number;
      size: number;
      color: string;
      speed: number;
    }> = [];

    const sentimentColors = ["#10b981", "#6366f1", "#00f0ff", "#ff3b30", "#34d399"];

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 85; // Sphere radius

      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        size: Math.random() * 2 + 1,
        color: sentimentColors[Math.floor(Math.random() * sentimentColors.length)],
        speed: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1)
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw grid radial gradient background
      const grad = ctx.createRadialGradient(width/2, height/2, 2, width/2, height/2, width/2);
      grad.addColorStop(0, "rgba(99, 102, 241, 0.05)");
      grad.addColorStop(0.5, "rgba(5, 5, 5, 0)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw faint boundary rings
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(width/2, height/2, 85, 0, Math.PI * 2);
      ctx.stroke();

      // Render capital flow orbit lines
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(width/2, height/2, 85, 30, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(99, 102, 241, 0.1)";
      ctx.beginPath();
      ctx.ellipse(width/2, height/2, 85, 35, -Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();

      // Project particles to 2D
      const rx = rotationAngle.current.y;
      const ry = rotationAngle.current.x;

      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);

      // Sort particles by depth Z for correct layering
      const projected = particles.map(p => {
        // Rotate around Y axis
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;

        // Rotate around X axis
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        // Perspective projection
        const scale = 200 / (200 + z2); 
        const projX = x1 * scale + width / 2;
        const projY = y2 * scale + height / 2;

        // Natural auto-rotation drift
        p.x = p.x * Math.cos(p.speed) - p.z * Math.sin(p.speed);
        p.z = p.x * Math.sin(p.speed) + p.z * Math.cos(p.speed);

        return { x: projX, y: projY, z: z2, size: p.size * scale, color: p.color };
      });

      projected.sort((a, b) => b.z - a.z);

      // Draw projected points
      projected.forEach(p => {
        const opacity = Math.max(0.1, Math.min(1, (100 - p.z) / 200));
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Add subtle neon glow to front-most dots
        if (p.z < 0 && Math.random() > 0.95) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      });

      ctx.globalAlpha = 1.0;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Touch/drag listeners for 3D sphere rotation
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    startDragCoords.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startDragCoords.current.x;
    const dy = e.clientY - startDragCoords.current.y;
    rotationAngle.current.x += dx * 0.007;
    rotationAngle.current.y += dy * 0.007;
    startDragCoords.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasMouseUp = () => {
    isDragging.current = false;
  };

  // User Authentication & Backdoor Gate check
  useEffect(() => {
    async function checkAuth() {
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

  const saveDcfModel = async (customName?: string) => {
    if (!user) return;
    const name = customName || `${activeStock} Valuation (${new Date().toLocaleDateString()})`;
    setSavingModel(true);

    const inputs = {
      ticker: activeStock,
      revenue: currentProfile.statements.revenue[3],
      ebitda: currentProfile.statements.netIncome[3],
      growth_rate: growthRate,
      wacc: discountRate,
      exit_multiple: 15.0,
      terminal_growth_rate: terminalGrowthRate,
      valuation_method: "gordon"
    };

    const result = {
      enterprise_value: dcfCalculations.enterpriseValue,
      equity_value: dcfCalculations.equityValue,
      implied_share_price: dcfCalculations.intrinsicValuePerShare,
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
    if (inputs.ticker) setActiveStock(inputs.ticker as StockTicker);
    if (inputs.growth_rate) setGrowthRate(inputs.growth_rate);
    if (inputs.wacc) setDiscountRate(inputs.wacc);
    if (inputs.terminal_growth_rate) setTerminalGrowthRate(inputs.terminal_growth_rate);
  };

  // Watchlist & Notes helpers on mount
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

  // Screener sorting states
  const [sortField, setSortField] = useState<"ticker" | "peRatio" | "evEbitda" | "debtEquity" | "roe" | "price">("ticker");
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
    return Object.values(stocks)
      .filter(s => {
        if (stockFilter === "watchlist" && !watchlist.includes(s.ticker)) return false;
        if (selectedRegion !== "Global" && s.region !== selectedRegion) return false;
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField] ?? 0;
        let valB: any = b[sortField] ?? 0;
        
        if (typeof valA === "string") {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [stocks, stockFilter, watchlist, sortField, sortAsc, selectedRegion]);

  // Fetch and manage portfolio
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
          { ticker: "NVDA", shares: 40, average_buy_price: 850.00 }
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
          { ticker: "NVDA", shares: 40, average_buy_price: 850.00 }
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

  // High-Frequency Real-Time WebSocket simulation ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prev => {
        const next = { ...prev };
        const tickers = Object.keys(next);
        const target = tickers[Math.floor(Math.random() * tickers.length)];
        const stock = next[target];
        if (!stock) return prev;
        
        const tickPercent = (Math.random() - 0.49) * 0.005;
        const priceDiff = stock.price * tickPercent;
        const newPrice = Number((stock.price + priceDiff).toFixed(2));
        const newChange = Number((stock.change + priceDiff).toFixed(2));
        const newPercent = Number(((newChange / (newPrice - newChange)) * 100).toFixed(2));
        
        const nextHistory = [...stock.history];
        nextHistory.shift();
        nextHistory.push(newPrice);

        next[target] = {
          ...stock,
          price: newPrice,
          change: newChange,
          changePct: newPercent,
          history: nextHistory
        };
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const calculatedPortfolioStats = useMemo(() => {
    let totalMarketValue = 0;
    let totalCost = 0;
    let weightedBeta = 0;
    let weightedSharpe = 0;

    portfolioHoldings.forEach(holding => {
      const stock = stocks[holding.ticker];
      if (!stock) return;
      const currentPrice = stock.price;
      const mCapVal = holding.shares * currentPrice;
      totalMarketValue += mCapVal;
      totalCost += holding.shares * holding.average_buy_price;

      const stockBeta = stock.beta || 1.0;
      const stockSharpe = stock.sharpe || 1.0;

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
        const stock = stocks[holding.ticker];
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
      const stock = stocks[holding.ticker];
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

  // Stock Profile Selector
  const currentProfile = useMemo(() => {
    return stocks[activeStock];
  }, [stocks, activeStock]);

  // LIVE DCF ENGINE CALCULATOR
  const dcfCalculations = useMemo(() => {
    const fcfBase = currentProfile.statements.freeCashFlow[3] || 100000; // latest in Millions
    const calculatedFcfs: number[] = [];
    const discountedFcfs: number[] = [];

    // Projection Years 1 to 5
    let currentFcf = fcfBase;
    for (let i = 1; i <= 5; i++) {
      currentFcf = currentFcf * (1 + growthRate / 100);
      calculatedFcfs.push(currentFcf);

      const discountFactor = Math.pow(1 + discountRate / 100, i);
      discountedFcfs.push(currentFcf / discountFactor);
    }

    // Projection Years 6 to 10
    for (let i = 6; i <= 10; i++) {
      currentFcf = currentFcf * (1 + growthRate6to10 / 100);
      calculatedFcfs.push(currentFcf);

      const discountFactor = Math.pow(1 + discountRate / 100, i);
      discountedFcfs.push(currentFcf / discountFactor);
    }

    // Terminal Value projection
    const lastFcf = calculatedFcfs[9];
    const terminalValue = (lastFcf * (1 + terminalGrowthRate / 100)) / ((discountRate - terminalGrowthRate) / 100);
    const discountedTerminalValue = terminalValue / Math.pow(1 + discountRate / 100, 10);

    // Sum PV of Cash Flows
    const sumPvFcfs = discountedFcfs.reduce((sum, val) => sum + val, 0);
    const enterpriseValue = sumPvFcfs + discountedTerminalValue;

    // Equity Value = Enterprise Value + Cash - Debt
    const equityValue = enterpriseValue + currentProfile.statements.cash - currentProfile.statements.debt;
    const intrinsicValuePerShare = equityValue / (sharesOutstanding * 1000); // sharesOutstanding in billions

    const marketPrice = currentProfile.price;
    const safetyMarginPct = ((intrinsicValuePerShare - marketPrice) / intrinsicValuePerShare) * 100;
    const recommendation = safetyMarginPct > 20 
      ? "UNDERVALUED - STRONG BUY" 
      : safetyMarginPct > 5 
        ? "FAIR VALUE - BUY" 
        : safetyMarginPct > -10 
          ? "HOLD" 
          : "OVERVALUED - REDUCE/SELL";

    return {
      calculatedFcfs,
      discountedFcfs,
      terminalValue,
      discountedTerminalValue,
      sumPvFcfs,
      enterpriseValue,
      equityValue,
      intrinsicValuePerShare,
      safetyMarginPct,
      recommendation
    };
  }, [currentProfile, growthRate, growthRate6to10, discountRate, terminalGrowthRate, sharesOutstanding]);

  const mobileSensitivity = useMemo(() => {
    const waccSteps = [discountRate - 1, discountRate, discountRate + 1];
    const growthSteps = [growthRate - 1.5, growthRate, growthRate + 1.5];
    const fcfBase = currentProfile.statements.freeCashFlow[3] || 100000;
    
    return waccSteps.map(wStep => {
      const row = growthSteps.map(gStep => {
        let currentFcf = fcfBase;
        const discounted: number[] = [];
        for (let i = 1; i <= 5; i++) {
          currentFcf = currentFcf * (1 + gStep / 100);
          discounted.push(currentFcf / Math.pow(1 + wStep / 100, i));
        }
        for (let i = 6; i <= 10; i++) {
          currentFcf = currentFcf * (1 + growthRate6to10 / 100);
          discounted.push(currentFcf / Math.pow(1 + wStep / 100, i));
        }
        const lastFcf = currentFcf;
        const tv = (lastFcf * (1 + terminalGrowthRate / 100)) / (Math.max(0.005, wStep - terminalGrowthRate) / 100);
        const pvTV = tv / Math.pow(1 + wStep / 100, 10);
        const ev = discounted.reduce((a, b) => a + b, 0) + pvTV;
        const eq = ev + currentProfile.statements.cash - currentProfile.statements.debt;
        return eq / (sharesOutstanding * 1000);
      });
      return { waccValue: wStep, row };
    });
  }, [discountRate, growthRate, growthRate6to10, terminalGrowthRate, currentProfile, sharesOutstanding]);

  // AI Investment Committee scores & theses
  const investmentCommittee = useMemo(() => {
    // Generate scores based on active variables
    let bullScore = 80;
    let bearScore = 30;
    let quantScore = 75;
    let macroScore = 65;

    if (activeStock === "AAPL") {
      bullScore = Math.max(50, 85 + (growthRate - 12) * 2);
      bearScore = Math.min(90, 30 + (discountRate - 8.5) * 5);
      quantScore = Math.min(95, 78 + (currentProfile.changePct * 2));
      macroScore = Math.min(90, 68 - (discountRate - 8.5) * 4);
    } else if (activeStock === "NVDA") {
      bullScore = Math.min(99, 94 + (growthRate - 12) * 1.5);
      bearScore = Math.min(95, 52 + (discountRate - 8.5) * 6);
      quantScore = Math.min(99, 88 + (currentProfile.changePct * 1));
      macroScore = Math.min(90, 60 - (discountRate - 8.5) * 5);
    } else { // TSLA
      bullScore = Math.max(40, 72 + (growthRate - 12) * 3);
      bearScore = Math.min(95, 65 + (discountRate - 8.5) * 4);
      quantScore = Math.max(30, 48 + (currentProfile.changePct * 2.5));
      macroScore = Math.min(90, 58 - (discountRate - 8.5) * 3);
    }

    const consensusScore = Math.round((bullScore + (100 - bearScore) + quantScore + macroScore) / 4);

    const theses = {
      bull: activeStock === "AAPL"
        ? "Robust ecosystem monetization via high-margin Apple Services and AI features ('Apple Intelligence') driving hardware upgrades. Strong free cash flows allow aggressive share buybacks, compounding equity multipliers."
        : activeStock === "NVDA"
          ? "Uncontested monopoly in accelerated computing silicon (H100/Blackwell series). Full stack software lock-in via CUDA ecosystem represents an impregnable economic moat. Enterprise demand remains structurally supply-constrained."
          : "Full Self-Driving (FSD) software integration scaling networks exponentially. Megapack energy storage segments growing over 100% annually. Low cost manufacturing architecture underpins long term structural EV margins.",
      bear: activeStock === "AAPL"
        ? "Hardware stagnation in core iPhone sales. antitrust crackdowns in EU/US targeting App Store royalties squeeze services gross margin. Sub-optimal global hardware cycle risk."
        : activeStock === "NVDA"
          ? "Hyper-cyclical capex fatigue from hyperscale tech giants. In-house custom silicon designs (ASICs) from Google, Amazon, and Meta threaten hardware premium pricing over a 3-year horizon."
          : "Deflationary Chinese EV price war compressing automotive gross margins under 17%. Operational bottlenecks in scaling 4680 battery cells. Key regulatory credits revenue drying up.",
      quant: activeStock === "AAPL"
        ? `Stochastic RSI indicates neutral positioning at 52. Moving averages suggest bullish Golden Cross in progress over 50D/200D support. Short interest negligible at 0.8% of float.`
        : activeStock === "NVDA"
          ? `Extreme momentum breakout. RSI in overbought bounds at 74 but sustained on immense institutional volume profiles. Massive capital flow support levels consolidating around $910.`
          : `RSI shows severe oversold rebound patterns at 34. Moving averages trend downwards. Large option straddle volume centered on near term $175 strikes. Support floor at $168.`,
      macro: activeStock === "AAPL"
        ? "High rate regime creates defensive flight to liquidity benefits. High cash reserves provide structural carry income. Supply chain diversification out of regional zones progressing successfully."
        : activeStock === "NVDA"
          ? "High sensitivity to global capital investment expenditures. Liquidity tightening impacts tech valuation multiples negatively, although high current earnings cushion fundamental PE ratios."
          : "Extremely sensitive to global consumer credit availability. Automotive lease financing volumes hindered by extended prime rates. Global lithium price fluctuations offer minor raw margin relief."
    };

    return {
      bullScore: Math.round(bullScore),
      bearScore: Math.round(bearScore),
      quantScore: Math.round(quantScore),
      macroScore: Math.round(macroScore),
      consensusScore,
      theses
    };
  }, [activeStock, growthRate, discountRate, currentProfile.changePct]);

  // Handle Command Submission in Command Center
  const executeCommand = (cmd: string) => {
    const formatted = cmd.trim().toUpperCase();
    
    if (formatted === "AAPL") {
      setActiveStock("AAPL");
      setChatMessages(prev => [...prev, { sender: "User", text: "AAPL Profile", timestamp: currentTime }, { sender: "AI Analyst", text: "Routing terminal context to Apple Inc. Watchlist updated.", timestamp: currentTime }]);
    } else if (formatted === "NVDA") {
      setActiveStock("NVDA");
      setChatMessages(prev => [...prev, { sender: "User", text: "NVDA Profile", timestamp: currentTime }, { sender: "AI Analyst", text: "Routing terminal context to NVIDIA Corp. AI Compute matrices updated.", timestamp: currentTime }]);
    } else if (formatted === "TSLA") {
      setActiveStock("TSLA");
      setChatMessages(prev => [...prev, { sender: "User", text: "TSLA Profile", timestamp: currentTime }, { sender: "AI Analyst", text: "Routing terminal context to Tesla Inc. Autopilot modules synced.", timestamp: currentTime }]);
    } else if (formatted === "DCF") {
      setActiveTab("workspace");
      setActiveWorkspaceTab("dcf");
    } else if (formatted === "NEWS") {
      setActiveTab("workspace");
      setActiveWorkspaceTab("news");
    } else if (formatted === "COMMITTEE") {
      setActiveTab("committee");
    } else if (formatted === "PORTFOLIO") {
      setActiveTab("portfolio");
    } else if (formatted === "HF") {
      setHedgeFundMode(prev => !prev);
    } else {
      // Custom AI Chat injection
      setChatMessages(prev => [...prev, 
        { sender: "User", text: cmd, timestamp: currentTime },
        { sender: "AI Analyst", text: `Analyzing flow models for: "${cmd}". The macro committee consensus lists this asset index with structural support vectors. Recommended action: Monitor DCF WACC fluctuations.`, timestamp: currentTime }
      ]);
    }
    
    setCommandQuery("");
    setCommandPaletteOpen(false);
  };

  // Submit standard chat message
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    executeCommand(chatInput);
    setChatInput("");
  };

  // Submit forex chat message
  const handleForexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forexInput.trim()) return;
    const userText = forexInput;
    setForexInput("");
    setForexMessages(prev => [...prev, { sender: "User", text: userText, timestamp: currentTime }]);
    setIsTypingForex(true);
    
    setTimeout(() => {
      let reply = "";
      const text = userText.toLowerCase();
      if (text.includes("eur") || text.includes("usd")) {
        reply = "EUR/USD sits in a critical macro bracket near 1.0850. The European Central Bank's inflation commentary indicates near-term rate cuts while the Federal Reserve continues quantitative tightening. This divergence supports an initial test of 1.0920 before potential regression.";
      } else if (text.includes("inr") || text.includes("rupee")) {
        reply = "USD/INR is trading around 83.42. The Reserve Bank of India has maintained active market intervention to manage reserves and curb volatility. Expect a stable range of 83.20 - 83.80 over the current policy cycle.";
      } else if (text.includes("interest") || text.includes("rate") || text.includes("fed")) {
        reply = "Central banks remain hawkish. Real yields are compressing global bond desks. Expect yield curve steepening as short-term policy stays elevated, impacting global carry trades.";
      } else {
        reply = `ForexAI Research: Analyzing pair correlations for query: "${userText}". Macro reserves and spot liquidities show steady cross-currency flows with a bullish bias towards USD counterparts in volatile environments.`;
      }
      setForexMessages(prev => [...prev, { sender: "ForexAI", text: reply, timestamp: currentTime }]);
      setIsTypingForex(false);
    }, 800);
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-[#f8fafc] font-sans antialiased overflow-x-hidden flex items-center justify-center relative p-0 md:p-6 transition-all duration-500`}>
      
      {/* GLOWING AMBIENT BACKGROUND */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none z-0" />

      {/* DESKTOP INTEGRATED PHONE FRAME SIMULATOR */}
      <div className={`${isSimulator ? "w-[390px] h-[844px] rounded-[55px] border-[10px] border-neutral-900 shadow-[0_0_80px_rgba(0,0,0,0.8),_inset_0_0_10px_rgba(255,255,255,0.05),_0_0_0_2px_rgba(255,255,255,0.05)] bg-[#050505] relative overflow-hidden flex flex-col scale-[1.02] transform origin-center transition-all duration-500 z-10" : "w-full min-h-screen bg-[#050505] flex flex-col relative z-10"}`}>
        
        {/* SIMULATOR NOTCH & SYSTEM BAR */}
        <div className="w-full h-12 flex items-center justify-between px-7 shrink-0 z-30 bg-[#050505]/80 backdrop-blur-md relative select-none">
          <span className="text-[14px] font-semibold text-white tracking-tight">{currentTime}</span>
          
          {/* Dynamic Island Notch */}
          {isSimulator && (
            <div className="w-28 h-6 bg-black rounded-full absolute top-[10px] left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-1.5 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800" />
              <div className="w-2 h-2 rounded-full bg-emerald-500/30 figma-pulse-circle shrink-0" />
            </div>
          )}

          <div className="flex items-center gap-1.5 text-neutral-400">
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">5G</span>
            <Battery className="w-4 h-4 ml-0.5" />
          </div>
        </div>

        {/* HEADER BAR */}
        <header className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between z-20 shrink-0 bg-[#050505]/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${hedgeFundMode ? "bg-emerald-500 animate-pulse" : "bg-indigo-500 animate-pulse"}`} />
            <h1 className={`text-base font-bold font-display tracking-tight leading-none ${hedgeFundMode ? "text-emerald-400 font-mono" : "text-white"}`}>
              {hedgeFundMode ? "ANALYSTOS.HF" : "AnalystOS"}
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-neutral-400 font-mono">M1</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative flex items-center">
              <select
                value={lang}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setLang(newLang as any);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("aos_lang", newLang);
                    window.dispatchEvent(new Event("aos_lang_changed"));
                  }
                }}
                className="bg-[#050505]/60 border border-white/10 hover:border-indigo-500/40 px-1 py-0.5 rounded text-[8px] text-indigo-400 font-mono font-bold outline-none focus:border-indigo-500 uppercase cursor-pointer transition-colors"
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

            {/* Quick stock badge selector */}
            <div className="flex bg-white/[0.03] border border-white/[0.08] p-0.5 rounded-lg select-none">
              {(["AAPL", "NVDA", "RELIANCE", "BTC", "GOLD"] as StockTicker[]).map(ticker => (
                <button
                  key={ticker}
                  onClick={() => setActiveStock(ticker)}
                  className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md transition-all ${activeStock === ticker ? (hedgeFundMode ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" : "bg-indigo-600 text-white shadow-lg") : "text-neutral-400 hover:text-white"}`}
                >
                  {ticker}
                </button>
              ))}
            </div>

            {/* Bloomberg Mode Toggle */}
            <button 
              onClick={() => setHedgeFundMode(!hedgeFundMode)}
              className={`p-1.5 rounded-lg border transition-all ${hedgeFundMode ? "bg-emerald-950/80 border-emerald-700/50 text-emerald-400" : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white"}`}
              title="Toggle Hedge Fund Mode"
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* MAIN VIEWS - SCROLLABLE COMPONENT */}
        <main className={`flex-1 overflow-y-auto px-4 pb-24 pt-4 scrollbar-none z-10 ${hedgeFundMode ? "font-mono text-emerald-400 bg-black" : "bg-transparent"}`}>
          
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* ACTIVE STOCK QUICK INSIGHT */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden group shadow-xl">
                  {/* Subtle hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/[0.02] to-emerald-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] text-neutral-400 font-semibold tracking-wider uppercase font-display">Active Asset</p>
                      <h2 className="text-xl font-bold text-white leading-tight mt-0.5">{currentProfile.name}</h2>
                      <p className="text-neutral-500 text-[11px] mt-0.5">{currentProfile.ticker} · NASDAQ Global Select</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black font-display tracking-tight text-white">${currentProfile.price.toFixed(2)}</div>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded mt-1.5 leading-none ${currentProfile.change >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                        {currentProfile.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {currentProfile.change >= 0 ? "+" : ""}{currentProfile.change.toFixed(2)} ({currentProfile.changePct}%)
                      </span>
                    </div>
                  </div>

                  {/* Sparkline Canvas rendering */}
                  <div className="w-full h-16 mt-4 relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id={`grad-${activeStock}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={currentProfile.change >= 0 ? "#10b981" : "#ef4444"} stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#050505" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Area path */}
                      <path 
                        d={`M 0,30 ${currentProfile.history.map((val, idx) => {
                          const x = (idx / (currentProfile.history.length - 1)) * 100;
                          const min = Math.min(...currentProfile.history);
                          const max = Math.max(...currentProfile.history);
                          const y = 25 - ((val - min) / (max - min)) * 20;
                          return `L ${x},${y}`;
                        }).join(" ")} L 100,30 Z`} 
                        fill={`url(#grad-${activeStock})`} 
                      />
                      {/* Stroke path */}
                      <path 
                        d={currentProfile.history.map((val, idx) => {
                          const x = (idx / (currentProfile.history.length - 1)) * 100;
                          const min = Math.min(...currentProfile.history);
                          const max = Math.max(...currentProfile.history);
                          const y = 25 - ((val - min) / (max - min)) * 20;
                          return `${idx === 0 ? "M" : "L"} ${x},${y}`;
                        }).join(" ")}
                        fill="none" 
                        stroke={currentProfile.change >= 0 ? "#10b981" : "#ef4444"} 
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* 3D ROTATING MARKET GLOBE WIDGET */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden flex flex-col items-center">
                  <div className="w-full flex justify-between items-center z-10 shrink-0">
                    <div>
                      <h3 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5 font-display">
                        <Globe className="w-3.5 h-3.5 text-indigo-400" />
                        3D Global Sentiment Sphere
                      </h3>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Drag to rotate · Sentiment density flows</p>
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">LIVE FLOWS</span>
                  </div>

                  {/* Interactive Globe Canvas container */}
                  <div className="relative w-full h-[180px] flex items-center justify-center mt-1">
                    <canvas 
                      ref={canvasRef} 
                      width={220} 
                      height={180}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      className="cursor-grab active:cursor-grabbing max-w-full z-10"
                    />
                    
                    {/* Floating capital flows metrics overlay */}
                    <div className="absolute top-2 left-0 font-mono text-[9px] text-neutral-500 leading-normal z-0 space-y-1">
                      <div>US LIQ: +$14.2B</div>
                      <div>EU BUND: 3.42%</div>
                      <div>JP CARRY: ACTIVE</div>
                    </div>
                    <div className="absolute bottom-2 right-0 font-mono text-[9px] text-neutral-500 leading-normal text-right z-0 space-y-1">
                      <div>SENTIMENT: BULLISH</div>
                      <div>WACC COEFFICIENT: 0.85</div>
                      <div>QUANT BIAS: STRONG</div>
                    </div>
                  </div>
                </div>

                {/* PERSONALIZED AI MARKET BRIEF */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl relative">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5 mb-3">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-display">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      AI Capital Market Brief
                    </h3>
                    <span className="text-[9px] text-neutral-500 font-mono">08:00 AM EDT</span>
                  </div>
                  
                  <div className="space-y-3 text-[12px] leading-relaxed text-neutral-300">
                    <p>
                      <strong>Macro Catalyst:</strong> Rates solidify on positive treasury distributions. Hyperscaler capex projections for Q2 are scaling up <strong>+18.5% YoY</strong>, indicating a persistent capital runway for structural AI infrastructure.
                    </p>
                    <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-indigo-300">
                        <strong>Analyst Verdict for {activeStock}:</strong> The radial consensus indicates a <strong>{investmentCommittee.consensusScore}/100</strong> safety threshold. DCF models yield an intrinsic fair value of <strong>${dcfCalculations.intrinsicValuePerShare.toFixed(2)}</strong>.
                      </div>
                    </div>
                  </div>
                </div>

                {/* REGIONAL MARKET SELECTOR */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none font-mono text-[9px] select-none">
                  {["US", "India", "Japan", "United Kingdom", "European Union", "Global"].map(reg => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setSelectedRegion(reg)}
                      className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                        selectedRegion === reg
                          ? "bg-[#6366f1] text-white border-[#6366f1] font-bold"
                          : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white"
                      }`}
                    >
                      {reg.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* SORTABLE STOCK SCREENER BOARD */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-white/[0.04] pb-2.5">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-display">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Screener Monitor Board
                    </h3>
                    <div className="flex bg-white/[0.03] border border-white/[0.08] p-0.5 rounded-lg select-none">
                      <button
                        onClick={() => setStockFilter("all")}
                        className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${stockFilter === "all" ? "bg-indigo-600 text-white shadow-lg" : "text-neutral-400 hover:text-white"}`}
                      >
                        ALL
                      </button>
                      <button
                        onClick={() => setStockFilter("watchlist")}
                        className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${stockFilter === "watchlist" ? "bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/30" : "text-neutral-400 hover:text-white"}`}
                      >
                        WATCHLIST
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-500 select-none">
                          <th className="pb-2 cursor-pointer hover:text-white" onClick={() => handleSort("ticker")}>
                            TICKER {sortField === "ticker" ? (sortAsc ? "▲" : "▼") : ""}
                          </th>
                          <th className="pb-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort("peRatio")}>
                            P/E {sortField === "peRatio" ? (sortAsc ? "▲" : "▼") : ""}
                          </th>
                          <th className="pb-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort("evEbitda")}>
                            EV/EBIT {sortField === "evEbitda" ? (sortAsc ? "▲" : "▼") : ""}
                          </th>
                          <th className="pb-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort("roe")}>
                            ROE {sortField === "roe" ? (sortAsc ? "▲" : "▼") : ""}
                          </th>
                          <th className="pb-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort("price")}>
                            PRICE {sortField === "price" ? (sortAsc ? "▲" : "▼") : ""}
                          </th>
                          <th className="pb-2 text-right">★</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedFilteredStocks.map((stock) => {
                          const isStarred = watchlist.includes(stock.ticker);
                          return (
                            <tr
                              key={stock.ticker}
                              onClick={() => setActiveStock(stock.ticker as StockTicker)}
                              className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-none ${activeStock === stock.ticker ? "bg-white/[0.02]" : ""}`}
                            >
                              <td className="py-2.5 font-bold text-[#a78bfa]">{stock.ticker}</td>
                              <td className="py-2.5 text-right text-slate-300">{stock.peRatio}x</td>
                              <td className="py-2.5 text-right text-[#ffdd57]">{stock.evEbitda}x</td>
                              <td className="py-2.5 text-right text-[#34d399]">{stock.roe}%</td>
                              <td className="py-2.5 text-right text-white font-bold">${stock.price.toFixed(2)}</td>
                              <td className="py-2.5 text-right" onClick={(e) => { e.stopPropagation(); toggleWatchlist(stock.ticker); }}>
                                <button type="button" className="cursor-none focus:outline-none">
                                  <Star className={`w-3.5 h-3.5 ${isStarred ? "text-[#fbbf24] fill-[#fbbf24]" : "text-slate-600 hover:text-slate-400"}`} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MACRO CALENDAR */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3 font-display">Macro Calendar</h4>
                  <div className="space-y-2">
                    {[
                      { event: "CPI Inflation", time: "Tomorrow", imp: "High" },
                      { event: "FOMC Meeting", time: "June 17", imp: "Critical" },
                      { event: "NVDA Earnings", time: "July 24", imp: "High" }
                    ].map((cal, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <div className="truncate pr-1 font-mono">
                          <div className="text-white font-medium truncate">{cal.event}</div>
                          <div className="text-neutral-500 text-[8px]">{cal.time}</div>
                        </div>
                        <span className={`text-[8px] px-1 py-0.2 rounded font-semibold tracking-wider font-mono ${cal.imp === "Critical" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"}`}>
                          {cal.imp}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === "workspace" && (
              <motion.div
                key="workspace"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* SWITCHBOARD SELECTOR */}
                <div className="flex bg-white/[0.02] border border-white/[0.08] p-1 rounded-xl w-full select-none justify-between shrink-0">
                  {[
                    { id: "ai", label: "AI Chat", icon: MessageSquare },
                    { id: "forex", label: "Forex AI", icon: Globe },
                    { id: "dcf", label: "DCF Model", icon: SlidersHorizontal },
                    { id: "financials", label: "Statements", icon: Layers },
                    { id: "news", label: "News Feed", icon: Activity }
                  ].map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveWorkspaceTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeWorkspaceTab === tab.id ? (hedgeFundMode ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" : "bg-indigo-600 text-white") : "text-neutral-400 hover:text-white"}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* VIEW PORT CONTENT */}
                <div className="min-h-[460px] flex flex-col">
                  
                  {/* TAB 1: AI CO-ANALYST CHAT */}
                  {activeWorkspaceTab === "ai" && (
                    <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden">
                      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-green" />
                          <span className="text-xs font-bold text-white font-display">Research Specialist ID-94</span>
                        </div>
                        <button 
                          onClick={() => setAiVoiceActive(!aiVoiceActive)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider font-mono border transition-all ${aiVoiceActive ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" : "bg-neutral-900 border-neutral-800 text-neutral-400"}`}
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${aiVoiceActive ? "animate-bounce" : ""}`} />
                          {aiVoiceActive ? "VOICE ON" : "VOICE OFF"}
                        </button>
                      </div>

                      {/* Chat Messages Log */}
                      <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-1 text-[12px] scrollbar-none mb-3">
                        {chatMessages.map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={`flex flex-col max-w-[85%] ${msg.sender === "User" ? "ml-auto items-end" : "mr-auto items-start"}`}
                          >
                            <span className="text-[9px] text-neutral-500 font-mono mb-1">{msg.sender} · {msg.timestamp}</span>
                            <div className={`p-3 rounded-2xl leading-relaxed ${msg.sender === "User" ? (hedgeFundMode ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40" : "bg-indigo-600 text-white rounded-tr-none") : "bg-white/[0.04] border border-white/[0.06] text-neutral-200 rounded-tl-none"}`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Prompt Suggestions */}
                      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1.5 shrink-0 scrollbar-none">
                        {[
                          { text: "Build DCF Thesis", cmd: "Build DCF model thesis for " + activeStock },
                          { text: "Summarize Moats", cmd: "Summarize economic moats for " + activeStock },
                          { text: "Run Scenario Simulator", cmd: "Run pricing scenario models for " + activeStock }
                        ].map((sug, idx) => (
                          <button
                            key={idx}
                            onClick={() => executeCommand(sug.cmd)}
                            className="px-2.5 py-1 border border-white/[0.06] bg-white/[0.02] rounded-lg text-[9px] font-bold text-neutral-400 hover:text-white shrink-0 font-mono"
                          >
                            {sug.text}
                          </button>
                        ))}
                      </div>

                      {/* Input controls */}
                      <form onSubmit={handleChatSubmit} className="flex gap-2 shrink-0 border-t border-white/[0.05] pt-3">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={`Command portfolio indices... (e.g. AAPL)`}
                          className="flex-1 px-3 py-2 text-[11px] rounded-xl bg-white/[0.03] border border-white/[0.08] focus:outline-none focus:border-indigo-500 text-white font-mono placeholder:text-neutral-600"
                        />
                        <button 
                          type="submit" 
                          className={`p-2 rounded-xl transition-all ${hedgeFundMode ? "bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-400" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  )}

                  {/* TAB: FOREX AI DESK */}
                  {activeWorkspaceTab === "forex" && (
                    <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden">
                      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-xs font-bold text-white font-display">ForexAI Macro Desk</span>
                        </div>
                        <span className="text-[9px] text-neutral-400 font-mono tracking-wider">LIVE DATA</span>
                      </div>

                      {/* Live Ticking Rates Row */}
                      <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] font-mono">
                        <div className="bg-white/[0.03] border border-white/[0.05] p-2 rounded-lg flex justify-between items-center">
                          <span className="text-neutral-400">EUR/USD</span>
                          <span className="text-emerald-400 font-bold">1.0852</span>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.05] p-2 rounded-lg flex justify-between items-center">
                          <span className="text-neutral-400">USD/INR</span>
                          <span className="text-emerald-400 font-bold">83.42</span>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.05] p-2 rounded-lg flex justify-between items-center">
                          <span className="text-neutral-400">GBP/USD</span>
                          <span className="text-emerald-400 font-bold">1.2740</span>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.05] p-2 rounded-lg flex justify-between items-center">
                          <span className="text-neutral-400">USD/JPY</span>
                          <span className="text-red-400 font-bold">156.12</span>
                        </div>
                      </div>

                      {/* Economic Calendar Small Feed */}
                      <div className="bg-indigo-950/20 border border-indigo-500/20 p-2 rounded-lg mb-3 text-[9px] font-mono text-indigo-300">
                        <div className="flex justify-between font-bold border-b border-indigo-500/15 pb-1 mb-1">
                          <span>UPCOMING CALENDAR</span>
                          <span className="text-indigo-400">TODAY</span>
                        </div>
                        <div className="flex justify-between">
                          <span>US Fed Policy Statement</span>
                          <span className="text-white">20:30 BST</span>
                        </div>
                      </div>

                      {/* Chat Messages Log */}
                      <div className="flex-1 overflow-y-auto max-h-[170px] space-y-3 pr-1 text-[12px] scrollbar-none mb-3">
                        {forexMessages.map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={`flex flex-col max-w-[85%] ${msg.sender === "User" ? "ml-auto items-end" : "mr-auto items-start"}`}
                          >
                            <span className="text-[9px] text-neutral-500 font-mono mb-1">{msg.sender} · {msg.timestamp}</span>
                            <div className={`p-3 rounded-2xl leading-relaxed ${msg.sender === "User" ? (hedgeFundMode ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40" : "bg-indigo-600 text-white rounded-tr-none") : "bg-white/[0.04] border border-white/[0.06] text-neutral-200 rounded-tl-none"}`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isTypingForex && (
                          <div className="mr-auto items-start flex flex-col">
                            <span className="text-[9px] text-neutral-500 font-mono mb-1">ForexAI ...</span>
                            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-neutral-400 rounded-tl-none animate-pulse">
                              Typing macro research response...
                            </div>
                          </div>
                        )}
                        <div ref={forexEndRef} />
                      </div>

                      {/* Forex suggestion chips */}
                      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1.5 shrink-0 scrollbar-none">
                        {[
                          { text: "EUR/USD Thesis", q: "Analyze EUR/USD macro trend" },
                          { text: "INR Reserves", q: "Explain impact of RBI policy on USD/INR" },
                          { text: "Fed Impact", q: "How will Fed rate cuts affect global yields" }
                        ].map((sug, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setForexInput(sug.q);
                            }}
                            className="px-2.5 py-1 border border-white/[0.06] bg-white/[0.02] rounded-lg text-[9px] font-bold text-neutral-400 hover:text-white shrink-0 font-mono"
                          >
                            {sug.text}
                          </button>
                        ))}
                      </div>

                      {/* Input controls */}
                      <form onSubmit={handleForexSubmit} className="flex gap-2 shrink-0 border-t border-white/[0.05] pt-3">
                        <input
                          type="text"
                          value={forexInput}
                          onChange={(e) => setForexInput(e.target.value)}
                          placeholder="Ask ForexAI (e.g. Fed policy, EUR/USD)"
                          className="flex-1 px-3 py-2 text-[11px] rounded-xl bg-white/[0.03] border border-white/[0.08] focus:outline-none focus:border-indigo-500 text-white font-mono placeholder:text-neutral-600"
                        />
                        <button 
                          type="submit" 
                          className={`p-2 rounded-xl transition-all ${hedgeFundMode ? "bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-400" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  )}

                  {/* TAB 2: LIVE DCF VALUATION BUILDER */}
                  {activeWorkspaceTab === "dcf" && (
                    <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden">
                      <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-bold text-white font-display">DCF Mathematical Engine</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${dcfCalculations.safetyMarginPct >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                          {dcfCalculations.safetyMarginPct >= 0 ? "UNDERVALUED" : "OVERVALUED"}
                        </span>
                      </div>

                      <div className="overflow-y-auto max-h-[380px] pr-1 scrollbar-none space-y-4 text-left">
                        {/* Interactive Slider Parameters */}
                        <div className="grid grid-cols-2 gap-4 border-b border-white/[0.04] pb-4">
                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex justify-between">
                                <span>Growth Yr 1-5</span>
                                <span className="text-white">{growthRate}%</span>
                              </label>
                              <input 
                                type="range" 
                                min="0" 
                                max="30" 
                                step="0.5" 
                                value={growthRate}
                                onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
                                className="w-full accent-indigo-500 h-1 rounded-lg mt-1" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex justify-between">
                                <span>Growth Yr 6-10</span>
                                <span className="text-white">{growthRate6to10}%</span>
                              </label>
                              <input 
                                type="range" 
                                min="0" 
                                max="20" 
                                step="0.5" 
                                value={growthRate6to10}
                                onChange={(e) => setGrowthRate6to10(parseFloat(e.target.value))}
                                className="w-full accent-indigo-500 h-1 rounded-lg mt-1" 
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex justify-between">
                                <span>Discount Rate</span>
                                <span className="text-white">{discountRate}%</span>
                              </label>
                              <input 
                                type="range" 
                                min="5" 
                                max="18" 
                                step="0.1" 
                                value={discountRate}
                                onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                                className="w-full accent-indigo-500 h-1 rounded-lg mt-1" 
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex justify-between">
                                <span>Terminal Rate</span>
                                <span className="text-white">{terminalGrowthRate}%</span>
                              </label>
                              <input 
                                type="range" 
                                min="0" 
                                max="5" 
                                step="0.1" 
                                value={terminalGrowthRate}
                                onChange={(e) => setTerminalGrowthRate(parseFloat(e.target.value))}
                                className="w-full accent-indigo-500 h-1 rounded-lg mt-1" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Recalculated Valuation Output Screen */}
                        <div className="bg-black/40 border border-white/[0.04] p-3 rounded-xl space-y-2 font-mono text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Base Cash Flow:</span>
                            <span className="text-white font-bold">${currentProfile.statements.freeCashFlow[3]}M</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">PV of Cash Flows (10 yr):</span>
                            <span className="text-white font-bold">${Math.round(dcfCalculations.sumPvFcfs)}M</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">PV of Terminal Value:</span>
                            <span className="text-white font-bold">${Math.round(dcfCalculations.discountedTerminalValue)}M</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Calculated Equity Value:</span>
                            <span className="text-white font-bold">${Math.round(dcfCalculations.equityValue)}M</span>
                          </div>
                          <div className="flex justify-between border-t border-white/[0.05] pt-2 mt-2 text-[12px]">
                            <span className="text-neutral-400 font-bold">Intrinsic Value / Share:</span>
                            <span className="text-emerald-400 font-black">${dcfCalculations.intrinsicValuePerShare.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[12px]">
                            <span className="text-neutral-400 font-bold">Current Market Price:</span>
                            <span className="text-white font-black">${currentProfile.price.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Intrinsic Recommendation Card */}
                        <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest font-mono">Consensus Recommendation</p>
                            <h4 className="text-[12px] font-bold text-white tracking-tight mt-0.5 font-display">{dcfCalculations.recommendation}</h4>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest font-mono">Margin of Safety</p>
                            <span className={`text-[13px] font-black font-mono ${dcfCalculations.safetyMarginPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {dcfCalculations.safetyMarginPct >= 0 ? "+" : ""}{dcfCalculations.safetyMarginPct.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Save Valuation Model Control */}
                        <div className="pt-2 border-t border-white/5 space-y-2">
                          <div className="flex flex-col space-y-1">
                            <label className="text-neutral-500 uppercase text-[9px] font-bold">Save Model Name</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={saveModelName}
                                onChange={e => setSaveModelName(e.target.value)}
                                placeholder={`${activeStock} Mobile Value Model...`}
                                className="flex-1 bg-slate-950 border border-white/10 px-2 py-1.5 rounded text-[10px] text-white outline-none focus:border-indigo-500 font-mono cursor-none"
                              />
                              <button 
                                onClick={() => {
                                  saveDcfModel(saveModelName);
                                  setSaveModelName("");
                                }}
                                disabled={savingModel || !user}
                                className="bg-[#34d399] hover:bg-[#34d399]/80 text-[#020010] font-bold px-3 py-1.5 rounded text-[10px] transition-all uppercase tracking-wider font-mono cursor-none disabled:opacity-50"
                              >
                                {savingModel ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Saved Models Ledger Table */}
                        <div className="border-t border-white/5 pt-3">
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mb-2">
                            [SAVED_MODELS_LEDGER]
                          </span>
                          {savedMemos.length === 0 ? (
                            <div className="text-[9px] text-slate-500 font-mono uppercase">
                              No saved models found. Set parameters & click "Save".
                            </div>
                          ) : (
                            <div className="overflow-x-auto max-h-[120px] scrollbar-none">
                              <table className="w-full text-left font-mono text-[9px] border-collapse">
                                <thead>
                                  <tr className="border-b border-white/10 text-slate-500">
                                    <th className="pb-1.5 font-normal">MODEL NAME</th>
                                    <th className="pb-1.5 font-normal">TICKER</th>
                                    <th className="pb-1.5 font-normal text-right">IMPLIED VAL</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {savedMemos.map((memo, idx) => {
                                    const ticker = memo.inputs?.ticker || "AAPL";
                                    const impliedVal = memo.result?.implied_share_price || 0;
                                    return (
                                      <tr 
                                        key={memo.id || idx} 
                                        onClick={() => loadDcfModel(memo)}
                                        className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors cursor-none"
                                      >
                                        <td className="py-2 text-white font-bold max-w-[120px] truncate">{memo.name}</td>
                                        <td className="py-2 text-[#a78bfa]">{ticker}</td>
                                        <td className="py-2 text-right text-[#34d399] font-bold">${impliedVal.toFixed(2)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* WACC vs Growth Sensitivity Matrix */}
                        <div className="border-t border-white/5 pt-3 space-y-2">
                          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                            [WACC VS CAGR MATRIX - SHARE PRICE]
                          </span>
                          <div className="bg-slate-950/60 p-2.5 rounded border border-white/5">
                            <table className="w-full text-center text-[8.5px] font-mono border-collapse">
                              <thead>
                                <tr className="border-b border-white/10 text-slate-500">
                                  <th className="text-left pb-1">WACC\CAGR</th>
                                  <th>{(growthRate - 1.5).toFixed(1)}%</th>
                                  <th>{growthRate.toFixed(1)}%</th>
                                  <th>{(growthRate + 1.5).toFixed(1)}%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mobileSensitivity.map((rowItem, rIdx) => (
                                  <tr key={rIdx} className="border-b border-white/[0.02] last:border-0">
                                    <td className="text-left font-bold text-slate-400 py-1">{rowItem.waccValue.toFixed(1)}%</td>
                                    {rowItem.row.map((val: number, cIdx: number) => {
                                      const isBase = rowItem.waccValue === discountRate && cIdx === 1;
                                      return (
                                        <td key={cIdx} className={`py-1 ${isBase ? "text-emerald-400 font-bold" : "text-slate-350"}`}>
                                          ${val.toFixed(1)}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Research Notes editor */}
                        <div className="border-t border-white/5 pt-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                              [RESEARCH_NOTES_EDITOR]
                            </span>
                            <button 
                              onClick={() => handleSaveNotes(activeStock, activeStock === "AAPL" || activeStock === "NVDA" || activeStock === "TSLA" ? aaplNotes : relianceNotes)}
                              className="bg-[#34d399]/20 hover:bg-[#34d399]/40 text-[#34d399] font-mono text-[9px] px-2 py-0.5 rounded cursor-none"
                            >
                              SAVE
                            </button>
                          </div>
                          <textarea 
                            value={(activeStock === "AAPL" || activeStock === "NVDA" || activeStock === "TSLA") ? aaplNotes : relianceNotes}
                            onChange={e => {
                              if (activeStock === "AAPL" || activeStock === "NVDA" || activeStock === "TSLA") {
                                setAaplNotes(e.target.value);
                              } else {
                                setRelianceNotes(e.target.value);
                              }
                            }}
                            placeholder="Write your research notes here..."
                            className="w-full h-[70px] bg-slate-950/60 border border-white/10 px-2 py-1.5 rounded text-[10px] text-white outline-none focus:border-indigo-500 font-mono cursor-none resize-none"
                          />
                        </div>

                        {/* Citations & timestamp */}
                        <div className="text-[8px] text-neutral-500 space-y-0.5 mt-2 border-t border-white/5 pt-2 font-mono">
                          <div>CITATIONS: SEC 10-K, Morningstar Estimates, Wall Street Consensus.</div>
                          <div>TIMESTAMP: June 3, 2026, 19:12:00 UTC (WebSocket Feed Online)</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: INTERACTIVE FINANCIAL STATEMENTS */}
                  {activeWorkspaceTab === "financials" && (
                    <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden">
                      <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-xs font-bold text-white font-display">Historical Statements ($M)</span>
                        </div>
                        <span className="text-[9px] text-neutral-400 font-mono">ANNUAL REPORTS</span>
                      </div>

                      <div className="flex-1 overflow-x-auto">
                        <table className="w-full border-collapse font-mono text-[10px]">
                          <thead>
                            <tr className="border-b border-white/[0.06] text-neutral-500">
                              <th className="py-2 text-left font-bold font-display">Metric Item</th>
                              <th className="py-2 text-right">FY21</th>
                              <th className="py-2 text-right">FY22</th>
                              <th className="py-2 text-right">FY23</th>
                              <th className="py-2 text-right">FY24</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            <tr>
                              <td className="py-2 text-left text-white font-semibold font-display">Total Revenue</td>
                              {currentProfile.statements.revenue.map((val, idx) => (
                                <td key={idx} className="py-2 text-right text-neutral-300 font-bold">${val.toLocaleString()}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="py-2 text-left text-white font-semibold font-display">Net Income</td>
                              {currentProfile.statements.netIncome.map((val, idx) => (
                                <td key={idx} className="py-2 text-right text-neutral-300 font-bold">${val.toLocaleString()}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="py-2 text-left text-white font-semibold font-display">Free Cash Flow</td>
                              {currentProfile.statements.freeCashFlow.map((val, idx) => (
                                <td key={idx} className="py-2 text-right text-emerald-400 font-bold">${val.toLocaleString()}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="py-2 text-left text-white font-semibold font-display">Cash & Equiv.</td>
                              <td className="py-2 text-right text-neutral-500">-</td>
                              <td className="py-2 text-right text-neutral-500">-</td>
                              <td className="py-2 text-right text-neutral-500">-</td>
                              <td className="py-2 text-right text-neutral-300 font-bold">${currentProfile.statements.cash.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-left text-white font-semibold font-display">Total Debt</td>
                              <td className="py-2 text-right text-neutral-500">-</td>
                              <td className="py-2 text-right text-neutral-500">-</td>
                              <td className="py-2 text-right text-neutral-500">-</td>
                              <td className="py-2 text-right text-neutral-300 font-bold">${currentProfile.statements.debt.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Metric attribution chart */}
                      <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between mt-4">
                        <div className="text-[11px] leading-relaxed text-neutral-400">
                          <strong>Capital Allocation:</strong> Debt leverage multiplier is low at <strong>{(currentProfile.statements.debt/currentProfile.statements.cash).toFixed(2)}x</strong> ratio. Cash reservoirs provide structural security.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: REAL-TIME NEWS INTELLIGENCE FEED */}
                  {activeWorkspaceTab === "news" && (
                    <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden">
                      <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          <span className="text-xs font-bold text-white font-display">Raw News Intelligence</span>
                        </div>
                        <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono">REAL-TIME</span>
                      </div>

                      <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1 text-[11px] scrollbar-none">
                        {[
                          { headline: "SEC files prompt rule modifications targeting large-cap algorithm portfolios.", source: "Reuters", time: "11m ago", sentiment: "NEUTRAL" },
                          { headline: `${activeStock} secures major cloud computing agreements in Asia-Pacific expansion zone.`, source: "Bloomberg", time: "32m ago", sentiment: "BULLISH" },
                          { headline: "Treasury bond yields drift lower on institutional flow re-allocation.", source: "Dow Jones", time: "1h ago", sentiment: "BULLISH" },
                          { headline: "Supply-chain bottlenecks forecast in key regional technological manufacturing lines.", source: "FT.com", time: "2h ago", sentiment: "BEARISH" }
                        ].map((news, idx) => (
                          <div key={idx} className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-1.5 hover:border-white/[0.12] transition-colors">
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-500 font-bold">{news.source} · {news.time}</span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded font-mono ${news.sentiment === "BULLISH" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : news.sentiment === "BEARISH" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-neutral-800 text-neutral-400 border border-neutral-700"}`}>
                                {news.sentiment}
                              </span>
                            </div>
                            <h4 className="text-white font-semibold leading-normal font-display">{news.headline}</h4>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            )}

            {activeTab === "committee" && (
              <motion.div
                key="committee"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* RADIAL CONSENSUS GAUGE & OVERVIEW */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden flex items-center gap-6">
                  {/* Glowing custom SVG Gauge */}
                  <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        stroke="rgba(255,255,255,0.03)" 
                        strokeWidth="10" 
                        fill="transparent" 
                      />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        stroke="url(#gauge-grad)" 
                        strokeWidth="10" 
                        fill="transparent" 
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * investmentCommittee.consensusScore) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="50%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#00f0ff" />
                        </linearGradient>
                      </defs>
                    </svg>
                    
                    {/* Consensus Score Text Display */}
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-2xl font-black font-mono tracking-tight text-white">{investmentCommittee.consensusScore}</span>
                      <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest font-mono">Index</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">AI Investment Committee</span>
                    <h3 className="text-base font-bold text-white tracking-tight mt-1.5 font-display">Aggregate Consensus</h3>
                    <p className="text-[11px] text-neutral-400 leading-normal mt-1">
                      Our multi-agent consensus scoring represents the weighted vector of individual analysts analyzing <strong>{activeStock}</strong> fundamental pricing profiles.
                    </p>
                  </div>
                </div>

                {/* THE FOUR SPECIALIZED PERSONAS */}
                <div className="space-y-3">
                  {[
                    { title: "Bull Analyst", score: investmentCommittee.bullScore, text: investmentCommittee.theses.bull, icon: ThumbsUp, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                    { title: "Bear Analyst", score: investmentCommittee.bearScore, text: investmentCommittee.theses.bear, icon: ThumbsDown, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
                    { title: "Quant Analyst", score: investmentCommittee.quantScore, text: investmentCommittee.theses.quant, icon: Cpu, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
                    { title: "Macro Analyst", score: investmentCommittee.macroScore, text: investmentCommittee.theses.macro, icon: Compass, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
                  ].map((analyst, idx) => {
                    const Icon = analyst.icon;
                    return (
                      <div key={idx} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl space-y-2 hover:border-white/[0.1] transition-all">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg ${analyst.bg} ${analyst.color}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-[12px] font-bold text-white font-display">{analyst.title}</span>
                          </div>
                          <span className={`font-mono font-bold text-[12px] px-2 py-0.5 rounded ${analyst.color} ${analyst.bg} border ${analyst.border}`}>
                            {analyst.score}/100
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-neutral-400">
                          {analyst.text}
                        </p>
                      </div>
                    );
                  })}
                </div>

              </motion.div>
            )}

            {activeTab === "portfolio" && (
              <motion.div
                key="portfolio"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* NET WORTH SNAPSHOT */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden text-left font-sans">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-mono">{t.nav}</p>
                      <h2 className="text-2xl font-black text-white mt-1 font-display tracking-tight">
                        ${stressedStats.totalMarketValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </h2>
                      <p className="text-neutral-500 text-[10px] mt-0.5">Active Hedge Fund Allocation Desk</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded font-mono ${stressedStats.netProfitLoss >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                      {stressedStats.netProfitLoss >= 0 ? "+" : ""}{stressedStats.profitLossPct}% P/L
                    </span>
                  </div>

                  {/* Visual Allocation Ring */}
                  {portfolioHoldings.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.04] flex flex-row items-center gap-6">
                      <div className="relative w-20 h-20 shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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
                      <div className="flex-1 font-mono text-[9px] space-y-1">
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

                {/* TRANSACTION BUILDER PANEL */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl text-left space-y-3 font-sans">
                  <h3 className="text-xs font-bold text-white font-display">{t.buy_asset} / {t.sell_asset}</h3>
                  <form onSubmit={executeTrade} className="space-y-3 font-mono text-[11px]">
                    <div className="flex border border-white/10 rounded overflow-hidden text-[9px] font-mono">
                      <button 
                        type="button"
                        onClick={() => setTradeAction("buy")}
                        className="flex-1 py-1.5 cursor-pointer text-center bg-slate-900 border-r border-white/5"
                        style={tradeAction === "buy" ? {backgroundColor: "#34d399", color: "#020010", fontWeight: "bold"} : {color: "#94a3b8"}}
                      >
                        BUY
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTradeAction("sell")}
                        className="flex-1 py-1.5 cursor-pointer text-center bg-slate-900"
                        style={tradeAction === "sell" ? {backgroundColor: "#ff3860", color: "white", fontWeight: "bold"} : {color: "#94a3b8"}}
                      >
                        SELL
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col space-y-1 relative">
                        <label className="text-slate-500 uppercase text-[8px] font-bold">Ticker</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setMobileTradeTickerDropdownOpen(!mobileTradeTickerDropdownOpen)}
                            className="w-full bg-slate-950 border border-white/10 px-2 py-1.5 rounded text-white outline-none focus:border-indigo-500 text-left flex justify-between items-center cursor-pointer font-mono text-[10px]"
                          >
                            <span>{tradeTicker}</span>
                            <span className="text-slate-500 text-[8px]">▼</span>
                          </button>
                          
                          {mobileTradeTickerDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-white/10 rounded overflow-hidden z-50 shadow-2xl backdrop-blur-md max-h-40 overflow-y-auto">
                              {Object.keys(stocks).map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => {
                                    setTradeTicker(t);
                                    setMobileTradeTickerDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-2 py-2 hover:bg-[#a78bfa]/20 hover:text-white text-slate-200 transition-colors font-mono text-[9px] block cursor-pointer"
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label className="text-slate-500 uppercase text-[8px] font-bold">Shares</label>
                        <input 
                          type="number" 
                          min="1" 
                          value={tradeShares}
                          onChange={e => setTradeShares(Number(e.target.value))}
                          className="bg-slate-950 border border-white/10 px-2 py-1.5 rounded text-white outline-none focus:border-indigo-500 cursor-text"
                        />
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label className="text-slate-500 uppercase text-[8px] font-bold">Price</label>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0.01"
                          value={tradePrice}
                          onChange={e => setTradePrice(Number(e.target.value))}
                          className="bg-slate-950 border border-white/10 px-2 py-1.5 rounded text-white outline-none focus:border-indigo-500 cursor-text"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loadingPortfolio}
                      className={`w-full font-bold py-2 rounded text-[11px] transition-all uppercase tracking-wider font-mono flex items-center justify-center space-x-1.5 cursor-pointer ${
                        tradeAction === "buy" ? "bg-[#34d399] text-[#020010] hover:bg-[#34d399]/85" : "bg-[#ff3860] text-white hover:bg-[#ff3860]/85"
                      }`}
                    >
                      {loadingPortfolio ? "Transmitting..." : "Execute Trade"}
                    </button>
                  </form>
                </div>

                {/* MACRO STRESS TESTING */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl text-left space-y-3 font-sans">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white font-display flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                      {t.stress_test}
                    </h3>
                    {activeStress !== "none" && (
                      <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono font-bold">STRESSED</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                    {[
                      { id: "none", label: "None / Baseline" },
                      { id: "inflation", label: "Inflation Spike (+3%)" },
                      { id: "tech_selloff", label: "Tech Selloff (-15%)" },
                      { id: "rate_hike", label: "Rate Hike (+100bps)" },
                      { id: "supply_chain", label: "Supply Chain Crisis" }
                    ].map(scenario => (
                      <button
                        key={scenario.id}
                        type="button"
                        onClick={() => setActiveStress(scenario.id as any)}
                        className={`py-1.5 px-2 rounded border text-left transition-colors cursor-pointer ${
                          activeStress === scenario.id 
                            ? "bg-red-950/40 text-red-400 border-red-800/40 font-bold" 
                            : "bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:text-white"
                        }`}
                      >
                        {scenario.label}
                      </button>
                    ))}
                  </div>

                  {activeStress !== "none" && (
                    <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-[10px] text-red-300 font-sans leading-relaxed">
                        {activeStress === "inflation" && "WARNING: High WACC discount factor may devalue pre-revenue growth equities. Asset reallocation recommended."}
                        {activeStress === "tech_selloff" && "WARNING: Heavy tech exposure causing drawdown spikes. Consider hedging with bonds/commodities."}
                        {activeStress === "rate_hike" && "WARNING: Cost of debt increases. High debt/equity names underperform. Consider deleveraging."}
                        {activeStress === "supply_chain" && "WARNING: Supply chain bottlenecks hit hardware margins. Inflation hedges (Gold/Commodities) outperform."}
                      </div>
                    </div>
                  )}
                </div>

                {/* HOLDINGS DETAIL GRID */}
                {portfolioHoldings.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 backdrop-blur-xl text-left space-y-2 font-sans">
                    <h3 className="text-xs font-bold text-white font-display">Holdings Detail Ledger</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[9px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-500">
                            <th className="pb-1.5">ASSET</th>
                            <th className="pb-1.5 text-right">SHARES</th>
                            <th className="pb-1.5 text-right">AVG BUY</th>
                            <th className="pb-1.5 text-right">VAL</th>
                            <th className="pb-1.5 text-right">P/L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolioHoldings.map((holding, idx) => {
                            const stock = stocks[holding.ticker];
                            const currentPrice = stock ? stock.price : holding.average_buy_price;
                            const mktVal = holding.shares * currentPrice;
                            const cost = holding.shares * holding.average_buy_price;
                            const pl = mktVal - cost;
                            const isUp = pl >= 0;
                            return (
                              <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                                <td className="py-2 font-bold text-[#a78bfa]">{holding.ticker}</td>
                                <td className="py-2 text-right text-slate-200">{holding.shares}</td>
                                <td className="py-2 text-right text-slate-400">${holding.average_buy_price.toFixed(1)}</td>
                                <td className="py-2 text-right text-white font-bold">${Math.round(mktVal)}</td>
                                <td className={`py-2 text-right font-bold ${isUp ? "text-[#34d399]" : "text-[#ff3860]"}`}>
                                  {isUp ? "+" : ""}{Math.round(pl)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* RISK ATTRIBUTION PORTFOLIO METRICS */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl text-left font-sans">
                  <h3 className="text-xs font-bold text-white mb-3 font-display">Risk Analytics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 border border-white/[0.04] p-3 rounded-xl font-mono space-y-1">
                      <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">{t.portfolio_beta}</div>
                      <div className="text-base font-black text-white">{stressedStats.portfolioBeta}</div>
                      <p className="text-[8px] text-neutral-500 mt-1 leading-normal">Systemic volatility correlation metric.</p>
                    </div>

                    <div className="bg-black/40 border border-white/[0.04] p-3 rounded-xl font-mono space-y-1">
                      <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">{t.sharpe_ratio}</div>
                      <div className="text-base font-black text-emerald-400">{stressedStats.portfolioSharpe}</div>
                      <p className="text-[8px] text-neutral-500 mt-1 leading-normal">Risk-adjusted returns return matrix.</p>
                    </div>

                    <div className="bg-black/40 border border-white/[0.04] p-3 rounded-xl font-mono space-y-1">
                      <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">{t.max_drawdown}</div>
                      <div className="text-base font-black text-red-400">{stressedStats.portfolioDrawdown}%</div>
                      <p className="text-[8px] text-neutral-500 mt-1 leading-normal">Peak-to-trough historical correction limit.</p>
                    </div>

                    <div className="bg-black/40 border border-white/[0.04] p-3 rounded-xl font-mono space-y-1">
                      <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">{t.portfolio_alpha}</div>
                      <div className="text-base font-black text-indigo-400">+{stressedStats.portfolioAlpha}%</div>
                      <p className="text-[8px] text-neutral-500 mt-1 leading-normal">Excess risk-adjusted performance.</p>
                    </div>
                  </div>
                </div>

                {/* ADVANCED GOAL TRACKING */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl space-y-3 text-left font-sans">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white font-display">Target Acquisition Limit</span>
                    <span className="text-neutral-400 font-mono font-bold">85% Complete</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full" style={{ width: "85%" }} />
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-normal leading-relaxed">
                    Goal bounds align with $3M capital acquisitions. Portfolio yields compound daily vectors with minimal drawdown margins.
                  </p>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* FLOATING COMMAND PALETTE / COMMAND CENTER HUD OVERLAY */}
        <AnimatePresence>
          {commandPaletteOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md z-45 flex items-center justify-center p-6 select-none"
              onClick={() => setCommandPaletteOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                className="w-full max-w-[340px] bg-neutral-950/90 border border-white/[0.1] rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),_inset_0_0_20px_rgba(255,255,255,0.02)] relative z-50 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Command className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    <span>Command Center Console</span>
                  </div>
                  <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded font-mono">OS.v1</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Type AAPL, NVDA, TSLA, DCF, HF, NEWS..."
                    value={commandQuery}
                    onChange={(e) => setCommandQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        executeCommand(commandQuery);
                      }
                    }}
                    className="w-full px-3 py-2 text-[11px] bg-white/[0.03] border border-white/[0.08] focus:outline-none focus:border-indigo-500 rounded-xl text-white font-mono placeholder:text-neutral-600"
                  />
                </div>

                {/* Suggestions items */}
                <div className="space-y-1 text-[10px] font-mono">
                  <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest px-1 py-1">Quick Shortcut Commands</p>
                  {[
                    { code: "AAPL / NVDA / TSLA", desc: "Select and focus active stock model" },
                    { code: "DCF", desc: "Open the live Discounted Cash Flow valuation builder" },
                    { code: "COMMITTEE", desc: "View the AI Consensus Investment Committee" },
                    { code: "NEWS", desc: "Inspect raw institutional news signals" },
                    { code: "HF", desc: "Toggle raw Monospace Monospaced Hedge Fund Mode" }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeCommand(item.code.split(" ")[0])}
                      className="w-full text-left p-2 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/[0.04] transition-all flex items-center justify-between text-neutral-400 hover:text-white"
                    >
                      <span className="font-bold text-indigo-400">{item.code}</span>
                      <span className="text-[9px] text-neutral-500">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM FLOATING FLOATED GLASS DOCK NAVIGATION BAR */}
        <nav className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[85%] h-14 bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl rounded-2xl flex items-center justify-around px-4 shadow-[0_15px_30px_rgba(0,0,0,0.6),_inset_0_0_10px_rgba(255,255,255,0.02)] z-30 select-none">
          {[
            { id: "home", label: "Home", icon: Compass },
            { id: "workspace", label: "Workspace", icon: Briefcase },
            { id: "command", label: "Command", icon: Command, isCommand: true },
            { id: "committee", label: "Committee", icon: Award },
            { id: "portfolio", label: "Portfolio", icon: PieChart }
          ].map((tab, idx) => {
            // Wait, what's a safe replacement for ShieldAlert? AlertCircle or Cpu or Settings is very good. Let's use Sparkles/Award/Cpu
            const Icon = tab.id === "committee" ? Award : tab.icon;
            
            if (tab.isCommand) {
              return (
                <button
                  key={idx}
                  onClick={() => setCommandPaletteOpen(true)}
                  className={`p-2 rounded-xl transition-all ${hedgeFundMode ? "bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-400" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"} scale-110`}
                  title="Open Command Center"
                >
                  <Command className="w-4 h-4 animate-pulse" />
                </button>
              );
            }

            const active = activeTab === tab.id;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(tab.id as any)}
                className={`p-2 rounded-xl transition-all relative flex flex-col items-center gap-0.5 ${active ? (hedgeFundMode ? "text-emerald-400" : "text-white") : "text-neutral-500 hover:text-neutral-300"}`}
                title={tab.label}
              >
                <Icon className="w-4.5 h-4.5" />
                {active && (
                  <motion.span 
                    layoutId="dock-bubble"
                    className={`absolute bottom-0 w-1.5 h-1.5 rounded-full ${hedgeFundMode ? "bg-emerald-400" : "bg-indigo-500"}`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Dynamic Monospace overlay for Monospace Hedge Fund Mode */}
        {hedgeFundMode && (
          <div className="absolute top-12 left-0 right-0 h-1 border-b border-emerald-900 bg-black/40 text-[7px] text-emerald-500/60 font-mono px-6 py-0.5 flex justify-between z-20 pointer-events-none select-none">
            <span>TERMINAL STATUS: DEEP_FLOW_SYNC</span>
            <span>FREQ: 120HZ_PRO</span>
            <span>INDEX: SECURE</span>
          </div>
        )}

      </div>

      {/* SIDEBAR SYSTEM INFO (DESKTOP MODES ONLY) */}
      {isSimulator && (
        <div className="hidden lg:flex flex-col ml-8 w-[240px] space-y-4 self-center font-mono text-[11px] text-neutral-500 z-10 select-none">
          <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-md space-y-3">
            <h5 className="font-bold text-white tracking-wider uppercase font-display text-[9px] border-b border-white/[0.04] pb-1.5">Interactive Controls</h5>
            
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>Viewport Shell:</span>
                <span className="text-indigo-400">Activated</span>
              </div>
              <div className="flex justify-between">
                <span>Hedge Fund UI:</span>
                <span className={hedgeFundMode ? "text-emerald-400" : "text-neutral-400"}>{hedgeFundMode ? "Enabled" : "Disabled"}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Ticker:</span>
                <span className="text-white font-bold">{activeStock}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.04] space-y-1 text-[9px] leading-relaxed">
              <p>
                💡 <strong>Hotkey shortcuts:</strong> Press <kbd className="bg-neutral-800 text-neutral-300 px-1 py-0.5 rounded text-[8px] font-semibold border border-neutral-700">Ctrl + K</kbd> to prompt the command deck directly.
              </p>
              {hedgeFundMode && (
                <p>
                  ⌨️ <strong>Hedge Fund Hotkeys:</strong> Press <kbd className="bg-neutral-800 text-neutral-300 px-1 py-0.5 rounded">1</kbd>–<kbd className="bg-neutral-800 text-neutral-300 px-1 py-0.5 rounded">4</kbd> to toggle view routes. Press <kbd className="bg-neutral-800 text-neutral-300 px-1 py-0.5 rounded">H</kbd> to exit.
                </p>
              )}
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-md">
            <h5 className="font-bold text-white tracking-wider uppercase font-display text-[9px] border-b border-white/[0.04] pb-1.5 mb-2">Platform Matrix</h5>
            <p className="text-[10px] leading-normal leading-relaxed">
              This client operates as an adaptive next-generation financial research environment. Built with Next.js, Framer Motion, and Tailwind CSS.
            </p>
          </div>
        </div>
      )}

      {/* Onboarding Tour Guide Overlay */}
      <AnimatePresence>
        {tourActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-24 left-6 right-6 bg-[#0b0f19]/95 border border-[#a78bfa]/25 p-5 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-40 text-left backdrop-blur-md font-mono text-[11px]"
          >
            <div className="space-y-3.5">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[9px] text-[#a78bfa] font-bold tracking-widest flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#a78bfa] animate-pulse" />
                  <span>MOBILE_LITE_TOUR ({tourStep}/4)</span>
                </span>
                <button 
                  onClick={() => {
                    setTourActive(false);
                    setCommandPaletteOpen(false);
                  }} 
                  className="text-slate-500 hover:text-white text-[9px] cursor-none border-none bg-transparent"
                >
                  [SKIP]
                </button>
              </div>

              <div className="space-y-1.5">
                {tourStep === 1 && (
                  <div className="space-y-1">
                    <h4 className="text-white text-xs font-bold font-mono">1. HOME MONITOR DESK</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      This summary screen tracks real-time indices, Indian stock quotes, and your active watchlist. Tap on tickers to load their individual profiles.
                    </p>
                  </div>
                )}

                {tourStep === 2 && (
                  <div className="space-y-1">
                    <h4 className="text-white text-xs font-bold font-mono">2. DCF & AI WORKSPACE</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Tap the Workspace icon below to access your live DCF model recalculator, financials data sheets, and real-time AI analyst chat.
                    </p>
                  </div>
                )}

                {tourStep === 3 && (
                  <div className="space-y-1">
                    <h4 className="text-white text-xs font-bold font-mono">3. CONSENSUS COMMITTEE</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Navigate to the Committee tab to check consensus metrics, buy/hold recommendations, beats/misses bulletins, and analyst notes.
                    </p>
                  </div>
                )}

                {tourStep === 4 && (
                  <div className="space-y-1">
                    <h4 className="text-white text-xs font-bold font-mono">4. MOBILE COMMAND CONSOLE</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Tap the central Command tab or press <strong>Cmd+K / Ctrl+K</strong> to open the Command Palette. Instantly switch tickers, search formulas, or jump views.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5 font-mono text-[9px]">
                <button
                  disabled={tourStep === 1}
                  onClick={() => {
                    const nextStep = tourStep - 1;
                    setTourStep(nextStep);
                    if (nextStep === 1) setActiveTab("home");
                    if (nextStep === 2) {
                      setActiveTab("workspace");
                      setActiveWorkspaceTab("dcf");
                    }
                    if (nextStep === 3) {
                      setActiveTab("committee");
                      setCommandPaletteOpen(false);
                    }
                  }}
                  className="text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500 cursor-none bg-transparent border-none"
                >
                  &lt; PREV
                </button>
                {tourStep < 4 ? (
                  <button
                    onClick={() => {
                      const nextStep = tourStep + 1;
                      setTourStep(nextStep);
                      if (nextStep === 1) setActiveTab("home");
                      if (nextStep === 2) {
                        setActiveTab("workspace");
                        setActiveWorkspaceTab("dcf");
                      }
                      if (nextStep === 3) setActiveTab("committee");
                      if (nextStep === 4) setCommandPaletteOpen(true);
                    }}
                    className="text-[#a78bfa] hover:text-white font-bold cursor-none bg-transparent border-none"
                  >
                    NEXT &gt;
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setTourActive(false);
                      setCommandPaletteOpen(false);
                      localStorage.setItem("aos_mobile_tour_completed", "true");
                    }}
                    className="text-[#34d399] hover:text-white font-bold cursor-none bg-transparent border-none"
                  >
                    [COMPLETE]
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Tour Invite Card */}
      <AnimatePresence>
        {showTourInvite && !tourActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-24 left-6 right-6 bg-[#0b0f19]/95 border border-[#34d399]/25 p-5 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-40 text-left backdrop-blur-md font-mono text-[11px]"
          >
            <div className="space-y-3.5">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[9px] text-[#34d399] font-bold tracking-widest flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#34d399] animate-pulse" />
                  <span>MOBILE_LITE_INTRO</span>
                </span>
                <button 
                  onClick={() => {
                    setShowTourInvite(false);
                    localStorage.setItem("aos_mobile_tour_completed", "true");
                  }} 
                  className="text-slate-500 hover:text-white text-[9px] cursor-none border-none bg-transparent"
                >
                  [DISMISS]
                </button>
              </div>
              <p className="text-slate-400 font-sans text-xs leading-relaxed">
                Welcome to the <strong>Mobile Lite Cockpit</strong>. Would you like a quick 4-step tour to guide you through the mobile workspace tabs and command shortcut tools?
              </p>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowTourInvite(false);
                    setTourActive(true);
                    setTourStep(1);
                    setActiveTab("home");
                  }}
                  className="flex-1 bg-[#34d399] hover:bg-[#34d399]/85 text-[#020010] font-bold py-2 rounded text-center cursor-none border-none transition-all"
                >
                  START TOUR
                </button>
                <button
                  onClick={() => {
                    setShowTourInvite(false);
                    localStorage.setItem("aos_mobile_tour_completed", "true");
                  }}
                  className="px-4 py-2 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded cursor-none bg-transparent transition-all"
                >
                  SKIP
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
