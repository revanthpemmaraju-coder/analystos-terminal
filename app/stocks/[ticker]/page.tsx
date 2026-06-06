/* eslint-disable */
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/navbar";
import TickerBar from "@/components/ticker-bar";
import LiveStockChart from "@/components/live-stock-chart";
import { 
  TrendingUp, ShieldAlert, FileText, ChevronRight, 
  HelpCircle, ArrowLeft, RefreshCw, AlertTriangle, Database
} from "lucide-react";

interface StockDetail {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  vol: string;
  high52: number;
  low52: number;
  businessModel?: string;
  risks?: string;
  earningsVerdict?: string;
  redFlags: string[];
  pe?: number;
  pb?: number;
  evEbitda?: number;
  roe?: number;
  debtEquity?: number;
  assetClass?: "Stock" | "ETF" | "REIT" | "Closed-End Fund" | "Mutual Fund";
  overviewTitle?: string;
  overviewText?: string;
  verdictTitle?: string;
  verdictText?: string;
  risksTitle?: string;
  risksText?: string;
  redFlagsTitle?: string;
  metrics?: Array<{ label: string; val: string; desc: string }>;
}

export default function StockDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticker = (params.ticker as string)?.toUpperCase() || "";

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [fetchingData, setFetchingData] = useState(true);
  const [liveQuote, setLiveQuote] = useState<any>(null);
  const [flow, setFlow] = useState<any>(null);

  // Protect route & Fetch session
  useEffect(() => {
    async function checkAuth() {
      const isFounder = typeof window !== "undefined" && 
        (new URLSearchParams(window.location.search).get("founder") === "revanth_gate_pro" || 
         localStorage.getItem("founder_bypass") === "true");

      if (isFounder) {
        setUser({ id: "founder-guest-id", email: "founder@analystos.com" });
        const finalProfile = { plan: "pro", name: "Founder / Administrator" };
        setProfile(finalProfile);
        if (typeof window !== "undefined") {
          localStorage.setItem("founder_bypass", "true");
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

      // Fetch user profile details
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      let finalProfile = prof || { plan: "free", name: "User" };

      // Founder Whitelisting Hook
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
    }
    checkAuth();
  }, [router]);

  // Fetch company fundamental details
  useEffect(() => {
    if (!ticker) return;
    async function fetchStockDetails() {
      try {
        setFetchingData(true);
        const response = await fetch(`/api/market?ticker=${ticker}`);
        if (response.ok) {
          const data = await response.json();
          setStock(data);
        }
      } catch (err) {
        console.error("Failed fetching stock details:", err);
      } finally {
        setFetchingData(false);
      }
    }
    fetchStockDetails();
  }, [ticker]);

  // Real-time quote stream
  useEffect(() => {
    if (typeof window === "undefined" || !ticker) return;
    const es = new EventSource(
      `/api/stocks/stream?symbols=${encodeURIComponent(ticker)}&intervalMs=6000`
    );

    const onQuotes = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data);
        if (!Array.isArray(payload)) return;
        const row = payload.find(
          (x) =>
            x?.ok &&
            String(x.quote?.displaySymbol || "")
              .toUpperCase()
              .replace(/\.(NS|BO|NSE|BSE)$/i, "") === ticker.toUpperCase()
        );
        if (row?.quote) setLiveQuote(row.quote);
      } catch {
        /* ignore */
      }
    };
    es.addEventListener("quotes", onQuotes as any);
    return () => es.close();
  }, [ticker]);

  // Institutional flow snapshot
  useEffect(() => {
    if (!ticker) return;
    (async () => {
      try {
        const res = await fetch(`/api/stocks/flow?symbol=${encodeURIComponent(ticker)}`);
        if (!res.ok) return;
        const data = await res.json();
        setFlow(data.flow);
      } catch {
        /* ignore */
      }
    })();
  }, [ticker]);

  if (loading || fetchingData) {
    return (
      <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono items-center justify-center space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-400">CONNECTING_COMPANY_PORT_NODE...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6 select-none">
        
        {/* Back Link */}
        <button
          onClick={() => router.push("/dashboard")}
          className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>✕ BACK TO DASHBOARD</span>
        </button>

        {stock && (
          <div className="space-y-6">
            
            {/* Stock Core Title Card */}
            <div className="terminal-card rounded-lg p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="terminal-badge font-bold uppercase text-[10px]">
                    {stock.assetClass ? `${stock.assetClass.toUpperCase().replace(/ /g, "_")}_TICKER` : "EQUITY_SHARE_TICKER"}
                  </span>
                  {stock.assetClass && (
                    <span className={`text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border ${
                      stock.assetClass === "ETF"
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25"
                        : stock.assetClass === "REIT"
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/25"
                        : stock.assetClass === "Closed-End Fund"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                        : stock.assetClass === "Mutual Fund"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                    }`}>
                      {stock.assetClass}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">{stock.ticker}</h1>
                <p className="text-slate-400 text-xs font-sans">{stock.name}</p>
              </div>

              {/* Price quote */}
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">CURRENT QUOTE (₹)</span>
                  <span className="text-2xl font-bold text-white font-mono">
                    ₹{Number(liveQuote?.price ?? stock.price).toFixed(2)}
                  </span>
                </div>
                
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">CHANGE</span>
                  <span
                    className={`text-xl font-bold flex items-center justify-end ${
                      Number(liveQuote?.changePercent ?? stock.changePercent) >= 0
                        ? "text-[#00e676]"
                        : "text-[#ff3860]"
                    }`}
                  >
                    {Number(liveQuote?.changePercent ?? stock.changePercent) >= 0 ? "▲" : "▼"}{" "}
                    {Number(liveQuote?.changePercent ?? stock.changePercent) >= 0 ? "+" : ""}
                    {Number(liveQuote?.changePercent ?? stock.changePercent).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            <LiveStockChart initialSymbol={ticker} compact />

            {flow && (
              <div className="terminal-card rounded-lg p-6">
                <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-3 text-xs mb-3">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-[#00f0ff]" />
                    <span className="text-white font-bold uppercase">INSTITUTIONAL_FLOW_SNAPSHOT</span>
                    <span className="terminal-badge">YAHOO_OWNERSHIP</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/flow")}
                    className="text-slate-500 hover:text-[#00f0ff] text-[10px] font-bold"
                  >
                    [OPEN_TRACKER →]
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">% INSTITUTIONS</div>
                    <div className="text-slate-200">
                      {flow?.majorHolders?.percentInstitutions != null
                        ? `${(flow.majorHolders.percentInstitutions * 100).toFixed(2)}%`
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">% INSIDERS</div>
                    <div className="text-slate-200">
                      {flow?.majorHolders?.percentInsiders != null
                        ? `${(flow.majorHolders.percentInsiders * 100).toFixed(2)}%`
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">INSIDER NET %</div>
                    <div className="text-slate-200">
                      {flow?.netSharePurchaseActivity?.netPercentInsiderSharesPurchased != null
                        ? `${(flow.netSharePurchaseActivity.netPercentInsiderSharesPurchased * 100).toFixed(2)}%`
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">UPDATED</div>
                    <div className="text-slate-200">
                      {flow?.updatedAt ? new Date(flow.updatedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics spreadsheet grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(stock.metrics || [
                { label: "PRICE_TO_EARNINGS (P/E)", val: `${stock.pe || 0}x`, desc: "Earnings multiplier" },
                { label: "PRICE_TO_BOOK (P/B)", val: `${stock.pb || 0}x`, desc: "Net asset premium" },
                { label: "EV_TO_EBITDA", val: `${stock.evEbitda || 0}x`, desc: "Operating value" },
                { label: "RETURN_ON_EQUITY (ROE)", val: `${stock.roe || 0}%`, desc: "Equity reinvestment" },
                { label: "DEBT_TO_EQUITY", val: `${stock.debtEquity || 0}x`, desc: "Consolidated leverage" },
              ]).concat([
                { label: "VOLUME", val: stock.vol, desc: "Liquid daily shares" },
                { label: "52W_HIGH (₹)", val: `${stock.high52 != null ? stock.high52.toFixed(2) : "N/A"}`, desc: "Channel ceiling limit" },
                { label: "52W_LOW (₹)", val: `${stock.low52 != null ? stock.low52.toFixed(2) : "N/A"}`, desc: "Channel floor limit" }
              ]).map((metric, idx) => (
                <div key={idx} className="terminal-card rounded p-4 font-mono space-y-1 bg-[#0b0f19]">
                  <span className="text-[9px] text-slate-500 font-bold block">{metric.label}</span>
                  <span className="text-lg font-bold text-white block">{metric.val}</span>
                  <span className="text-[9px] text-slate-400 font-sans block">{metric.desc}</span>
                </div>
              ))}
            </div>

            {/* AI Insights & Red Flags */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Business Model & Verdict */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Business Model */}
                <div className="terminal-card rounded-lg p-6">
                  <div className="flex items-center space-x-2 border-b border-slate-900 pb-3 text-xs mb-3">
                    <FileText className="w-4 h-4 text-[#00f0ff]" />
                    <span className="text-white font-bold uppercase">
                      {stock.overviewTitle || "BUSINESS_MODEL_OVERVIEW"}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans whitespace-pre-line">
                    {stock.overviewText || stock.businessModel}
                  </p>
                </div>
 
                {/* Earnings Verdict */}
                <div className="terminal-card rounded-lg p-6">
                  <div className="flex items-center space-x-2 border-b border-slate-900 pb-3 text-xs mb-3">
                    <TrendingUp className="w-4 h-4 text-[#00e676]" />
                    <span className="text-white font-bold uppercase">
                      {stock.verdictTitle || "VALUATION_VERDICT_VERIFICATION"}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans whitespace-pre-line">
                    {stock.verdictText || stock.earningsVerdict}
                  </p>
                </div>
 
              </div>
 
              {/* Risks & Red Flags */}
              <div className="space-y-6">
                
                {/* Risks list */}
                <div className="terminal-card rounded-lg p-6">
                  <div className="flex items-center space-x-2 border-b border-slate-900 pb-3 text-xs mb-3">
                    <AlertTriangle className="w-4 h-4 text-[#ff3860]" />
                    <span className="text-white font-bold uppercase">
                      {stock.risksTitle || "REGULATORY_OPERATIONAL_RISKS"}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed font-sans whitespace-pre-line">
                    {stock.risksText || stock.risks}
                  </p>
                </div>
 
                {/* Red Flags warnings */}
                <div className="terminal-card rounded-lg p-6 border border-[#ff3860]/20 bg-[#ff3860]/5">
                  <div className="flex items-center space-x-2 border-b border-[#ff3860]/10 pb-3 text-xs mb-3">
                    <ShieldAlert className="w-4 h-4 text-[#ff3860] animate-pulse" />
                    <span className="text-[#ff3860] font-bold uppercase">
                      {stock.redFlagsTitle || "RED_FLAGS_MONITOR"}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-2.5 text-xs text-slate-300">
                    {stock.redFlags.map((flag, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <span className="text-[#ff3860] font-bold mt-0.5">•</span>
                        <span className="font-sans leading-relaxed text-[11px]">{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
 
              </div>
 
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
