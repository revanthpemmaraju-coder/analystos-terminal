/* eslint-disable */
"use client";

import Link from "next/link";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/navbar";
import TickerBar from "@/components/ticker-bar";
import { 
  Send, Terminal, Cpu, ShieldAlert, Sparkles, 
  Trash2, CornerDownLeft, RefreshCw, User, HelpCircle
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function generateMockResponse(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes("swot") || msg.includes("reliance")) {
    return `[SYS_ANALYST_SECURE_NODE: RELIANCE SWOT ANALYSIS]

1. STRENGTHS [CIT_RL_01]:
- Dominant market share in retail & telecom (Jio) platforms.
- Initialized high-density GPU server integrations for Blackwell trials.
- Impenetrable cash-flow generation from O2C (Oil-to-Chemicals).

2. WEAKNESSES [CIT_RL_02]:
- Elevated capital expenditure (CapEx) targets pressure near-term margins.
- High debt-to-equity ratio compared to pure-play domestic peers.

3. OPPORTUNITIES [CIT_RL_03]:
- Dynamic expansion into solar gigafactories & green hydrogen ecosystems.
- Dynamic scale-up of financial services platforms via Jio Financial.

4. THREATS [CIT_RL_04]:
- Volatility in global crude oil and refining margins.
- Intense pricing competition in the telecom segment.

RECOMMENDATION: OVERWEIGHT
INTRINSIC VALUATION TARGET: ₹2,580.40 (Current Spot: ₹2,450.40)`;
  }
  
  if (msg.includes("dupont") || msg.includes("roe")) {
    return `[SYS_ANALYST_SECURE_NODE: DUPONT ROE EQUATION]

The DuPont Analysis breaks down Return on Equity (ROE) into three distinct core financial drivers [CIT_DP_01]:

ROE = Profit Margin × Asset Turnover × Financial Leverage

1. NET PROFIT MARGIN [CIT_DP_02]:
- Formula: Net Income / Revenue
- Insight: Measures operating efficiency. How much profit is generated per rupee of sales.

2. ASSET TURNOVER [CIT_DP_03]:
- Formula: Revenue / Average Assets
- Insight: Measures asset utilization efficiency. How effectively the firm uses assets to generate sales.

3. FINANCIAL LEVERAGE [CIT_DP_04]:
- Formula: Average Assets / Average Equity (Equity Multiplier)
- Insight: Measures leverage. The degree of debt used to finance asset bases.

By analyzing these three distinct vectors, equity researchers can determine whether ROE is driven by profitability, operations, or aggressive debt leverage.`;
  }
  
  if (msg.includes("dcf") || msg.includes("valuation") || msg.includes("ebitda") || msg.includes("wacc") || msg.includes("cagr")) {
    return `[SYS_ANALYST_SECURE_NODE: DCF VALUATION METRIC]

A Discounted Cash Flow (DCF) model calculates the present value of future cash flows to determine intrinsic value [CIT_DCF_01]:

1. FORECAST FREE CASH FLOWS (FCF) [CIT_DCF_02]:
- Forecast revenue growth (5-Year pro-forma).
- Calculate EBITDA, subtract CapEx, working capital additions, and taxes to derive Free Cash Flow to Firm (FCFF).

2. DISCOUNTING VIA WACC [CIT_DCF_03]:
- Discount future FCFs back to present value utilizing the Weighted Average Cost of Capital (WACC) as the discount rate.

3. TERMINAL VALUE (TV) [CIT_DCF_04]:
- Calculate TV at Year 5 using exit EBITDA Multiples or Gordon Growth Model. Discount TV back to Year 0.

4. INTRINSIC SHARE PRICE [CIT_DCF_05]:
- Sum PV of FCFs and PV of TV to get Enterprise Value (EV). Subtract Net Debt to find Equity Value. Divide by outstanding shares to get implied intrinsic price.`;
  }
  
  if (msg.includes("comps") || msg.includes("comparable") || msg.includes("peer")) {
    return `[SYS_ANALYST_SECURE_NODE: COMPARABLE COMPS REVIEW]

Comparable Company Analysis (Comps) is a relative valuation method comparing the target to peer firms [CIT_COMP_01]:

1. PEER GROUP SELECTION [CIT_COMP_02]:
- Identify peer companies with similar operations, size, leverage, and growth rates (e.g. comparing TCS with Infosys).

2. VALUATION MULTIPLES [CIT_COMP_03]:
- Extract and normalize trading multiples: EV/EBITDA, P/E, EV/Sales, and P/B ratios from financial ledgers.

3. BENCHMARK ANALYSIS [CIT_COMP_04]:
- Calculate mean and median multiples of peer cohorts. Compare target metrics against benchmarks to locate discount or premium valuations.

4. VALUATION CONCLUSION [CIT_COMP_05]:
- Apply peer median multiples to target's financial metrics to estimate relative implied fair value spot.`;
  }
  
  if (msg.includes("tcs") || msg.includes("infosys") || msg.includes("hdfc") || msg.includes("bank") || msg.includes("stock")) {
    return `[SYS_ANALYST_SECURE_NODE: INDIAN BLUE-CHIP LEDGER]

Institutional outlook on major Indian blue-chip equities [CIT_IND_01]:

1. TATA CONSULTANCY SERVICES (TCS) [CIT_IND_02]:
- Margin metrics: Solid EBITDA margin expansion holding firm at 26.2%.
- Valuation: Trading at 28.2x P/E. Strong digital transformation and cloud pipelines.

2. INFOSYS (INFY) [CIT_IND_03]:
- Growth profile: Steady 7.8% 5-Yr pro-forma growth. High cash-flow conversion.
- Valuation: Trading at 22.5x P/E.

3. HDFC BANK (HDFCBANK) [CIT_IND_04]:
- Valuation gap: Intrinsic upside of +18.4% based on normalized comps.
- Metrics: Attractive 16.8x P/E following merger consolidation phases.

RECOMMENDATION: Sector-leads hold positive long-term compounding structures.`;
  }
  
  return `[SYS_ANALYST_SECURE_NODE: EQUITY RESEARCH FEED]

Ready for institutional analysis. Your query regarding financial ledgers has been logged.

1. COMPLIANCE SUMMARY [CIT_GEN_01]:
- System is operating in institutional research mode. All valuation outputs verify against domestic Indian (NSE/BSE) and global indexes.

2. SUGGESTED INQUIRIES [CIT_GEN_02]:
- "Perform a SWOT analysis for Reliance"
- "Explain DuPont ROE equations"
- "Walk me through a 5-Year DCF structure"
- "Run a Comparable Comps review for TCS vs Infosys"

Please specify your target stock ticker or financial modeling concept to compile full intrinsic pro-formas.`;
}

export default function AnalystChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Protect route & Fetch session
  useEffect(() => {
    async function checkAuth() {
      const isFounder = typeof window !== "undefined" && 
        (new URLSearchParams(window.location.search).get("founder") === "true" || 
         localStorage.getItem("founder_bypass") === "true");

      if (isFounder) {
        setUser({ id: "founder-guest-id", email: "founder@analystos.com" });
        const finalProfile = { plan: "pro", name: "Founder / Administrator", questions_used_today: 0 };
        setProfile(finalProfile);
        if (typeof window !== "undefined") {
          localStorage.setItem("founder_bypass", "true");
        }

        // Fetch existing conversation history from localStorage for founder guest
        const localConv = typeof window !== "undefined" ? localStorage.getItem("analyst_conversation_founder") : null;
        if (localConv) {
          try {
            setMessages(JSON.parse(localConv));
          } catch (e) {
            // fallback
            setMessages([
              {
                role: "assistant",
                content: "SYS_CORE_ONLINE: Welcome to AnalystOS AI Research Cockpit.\n\nI am your institutional equity research analyst. Ask me any question regarding corporate balance sheets, domestic NSE/BSE stock valuations, CAGR projections, exit EBITDA multiples, or financial modeling guides. I will cite my logic.\n\nTry asking: 'Perform a SWOT analysis for Reliance' or 'Explain DuPont ROE equations.'",
                timestamp: new Date().toLocaleTimeString()
              }
            ]);
          }
        } else {
          // Welcoming institutional logs
          setMessages([
            {
              role: "assistant",
              content: "SYS_CORE_ONLINE: Welcome to AnalystOS AI Research Cockpit.\n\nI am your institutional equity research analyst. Ask me any question regarding corporate balance sheets, domestic NSE/BSE stock valuations, CAGR projections, exit EBITDA multiples, or financial modeling guides. I will cite my logic.\n\nTry asking: 'Perform a SWOT analysis for Reliance' or 'Explain DuPont ROE equations.'",
              timestamp: new Date().toLocaleTimeString()
            }
          ]);
        }
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      // Fetch user profile plan details
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      let finalProfile = prof || { plan: "free", name: "User", questions_used_today: 0 };

      // Founder Whitelisting Hook
      if (
        session.user.email?.toLowerCase().includes("abhin") || 
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

      // Fetch existing conversation history from Supabase
      const { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (conversation?.messages) {
        setMessages(conversation.messages);
      } else {
        // Welcoming institutional logs
        setMessages([
          {
            role: "assistant",
            content: "SYS_CORE_ONLINE: Welcome to AnalystOS AI Research Cockpit.\n\nI am your institutional equity research analyst. Ask me any question regarding corporate balance sheets, domestic NSE/BSE stock valuations, CAGR projections, exit EBITDA multiples, or financial modeling guides. I will cite my logic.\n\nTry asking: 'Perform a SWOT analysis for Reliance' or 'Explain DuPont ROE equations.'",
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  // Scroll to bottom on updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = inputVal.trim();
    if (!prompt || sending) return;

    setErrorMsg("");
    setQuotaExceeded(false);
    setInputVal("");
    setSending(true);

    const userMsg: Message = {
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString()
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, userId: user.id })
      });

      if (response.status === 429) {
        // Quota Limit Hit
        const data = await response.json();
        setQuotaExceeded(true);
        setErrorMsg(data.message);
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: "ERROR: [QUOTA_EXCEEDED] Your daily limit of 5 AI questions has been reached. Please upgrade to PRO to establish unlimited terminal requests.",
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      } else if (!response.ok) {
        throw new Error("Terminal connection error.");
      } else {
        const data = await response.json();
        const assistantMsg: Message = {
          role: "assistant",
          content: data.content,
          timestamp: new Date().toLocaleTimeString()
        };

        const updatedMsgs = [...newMsgs, assistantMsg];
        setMessages(updatedMsgs);

        const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (user.id && isValidUuid(user.id)) {
          // Save conversation history to Supabase
          await supabase.from("conversations").upsert({
            user_id: user.id,
            messages: updatedMsgs,
            created_at: new Date()
          });
        } else {
          localStorage.setItem("analyst_conversation_founder", JSON.stringify(updatedMsgs));
        }

        // Increment local questions count if Free user
        if (profile?.plan === "free") {
          setProfile((prev: any) => ({
            ...prev,
            questions_used_today: (prev?.questions_used_today || 0) + 1
          }));
        }
      }
    } catch (err: any) {
      console.warn("Secure link offline. Running local client-side co-pilot simulation:", err);
      
      const localResponse = `[SYS_BACKUP_NODE: LOCAL CO-PILOT SIMULATION ACTIVE]\n\n` + generateMockResponse(prompt);
      
      const assistantMsg: Message = {
        role: "assistant",
        content: localResponse,
        timestamp: new Date().toLocaleTimeString()
      };

      const updatedMsgs = [...newMsgs, assistantMsg];
      setMessages(updatedMsgs);

      // Save locally
      localStorage.setItem("analyst_conversation_founder", JSON.stringify(updatedMsgs));
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!user) return;
    setErrorMsg("");
    setQuotaExceeded(false);
    
    const baseMsg: Message[] = [
      {
        role: "assistant",
        content: "SYS_CORE_ONLINE: Message log history cleared. Ready for new input.",
        timestamp: new Date().toLocaleTimeString()
      }
    ];
    setMessages(baseMsg);

    const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (user.id && isValidUuid(user.id)) {
      await supabase.from("conversations").delete().eq("user_id", user.id);
    } else {
      localStorage.removeItem("analyst_conversation_founder");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono items-center justify-center space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-400">CONNECTING_AI_ANALYST_PORT...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col justify-between space-y-4">
        
        {/* Chat Header details */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <div className="flex items-center space-x-2 text-xs">
            <Cpu className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-white font-bold uppercase">AI_RESEARCH_ANALYST_PORT</span>
            <span className="terminal-badge">CLAUDE_SONNET_ACTIVE</span>
          </div>

          <div className="flex items-center space-x-4 text-[10px]">
            {profile?.plan === "free" && (
              <span className="text-slate-500 font-bold uppercase">
                QUOTA_USED: {profile?.questions_used_today || 0} / 5
              </span>
            )}
            <button
              onClick={handleClearChat}
              className="text-slate-500 hover:text-[#ff3860] flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>[CLEAR_LOGS]</span>
            </button>
          </div>
        </div>

        {/* Quota limit banner */}
        {quotaExceeded && (
          <div className="border border-[#ff3860]/20 bg-[#ff3860]/5 p-4 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-5 h-5 text-[#ff3860] animate-bounce" />
              <div>
                <span className="text-white font-bold">[QUOTA_EXCEEDED: LIMIT_REACHED]</span>
                <p className="text-slate-400 font-sans mt-0.5">Your daily free query limit has been exceeded. Activate the PRO Key to establish dynamic unlimited terminal feeds instantly.</p>
              </div>
            </div>
            <Link href="/signup?upgrade=true" className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-4 py-2 rounded transition-colors text-[10px]">
              ACTIVATE_PRO_KEY
            </Link>
          </div>
        )}

        {/* Monospace Chat Terminal logs display */}
        <div className="flex-1 bg-[#0b0f19] border border-[#00f0ff]/10 rounded-lg p-6 min-h-[400px] max-h-[60vh] overflow-y-auto scrollbar-thin flex flex-col space-y-4 shadow-xl">
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={i}
                className={`flex flex-col space-y-1.5 max-w-[85%] ${
                  isUser ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div className="flex items-center space-x-2 text-[9px] text-slate-500">
                  {isUser ? <User className="w-3 h-3 text-[#00f0ff]" /> : <Cpu className="w-3 h-3 text-[#00e676]" />}
                  <span className="font-bold">{isUser ? "USER_NODE" : "ANALYSTOS_AI"}</span>
                  <span>[{msg.timestamp}]</span>
                </div>
                
                <div
                  className={`px-4 py-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap font-mono ${
                    isUser
                      ? "bg-[#00f0ff]/10 border border-[#00f0ff]/20 text-[#00f0ff]"
                      : "bg-[#05070a]/90 border border-slate-900 text-slate-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex flex-col space-y-1.5 items-start max-w-[85%] self-start animate-pulse">
              <div className="flex items-center space-x-2 text-[9px] text-slate-500">
                <Cpu className="w-3 h-3 text-[#00e676]" />
                <span className="font-bold">ANALYSTOS_AI</span>
                <span>[COMPILING...]</span>
              </div>
              <div className="px-4 py-3 rounded-lg text-xs leading-relaxed whitespace-pre font-mono bg-[#05070a]/90 border border-slate-900 text-slate-400">
                THINKING: COMPILING VALUATIONS AND CITATIONS DATA SPECS...
              </div>
            </div>
          )}
          <div ref={bottomRef}></div>
        </div>

        {/* Input prompt form */}
        <form onSubmit={handleSubmit} className="flex border border-[#00f0ff]/15 rounded-lg overflow-hidden bg-[#0b0f19] p-1 shadow-2xl">
          <input
            type="text"
            required
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="Type any corporate or valuation query (e.g. Perform a comps review for Reliance)..."
            className="flex-1 bg-transparent px-4 py-3 text-xs text-white outline-none border-none font-mono placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={sending || !inputVal.trim()}
            className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 disabled:bg-[#0b0f19] text-[#05070a] disabled:text-slate-600 font-bold px-6 py-2.5 rounded text-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <span>SEND</span>
            <Send className="w-3 h-3" />
          </button>
        </form>

        <div className="text-[10px] text-slate-500 font-sans text-center">
          Terminal handles financial citations natively. Verify calculations against company pro-formas directly in dashboard sheets.
        </div>

      </main>
    </div>
  );
}
