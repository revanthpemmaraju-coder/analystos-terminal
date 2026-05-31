/* eslint-disable */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/navbar";
import TickerBar from "@/components/ticker-bar";
import { 
  Wallet, ShieldAlert, Save, RefreshCw, 
  Trash2, Plus, Minus, BarChart3, TrendingUp, HelpCircle
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  LineChart, Line, XAxis, YAxis, Tooltip, Legend 
} from "recharts";

interface Holding {
  ticker: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Paper portfolio states
  const [portfolioName, setPortfolioName] = useState("Analyst Core Fund");
  const [cashBalance, setCashBalance] = useState(150000); // ₹ Lakhs baseline cash
  const [holdings, setHoldings] = useState<Holding[]>([
    { ticker: "RELIANCE", name: "Reliance Industries", shares: 120, avgPrice: 2380.00, currentPrice: 2450.40 },
    { ticker: "TCS", name: "Tata Consultancy Services", shares: 45, avgPrice: 3620.00, currentPrice: 3820.15 },
    { ticker: "HDFCBANK", name: "HDFC Bank Ltd.", shares: 180, avgPrice: 1540.00, currentPrice: 1510.60 }
  ]);

  // Transaction form states
  const [txTicker, setTxTicker] = useState("");
  const [txShares, setTxShares] = useState(10);
  const [txPrice, setTxPrice] = useState(1000);
  const [txError, setTxError] = useState("");

  // Protect route & Fetch session
  useEffect(() => {
    async function checkAuth() {
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
      
      if (prof) {
        setProfile(prof);
      } else {
        setProfile({ plan: "free", name: "User" });
      }

      // Fetch existing portfolio holdings from Supabase
      const { data: port } = await supabase
        .from("portfolios")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (port) {
        setPortfolioName(port.name);
        if (port.holdings && port.holdings.length > 0) {
          setHoldings(port.holdings);
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  // Save holdings state to Supabase
  const handleSavePortfolio = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("portfolios")
        .upsert({
          user_id: user.id,
          name: portfolioName,
          holdings: holdings,
          created_at: new Date()
        }, { onConflict: "user_id" });

      if (error) throw error;
      alert("✓ Paper Portfolio logged securely in Supabase!");
    } catch (err: any) {
      alert(`Save Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Transaction order executions
  const handleBuyOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setTxError("");
    const ticker = txTicker.trim().toUpperCase();
    if (!ticker || txShares <= 0 || txPrice <= 0) return setTxError("Provide valid order inputs.");

    const totalCost = txShares * txPrice;
    if (totalCost > cashBalance) {
      return setTxError("Insufficient cash buffer to complete buy order.");
    }

    setCashBalance(prev => prev - totalCost);

    const existingIdx = holdings.findIndex(h => h.ticker === ticker);
    if (existingIdx !== -1) {
      const current = holdings[existingIdx];
      const newShares = current.shares + txShares;
      const newAvg = ((current.shares * current.avgPrice) + totalCost) / newShares;
      const updated = [...holdings];
      updated[existingIdx] = {
        ...current,
        shares: newShares,
        avgPrice: Number(newAvg.toFixed(2)),
        currentPrice: txPrice // Assuming price represents current quote
      };
      setHoldings(updated);
    } else {
      setHoldings([
        ...holdings,
        { ticker, name: `${ticker} Equity`, shares: txShares, avgPrice: txPrice, currentPrice: txPrice }
      ]);
    }

    setTxTicker("");
    setTxShares(10);
    setTxPrice(1000);
  };

  const handleSellOrder = (ticker: string, sharesToSell: number, price: number) => {
    const existingIdx = holdings.findIndex(h => h.ticker === ticker);
    if (existingIdx === -1) return;

    const current = holdings[existingIdx];
    if (sharesToSell > current.shares) return alert("Holdings buffer insufficient to sell specified shares.");

    const proceeds = sharesToSell * price;
    setCashBalance(prev => prev + proceeds);

    const updated = [...holdings];
    if (sharesToSell === current.shares) {
      updated.splice(existingIdx, 1);
    } else {
      updated[existingIdx] = {
        ...current,
        shares: current.shares - sharesToSell
      };
    }
    setHoldings(updated);
  };

  // Calculations for portfolio summary metrics
  const totalInvested = holdings.reduce((sum, h) => sum + (h.shares * h.avgPrice), 0);
  const currentVal = holdings.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
  const portfolioPnl = currentVal - totalInvested;
  const portfolioPnlPercent = totalInvested > 0 ? (portfolioPnl / totalInvested) * 100 : 0;
  const navValue = currentVal + cashBalance;

  // Sector Pie chart configurations
  const COLORS = ["#00f0ff", "#00e676", "#ff3860", "#c084fc", "#e2e8f0"];
  const pieData = holdings.map(h => ({
    name: h.ticker,
    value: Number((h.shares * h.currentPrice).toFixed(2))
  }));

  // Benchmark returns comparative data (Yearly projections)
  const chartData = [
    { name: "JAN", Fund: 100, Nifty50: 100 },
    { name: "FEB", Fund: 108, Nifty50: 102 },
    { name: "MAR", Fund: 112, Nifty50: 104 },
    { name: "APR", Fund: 110, Nifty50: 107 },
    { name: "MAY", Fund: 124, Nifty50: 109 }
  ];

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono items-center justify-center space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-400">CONNECTING_PORTFOLIO_NODE...</span>
      </div>
    );
  }

  // Quota locks: Free plan limited to 1 portfolio
  const plan = profile?.plan || "free";

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Dynamic header logs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-3 gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <Wallet className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-white font-bold uppercase">PORTFOLIO_SIMULATOR</span>
            <span className="terminal-badge">PAPER_TRADING_ACTIVE</span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <input
              type="text"
              value={portfolioName}
              onChange={e => setPortfolioName(e.target.value)}
              className="bg-[#05070a] border border-slate-900 px-3 py-1.5 rounded text-white text-xs outline-none focus:border-[#00f0ff]"
            />
            <button
              onClick={handleSavePortfolio}
              disabled={saving}
              className="bg-[#00e676] hover:bg-[#00e676]/80 text-[#05070a] font-bold px-3 py-1.5 rounded flex items-center space-x-1"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>SAVE_PORTFOLIO</span>
            </button>
          </div>
        </div>

        {/* Portfolio Summary Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 select-none">
          <div className="terminal-card rounded-lg p-5 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">NET ASSET VALUE (NAV)</span>
            <h3 className="text-lg font-bold text-white">₹{navValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
            <span className="text-[9px] text-slate-400">Cash + Equity balances</span>
          </div>

          <div className="terminal-card rounded-lg p-5 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">INVESTED CAPITAL</span>
            <h3 className="text-lg font-bold text-slate-200">₹{totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
            <span className="text-[9px] text-slate-400">Total buy margins</span>
          </div>

          <div className="terminal-card rounded-lg p-5 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">BUYING POWER CASH</span>
            <h3 className="text-lg font-bold text-[#00f0ff]">₹{cashBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h3>
            <span className="text-[9px] text-slate-400">Liquid reserves available</span>
          </div>

          <div className="terminal-card rounded-lg p-5 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">TOTAL PORTFOLIO P&L</span>
            <h3 className={`text-lg font-bold ${portfolioPnl >= 0 ? "text-[#00e676]" : "text-[#ff3860]"}`}>
              ₹{portfolioPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({portfolioPnl >= 0 ? "+" : ""}{portfolioPnlPercent.toFixed(2)}%)
            </h3>
            <span className="text-[9px] text-slate-400">Unrealized gains stream</span>
          </div>
        </div>

        {/* Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Active Holdings Ledger & Transactions form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Holdings table */}
            <div className="terminal-card rounded-lg p-6">
              <span className="text-[10px] text-slate-500 font-bold uppercase border-b border-slate-900 pb-2 mb-4 block">ACTIVE_EQUITY_HOLDINGS</span>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left terminal-table text-xs">
                  <thead>
                    <tr>
                      <th>TICKER</th>
                      <th className="text-right">SHARES</th>
                      <th className="text-right">AVG_BUY (₹)</th>
                      <th className="text-right">CURRENT (₹)</th>
                      <th className="text-right">INVESTED</th>
                      <th className="text-right">P&L</th>
                      <th className="text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h, i) => {
                      const cost = h.shares * h.avgPrice;
                      const value = h.shares * h.currentPrice;
                      const pnl = value - cost;
                      const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
                      return (
                        <tr key={i}>
                          <td className="font-bold text-white py-2.5">{h.ticker}</td>
                          <td className="text-right">{h.shares}</td>
                          <td className="text-right text-slate-400">{h.avgPrice.toFixed(2)}</td>
                          <td className="text-right text-slate-300 font-bold">{h.currentPrice.toFixed(2)}</td>
                          <td className="text-right text-slate-400">{cost.toLocaleString()}</td>
                          <td className={`text-right font-bold ${pnl >= 0 ? "text-[#00e676]" : "text-[#ff3860]"}`}>
                            ₹{pnl.toFixed(0)} ({pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%)
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => handleSellOrder(h.ticker, h.shares, h.currentPrice)}
                              className="text-[#ff3860] hover:underline hover:bg-red-500/10 px-2 py-1 rounded text-[10px] font-bold"
                            >
                              [LIQUIDATE]
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaction entry form */}
            <div className="terminal-card rounded-lg p-6">
              <span className="text-[10px] text-slate-500 font-bold uppercase border-b border-slate-900 pb-2 mb-4 block">EXECUTE_SIMULATED_ORDER</span>
              
              {txError && (
                <div className="bg-[#ff3860]/10 border border-[#ff3860]/20 text-[#ff3860] p-2.5 rounded text-xs text-center mb-4">
                  {txError}
                </div>
              )}

              <form onSubmit={handleBuyOrder} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end text-xs font-mono">
                <div className="flex flex-col space-y-1">
                  <label className="text-slate-500 text-[10px] uppercase">TICKER</label>
                  <input
                    type="text"
                    required
                    value={txTicker}
                    onChange={e => setTxTicker(e.target.value)}
                    placeholder="e.g. INFY"
                    className="bg-[#05070a] border border-slate-900 rounded p-2 text-white outline-none focus:border-[#00f0ff]"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-slate-500 text-[10px] uppercase">QUANTITY (SHARES)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={txShares}
                    onChange={e => setTxShares(Number(e.target.value))}
                    className="bg-[#05070a] border border-slate-900 rounded p-2 text-white outline-none focus:border-[#00f0ff]"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-slate-500 text-[10px] uppercase">BUY PRICE (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={txPrice}
                    onChange={e => setTxPrice(Number(e.target.value))}
                    className="bg-[#05070a] border border-slate-900 rounded p-2 text-white outline-none focus:border-[#00f0ff]"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold py-2 rounded text-xs font-mono transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>TRANSMIT BUY</span>
                </button>
              </form>
            </div>
          </div>

          {/* Column 3: Allocation Charts vs Benchmark */}
          <div className="space-y-6">
            
            {/* Holdings Weight Pie Chart */}
            <div className="terminal-card rounded-lg p-6">
              <span className="text-[10px] text-slate-500 font-bold uppercase border-b border-slate-900 pb-2 mb-4 block">SECTOR_ALLOCATION_WEIGHTS</span>
              
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: "#0b0f19", border: "1px solid rgba(0,240,255,0.15)", borderRadius: "4px" }}
                      itemStyle={{ color: "#fff", fontSize: "11px", fontFamily: "monospace" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends list */}
              <div className="flex flex-wrap justify-center gap-4 text-[10px] font-mono mt-2">
                {holdings.map((h, i) => (
                  <div key={i} className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                    <span className="text-slate-400">{h.ticker} ({((h.shares * h.currentPrice) / currentVal * 100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance line chart vs NIFTY 50 */}
            <div className="terminal-card rounded-lg p-6">
              <span className="text-[10px] text-slate-500 font-bold uppercase border-b border-slate-900 pb-2 mb-4 block">PORTFOLIO_RETURNS_VS_BENCHMARK</span>
              
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ background: "#0b0f19", border: "1px solid rgba(0,240,255,0.15)", borderRadius: "4px" }}
                      itemStyle={{ fontSize: "11px", fontFamily: "monospace" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                    <Line type="monotone" dataKey="Fund" name="Core Fund" stroke="#00f0ff" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Nifty50" name="Nifty 50" stroke="#00e676" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
