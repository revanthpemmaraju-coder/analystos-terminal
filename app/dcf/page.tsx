/* eslint-disable */
"use client";

import Link from "next/link";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/navbar";
import TickerBar from "@/components/ticker-bar";
import { 
  Calculator, ShieldAlert, Sparkles, Save, Share2, 
  RefreshCw, TrendingUp, Info, DollarSign, ChevronRight
} from "lucide-react";

export default function DcfSandboxPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedModels, setSavedModels] = useState<any[]>([]);

  // Form Inputs
  const [modelName, setModelName] = useState("Reliance Valuation Comps");
  const [revenue, setRevenue] = useState(120000); // in ₹ Lakhs
  const [ebitda, setEbitda] = useState(25000); // in ₹ Lakhs
  const [growthRate, setGrowthRate] = useState(12.0); // %
  const [wacc, setWacc] = useState(9.5); // %
  const [exitMultiple, setExitMultiple] = useState(15.0); // x
  const [outstandingShares, setOutstandingShares] = useState(100); // Lakhs
  const [netDebt, setNetDebt] = useState(15000); // Lakhs

  // Recalculated outputs
  const [projections, setProjections] = useState<any[]>([]);
  const [enterpriseValue, setEnterpriseValue] = useState(0);
  const [equityValue, setEquityValue] = useState(0);
  const [impliedPrice, setImpliedPrice] = useState(0);
  const [sensitivityGrid, setSensitivityGrid] = useState<any[]>([]);

  // Protect route & Fetch session
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      // Fetch user profiles plan
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

      if (prof && prof.plan !== "free") {
        fetchSavedModels(session.user.id);
      }
    }
    checkAuth();
  }, [router]);

  async function fetchSavedModels(userId: string) {
    const { data } = await supabase
      .from("dcf_models")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setSavedModels(data);
  }

  // Real-time valuation logic
  useEffect(() => {
    // 1. Project EBITDA for 5 Years
    const projected: any[] = [];
    let currentEbitda = ebitda;
    const rate = growthRate / 100;
    const discount = wacc / 100;
    
    let sumPV = 0;
    for (let i = 1; i <= 5; i++) {
      currentEbitda = currentEbitda * (1 + rate);
      const discountFactor = 1 / Math.pow(1 + discount, i);
      const pv = currentEbitda * discountFactor;
      sumPV += pv;
      projected.push({
        year: i,
        ebitda: Number(currentEbitda.toFixed(2)),
        df: Number(discountFactor.toFixed(4)),
        pv: Number(pv.toFixed(2))
      });
    }
    setProjections(projected);

    // 2. Terminal Value
    const tv = projected[4].ebitda * exitMultiple;
    const pvTV = tv / Math.pow(1 + discount, 5);
    const ev = sumPV + pvTV;
    setEnterpriseValue(Number(ev.toFixed(2)));

    // 3. Equity Value and Intrinsic Price
    const eqVal = ev - netDebt;
    setEquityValue(Number(eqVal.toFixed(2)));
    
    const price = eqVal / outstandingShares;
    setImpliedPrice(Number(price.toFixed(2)));

    // 4. Sensitivity Analysis (WACC vs Growth Rate)
    const waccSteps = [wacc - 2, wacc - 1, wacc, wacc + 1, wacc + 2];
    const growthSteps = [growthRate - 2, growthRate - 1, growthRate, growthRate + 1, growthRate + 2];
    
    const grid = waccSteps.map(wStep => {
      const row = growthSteps.map(gStep => {
        let tempEbitda = ebitda;
        const rTemp = gStep / 100;
        const dTemp = wStep / 100;
        let sumTempPV = 0;
        
        for (let i = 1; i <= 5; i++) {
          tempEbitda = tempEbitda * (1 + rTemp);
          sumTempPV += tempEbitda / Math.pow(1 + dTemp, i);
        }
        
        const tvTemp = tempEbitda * exitMultiple;
        const pvTVTemp = tvTemp / Math.pow(1 + dTemp, 5);
        const evTemp = sumTempPV + pvTVTemp;
        const eqTemp = evTemp - netDebt;
        const priceTemp = eqTemp / outstandingShares;
        return Number(priceTemp.toFixed(2));
      });
      return { waccValue: wStep, row };
    });
    setSensitivityGrid(grid);

  }, [ebitda, growthRate, wacc, exitMultiple, outstandingShares, netDebt]);

  const handleSaveModel = async () => {
    if (!user || saving) return;
    setSaving(true);

    const modelPayload = {
      name: modelName,
      inputs: { revenue, ebitda, growthRate, wacc, exitMultiple, outstandingShares, netDebt },
      result: { enterpriseValue, equityValue, impliedPrice }
    };

    try {
      const { error } = await supabase.from("dcf_models").insert([
        {
          user_id: user.id,
          name: modelName,
          inputs: modelPayload.inputs,
          result: modelPayload.result,
          created_at: new Date()
        }
      ]);

      if (error) throw error;
      alert("✓ DCF Valuation model saved successfully!");
      fetchSavedModels(user.id);
    } catch (err: any) {
      alert(`Save Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadModel = (model: any) => {
    setModelName(model.name);
    setRevenue(model.inputs.revenue);
    setEbitda(model.inputs.ebitda);
    setGrowthRate(model.inputs.growthRate);
    setWacc(model.inputs.wacc);
    setExitMultiple(model.inputs.exitMultiple);
    setOutstandingShares(model.inputs.outstandingShares);
    setNetDebt(model.inputs.netDebt);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono items-center justify-center space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-400">CONNECTING_DCF_SANDBOX_PORT...</span>
      </div>
    );
  }

  // Dynamic gate redirecting free users
  const isFree = profile?.plan === "free";

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Gate Block Banner for Free Plan */}
        {isFree ? (
          <div className="border border-[#ff3860]/20 bg-[#ff3860]/5 p-8 rounded-lg text-center space-y-4 max-w-xl mx-auto select-none my-12 shadow-2xl">
            <ShieldAlert className="w-12 h-12 text-[#ff3860] mx-auto animate-pulse" />
            <h3 className="text-lg font-bold text-white uppercase">[DCF_SANDBOX: ACCESS_DENIED]</h3>
            <p className="text-slate-400 font-sans text-xs leading-relaxed">
              Discounted Cash Flow (DCF) Sandbox modeling and multi-scenario sensitivity engines are locked under the Free plan. Activate the PRO key to unleash professional Excel-style valuation spreadsheets.
            </p>
            <Link href="/signup?upgrade=true" className="inline-block bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-6 py-2.5 rounded transition-colors text-xs">
              ACTIVATE_PRO_KEY_NOW
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Active Header details */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-3 gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <Calculator className="w-4 h-4 text-[#00f0ff]" />
                <span className="text-white font-bold uppercase">VALUATION_DCF_SPREADSHEET</span>
                <span className="terminal-badge">SANDBOX_ACTIVE</span>
              </div>
              
              <div className="flex items-center space-x-3 text-xs">
                <input
                  type="text"
                  value={modelName}
                  onChange={e => setModelName(e.target.value)}
                  className="bg-[#05070a] border border-slate-900 px-3 py-1.5 rounded text-white text-xs outline-none focus:border-[#00f0ff]"
                />
                <button
                  onClick={handleSaveModel}
                  disabled={saving}
                  className="bg-[#00e676] hover:bg-[#00e676]/80 text-[#05070a] font-bold px-3 py-1.5 rounded flex items-center space-x-1"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>SAVE_MODEL</span>
                </button>
              </div>
            </div>

            {/* Core Model grids */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1: Financial Assumptions Inputs */}
              <div className="terminal-card rounded-lg p-6 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-900 pb-3 text-xs">
                  <TrendingUp className="w-4 h-4 text-[#00f0ff]" />
                  <span className="text-white font-bold uppercase">VALUATION_INPUTS</span>
                </div>

                <div className="space-y-3.5 text-xs font-mono">
                  {/* Revenue */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-500">INITIAL ANNUAL REVENUE (₹ LAKHS)</label>
                    <input 
                      type="number" 
                      value={revenue} 
                      onChange={e => setRevenue(Number(e.target.value))}
                      className="bg-[#05070a] border border-slate-900 px-3 py-2 rounded text-white font-bold" 
                    />
                  </div>

                  {/* EBITDA */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-500">INITIAL ANNUAL EBITDA (₹ LAKHS)</label>
                    <input 
                      type="number" 
                      value={ebitda} 
                      onChange={e => setEbitda(Number(e.target.value))}
                      className="bg-[#05070a] border border-slate-900 px-3 py-2 rounded text-white font-bold" 
                    />
                  </div>

                  {/* EBITDA Growth Rate */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-500">EBITDA GROWTH RATE (%)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={growthRate} 
                      onChange={e => setGrowthRate(Number(e.target.value))}
                      className="bg-[#05070a] border border-slate-900 px-3 py-2 rounded text-white font-bold" 
                    />
                  </div>

                  {/* WACC */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-500">DISCOUNT RATE - WACC (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={wacc} 
                      onChange={e => setWacc(Number(e.target.value))}
                      className="bg-[#05070a] border border-slate-900 px-3 py-2 rounded text-white font-bold" 
                    />
                  </div>

                  {/* Exit Multiple */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-500">TERMINAL EXIT MULTIPLE (EBITDA x)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={exitMultiple} 
                      onChange={e => setExitMultiple(Number(e.target.value))}
                      className="bg-[#05070a] border border-slate-900 px-3 py-2 rounded text-white font-bold" 
                    />
                  </div>

                  {/* Shares Outstanding */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-500">SHARES OUTSTANDING (LAKHS)</label>
                    <input 
                      type="number" 
                      value={outstandingShares} 
                      onChange={e => setOutstandingShares(Number(e.target.value))}
                      className="bg-[#05070a] border border-slate-900 px-3 py-2 rounded text-white font-bold" 
                    />
                  </div>

                  {/* Net Debt */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-slate-500">NET CORPORATE DEBT (₹ LAKHS)</label>
                    <input 
                      type="number" 
                      value={netDebt} 
                      onChange={e => setNetDebt(Number(e.target.value))}
                      className="bg-[#05070a] border border-slate-900 px-3 py-2 rounded text-white font-bold" 
                    />
                  </div>
                </div>
              </div>

              {/* Column 2 & 3: Recalculated Projections & sensitivity */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Intrinsic value output banner */}
                <div className="terminal-card rounded-lg p-6 bg-[#00f0ff]/5 border border-[#00f0ff]/20 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="text-center sm:text-left space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">ENTERPRISE VALUE</span>
                    <h3 className="text-lg font-bold text-white">₹{enterpriseValue.toLocaleString()} L</h3>
                  </div>
                  
                  <div className="text-center sm:text-left space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">EQUITY VALUE</span>
                    <h3 className="text-lg font-bold text-slate-200">₹{equityValue.toLocaleString()} L</h3>
                  </div>

                  <div className="text-center bg-[#05070a] border border-[#00f0ff]/20 p-3 rounded space-y-1 flex flex-col justify-center">
                    <span className="text-[9px] text-[#00f0ff] font-bold uppercase">INTRINSIC SHARE PRICE</span>
                    <h2 className="text-2xl font-bold text-[#00e676]">₹{impliedPrice.toFixed(2)}</h2>
                  </div>
                </div>

                {/* 5-Year pro-forma forecast ledger */}
                <div className="terminal-card rounded-lg p-6">
                  <div className="flex items-center space-x-2 border-b border-slate-900 pb-3 text-xs mb-4">
                    <Info className="w-4 h-4 text-[#00f0ff]" />
                    <span className="text-white font-bold uppercase">5-YEAR PRO-FORMA FORECAST LEDGER</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left terminal-table text-xs">
                      <thead>
                        <tr>
                          <th>YEAR</th>
                          <th className="text-right">EBITDA (₹ LAKHS)</th>
                          <th className="text-right">DISCOUNT FACTOR</th>
                          <th className="text-right">PRESENT VALUE (₹ LAKHS)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projections.map((proj, idx) => (
                          <tr key={idx}>
                            <td className="font-bold text-white py-2">Year {proj.year}</td>
                            <td className="text-right text-slate-300">{proj.ebitda.toLocaleString()}</td>
                            <td className="text-right text-slate-500">{proj.df}</td>
                            <td className="text-right text-[#00e676] font-bold">{proj.pv.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* WACC vs Growth Sensitivity Grid */}
                <div className="terminal-card rounded-lg p-6">
                  <div className="flex items-center space-x-2 border-b border-slate-900 pb-3 text-xs mb-4">
                    <Calculator className="w-4 h-4 text-[#00e676]" />
                    <span className="text-white font-bold uppercase">WACC VS GROWTH INTRINSIC PRICE MATRIX</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-900">
                          <th className="text-slate-500 text-left p-2">WACC \ Growth</th>
                          {[(growthRate-2), (growthRate-1), growthRate, (growthRate+1), (growthRate+2)].map((g, i) => (
                            <th key={i} className="text-slate-400 p-2 font-bold">{g.toFixed(1)}%</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sensitivityGrid.map((rowItem, rIdx) => (
                          <tr key={rIdx} className="border-b border-slate-950/20">
                            <td className="text-slate-400 font-bold text-left p-2 bg-[#05070a]">{rowItem.waccValue.toFixed(1)}%</td>
                            {rowItem.row.map((val: number, cIdx: number) => {
                              const isBase = rowItem.waccValue === wacc && cIdx === 2;
                              return (
                                <td 
                                  key={cIdx} 
                                  className={`p-2 font-bold ${
                                    isBase 
                                      ? "bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 rounded" 
                                      : "text-slate-300"
                                  }`}
                                >
                                  ₹{val.toFixed(0)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Saved Models Index */}
                {savedModels.length > 0 && (
                  <div className="terminal-card rounded-lg p-6">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">SAVED_DCF_MODELS</span>
                    <div className="flex flex-col gap-2 mt-3 text-xs">
                      {savedModels.map((m, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-[#05070a] p-2.5 border border-slate-950 rounded">
                          <div>
                            <span className="text-white font-bold">{m.name}</span>
                            <p className="text-[9px] text-slate-500 mt-0.5">Price: ₹{m.result.impliedPrice.toFixed(2)} | WACC: {m.inputs.wacc}%</p>
                          </div>
                          <button
                            onClick={() => handleLoadModel(m)}
                            className="text-[#00f0ff] hover:underline flex items-center space-x-1"
                          >
                            <span>[LOAD]</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
