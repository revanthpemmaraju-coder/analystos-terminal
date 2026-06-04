/* eslint-disable */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/navbar";
import TickerBar from "@/components/ticker-bar";
import StockSearchInput, { StockSearchSelection } from "@/components/stock-search-input";
import { Cpu, Send, Trash2, User } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

const isValidUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const baseWelcome =
  "SYS_CORE_ONLINE: AnalystOS Stock AI (Stocks/ETFs only).\n\n" +
  "1) Search & pin a ticker for the best answers (optional).\n" +
  "2) Ask anything: valuation, buy/sell/hold, comps, catalysts, earnings, risk, portfolio sizing.\n" +
  "3) Live prices + charts are pulled from Yahoo Finance.\n\n" +
  'Try: pin "TCS" and ask: "Give me a bull/base/bear case + target price."';

export default function StockAiPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("founder-guest-id"); // guest works without auth

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [sending, setSending] = useState(false);
  const [pinnedStock, setPinnedStock] = useState<StockSearchSelection | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(() => `aos_stock_ai_conv_${userId}`, [userId]);

  useEffect(() => {
    // If user is logged in, use their UUID to enable quota/persistence.
    // Otherwise fall back to guest mode (no login required).
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    </div>
  );
}
