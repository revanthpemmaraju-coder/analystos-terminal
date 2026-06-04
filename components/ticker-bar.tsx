"use client";

import React, { useEffect, useState } from "react";

interface IndexTick {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export default function TickerBar() {
  const [ticks, setTicks] = useState<IndexTick[]>([
    { name: "NIFTY 50", value: 22853.20, change: 102.50, changePercent: 0.45 },
    { name: "SENSEX", value: 75116.80, change: 390.20, changePercent: 0.52 },
    { name: "S&P 500", value: 5277.50, change: 41.80, changePercent: 0.80 },
    { name: "NASDAQ", value: 16735.00, change: 182.10, changePercent: 1.10 },
    { name: "DOW JONES", value: 39069.50, change: -47.30, changePercent: -0.12 },
    { name: "FTSE 100", value: 8275.30, change: 20.60, changePercent: 0.25 }
  ]);

  // Simulate real-time tick stream variations
  useEffect(() => {
    const interval = setInterval(() => {
      setTicks(prevTicks =>
        prevTicks.map(tick => {
          const delta = (Math.random() - 0.49) * (tick.value * 0.0005);
          const newValue = tick.value + delta;
          const newChange = tick.change + delta;
          const newPercent = (newChange / (newValue - newChange)) * 100;
          return {
            ...tick,
            value: Number(newValue.toFixed(2)),
            change: Number(newChange.toFixed(2)),
            changePercent: Number(newPercent.toFixed(2))
          };
        })
      );
    }, 600);

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
              <span className="text-white font-bold">{tick.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className={`font-semibold flex items-center ${isUp ? "text-[#00e676]" : "text-[#ff3860]"}`}>
                {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{tick.changePercent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
