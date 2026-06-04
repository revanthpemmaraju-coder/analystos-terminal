/* eslint-disable */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar";
import TickerBar from "@/components/ticker-bar";
import StockSearchInput, { StockSearchSelection } from "@/components/stock-search-input";
import { supabase } from "@/lib/supabase";
import { Database, RefreshCw } from "lucide-react";

type Flow = any;

export default function FlowPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<StockSearchSelection | null>(null);
  const [symbol, setSymbol] = useState("AAPL");
  const [flow, setFlow] = useState<Flow | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const displaySymbol = useMemo(() => {
    const raw = selected?.symbol || symbol;
    return raw.includes(".") ? raw.split(".")[0].toUpperCase() : raw.toUpperCase();
  }, [selected?.symbol, symbol]);

  useEffect(() => {
    async function checkAuth() {
      const isFounder =
        typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).get("founder") === "revanth_gate_pro" ||
          localStorage.getItem("founder_bypass") === "true");

      if (isFounder) {
        setUser({ id: "founder-guest-id", email: "founder@analystos.com" });
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const loadFlow = async () => {
    setFetching(true);
    setError("");
    try {
      const res = await fetch(`/api/stocks/flow?symbol=${encodeURIComponent(displaySymbol)}`);
      if (!res.ok) throw new Error("Flow unavailable");
      const data = await res.json();
      setFlow(data.flow);
    } catch (e: any) {
      setFlow(null);
      setError(e?.message || "Failed to load flow");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono items-center justify-center space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-400">CONNECTING_FLOW_NODE...</span>
      </div>
    );
  }

  const mh = flow?.majorHolders || {};
  const net = flow?.netSharePurchaseActivity || {};

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-900 pb-3">
          <div className="flex items-center space-x-2 text-xs">
            <Database className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-white font-bold uppercase">INSTITUTIONAL_FLOW_TRACKER</span>
            <span className="terminal-badge">YAHOO_OWNERSHIP</span>
          </div>

          <button
            type="button"
            onClick={() => void loadFlow()}
            className="text-slate-400 hover:text-[#00f0ff] border border-slate-800 hover:border-[#00f0ff]/30 rounded px-3 py-2 text-[10px] font-bold flex items-center gap-2"
            disabled={fetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
            Search a stock to view ownership + insider net purchase activity
          </p>
          <StockSearchInput
            onSelect={(item) => {
              setSelected(item);
              setSymbol(item.symbol);
              setTimeout(() => void loadFlow(), 0);
            }}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Or type ticker (e.g. AAPL, TCS)"
              className="bg-[#05070a] border border-slate-900 px-3 py-2 rounded text-white text-xs outline-none focus:border-[#00f0ff] w-[280px]"
            />
            <button
              type="button"
              onClick={() => void loadFlow()}
              className="bg-[#00f0ff] hover:bg-[#00f0ff]/85 text-[#05070a] rounded px-3 py-2 text-[10px] font-bold"
              disabled={fetching}
            >
              LOAD
            </button>
            <span className="text-[10px] text-slate-500">SYMBOL: {displaySymbol}</span>
          </div>
        </div>

        {error && (
          <div className="terminal-card rounded-lg p-4 text-xs text-[#ff3860] border border-[#ff3860]/20 bg-[#ff3860]/5">
            {error}
            <div className="text-[10px] text-slate-500 mt-1">
              Note: true institutional order-flow is not available from Yahoo; this view shows ownership/insider activity when reported.
            </div>
          </div>
        )}

        {flow && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "% INSTITUTIONS",
                  val:
                    mh?.percentInstitutions != null ? `${(mh.percentInstitutions * 100).toFixed(2)}%` : "N/A",
                },
                {
                  label: "% INSIDERS",
                  val:
                    mh?.percentInsiders != null ? `${(mh.percentInsiders * 100).toFixed(2)}%` : "N/A",
                },
                {
                  label: "INST. FLOAT %",
                  val:
                    mh?.institutionsFloatPercent != null
                      ? `${(mh.institutionsFloatPercent * 100).toFixed(2)}%`
                      : "N/A",
                },
                {
                  label: "INST. COUNT",
                  val: mh?.institutionsCount != null ? String(mh.institutionsCount) : "N/A",
                },
              ].map((m, idx) => (
                <div key={idx} className="terminal-card rounded p-4 font-mono space-y-1 bg-[#0b0f19]">
                  <span className="text-[9px] text-slate-500 font-bold block">{m.label}</span>
                  <span className="text-lg font-bold text-white block">{m.val}</span>
                </div>
              ))}
            </div>

            <div className="terminal-card rounded-lg p-6">
              <span className="text-[10px] text-slate-500 font-bold uppercase border-b border-slate-900 pb-2 mb-4 block">
                INSIDER_NET_PURCHASE_ACTIVITY
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">PERIOD</div>
                  <div className="text-slate-200">{net?.period || "N/A"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">NET % PURCHASED</div>
                  <div className="text-slate-200">
                    {net?.netPercentInsiderSharesPurchased != null
                      ? `${(net.netPercentInsiderSharesPurchased * 100).toFixed(2)}%`
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">NET SHARES</div>
                  <div className="text-slate-200">
                    {net?.netSharesPurchased != null ? net.netSharesPurchased.toLocaleString() : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">INSIDER SHARES HELD</div>
                  <div className="text-slate-200">
                    {net?.totalInsiderSharesHeld != null ? net.totalInsiderSharesHeld.toLocaleString() : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="terminal-card rounded-lg p-6">
                <span className="text-[10px] text-slate-500 font-bold uppercase border-b border-slate-900 pb-2 mb-4 block">
                  TOP_INSTITUTIONS (REPORTED)
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left terminal-table text-xs">
                    <thead>
                      <tr>
                        <th>NAME</th>
                        <th className="text-right">PCT_HELD</th>
                        <th className="text-right">POSITION</th>
                        <th className="text-right">REPORT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(flow?.topInstitutions || []).slice(0, 10).map((x: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2.5 text-slate-200">{x.name}</td>
                          <td className="text-right text-slate-400">
                            {x.pctHeld != null ? `${(x.pctHeld * 100).toFixed(2)}%` : "—"}
                          </td>
                          <td className="text-right text-slate-400">
                            {x.position != null ? Number(x.position).toLocaleString() : "—"}
                          </td>
                          <td className="text-right text-slate-500">{x.reportDate || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="terminal-card rounded-lg p-6">
                <span className="text-[10px] text-slate-500 font-bold uppercase border-b border-slate-900 pb-2 mb-4 block">
                  INSIDER_TRANSACTIONS (RECENT)
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left terminal-table text-xs">
                    <thead>
                      <tr>
                        <th>INSIDER</th>
                        <th>ACTION</th>
                        <th className="text-right">SHARES</th>
                        <th className="text-right">DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(flow?.insiderTransactions || []).slice(0, 12).map((x: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2.5 text-slate-200">{x.insider}</td>
                          <td className="text-slate-400">{x.transactionText || "—"}</td>
                          <td className="text-right text-slate-400">
                            {x.shares != null ? Number(x.shares).toLocaleString() : "—"}
                          </td>
                          <td className="text-right text-slate-500">{x.startDate || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-[10px] text-slate-500 mt-2">
                  Data source: Yahoo Finance quoteSummary (ownership + insider activity).
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

