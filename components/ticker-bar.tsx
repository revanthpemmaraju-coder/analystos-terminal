"use client";

import React, { useEffect, useState } from "react";

interface IndexTick {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

const FALLBACK: IndexTick[] = [
  { name: "NIFTY 50", value: 22853.2, change: 102.5, changePercent: 0.45 },
  { name: "SENSEX", value: 75116.8, change: 390.2, changePercent: 0.52 },
  { name: "S&P 500", value: 5277.5, change: 41.8, changePercent: 0.8 },
  { name: "NASDAQ", value: 16735.0, change: 182.1, changePercent: 1.1 },
  { name: "DOW JONES", value: 39069.5, change: -47.3, changePercent: -0.12 },
  { name: "FTSE 100", value: 8275.3, change: 20.6, changePercent: 0.25 },
];

export default function TickerBar() {
  const [ticks, setTicks] = useState<IndexTick[]>(FALLBACK);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/stocks/indices");
        if (!res.ok) return;
        const data = await res.json();
        if (data.indices?.length) setTicks(data.indices);
      } catch {
        /* keep fallback */
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#05070a] border-b border-slate-900 overflow-hidden select-none py-1.5 px-4 text-xs font-mono">
      <div className="flex items-center space-x-8 animate-marquee whitespace-nowrap">
        <span className="text-slate-500 font-semibold uppercase mr-2">[MARKETS_LIVE]</span>
        {ticks.map((tick, idx) => {
          const isUp = tick.changePercent >= 0;
          return (
            <div key={idx} className="inline-flex items-center space-x-2">
              <span className="text-slate-400 font-medium">{tick.name}</span>
              <span className="text-white font-bold">
                {tick.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span
                className={`font-semibold flex items-center ${isUp ? "text-[#00e676]" : "text-[#ff3860]"}`}
              >
                {isUp ? "▲" : "▼"} {isUp ? "+" : ""}
                {tick.changePercent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
