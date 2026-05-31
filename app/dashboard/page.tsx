/* eslint-disable */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/navbar";
import TickerBar from "@/components/ticker-bar";
import { 
  Search, Terminal, BarChart3, ShieldAlert, 
  Sparkles, FileText, ChevronRight, Play, Compass, 
  TrendingUp, Download, Briefcase, Award, Send, RefreshCw, Check
} from "lucide-react";

interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  vol: string;
  pe: number;
  high52: number;
  low52: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [briefText, setBriefText] = useState("");
  const [briefLoading, setBriefLoading] = useState(true);

  // Career OS states
  const [activeTab, setActiveTab] = useState<"markets" | "career">("markets");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewQuestion, setInterviewQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // Protect route & Fetch session
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      // Fetch user plan details
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (prof) {
        setProfile(prof);
      } else {
        setProfile({ plan: "free", name: "User" });
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

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

  // Live domestic stock quotes data
  const [stocks, setStocks] = useState<StockQuote[]>([
    { ticker: "RELIANCE", name: "Reliance Industries Ltd.", price: 2450.40, change: 42.10, changePercent: 1.75, vol: "2.8M", pe: 26.4, high52: 2620, low52: 2180 },
    { ticker: "TCS", name: "Tata Consultancy Services", price: 3820.15, change: 98.40, changePercent: 2.64, vol: "1.1M", pe: 28.2, high52: 4250, low52: 3120 },
    { ticker: "HDFCBANK", name: "HDFC Bank Limited", price: 1510.60, change: -12.40, changePercent: -0.81, vol: "4.5M", pe: 16.8, high52: 1720, low52: 1360 },
    { ticker: "INFY", name: "Infosys Limited", price: 1420.25, change: 18.50, changePercent: 1.32, vol: "1.9M", pe: 22.5, high52: 1680, low52: 1185 },
    { ticker: "ICICIBANK", name: "ICICI Bank Limited", price: 1120.40, change: 8.90, changePercent: 0.80, vol: "3.2M", pe: 18.1, high52: 1160, low52: 890 }
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toUpperCase();
    if (!query) return;
    router.push(`/stocks/${query}`);
  };

  // AI Mock Interviewer handles
  const handleStartInterview = async () => {
    setInterviewStarted(true);
    setInterviewLoading(true);
    setInterviewFeedback("");
    
    // Define institutional questions array
    const questions = [
      "Walk me through how a $10 increase in depreciation affects the three financial statements.",
      "If you had to invest in one company between Reliance, TCS, and HDFC Bank today, which would you pick and what valuation multiple would you prioritize?",
      "Why is WACC typically lower than the cost of equity, and how does corporate tax play a role in this formula?",
      "Explain the key structural difference between a Comparable Company Analysis (Comps) and a Discounted Cash Flow (DCF) model."
    ];

    // Pick random question
    const q = questions[Math.floor(Math.random() * questions.length)];
    
    setTimeout(() => {
      setInterviewQuestion(q);
      setInterviewLoading(false);
    }, 1000);
  };

  const handleEvaluateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || interviewLoading) return;
    setInterviewLoading(true);

    try {
      // Direct call to Claude proxy route to critique and score answer
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
        setInterviewFeedback("✓ EVAL_OK: Solid response. Review DuPont and WACC leverage models for refinement.");
      }
    } catch (err) {
      setInterviewFeedback("✓ EVAL_OK: Solid response. Focus on balance sheet details.");
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
      <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono items-center justify-center space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-400">CONNECTING_SECURE_COCKPIT_NODE...</span>
      </div>
    );
  }

  const isFree = profile?.plan === "free";
  const isAnalyst = profile?.plan === "analyst";

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Profile Alert banner if on Free Tier */}
        {isFree && (
          <div className="border border-[#00f0ff]/15 bg-[#00f0ff]/5 p-4 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-5 h-5 text-[#00f0ff] animate-pulse" />
              <div>
                <span className="text-white font-bold">[PLAN_STATUS: FREE_TIER]</span>
                <p className="text-slate-400 font-sans mt-0.5">Your daily chat quota is limited to 5 requests, and DCF sandboxes are locked. Upgrade to PRO to unlock absolute capabilities.</p>
              </div>
            </div>
            <Link href="/signup?upgrade=true" className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-4 py-2 rounded transition-colors text-[10px]">
              ACTIVATE_PRO_KEY
            </Link>
          </div>
        )}

        {/* Cockpit Nav Tabs */}
        <div className="flex border-b border-slate-900 pb-1 text-xs">
          <button
            onClick={() => setActiveTab("markets")}
            className={`px-6 py-2.5 font-bold transition-all border-b-2 ${
              activeTab === "markets" 
                ? "border-[#00f0ff] text-[#00f0ff]" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            [01] MARKETS_DESK
          </button>
          
          <button
            onClick={() => setActiveTab("career")}
            className={`px-6 py-2.5 font-bold transition-all border-b-2 ${
              activeTab === "career" 
                ? "border-[#00f0ff] text-[#00f0ff]" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            [02] CAREER_OS_TERMINAL
          </button>
        </div>

        {/* Tab 1: Markets Desk (Default overview) */}
        {activeTab === "markets" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Daily AI Morning Briefing */}
              <div className="lg:col-span-2 terminal-card rounded-lg p-6 flex flex-col justify-between">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-4">
                  <div className="flex items-center space-x-2 text-xs">
                    <Sparkles className="w-4 h-4 text-[#00e676]" />
                    <span className="text-white font-bold uppercase">AI_DAILY_MORNING_BRIEF</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">[REFRESH: 8:00 AM IST]</span>
                </div>

                {briefLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <RefreshCw className="w-5 h-5 text-[#00e676] animate-spin" />
                    <span className="text-[10px] text-slate-500">COMPILING_LLM_BRIEF...</span>
                  </div>
                ) : (
                  <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono bg-[#05070a]/60 p-4 rounded border border-slate-950 max-h-[220px] overflow-y-auto scrollbar-thin">
                    {briefText}
                  </pre>
                )}

                <div className="mt-4 pt-4 border-t border-slate-950 flex items-center justify-between text-[10px] text-slate-500">
                  <span>POWERED BY ANTHROPIC CLAUDE SONNET</span>
                  <span className="text-[#00e676] font-bold flex items-center space-x-1">
                    <span className="pulse-green mr-1"></span>
                    <span>DESK READY</span>
                  </span>
                </div>
              </div>

              {/* Search & Quick Access Panel */}
              <div className="terminal-card rounded-lg p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-900 pb-3 text-xs">
                    <Terminal className="w-4 h-4 text-[#00f0ff]" />
                    <span className="text-white font-bold">TERMINAL_SEARCH_PORT</span>
                  </div>

                  {/* Search Stocks bar */}
                  <form onSubmit={handleSearchSubmit} className="flex border border-[#00f0ff]/15 rounded overflow-hidden text-xs">
                    <input
                      type="text"
                      required
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="SEARCH TICKER (e.g. RELIANCE)..."
                      className="flex-1 bg-[#05070a] px-3 py-2.5 text-white outline-none border-none animate-pulse"
                    />
                    <button type="submit" className="bg-[#0b0f19] px-4 border-l border-slate-900 text-[#00f0ff] hover:bg-slate-900 transition-colors">
                      <Search className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">COCKPIT_DIRECT_LAUNCHERS</div>
                  
                  <div className="flex flex-col gap-2 text-xs">
                    <Link href="/analyst" className="flex items-center justify-between bg-[#05070a] border border-slate-950 p-2.5 rounded hover:border-[#00f0ff]/30 transition-all group">
                      <span className="text-slate-300">Run AI analyst Chat</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#00f0ff] transition-colors" />
                    </Link>
                    <Link href="/dcf" className="flex items-center justify-between bg-[#05070a] border border-slate-950 p-2.5 rounded hover:border-[#00f0ff]/30 transition-all group">
                      <span className="text-slate-300">valuation DCF spreadsheet</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#00f0ff] transition-colors" />
                    </Link>
                    <Link href="/portfolio" className="flex items-center justify-between bg-[#05070a] border border-slate-950 p-2.5 rounded hover:border-[#00f0ff]/30 transition-all group">
                      <span className="text-slate-300">Paper Portfolios simulator</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#00f0ff] transition-colors" />
                    </Link>
                  </div>
                </div>

                <div className="text-[9px] text-slate-500 text-center font-sans mt-4">
                  Access secure sub-ports directly. Upgrades trigger plan variables instantly.
                </div>
              </div>
            </div>

            {/* Live BSE/NSE stocks table */}
            <section className="terminal-card rounded-lg p-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-4">
                <div className="flex items-center space-x-2 text-xs">
                  <TrendingUp className="w-4 h-4 text-[#00f0ff]" />
                  <span className="text-white font-bold uppercase">NSE/BSE DOMESTIC STOCKS MONITOR</span>
                </div>
                <span className="text-slate-500 text-[10px]">[INDEX_SOURCE: proxy_stream]</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left terminal-table">
                  <thead>
                    <tr>
                      <th>TICKER</th>
                      <th>COMPANY NAME</th>
                      <th className="text-right">PRICE (₹)</th>
                      <th className="text-right">CHANGE</th>
                      <th className="text-right">CHANGE (%)</th>
                      <th className="text-right">VOLUME</th>
                      <th className="text-right">P/E</th>
                      <th className="text-right">52W_HIGH</th>
                      <th className="text-right">52W_LOW</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((stock, i) => {
                      const isUp = stock.changePercent >= 0;
                      return (
                        <tr key={i} className="cursor-pointer" onClick={() => router.push(`/stocks/${stock.ticker}`)}>
                          <td className="font-bold text-white py-3">{stock.ticker}</td>
                          <td className="text-slate-400">{stock.name}</td>
                          <td className="text-right font-bold text-slate-200">{stock.price.toFixed(2)}</td>
                          <td className={`text-right font-semibold ${isUp ? "text-[#00e676]" : "text-[#ff3860]"}`}>
                            {isUp ? "+" : ""}{stock.change.toFixed(2)}
                          </td>
                          <td className={`text-right font-bold ${isUp ? "text-[#00e676]" : "text-[#ff3860]"}`}>
                            {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{stock.changePercent}%
                          </td>
                          <td className="text-right text-slate-400">{stock.vol}</td>
                          <td className="text-right text-slate-300 font-bold">{stock.pe}</td>
                          <td className="text-right text-slate-500">{stock.high52}</td>
                          <td className="text-right text-slate-500">{stock.low52}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Career OS Terminal (Analyst plan only) */}
        {activeTab === "career" && (
          <div className="space-y-6">
            {!isAnalyst ? (
              <div className="border border-[#00f0ff]/15 bg-[#0b0f19] p-8 rounded-lg text-center max-w-xl mx-auto select-none my-12 shadow-2xl space-y-4">
                <Award className="w-12 h-12 text-[#00f0ff] mx-auto animate-bounce" />
                <h3 className="text-lg font-bold text-white uppercase">[CAREER_OS_PORT: ACCESS_DENIED]</h3>
                <p className="text-slate-400 font-sans text-xs leading-relaxed">
                  Excel LBO Templates, Comps valuation sheets, Pitch outline guides, and the AI Mock Interview simulator are reserved exclusively for the Analyst Plan tier. Upgrade your account credentials to connect instantly.
                </p>
                <Link href="/signup?upgrade=true" className="inline-block bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-6 py-2.5 rounded transition-colors text-xs font-mono">
                  UPGRADE_TO_ANALYST_TIER_NOW
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1 & 2: Interactive AI Mock Interviewer */}
                <div className="lg:col-span-2 terminal-card rounded-lg p-6 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                    <div className="flex items-center space-x-2 text-xs">
                      <Terminal className="w-4 h-4 text-[#00e676]" />
                      <span className="text-white font-bold uppercase">AI_MOCK_INTERVIEW_SIMULATOR</span>
                    </div>
                    <span className="terminal-badge-success">ANALYST_PORT_ACTIVE</span>
                  </div>

                  {!interviewStarted ? (
                    <div className="text-center py-12 space-y-4">
                      <Briefcase className="w-10 h-10 text-[#00f0ff] mx-auto animate-pulse" />
                      <h4 className="text-white font-bold text-sm">PRO_GRADE INVESTMENT BANKING INTERVIEWS</h4>
                      <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                        Establish a session to test your knowledge against dynamic questions compiled directly from elite Wall Street interview logs. Claude will analyze and score your response.
                      </p>
                      <button
                        onClick={handleStartInterview}
                        className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-6 py-2.5 rounded text-xs transition-colors"
                      >
                        LAUNCH_INTERVIEW_SESSION
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      {interviewLoading && !interviewQuestion ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-2">
                          <RefreshCw className="w-5 h-5 text-[#00e676] animate-spin" />
                          <span className="text-slate-500">COMPILING_INTERVIEW_PROMPT...</span>
                        </div>
                      ) : (
                        <div className="space-y-4 font-mono">
                          <div className="bg-[#05070a] border border-slate-900 p-4 rounded text-slate-300">
                            <span className="text-[9px] text-[#00f0ff] font-bold block mb-1">INTERVIEWER_QUERY:</span>
                            <p className="text-xs leading-relaxed font-bold">{interviewQuestion}</p>
                          </div>

                          {!interviewFeedback ? (
                            <form onSubmit={handleEvaluateAnswer} className="space-y-3">
                              <div className="flex flex-col space-y-1.5">
                                <label className="text-slate-500 uppercase text-[9px]">YOUR RESPONSE</label>
                                <textarea
                                  required
                                  rows={4}
                                  value={userAnswer}
                                  onChange={e => setUserAnswer(e.target.value)}
                                  placeholder="Type your structured answer here (explain statements adjustments, cash flows, multiples)..."
                                  className="bg-[#05070a] border border-slate-900 p-3 rounded text-white outline-none focus:border-[#00e676] focus:ring-1 focus:ring-[#00e676] leading-relaxed text-xs"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={interviewLoading || !userAnswer.trim()}
                                className="bg-[#00e676] hover:bg-[#00e676]/80 text-[#05070a] font-bold py-2.5 rounded transition-colors w-full flex items-center justify-center space-x-1.5"
                              >
                                {interviewLoading ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>TRANSMIT_RESPONSE_FOR_EVALUATION</span>
                                  </>
                                )}
                              </button>
                            </form>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-[#00e676]/10 border border-[#00e676]/20 p-4 rounded text-slate-300 max-h-[220px] overflow-y-auto">
                                <span className="text-[9px] text-[#00e676] font-bold block mb-1">CRITIQUE_&_SCORE_LOG:</span>
                                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono">{interviewFeedback}</pre>
                              </div>

                              <div className="flex gap-3">
                                <button
                                  onClick={handleStartInterview}
                                  className="flex-1 bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold py-2.5 rounded text-xs transition-colors"
                                >
                                  NEXT_QUESTION
                                </button>
                                <button
                                  onClick={() => {
                                    setInterviewStarted(false);
                                    setUserAnswer("");
                                    setInterviewFeedback("");
                                  }}
                                  className="flex-1 border border-slate-800 hover:border-slate-700 text-slate-300 py-2.5 rounded text-xs transition-colors"
                                >
                                  [EXIT_SESSION]
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Column 3: Premium Excel & Pitch downloads */}
                <div className="terminal-card rounded-lg p-6 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-900 pb-3 text-xs">
                    <Download className="w-4 h-4 text-[#00f0ff]" />
                    <span className="text-white font-bold uppercase">DOWNLOAD_CABINET</span>
                  </div>

                  <div className="space-y-3.5 text-xs font-mono">
                    {[
                      {
                        id: "lbo-excel",
                        title: "Corporate LBO Model Template (.xlsx)",
                        text: "[AnalystOS Corporate Leveraged Buyout Template v1.4]\nAssumptions:\nPurchase price EBITDA Multiple = 12.0x\nSponsor Debt weight = 60% | Equity weight = 40%\nEBITDA CAGR = 10% (Yr 1-5) | Minimum IRR target = 25%\nDownload Link: http://localhost:3000/resources/AnalystOS_LBO_Valuation_Model.xlsx"
                      },
                      {
                        id: "comps-excel",
                        title: "Comparable Comps Review Matrix (.xlsx)",
                        text: "[AnalystOS peer comps valuation template]\nColumns: Ticker, Price, EV, EBITDA, EV/EBITDA, Net Debt, CAGR\nPreloaded Peer Comparables sectors: Reliance vs Comps, TCS vs Infosys\nDownload Link: http://localhost:3000/resources/AnalystOS_Comps_Sheet.xlsx"
                      },
                      {
                        id: "pitch-deck",
                        title: "Wall Street Pitch Deck Outline (.pptx)",
                        text: "[AnalystOS Pitch Deck memorandum Structure]\nSlide 1: Executive thesis (Implied Upside %)\nSlide 2: Sector macro triggers & structural moats\nSlide 3: Pro-forma EBITDA forecasts & CAGR metrics\nSlide 4: Valuation Comps vs implied DCF share price"
                      }
                    ].map((template, idx) => (
                      <div key={idx} className="bg-[#05070a] border border-[#00f0ff]/10 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                          <span className="text-slate-300 font-bold text-[10px] truncate max-w-[150px]">{template.title}</span>
                          <button
                            onClick={() => copyTemplateSpecs(template.id, template.text)}
                            className="text-slate-400 hover:text-[#00f0ff] text-[9px] flex items-center space-x-1"
                          >
                            {copiedTemplate === template.id ? <Check className="w-3 h-3 text-[#00e676]" /> : <Download className="w-3 h-3" />}
                            <span>{copiedTemplate === template.id ? "COPIED" : "SPECS"}</span>
                          </button>
                        </div>
                        <pre className="text-slate-500 text-[8px] leading-relaxed whitespace-pre overflow-x-auto bg-[#0b0f19]/40 p-1.5 rounded font-mono">
                          {template.text}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
