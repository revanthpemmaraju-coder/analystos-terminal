"use client";

import React, { useEffect, useState } from "react";

interface IndexTick {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export default function TickerBar() {
  const [ticks, setTicks] = useState<IndexTick[]>([]);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/stocks/indices");
        if (!res.ok) throw new Error(`Market indices request failed (${res.status}).`);
        const data = await res.json();
        if (!Array.isArray(data.indices) || data.indices.length === 0) {
          throw new Error("Market indices response was empty.");
        }
        setTicks(data.indices);
        setIsAvailable(true);
      } catch (error) {
        console.error("Unable to load live market indices:", error);
        setTicks([]);
        setIsAvailable(false);
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#05070a] border-b border-slate-900 overflow-hidden select-none py-1.5 px-4 text-xs font-mono">
      <div className="flex items-center space-x-8 animate-marquee whitespace-nowrap">
        <span className="text-slate-500 font-semibold uppercase mr-2">
          {isAvailable === null ? "[MARKETS_CONNECTING]" : isAvailable ? "[MARKETS_LIVE]" : "[MARKETS_UNAVAILABLE]"}
        </span>
        {isAvailable === false && (
          <span className="text-slate-400">Live market data unavailable</span>
        )}
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
