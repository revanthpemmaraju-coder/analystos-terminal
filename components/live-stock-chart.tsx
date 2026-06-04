"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw, TrendingUp } from "lucide-react";
import StockSearchInput, { StockSearchSelection } from "@/components/stock-search-input";
import type { ChartRange } from "@/lib/market-data";

const RANGES: { id: ChartRange; label: string }[] = [
  { id: "1d", label: "1D" },
  { id: "5d", label: "5D" },
  { id: "1mo", label: "1M" },
  { id: "3mo", label: "3M" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "5y", label: "5Y" },
];

interface LiveStockChartProps {
  initialSymbol?: string;
  symbolOptions?: string[];
  compact?: boolean;
}

export default function LiveStockChart({
  initialSymbol = "AAPL",
  symbolOptions = [],
  compact = false,
}: LiveStockChartProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [range, setRange] = useState<ChartRange>("1mo");
  const [points, setPoints] = useState<
    Array<{ date: string; close: number; volume: number }>
  >([]);
  const [quote, setQuote] = useState<{
    name: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    displaySymbol: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [streamStatus, setStreamStatus] = useState<
    "connecting" | "live" | "offline"
  >("connecting");
  const [lastTick, setLastTick] = useState<string>("");

  // Keep internal symbol synced when parent changes initialSymbol (Dashboard selector, etc.)
  useEffect(() => {
    const next = (initialSymbol || "").trim();
    if (!next) return;
    const t = setTimeout(() => setSymbol(next), 0);
    return () => clearTimeout(t);
  }, [initialSymbol]);

  const loadChart = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/stocks/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`
      );
      if (!res.ok) throw new Error("Chart unavailable");
      const data = await res.json();
      if (!data.points?.length) throw new Error("No price history for this symbol");
      setPoints(
        data.points.map((p: { date: string; close: number; volume: number }) => ({
          date: p.date,
          close: p.close,
          volume: p.volume,
        }))
      );
      if (data.quote) {
        setQuote({
          name: data.quote.name,
          price: data.quote.price,
          change: data.quote.change,
          changePercent: data.quote.changePercent,
          currency: data.quote.currency,
          displaySymbol: data.quote.displaySymbol,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load chart");
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadChart();
    }, 0);
    return () => clearTimeout(t);
  }, [loadChart]);

  // Real-time quote stream (SSE). Chart history still refreshes on a slower cadence.
  useEffect(() => {
    if (typeof window === "undefined" || !symbol) return;
    const t = setTimeout(() => setStreamStatus("connecting"), 0);

    const url = `/api/stocks/stream?symbols=${encodeURIComponent(
      symbol
    )}&intervalMs=5000`;
    const es = new EventSource(url);

    const onReady = () => setStreamStatus("live");
    const onQuotes = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data);
        if (!Array.isArray(payload)) return;
        const row = payload.find(
          (x) => x?.ok && x?.quote?.displaySymbol?.toUpperCase() === symbol.toUpperCase()
        );
        if (row?.quote) {
          setQuote({
            name: row.quote.name,
            price: row.quote.price,
            change: row.quote.change,
            changePercent: row.quote.changePercent,
            currency: row.quote.currency,
            displaySymbol: row.quote.displaySymbol,
          });
          setLastTick(row.ts || new Date().toISOString());
          setStreamStatus("live");
        }
      } catch {
        /* ignore */
      }
    };

    es.addEventListener("ready", onReady as any);
    es.addEventListener("quotes", onQuotes as any);
    es.onerror = () => setStreamStatus("offline");

    return () => {
      clearTimeout(t);
      es.close();
    };
  }, [symbol]);

  useEffect(() => {
    const id = setInterval(loadChart, range === "1d" ? 60_000 : 120_000);
    return () => clearInterval(id);
  }, [loadChart, range]);

  const onSearchSelect = (item: StockSearchSelection) => {
    const display = item.symbol.includes(".")
      ? item.symbol.split(".")[0]
      : item.symbol;
    setSymbol(display);
  };

  const isUp = (quote?.changePercent ?? 0) >= 0;
  const currencyPrefix =
    quote?.currency === "INR" ? "₹" : quote?.currency === "USD" ? "$" : "";

  return (
    <div
      className={`bg-[#080c16] border border-white/[0.06] rounded-2xl ${compact ? "p-4" : "p-6"}`}
    >
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest">
              LIVE_PRICE_CHART
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                streamStatus === "live"
                  ? "bg-[#34d399] animate-pulse"
                  : streamStatus === "connecting"
                    ? "bg-[#ffdd57] animate-pulse"
                    : "bg-[#ff3860]"
              }`}
              title={
                streamStatus === "live"
                  ? `Streaming quotes (last: ${lastTick || "—"})`
                  : streamStatus === "connecting"
                    ? "Connecting to quote stream…"
                    : "Quote stream offline — falling back to polling."
              }
            />
          </div>
          <button
            type="button"
            onClick={loadChart}
            className="text-slate-500 hover:text-[#00f0ff] p-1"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {symbolOptions.length > 0 && (
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-slate-950 border border-white/10 text-[#00f0ff] text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg outline-none"
            >
              {symbolOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <div className="flex-1 min-w-[200px]">
            <StockSearchInput onSelect={onSearchSelect} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-2.5 py-1 rounded text-[9px] font-mono font-bold transition-colors ${
                range === r.id
                  ? "bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40"
                  : "text-slate-500 border border-transparent hover:text-slate-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {quote && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
          <span className="text-[10px] font-mono text-[#00f0ff]">
            {quote.displaySymbol}
          </span>
          <span className="text-lg font-bold text-white font-mono truncate max-w-full">
            {quote.name}
          </span>
          <span className="text-2xl font-bold text-white font-mono">
            {currencyPrefix}
            {quote.price < 10 ? quote.price.toFixed(4) : quote.price.toFixed(2)}
          </span>
          <span
            className={`text-sm font-bold font-mono ${isUp ? "text-[#34d399]" : "text-[#ff3860]"}`}
          >
            {isUp ? "+" : ""}
            {quote.change.toFixed(2)} ({isUp ? "+" : ""}
            {quote.changePercent.toFixed(2)}%)
          </span>
          <span className="text-[9px] text-slate-500 font-mono">YAHOO FINANCE</span>
        </div>
      )}

      {error && (
        <p className="text-[#ff3860] text-xs font-mono mb-3">{error}</p>
      )}

      <div className={compact ? "h-[220px] w-full" : "h-[280px] w-full"}>
        {loading && !points.length ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono animate-pulse">
            LOADING_MARKET_DATA…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="liveChartUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="liveChartDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3860" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ff3860" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#64748b", fontFamily: "monospace" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 9, fill: "#64748b", fontFamily: "monospace" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
                width={70}
                tickFormatter={(v: number) =>
                  v < 10 ? v.toFixed(2) : v.toLocaleString(undefined, { maximumFractionDigits: 2 })
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0b0f19",
                  border: "1px solid rgba(0,240,255,0.15)",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                }}
                formatter={(value) => [
                  `${currencyPrefix}${Number(value ?? 0).toFixed(2)}`,
                  "Close",
                ]}
                labelFormatter={(label) => String(label)}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={isUp ? "#34d399" : "#ff3860"}
                strokeWidth={2}
                fill={isUp ? "url(#liveChartUp)" : "url(#liveChartDown)"}
                dot={false}
                activeDot={{ r: 4, fill: "#00f0ff", stroke: "#05070a", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-[9px] font-mono text-slate-500">
        <span>FEED: YAHOO FINANCE (LIVE)</span>
        <span className="text-[#00f0ff]">DRAG RANGE • HOVER FOR OHLC</span>
      </div>
    </div>
  );
}
