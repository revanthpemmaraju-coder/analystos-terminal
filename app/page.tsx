/* eslint-disable */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Terminal, Shield, ArrowRight, Lock, Unlock, Copy, Check, 
  ExternalLink, Search, BarChart3, LineChart, Cpu, BookOpen, 
  DollarSign, FileText, ChevronRight, RefreshCw, Send, CheckSquare
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TickerBar from "@/components/ticker-bar";

export default function LandingPage() {
  // Navigation countdown
  const [countdown, setCountdown] = useState("");
  const LAUNCH_DATE = new Date("2026-06-14T09:00:00+05:30");

  useEffect(() => {
    const updateCountdown = () => {
      const diff = LAUNCH_DATE.getTime() - new Date().getTime();
      if (diff <= 0) {
        setCountdown("LIVE ACCESS ACTIVE 🟢");
      } else {
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdown(`${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Four visual previews states
  const [activePreview, setActivePreview] = useState<"dashboard" | "terminal" | "market" | "dcf">("dashboard");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "SYS_NODE_INIT: SECURE CONNECTION GRANTED [V2.0.4]",
    "AUTHENTICATING SECURE TOKENS...",
    "MARKET_DATA_CONNECT: BSE_NSE_STREAM_ONLINE",
    "ENTER 'HELP' FOR ANALYST COMMAND DIRECTORY."
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [bidAskTicks, setBidAskTicks] = useState<any[]>([
    { ticker: "RELIANCE", bid: 2450.40, ask: 2451.10, vol: 15000 },
    { ticker: "TCS", bid: 3820.15, ask: 3821.50, vol: 8500 },
    { ticker: "HDFCBANK", bid: 1510.60, ask: 1511.00, vol: 24000 },
    { ticker: "INFY", bid: 1420.25, ask: 1421.10, vol: 11200 }
  ]);

  // Recalculating WACC exited sensitivity
  const [dcfWacc, setDcfWacc] = useState(9.0);
  const [dcfGrowth, setDcfGrowth] = useState(4.5);
  const [dcfTerminalVal, setDcfTerminalVal] = useState(15.2);

  // Live updates for bids/asks and terminal
  useEffect(() => {
    const marketInterval = setInterval(() => {
      setBidAskTicks(prev =>
        prev.map(item => {
          const delta = (Math.random() - 0.49) * 2;
          const newBid = item.bid + delta;
          const newAsk = newBid + (Math.random() * 0.8 + 0.2);
          return {
            ...item,
            bid: Number(newBid.toFixed(2)),
            ask: Number(newAsk.toFixed(2)),
            vol: Math.floor(item.vol + (Math.random() - 0.5) * 500)
          };
        })
      );
    }, 2000);

    return () => clearInterval(marketInterval);
  }, []);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim().toUpperCase();
    if (!cmd) return;

    let response = `CMD_ERROR: '${cmd}' is unrecognized. Type HELP for commands.`;
    if (cmd === "HELP") {
      response = "AVAILABLE: HELP | RUN_VALUATION | SYS_PING | LIST_STOCKS";
    } else if (cmd === "SYS_PING") {
      response = "SYS_STATUS: PING 28ms - NSE_NODE ALIVE";
    } else if (cmd === "RUN_VALUATION") {
      response = "DCF_COMPILING: RELIANCE INTRINSIC ESTIMATE ₹2,840 (UP-SIDE +16.2%)";
    } else if (cmd === "LIST_STOCKS") {
      response = "TICKERS: RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, KOTAKBANK";
    }

    setTerminalLogs(prev => [...prev, `> ${cmd}`, response]);
    setTerminalInput("");
  };

  // Lead Magnet Vault states
  const [vaultEmail, setVaultEmail] = useState("");
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultEmail) return;
    setVaultLoading(true);

    try {
      // Log lead to database
      await supabase.from("waitlist").insert([{ email: vaultEmail, segment: "lead_magnet_locker" }]);
    } catch (err) {
      console.warn("Bypassed database write: ", err);
    }

    setTimeout(() => {
      setVaultLoading(false);
      setVaultUnlocked(true);
    }, 1200);
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Info Hub Overlay portal states
  const [infoHubActive, setInfoHubActive] = useState(false);
  const [activeHubTab, setActiveHubTab] = useState<string>("home");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactFirm, setContactFirm] = useState("student");
  const [contactMsg, setContactMsg] = useState("");
  const [contactRef, setContactRef] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);

    try {
      await supabase.from("waitlist").insert([
        { 
          email: contactEmail, 
          segment: `contact_${contactFirm}`, 
          metadata: { name: contactName, message: contactMsg } 
        }
      ]);
    } catch (err) {
      console.warn("Bypassed contact database log: ", err);
    }

    setTimeout(() => {
      setContactLoading(false);
      setContactRef(`REF_${Math.floor(Math.random() * 900000 + 100000)}`);
      setContactName("");
      setContactEmail("");
      setContactMsg("");
    }, 1500);
  };

  const openHub = (tab: string) => {
    setActiveHubTab(tab);
    setInfoHubActive(true);
  };

  const features = [
    { title: "Financial Modeling", desc: "Dynamic pro-forma forecasts, income statements, balance sheets.", icon: Cpu },
    { title: "DCF Analysis", desc: "Interactive Exit Multiple and Perpetuity Growth valuation engines.", icon: DollarSign },
    { title: "Valuation Tools", desc: "Leveraged Buyout (LBO) sheets and comparable comp tables.", icon: BarChart3 },
    { title: "Statement Review", desc: "Automated analysis of core financial statement margins and working capital.", icon: FileText },
    { title: "Market Research", desc: "Live macroeconomic indicator maps and sector indexes.", icon: LineChart },
    { title: "Company Analysis", desc: "Red flag indicators scanning margins, leverage, and promoter pledge.", icon: Shield },
    { title: "Research Notes", desc: "Terminal-styled monospace research journals with citation indices.", icon: Terminal },
    { title: "Investment Frameworks", desc: "Pre-loaded SWOT modules, Porter's 5 Forces, and economic moat guides.", icon: BookOpen },
    { title: "Learning Hub", desc: "Practice valuation simulators and financial concept maps.", icon: CheckSquare },
    { title: "CFA Concepts", desc: "Formulas and study references mapped directly to the CFA Level 1 syllabus.", icon: Shield },
    { title: "Excel Templates", desc: "High-density model layouts and keyboard navigation cheat sheets.", icon: FileText }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-sans selection:bg-[#00f0ff]/30 selection:text-white">
      {/* Ticker marquee */}
      <TickerBar />

      {/* Header */}
      <header className="w-full bg-[#0b0f19]/80 backdrop-blur border-b border-[#00f0ff]/12 px-8 py-4 flex items-center justify-between font-mono z-10 sticky top-0">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-lg font-bold text-white tracking-tight flex items-center space-x-1.5">
            <span>AnalystOS</span>
            <span className="pulse-blue"></span>
          </Link>
          <span className="hidden md:inline-flex bg-[#0b0f19] border border-[#00e676]/20 px-2.5 py-1 text-[#00e676] rounded text-[10px] items-center space-x-1.5">
            <span className="w-1.5 h-1.5 bg-[#00e676] rounded-full animate-ping"></span>
            <span>SYSTEMS ONLINE</span>
          </span>
        </div>

        <div className="flex items-center space-x-6 text-xs">
          <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
            [LOG_IN]
          </Link>
          <Link
            href="/signup"
            className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-4 py-2 rounded transition-colors"
          >
            [SIGN_UP]
          </Link>
        </div>
      </header>

      {/* Main hero */}
      <main className="flex-1 flex flex-col items-center">
        <section className="w-full max-w-6xl px-6 pt-16 pb-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1 flex flex-col space-y-6">
            <div className="inline-flex self-center md:self-start bg-[#0b0f19] border border-[#00f0ff]/20 px-3 py-1.5 rounded-full text-xs font-mono text-[#00f0ff] items-center space-x-2">
              <span className="pulse-blue"></span>
              <span>Bloomberg Alternative for Next-Gen Analysts</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white font-mono leading-none">
              Research. <br className="hidden md:block"/>
              Analyze. <br className="hidden md:block"/>
              <span className="text-[#00f0ff] glow-text">Execute.</span>
            </h1>

            <p className="text-slate-400 text-base md:text-lg max-w-lg leading-relaxed">
              The Institutional Finance Terminal for Hedge Fund & Investment Research. Analyze statements, compute DCFs, and compile theses faster.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-mono">
              <Link 
                href="/signup" 
                className="w-full sm:w-auto text-center bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-6 py-3 rounded transition-colors flex items-center justify-center space-x-2"
              >
                <span>OPEN FREE TERMINAL</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <button 
                onClick={() => openHub("about")}
                className="w-full sm:w-auto text-center border border-slate-700 hover:border-[#00f0ff] text-slate-300 hover:text-white px-6 py-3 rounded transition-colors"
              >
                [FOUNDERS_NOTE.LOG]
              </button>
            </div>

            <div className="text-xs font-mono text-slate-500 flex items-center space-x-2 justify-center md:justify-start">
              <span className="pulse-green"></span>
              <span>PRO_TIER FREE LAUNCH COUNTDOWN:</span>
              <span className="text-[#00e676] font-bold">{countdown}</span>
            </div>
          </div>

          {/* Hero interactive screen preview container */}
          <div className="flex-1 w-full max-w-lg terminal-card rounded-lg p-4 font-mono select-none">
            <div className="flex items-center justify-between border-b border-[#00f0ff]/12 pb-3 mb-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="pulse-blue"></span>
                <span className="text-slate-400 font-bold">ANALYSTOS_TERMINAL_PREVIEW</span>
              </div>
              <span className="text-slate-500 text-[10px]">[SYS_OK]</span>
            </div>

            {/* Sandbox nav tabs */}
            <div className="flex border-b border-slate-900 mb-4 text-[10px] overflow-x-auto gap-1">
              {[
                { id: "dashboard", label: "[01] ALLOCATIONS" },
                { id: "terminal", label: "[02] SYSTEM_LOG" },
                { id: "market", label: "[03] TICK_STREAM" },
                { id: "dcf", label: "[04] DCF_SENSITIVITY" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActivePreview(tab.id as any)}
                  className={`px-3 py-1.5 border-t border-x rounded-t transition-colors ${
                    activePreview === tab.id 
                      ? "border-[#00f0ff]/20 bg-[#05070a] text-[#00f0ff] font-bold" 
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sandbox Display Content */}
            <div className="bg-[#05070a] border border-[#00f0ff]/8 p-4 rounded min-h-[220px] text-xs flex flex-col justify-between">
              
              {/* Preview 1: Professional Dashboard */}
              {activePreview === "dashboard" && (
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>PORTFOLIO: IND_GROWTH_FUND</span>
                    <span className="text-[#00e676]">CAGR: +24.8%</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-950 p-2.5 rounded bg-[#0b0f19]">
                      <div className="text-[10px] text-slate-500">NET ASSET VALUE</div>
                      <div className="text-lg font-bold text-white">₹84,50,420</div>
                      <div className="text-[10px] text-[#00e676]">+14.2% YoY</div>
                    </div>
                    <div className="border border-slate-950 p-2.5 rounded bg-[#0b0f19]">
                      <div className="text-[10px] text-slate-500">SECTOR MAX ALLOC</div>
                      <div className="text-lg font-bold text-white">TECHNOLOGY</div>
                      <div className="text-[10px] text-[#00f0ff]">32.4% WEIGHT</div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>EQUITY ALLOCATION WEIGHTS</span>
                      <span>RELIANCE (28%) | TCS (22%) | HDFCBANK (18%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex">
                      <div className="h-full bg-[#00f0ff]" style={{ width: "28%" }}></div>
                      <div className="h-full bg-[#00e676]" style={{ width: "22%" }}></div>
                      <div className="h-full bg-slate-400" style={{ width: "18%" }}></div>
                      <div className="h-full bg-slate-700" style={{ width: "32%" }}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview 2: Terminal Console logs */}
              {activePreview === "terminal" && (
                <div className="flex flex-col h-full space-y-3 justify-between">
                  <div className="flex-1 flex flex-col space-y-1 text-slate-400 overflow-y-auto max-h-[160px] scrollbar-thin">
                    {terminalLogs.map((log, i) => (
                      <div key={i} className={log.startsWith(">") ? "text-[#00f0ff]" : ""}>
                        {log}
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleTerminalSubmit} className="flex border border-slate-900 rounded overflow-hidden">
                    <span className="bg-[#0b0f19] px-2 py-1.5 text-slate-500 font-bold">&gt;</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={e => setTerminalInput(e.target.value)}
                      placeholder="Type SYS_PING or RUN_VALUATION..."
                      className="flex-1 bg-transparent px-2 py-1.5 text-white outline-none border-none text-xs"
                    />
                    <button type="submit" className="bg-[#0b0f19] px-3 text-[#00f0ff] hover:bg-[#0b0f19]/80 font-bold border-l border-slate-900">
                      RUN
                    </button>
                  </form>
                </div>
              )}

              {/* Preview 3: Live Market ticks list */}
              {activePreview === "market" && (
                <div className="flex flex-col space-y-3">
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>NSE_STREAM: BIDS_ASKS_VOLUME</span>
                    <span>TICK_DELAY: 0.1s</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] text-slate-500 border-b border-slate-900">
                          <th className="pb-1">TICKER</th>
                          <th className="pb-1 text-right">BID</th>
                          <th className="pb-1 text-right">ASK</th>
                          <th className="pb-1 text-right">VOL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bidAskTicks.map((tick, i) => (
                          <tr key={i} className="border-b border-slate-950/20">
                            <td className="py-1.5 font-bold text-white">{tick.ticker}</td>
                            <td className="py-1.5 text-right text-[#00e676]">{tick.bid.toFixed(2)}</td>
                            <td className="py-1.5 text-right text-[#ff3860]">{tick.ask.toFixed(2)}</td>
                            <td className="py-1.5 text-right text-slate-400">{tick.vol.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Preview 4: Recalculating Exit Sensitivity */}
              {activePreview === "dcf" && (
                <div className="flex flex-col space-y-3">
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>DCF VALUATION ENGINE</span>
                    <span>SENSITIVITY ANALYSIS</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] mb-2">
                    <div className="flex flex-col bg-[#0b0f19] border border-slate-950 p-1.5 rounded">
                      <span className="text-slate-500">WACC (%)</span>
                      <input 
                        type="number" 
                        step="0.5"
                        value={dcfWacc} 
                        onChange={e => setDcfWacc(Number(e.target.value))}
                        className="bg-transparent text-white border-none outline-none font-bold text-xs" 
                      />
                    </div>
                    <div className="flex flex-col bg-[#0b0f19] border border-slate-950 p-1.5 rounded">
                      <span className="text-slate-500">GROWTH (%)</span>
                      <input 
                        type="number" 
                        step="0.5"
                        value={dcfGrowth} 
                        onChange={e => setDcfGrowth(Number(e.target.value))}
                        className="bg-transparent text-white border-none outline-none font-bold text-xs" 
                      />
                    </div>
                    <div className="flex flex-col bg-[#0b0f19] border border-slate-950 p-1.5 rounded">
                      <span className="text-slate-500">EXIT EBITDA (x)</span>
                      <input 
                        type="number" 
                        step="0.5"
                        value={dcfTerminalVal} 
                        onChange={e => setDcfTerminalVal(Number(e.target.value))}
                        className="bg-transparent text-white border-none outline-none font-bold text-xs" 
                      />
                    </div>
                  </div>

                  <div className="border border-[#00f0ff]/10 rounded bg-[#0b0f19] p-2 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase">Implied Share Price:</span>
                    <span className="text-[#00e676] font-bold text-sm">
                      ₹{((dcfTerminalVal * 150) + (dcfGrowth * 25) - (dcfWacc * 40)).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-[9px] text-slate-500 text-center">
                    Recalculating valuation sensitivity indexes dynamically based on custom model variables.
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>

        {/* 11-Features Catalog */}
        <section className="w-full bg-[#0b0f19] py-16 border-y border-[#00f0ff]/12 flex flex-col items-center">
          <div className="w-full max-w-6xl px-6">
            <div className="text-center md:text-left mb-12">
              <span className="terminal-badge">MODULE DIRECTORY</span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mt-3 font-mono">
                FactSet-Grade Feature Catalog
              </h2>
              <p className="text-slate-400 mt-2 text-sm">
                Explore the complete institutional specifications compiled into the AnalystOS engine.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feat, idx) => (
                <div key={idx} className="terminal-card rounded-lg p-5 flex items-start space-x-4">
                  <div className="bg-[#00f0ff]/10 p-2.5 rounded border border-[#00f0ff]/20">
                    <feat.icon className="w-5 h-5 text-[#00f0ff]" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold font-mono text-sm uppercase">{feat.title}</h4>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lead Magnet locked Vault drawer cabinet */}
        <section className="w-full max-w-6xl px-6 py-20" id="resources-vault">
          <div className="terminal-card rounded-xl p-8 border border-[#00e676]/15 bg-[#0b0f19]/80 flex flex-col items-center max-w-3xl mx-auto">
            <span className="terminal-badge-success uppercase">ANALYST TOOLKIT</span>
            <h2 className="text-3xl font-bold font-mono text-white tracking-tight text-center mt-3">
              Unlock Free Valuation Templates
            </h2>
            <p className="text-slate-400 text-xs text-center max-w-md mt-2 leading-relaxed">
              Enter your email below to instantly activate your credentials and unlock 5 professional valuation, Excel shortcuts, and CFA concepts guides for free.
            </p>

            {/* List items with locked statuses */}
            <div className="w-full flex flex-col gap-3 my-8 font-mono text-xs max-w-md">
              {[
                "01. Corporate DCF Valuation Model Template (.xlsx)",
                "02. 30+ Wall Street Excel Keyboard Shortcuts Guide (.pdf)",
                "03. Financial Ratios & Valuation Cheat Sheet (.pdf)",
                "04. Institutional Equity Research Stock Template (.docx)",
                "05. CFA Level 1 Study & Formula Notes (.pdf)"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                  <span className="text-slate-300">{item}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    vaultUnlocked 
                      ? "bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30" 
                      : "bg-[#ff3860]/10 text-[#ff3860] border border-[#ff3860]/30"
                  }`}>
                    {vaultUnlocked ? "UNLOCKED" : "LOCKED"}
                  </span>
                </div>
              ))}
            </div>

            {/* Email form logs to waitlist */}
            {!vaultUnlocked ? (
              <form onSubmit={handleUnlockVault} className="w-full max-w-md flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={vaultEmail}
                  onChange={e => setVaultEmail(e.target.value)}
                  placeholder="Enter your email to unlock toolkit..."
                  className="flex-1 bg-[#05070a] border border-[#00e676]/25 rounded px-4 py-2.5 text-xs text-white outline-none focus:border-[#00e676] focus:ring-1 focus:ring-[#00e676]"
                />
                <button
                  type="submit"
                  disabled={vaultLoading}
                  className="bg-[#00e676] hover:bg-[#00e676]/80 text-[#05070a] font-mono font-bold px-6 py-2.5 rounded text-xs transition-colors flex items-center justify-center space-x-2"
                >
                  {vaultLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>UNLOCK VAULT</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="w-full max-w-xl flex flex-col space-y-4 animate-fadeIn">
                <div className="bg-[#00e676]/10 border border-[#00e676]/20 p-4 rounded text-center text-xs text-[#00e676] font-mono flex items-center justify-center space-x-2">
                  <Unlock className="w-4 h-4" />
                  <span>VAULT UNLOCKED: CREDENTIALS GRANTED INSTANTLY</span>
                </div>

                {/* Unlocked drawer items */}
                {[
                  {
                    id: "dcf-model",
                    title: "01. Corporate DCF Valuation Model Template",
                    text: "[AnalystOS Corporate DCF Model Template v1.2]\nSheet 1: assumptions\nWACC = 9.0% | Exit EBITDA Multiple = 14.0x\nEBITDA Growth Rate = 15.0% (Yr 1-3), 8.0% (Yr 4-5)\nImplied Enterprise Value = ₹18.54 Cr\nDownload: http://localhost:3000/resources/AnalystOS_DCF_Valuation_Model.xlsx"
                  },
                  {
                    id: "shortcuts",
                    title: "02. 30+ Wall Street Excel Shortcuts Guide",
                    text: "[AnalystOS Excel Shortcuts Handbook]\n- Ctrl + [ : Trace precedents\n- F5 + Enter: Return to cell\n- Alt + E + S + V: Paste Special as Values\n- Alt + H + O + I: Autofit column widths"
                  },
                  {
                    id: "cheat-sheet",
                    title: "03. Financial Ratios & Valuation Cheat Sheet",
                    text: "[AnalystOS Formula Cheat Sheet]\n1. EV = Market Cap + Debt - Cash\n2. WACC = (E/V * Ke) + (D/V * Kd * (1 - Tax))\n3. Ke = Rf + Beta * (Rm - Rf) [CAPM]\n4. FCFF = EBIT*(1-T) + D&A - Capex - dNWC"
                  }
                ].map((cabinet, idx) => (
                  <div key={idx} className="bg-[#05070a] border border-[#00f0ff]/10 rounded-lg p-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-3">
                      <span className="text-white font-bold font-mono text-xs uppercase">{cabinet.title}</span>
                      <button
                        onClick={() => copyToClipboard(cabinet.id, cabinet.text)}
                        className="text-slate-400 hover:text-[#00f0ff] font-mono text-[10px] flex items-center space-x-1"
                      >
                        {copiedId === cabinet.id ? <Check className="w-3 h-3 text-[#00e676]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === cabinet.id ? "COPIED" : "COPY SPECS"}</span>
                      </button>
                    </div>
                    <pre className="text-slate-400 font-mono text-[10px] leading-relaxed whitespace-pre bg-[#0b0f19]/60 p-2.5 rounded overflow-x-auto">
                      {cabinet.text}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Fullscreen FactSet-grade menu routing overlay */}
      {infoHubActive && (
        <div className="fixed inset-0 bg-[#05070a]/90 backdrop-blur z-50 flex items-center justify-center font-mono">
          <div className="w-full max-w-4xl h-[85vh] bg-[#0b0f19] border border-[#00f0ff]/20 rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
            {/* Sidebar menu */}
            <div className="w-full md:w-64 border-r border-[#00f0ff]/12 bg-[#05070a] flex flex-col p-6">
              <button 
                onClick={() => setInfoHubActive(false)} 
                className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider mb-8 text-left flex items-center space-x-1"
              >
                <span>✕ RETURN TO DASHBOARD</span>
              </button>
              
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">TERMINAL_INDEX</div>
              <div className="flex flex-col gap-2">
                {[
                  { id: "home", label: "[01] TERMINAL_HOME" },
                  { id: "about", label: "[02] FOUNDERS_NOTE" },
                  { id: "contact", label: "[03] CONNECT_DESK" },
                  { id: "changelog", label: "[04] VER_HISTORY" },
                  { id: "privacy", label: "[05] DATA_SAFEGUARD" },
                  { id: "terms", label: "[06] USER_LICENSE" }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveHubTab(item.id)}
                    className={`text-left px-3 py-2 rounded text-xs transition-colors ${
                      activeHubTab === item.id 
                        ? "bg-[#00f0ff]/10 text-[#00f0ff] font-bold border border-[#00f0ff]/20" 
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content viewports */}
            <div className="flex-1 p-8 overflow-y-auto bg-[#0b0f19]">
              
              {/* Hub Home view */}
              {activeHubTab === "home" && (
                <div className="flex flex-col space-y-4">
                  <span className="terminal-badge">CORE_MODULE.WELCOME</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">AnalystOS Terminal Info Hub</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Welcome to the central command specifications center. Use the left FactSet-grade navigation index to explore features lists, founder logs, open direct engineering support tickets, and review encryption safeguards.
                  </p>
                  <div className="border border-dashed border-[#00f0ff]/20 p-4 rounded bg-[#00f0ff]/3 flex items-start space-x-3 text-xs">
                    <Terminal className="w-5 h-5 text-[#00f0ff] flex-shrink-0" />
                    <div>
                      <h5 className="text-[#00f0ff] font-bold">[SYSTEM_LOG: ACTIVE]</h5>
                      <p className="text-slate-400 mt-1">You are inside the active terminal specification dashboard overlay. Revert back to the homepage anytime by clicking Return.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hub About view */}
              {activeHubTab === "about" && (
                <div className="flex flex-col space-y-4">
                  <span className="terminal-badge">FOUNDERS_NOTE.METADATA</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Our Mission & Revanth Pemmaraju's Story</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    AnalystOS was conceived with a simple yet powerful mission: to democratize institutional-grade financial analysis tools. For too long, young professional analysts, candidates, and students have been priced out of professional Bloomberg, FactSet, or Capital IQ subscriptions (which cost ₹2.5 lakh/year).
                  </p>
                  <blockquote className="border-l-2 border-[#00f0ff] pl-4 py-1 italic text-slate-200 text-xs my-3 bg-[#05070a]/40">
                    "We believe that high-quality equity research, company deep-dives, and financial modeling tools should be accessible to anyone with a willingness to learn. By providing institutional speed and clean data pipelines at a fraction of the cost, we empower the next generation of finance leaders."
                    <br /><span className="text-[10px] text-slate-500 font-bold block mt-2">— Revanth Pemmaraju, Founder</span>
                  </blockquote>
                </div>
              )}

              {/* Hub Contact Ticket view */}
              {activeHubTab === "contact" && (
                <div className="flex flex-col space-y-4">
                  <span className="terminal-badge">CONNECT_DESK.PORTAL</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Technical Support & Sales Desk</h3>
                  <p className="text-slate-400 text-xs">Transmit a query ticket directly to our engineering desk.</p>
                  
                  {!contactRef ? (
                    <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-slate-500">FULL NAME</label>
                          <input 
                            type="text" 
                            required
                            value={contactName}
                            onChange={e => setContactName(e.target.value)}
                            placeholder="Your name" 
                            className="bg-[#05070a] border border-[#00f0ff]/15 rounded p-2 text-white outline-none focus:border-[#00f0ff]" 
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-slate-500">PROFESSIONAL EMAIL</label>
                          <input 
                            type="email" 
                            required
                            value={contactEmail}
                            onChange={e => setContactEmail(e.target.value)}
                            placeholder="you@firm.com" 
                            className="bg-[#05070a] border border-[#00f0ff]/15 rounded p-2 text-white outline-none focus:border-[#00f0ff]" 
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-slate-500">FIRM TYPE / PORTFOLIO</label>
                        <select 
                          value={contactFirm}
                          onChange={e => setContactFirm(e.target.value)}
                          className="bg-[#05070a] border border-[#00f0ff]/15 rounded p-2 text-slate-300 outline-none focus:border-[#00f0ff]"
                        >
                          <option value="student">Student / CFA Candidate</option>
                          <option value="analyst">Buy-side or Sell-side Analyst</option>
                          <option value="hedgefund">Asset Management / Family Office</option>
                          <option value="retail">Retail Investor</option>
                        </select>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-slate-500">INQUIRY DETAIL SUMMARY</label>
                        <textarea 
                          required
                          rows={4}
                          value={contactMsg}
                          onChange={e => setContactMsg(e.target.value)}
                          placeholder="Please provide details of your inquiry..." 
                          className="bg-[#05070a] border border-[#00f0ff]/15 rounded p-2 text-white outline-none focus:border-[#00f0ff]" 
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={contactLoading}
                        className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold py-2.5 rounded transition-colors w-full flex items-center justify-center space-x-2"
                      >
                        {contactLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>TRANSMIT SUPPORT TICKET →</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="bg-[#00e676]/10 border border-[#00e676]/20 p-6 rounded-lg text-center font-mono space-y-3">
                      <Check className="w-8 h-8 text-[#00e676] mx-auto animate-bounce" />
                      <h4 className="text-white font-bold text-sm uppercase">TICKET_TRANSMITTED_SUCCESSFULLY</h4>
                      <p className="text-slate-400 text-xs">
                        Support ticket ref: <span className="text-[#00e676] font-bold">{contactRef}</span> has been logged securely in waitlist logs. Our support team will coordinate via email.
                      </p>
                      <button 
                        onClick={() => setContactRef(null)} 
                        className="text-[#00f0ff] hover:underline text-xs"
                      >
                        [OPEN NEW TICKET]
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* Hub Changelog view */}
              {activeHubTab === "changelog" && (
                <div className="flex flex-col space-y-4">
                  <span className="terminal-badge">VER_HISTORY.STREAM</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Terminal Version History</h3>
                  <div className="space-y-4 text-xs font-mono text-left">
                    <div className="border-l-2 border-[#00e676] pl-4">
                      <strong className="text-white">v1.0.4 (Active Launch)</strong> <span className="text-slate-500 text-[10px]">2026-05-31</span>
                      <p className="text-slate-400 mt-1">Pivoted landing experience to full-stack Next.js 14 App Router, integrating active Supabase PostgreSQL data schemas, Razorpay bindings, Claude API prompts, and Career OS modules.</p>
                    </div>
                    <div className="border-l-2 border-[#00f0ff] pl-4">
                      <strong className="text-white">v1.0.2 (Payments & Auth)</strong> <span className="text-slate-500 text-[10px]">2026-05-30</span>
                      <p className="text-slate-400 mt-1">Integrated client-side Supabase Auth, Google OAuth hooks, and configured Indian INR checkout orders via Razorpay scripts.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hub Privacy Safeguards view */}
              {activeHubTab === "privacy" && (
                <div className="flex flex-col space-y-4 text-xs">
                  <span className="terminal-badge">DATA_SAFEGUARD.COMPLIANCE</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Privacy Policy Safeguards</h3>
                  <div className="space-y-3 text-slate-400 leading-relaxed">
                    <p>At AnalystOS, we prioritize the protection and security of your financial and personal data. We utilize enterprise-grade security structures through **Supabase PostgreSQL** and **Vercel** hosting platforms.</p>
                    <strong className="text-white uppercase block">1. Information We Collect</strong>
                    <p>We collect your email, name, and billing details upon sign-up or download. Payment transactions are processed securely through **Razorpay** checkout systems; no credit card details are stored directly on our servers.</p>
                    <strong className="text-white uppercase block">2. Cookies and Logs</strong>
                    <p>We use localized tokens to store active sessions and monitor terminal diagnostic heartbeats. All logs are securely archived and cleared regularly.</p>
                  </div>
                </div>
              )}

              {/* Hub Terms view */}
              {activeHubTab === "terms" && (
                <div className="flex flex-col space-y-4 text-xs">
                  <span className="terminal-badge">USER_LICENSE.LEGAL_FRAME</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Terms of Service License</h3>
                  <div className="space-y-3 text-slate-400 leading-relaxed">
                    <p>Please read these terms carefully before accessing the AnalystOS terminal workspace. By creating an account, you agree to comply with these terms.</p>
                    <strong className="text-white uppercase block">1. Subscription Billing</strong>
                    <p>AnalystOS is billed on a recurring monthly cycle of **₹499/month** for the PRO plan. You may cancel your subscription at any time directly through the user navigation pill.</p>
                    <strong className="text-white uppercase block">2. Acceptable Use</strong>
                    <p>The terminal features, DCF sandboxes, and financial models are provided for educational and research analysis purposes. We do not offer direct investment advisory or brokerage execution services.</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-[#05070a] border-t border-slate-900 py-12 text-slate-500 text-xs font-mono">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <span className="text-white font-bold text-sm">AnalystOS</span>
            <p className="text-slate-400 text-xs leading-relaxed">
              The financial OS designed for the next generation of investment analysts.
            </p>
            <span className="text-[10px] block">&copy; {new Date().getFullYear()} AnalystOS. All rights reserved.</span>
          </div>

          <div>
            <h5 className="text-white font-bold mb-3">PLATFORM</h5>
            <div className="flex flex-col space-y-2">
              <Link href="/signup" className="hover:text-[#00f0ff]">[OPEN_TERMINAL]</Link>
              <a href="#resources-vault" className="hover:text-[#00f0ff]">[FREE_TEMPLATES]</a>
              <button onClick={() => openHub("contact")} className="text-left hover:text-[#00f0ff]">[SUPPORT_DESK]</button>
            </div>
          </div>

          <div>
            <h5 className="text-white font-bold mb-3">INFO HUB</h5>
            <div className="flex flex-col space-y-2">
              <button onClick={() => openHub("about")} className="text-left hover:text-[#00f0ff]">[FOUNDERS_NOTE]</button>
              <button onClick={() => openHub("changelog")} className="text-left hover:text-[#00f0ff]">[VERSION_RELEASES]</button>
              <button onClick={() => openHub("contact")} className="text-left hover:text-[#00f0ff]">[PARTNERSHIP_DESK]</button>
            </div>
          </div>

          <div>
            <h5 className="text-white font-bold mb-3">LEGAL</h5>
            <div className="flex flex-col space-y-2">
              <button onClick={() => openHub("privacy")} className="text-left hover:text-[#00f0ff]">[PRIVACY_SAFEGUARDS]</button>
              <button onClick={() => openHub("terms")} className="text-left hover:text-[#00f0ff]">[LICENSE_TERMS]</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
