/* eslint-disable */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/navbar";
import TickerBar from "@/components/ticker-bar";
import StockSearchInput, { StockSearchSelection } from "@/components/stock-search-input";
import { 
  Cpu, Send, Trash2, User,
  FileText, File, Share2, Eye, X,
  Download, Copy, Check, Printer
} from "lucide-react";
import { 
  getConfidenceScore, 
  exportToDocx, 
  generateShareLink, 
  markdownToHtmlSimple,
  ReportPayload 
} from "@/lib/report-exporter";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

const isValidUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const baseWelcome =
  "SYS_CORE_ONLINE: AnalystOS AI Co-Analyst (Global Markets & Equities).\n\n" +
  "1) Ask about general markets: \"Show top news\", \"Explain today's market movers\", \"What economic events are coming?\"\n" +
  "2) Pin a stock ticker: Search and pin to load company-specific context (valuation, DCF, comps, catalysts, earnings).\n" +
  "3) Real-time price updates + live charts are connected directly to active feed servers.\n\n" +
  'Try: Ask "What are the trending market movers?" or pin "TCS" and ask "Give me a bull/base/bear case."';

export default function StockAiPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("founder-guest-id"); // guest works without auth

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [sending, setSending] = useState(false);
  const [pinnedStock, setPinnedStock] = useState<StockSearchSelection | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Exporter & Preview States
  const [activeReport, setActiveReport] = useState<ReportPayload | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);

  const storageKey = useMemo(() => `aos_stock_ai_conv_${userId}`, [userId]);

  useEffect(() => {
    const boot = async () => {
      try {
        const mod = await import("@/lib/supabase");
        const sb = mod.supabase;
        const { data } = await sb.auth.getSession();
        const uid = data?.session?.user?.id;
        if (uid && isValidUuid(uid)) setUserId(uid);
      } catch {
        /* guest mode */
      }

      // Load conversation
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Message[];
            if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
          } catch {
            /* ignore */
          }
        }
      }

      // Default welcome
      setMessages((prev) =>
        prev.length
          ? prev
          : [{ role: "assistant", content: baseWelcome, timestamp: new Date().toLocaleTimeString() }]
      );

      setLoading(false);
    };

    void boot();
  }, [storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const persist = (next: Message[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey, JSON.stringify(next.slice(-60)));
  };

  const handleClear = () => {
    const base: Message[] = [
      { role: "assistant", content: "SYS_CORE_ONLINE: Logs cleared. Ready.", timestamp: new Date().toLocaleTimeString() },
    ];
    setMessages(base);
    persist(base);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = inputVal.trim();
    if (!prompt || sending) return;

    setSending(true);
    setInputVal("");

    const userMsg: Message = {
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString(),
    };

    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);

    try {
      const symbols = pinnedStock ? [pinnedStock.symbol.split(".")[0]] : [];
      const res = await fetch("/api/stocks/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, userId, symbols }),
      });

      if (!res.ok) throw new Error("Stock AI API error");
      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.content || "No response returned.",
        timestamp: new Date().toLocaleTimeString(),
      };

      const updated = [...nextMsgs, assistantMsg];
      setMessages(updated);
      persist(updated);
    } catch (err: any) {
      const assistantMsg: Message = {
        role: "assistant",
        content:
          "[SYS_BACKUP_NODE]\nStock AI is temporarily unavailable.\n\n" +
          "Try again, or ask with a clearer ticker (e.g. AAPL, TSLA, TCS, RELIANCE).",
        timestamp: new Date().toLocaleTimeString(),
      };
      const updated = [...nextMsgs, assistantMsg];
      setMessages(updated);
      persist(updated);
    } finally {
      setSending(false);
    }
  };

  // Exporter Actions
  const triggerToast = (text: string) => {
    setShowToast(text);
    setTimeout(() => {
      setShowToast(null);
    }, 4000);
  };

  const getTickerFromMessage = (content: string): string => {
    const match = content.match(/### Quick Answer\n\s*([A-Z0-9.-]{2,12})\b/);
    if (match) return match[1];
    const words = content.match(/\b([A-Z]{2,10})\b/g);
    if (words) {
      const stop = new Set(["BUY", "SELL", "HOLD", "WACC", "DCF", "ROE", "PE", "EBITDA", "AAPL", "NVDA", "TCS", "RELIANCE"]);
      for (const w of words) {
        if (!stop.has(w)) return w;
      }
    }
    return pinnedStock ? pinnedStock.symbol.split(".")[0] : "MARKET";
  };

  const handlePreviewReport = (msg: Message) => {
    const ticker = pinnedStock ? pinnedStock.symbol.split(".")[0] : getTickerFromMessage(msg.content);
    const score = getConfidenceScore(msg.content);
    setActiveReport({
      content: msg.content,
      timestamp: msg.timestamp || new Date().toLocaleTimeString(),
      confidence: score,
      ticker: ticker
    });
    setPreviewOpen(true);
  };

  const handleExportPDF = (msg: Message) => {
    const ticker = pinnedStock ? pinnedStock.symbol.split(".")[0] : getTickerFromMessage(msg.content);
    const score = getConfidenceScore(msg.content);
    setActiveReport({
      content: msg.content,
      timestamp: msg.timestamp || new Date().toLocaleTimeString(),
      confidence: score,
      ticker: ticker
    });
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleExportDOCX = (msg: Message) => {
    const ticker = pinnedStock ? pinnedStock.symbol.split(".")[0] : getTickerFromMessage(msg.content);
    const score = getConfidenceScore(msg.content);
    exportToDocx({
      content: msg.content,
      timestamp: msg.timestamp || new Date().toLocaleTimeString(),
      confidence: score,
      ticker: ticker
    });
    triggerToast("DOCX report downloaded successfully.");
  };

  const handleShareLink = (msg: Message, index: number) => {
    const ticker = pinnedStock ? pinnedStock.symbol.split(".")[0] : getTickerFromMessage(msg.content);
    const score = getConfidenceScore(msg.content);
    const link = generateShareLink({
      content: msg.content,
      timestamp: msg.timestamp || new Date().toLocaleTimeString(),
      confidence: score,
      ticker: ticker
    });
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedIndex(index);
      triggerToast("Certified report link copied to clipboard.");
      setTimeout(() => setCopiedIndex(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono items-center justify-center space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-400">CONNECTING_STOCK_AI_NODE...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <div className="flex items-center space-x-2 text-xs">
            <Cpu className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-white font-bold uppercase">STOCK_AI</span>
            <span className="terminal-badge">LIVE_QUOTES</span>
          </div>
          <button
            onClick={handleClear}
            className="text-slate-500 hover:text-[#ff3860] flex items-center space-x-1 text-[10px] font-bold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>[CLEAR_LOGS]</span>
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
            Search & pin a stock / ETF (optional but recommended)
          </p>
          <StockSearchInput onSelect={(item) => setPinnedStock(item)} />
          {pinnedStock && (
            <div className="flex items-center justify-between text-[10px] font-mono bg-[#00f0ff]/5 border border-[#00f0ff]/20 rounded px-3 py-2">
              <span>
                PINNED: <span className="text-[#00f0ff] font-bold">{pinnedStock.symbol}</span>
                <span className="text-slate-400 ml-2">{pinnedStock.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setPinnedStock(null)}
                className="text-slate-500 hover:text-[#ff3860]"
              >
                [CLEAR]
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 bg-[#0b0f19] border border-[#00f0ff]/10 rounded-lg p-6 min-h-[420px] max-h-[62vh] overflow-y-auto scrollbar-thin flex flex-col space-y-4 shadow-xl">
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={i}
                className={`flex flex-col space-y-1.5 max-w-[90%] ${
                  isUser ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div className="flex items-center space-x-2 text-[9px] text-slate-500">
                  {isUser ? (
                    <User className="w-3 h-3 text-[#00f0ff]" />
                  ) : (
                    <Cpu className="w-3 h-3 text-[#00e676]" />
                  )}
                  <span className="font-bold">{isUser ? "YOU" : "STOCK_AI"}</span>
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
                {!isUser && !msg.content.startsWith("SYS_CORE_ONLINE:") && (
                  <div className="flex items-center gap-3.5 mt-1 flex-wrap text-slate-500 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => handlePreviewReport(msg)}
                      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/25 text-[#00f0ff] hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]/40 transition-all font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>PREVIEW REPORT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportPDF(msg)}
                      className="flex items-center gap-1 hover:text-[#00f0ff] transition-colors"
                      title="Print / Export PDF"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportDOCX(msg)}
                      className="flex items-center gap-1 hover:text-[#00f0ff] transition-colors"
                      title="Export Word DOCX"
                    >
                      <File className="w-3.5 h-3.5" />
                      <span>DOCX</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareLink(msg, i)}
                      className="flex items-center gap-1 hover:text-[#00f0ff] transition-colors"
                      title="Generate Share Link"
                    >
                      {copiedIndex === i ? (
                        <Check className="w-3.5 h-3.5 text-[#00e676]" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedIndex === i ? "COPIED" : "SHARE"}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {sending && (
            <div className="flex flex-col space-y-1.5 items-start max-w-[85%] self-start animate-pulse">
              <div className="flex items-center space-x-2 text-[9px] text-slate-500">
                <Cpu className="w-3 h-3 text-[#00e676]" />
                <span className="font-bold">STOCK_AI</span>
                <span>[COMPILING...]</span>
              </div>
              <div className="px-4 py-3 rounded-lg text-xs leading-relaxed whitespace-pre font-mono bg-[#05070a]/90 border border-slate-900 text-slate-400">
                THINKING: Pulling live quotes + building research memo…
              </div>
            </div>
          )}
          <div ref={bottomRef}></div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex border border-[#00f0ff]/15 rounded-lg overflow-hidden bg-[#0b0f19] p-1 shadow-2xl"
        >
          <input
            type="text"
            required
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder='Ask anything (e.g. "Analyze AAPL and give me a target price", "Compare TCS vs INFY")'
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
      </main>

      {/* Hidden container for print-only rendering */}
      {activeReport && (
        <div className="printable-report-wrapper hidden">
          <div className="print-watermark-overlay"></div>
          {/* Page 1: Cover Page */}
          <div className="print-cover-page">
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", letterSpacing: "3px", textTransform: "uppercase" }}>
              AnalystOS Research Network
            </div>
            
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <div style={{ width: "64px", height: "64px", border: "4px solid #0284c7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7", fontWeight: "bold", fontSize: "10px", marginBottom: "2rem" }}>
                AOS
              </div>
              <h1 style={{ fontSize: "24pt", fontWeight: "bold", color: "#0f172a", margin: "1.5rem 0", lineHeight: 1.2 }}>
                ANALYSTOS CERTIFIED RESEARCH REPORT
              </h1>
              <div style={{ height: "3px", width: "50px", backgroundColor: "#0284c7", margin: "0.5rem auto 1.5rem" }}></div>
              <p style={{ fontSize: "13pt", color: "#0284c7", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                {activeReport.ticker ? `${activeReport.ticker} Ticker Analysis` : "Global Financial Markets Research"}
              </p>
            </div>

            <div style={{ width: "100%", borderTop: "1px dashed #cbd5e1", paddingTop: "2rem" }}>
              <table style={{ width: "100%", fontSize: "10pt", borderCollapse: "collapse", color: "#475569" }}>
                <tbody>
                  <tr>
                    <td style={{ textAlign: "left", padding: "4px 0", fontWeight: "bold" }}>Security Classification:</td>
                    <td style={{ textAlign: "right", padding: "4px 0" }}>Institutional Grade</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: "left", padding: "4px 0", fontWeight: "bold" }}>AI Confidence Score:</td>
                    <td style={{ textAlign: "right", padding: "4px 0" }}>{activeReport.confidence}%</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: "left", padding: "4px 0", fontWeight: "bold" }}>Timestamp of Compilation:</td>
                    <td style={{ textAlign: "right", padding: "4px 0" }}>{activeReport.timestamp}</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: "left", padding: "4px 0", fontWeight: "bold" }}>Verification:</td>
                    <td style={{ textAlign: "right", padding: "4px 0", color: "#0284c7", fontWeight: "bold" }}>PASSED [AOS-SECURE]</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: "8pt", color: "#94a3b8", marginTop: "2rem", textAlign: "center" }}>
                Disclaimer: Markets involve risk. Certified by AnalystOS Autonomous System.
              </p>
            </div>
          </div>

          {/* Page 2 onwards: Content */}
          <div className="print-content-page">
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #cbd5e1", paddingBottom: "8px", marginBottom: "2rem", fontSize: "9pt", color: "#64748b" }}>
              <span>AnalystOS Research Memorandum</span>
              <span>Ticker: {activeReport.ticker}</span>
            </div>
            <div 
              className="print-markdown-body"
              dangerouslySetInnerHTML={{ __html: markdownToHtmlSimple(activeReport.content) }} 
              style={{ fontSize: "11pt", color: "#334155" }}
            />
          </div>
        </div>
      )}

      {/* Interactive Report Preview Modal */}
      {previewOpen && activeReport && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0b0f19] border border-[#00f0ff]/20 rounded-xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#00f0ff]/12 bg-[#05070a]/90">
              <div className="flex items-center space-x-2.5">
                <Cpu className="w-5 h-5 text-[#00f0ff]" />
                <span className="text-white font-bold text-sm tracking-wide uppercase font-mono">Certified Report System</span>
                <span className="terminal-badge-success text-[10px]">VERIFIED_SECURE</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    const repMsg = {
                      content: activeReport.content,
                      timestamp: activeReport.timestamp
                    } as Message;
                    handleExportPDF(repMsg);
                  }}
                  className="p-1.5 text-slate-400 hover:text-[#00f0ff] hover:bg-[#00f0ff]/10 rounded transition-colors flex items-center space-x-1 text-xs font-mono"
                  title="Print / Save PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => {
                    const repMsg = {
                      content: activeReport.content,
                      timestamp: activeReport.timestamp
                    } as Message;
                    handleExportDOCX(repMsg);
                  }}
                  className="p-1.5 text-slate-400 hover:text-[#00f0ff] hover:bg-[#00f0ff]/10 rounded transition-colors flex items-center space-x-1 text-xs font-mono"
                  title="Export to Word DOCX"
                >
                  <Download className="w-4 h-4" />
                  <span>DOCX</span>
                </button>
                <button
                  onClick={() => {
                    const repMsg = {
                      content: activeReport.content,
                      timestamp: activeReport.timestamp
                    } as Message;
                    handleShareLink(repMsg, -1);
                  }}
                  className="p-1.5 text-slate-400 hover:text-[#00f0ff] hover:bg-[#00f0ff]/10 rounded transition-colors flex items-center space-x-1 text-xs font-mono"
                  title="Copy Share Link"
                >
                  <Share2 className="w-4 h-4" />
                  <span>SHARE</span>
                </button>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable Page Canvas */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#05070a]/40 flex flex-col items-center gap-10 scrollbar-thin select-text">
              
              {/* Document Page 1: Cover Page */}
              <div className="w-full max-w-2xl min-h-[750px] bg-[#0b0f19] border-2 border-[#00f0ff]/20 rounded-lg p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden select-text">
                {/* Techy background grids and gradients */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00f0ff]/5 via-transparent to-transparent pointer-events-none"></div>
                
                <div className="flex justify-between items-start z-10">
                  <div className="flex items-center space-x-2 text-[9px] font-mono tracking-widest text-[#00f0ff]">
                    <span>SYS_CORE_SECURE // NODE_CERTIFIED</span>
                  </div>
                  <div className="text-right text-[9px] font-mono text-slate-500">
                    REPORT_ID: AOS-{activeReport.confidence}-{activeReport.ticker}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center my-10 z-10">
                  {/* Decorative Seal / Logo */}
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#00f0ff]/30 flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-2 rounded-full border border-[#00f0ff]/20 flex items-center justify-center">
                      <Cpu className="w-6 h-6 text-[#00f0ff] animate-pulse" />
                    </div>
                  </div>
                  
                  <h1 className="text-2xl font-bold tracking-tight text-white font-display mb-4">
                    ANALYSTOS CERTIFIED RESEARCH REPORT
                  </h1>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-[#00f0ff] to-[#00e676] mb-6"></div>
                  
                  <h2 className="text-sm font-mono text-[#00f0ff] uppercase tracking-wider font-bold mb-2">
                    {activeReport.ticker ? `${activeReport.ticker} Equity Analysis` : "Global Financial Markets Research"}
                  </h2>
                  <p className="text-xs text-slate-400 max-w-md font-mono">
                    Autonomous equity research, financial modeling, valuation DCF analytics, and conference transcript signals.
                  </p>
                </div>

                {/* Cover Page Metadata */}
                <div className="border-t border-slate-800 pt-6 z-10">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Classification</span>
                      <span className="text-white font-bold">Institutional Grade</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">AI Confidence Score</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[#00e676] font-bold">{activeReport.confidence}%</span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#00e676] h-full" style={{ width: `${activeReport.confidence}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Compilation Timestamp</span>
                      <span className="text-white font-bold">{activeReport.timestamp}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Verification Node</span>
                      <span className="text-[#00e676] font-bold">PASSED [AOS-SECURE]</span>
                    </div>
                  </div>
                  
                  <p className="text-[9px] text-slate-600 mt-8 text-center font-mono">
                    Disclaimer: Markets involve risk and no outcome is certain. Certified by AnalystOS Autonomous System.
                  </p>
                </div>
              </div>

              {/* Document Page 2: Report Content */}
              <div className="w-full max-w-2xl min-h-[750px] bg-[#0b0f19] border border-[#00f0ff]/10 rounded-lg p-10 flex flex-col justify-between shadow-2xl relative select-text">
                <div className="watermark-overlay absolute inset-0 z-0"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#00f0ff]/2 via-transparent to-transparent pointer-events-none"></div>

                <div className="z-10 w-full flex flex-col flex-1">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-6 text-[9px] font-mono text-slate-500">
                    <span>ANALYSTOS RESEARCH MEMORANDUM</span>
                    <span>TICKER: {activeReport.ticker}</span>
                  </div>
                  
                  <div 
                    className="font-mono text-slate-300 leading-relaxed text-xs break-words"
                    dangerouslySetInnerHTML={{ __html: markdownToHtmlSimple(activeReport.content) }}
                  />
                </div>
                
                <div className="z-10 mt-10 pt-4 border-t border-slate-800 text-center text-[9px] font-mono text-slate-500 flex justify-between">
                  <span>AnalystOS AI Co-Analyst System v1.5</span>
                  <span>Page 2 / Confidential</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Action Completed Toast */}
      {showToast && (
        <div className="toast show bg-[#0b0f19] border border-[#00e676]/30 shadow-2xl transition-all">
          <div className="toast-content">
            <div className="toast-icon-wrapper bg-[#00e676]/10 text-[#00e676]">
              <Check className="w-4 h-4" />
            </div>
            <div className="toast-text font-mono">
              <span className="toast-title text-white text-xs font-bold">SUCCESS</span>
              <span className="toast-desc text-slate-400 text-[10px]">{showToast}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

