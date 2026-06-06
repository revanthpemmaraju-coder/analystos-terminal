"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export interface StockSearchSelection {
  symbol: string;
  name: string;
  exchange: string;
  assetClass?: string;
}

interface StockSearchInputProps {
  onSelect: (item: StockSearchSelection) => void;
  placeholder?: string;
  className?: string;
  initialQuery?: string;
}

export default function StockSearchInput({
  onSelect,
  placeholder = "Search any stock (TCS, AAPL, Reliance…)",
  className = "",
  initialQuery = "",
}: StockSearchInputProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<StockSearchSelection[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 1) {
      // Avoid setState synchronously inside effect (eslint rule)
      setTimeout(() => {
        setResults([]);
        setOpen(false);
      }, 0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const list = (data.results || []).map(
          (r: { symbol: string; name: string; exchange: string; assetClass?: string }) => ({
            symbol: r.symbol,
            name: r.name,
            exchange: r.exchange,
            assetClass: r.assetClass,
          })
        );
        setResults(list);
        setOpen(list.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pick = (item: StockSearchSelection) => {
    // Keep input useful for future searches (symbol + name)
    setQuery(`${item.symbol} — ${item.name}`);
    setOpen(false);
    onSelect(item);
  };

  const getAssetClassBadgeStyles = (assetClass?: string) => {
    switch (assetClass) {
      case "ETF":
        return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25";
      case "REIT":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/25";
      case "Closed-End Fund":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/25";
      case "Mutual Fund":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/25";
      case "Stock":
      default:
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="flex border border-[#00f0ff]/20 rounded-lg overflow-hidden bg-[#05070a]">
        <Search className="w-4 h-4 text-slate-500 ml-3 self-center shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-3 py-2.5 text-xs text-white outline-none font-mono placeholder:text-slate-600"
        />
        {loading && (
          <span className="text-[9px] text-[#00f0ff] self-center pr-3 font-mono animate-pulse">
            SCAN…
          </span>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-[#0b0f19] border border-[#00f0ff]/25 rounded-lg shadow-2xl text-xs font-mono">
          {results.map((r) => (
            <li key={r.symbol}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="w-full text-left px-3 py-2.5 hover:bg-[#00f0ff]/10 border-b border-white/5 last:border-0 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[#00f0ff] font-bold shrink-0">{r.symbol}</span>
                  <span className="text-slate-400 truncate">{r.name}</span>
                  {r.exchange && (
                    <span className="text-slate-600 text-[9px] shrink-0">[{r.exchange}]</span>
                  )}
                </div>
                {r.assetClass && (
                  <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0 font-sans ${getAssetClassBadgeStyles(r.assetClass)}`}>
                    {r.assetClass}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
