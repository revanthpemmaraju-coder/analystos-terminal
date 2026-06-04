"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export interface StockSearchSelection {
  symbol: string;
  name: string;
  exchange: string;
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
          (r: { symbol: string; name: string; exchange: string }) => ({
            symbol: r.symbol,
            name: r.name,
            exchange: r.exchange,
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
                className="w-full text-left px-3 py-2.5 hover:bg-[#00f0ff]/10 border-b border-white/5 last:border-0"
              >
                <span className="text-[#00f0ff] font-bold">{r.symbol}</span>
                <span className="text-slate-400 ml-2 truncate">{r.name}</span>
                {r.exchange && (
                  <span className="text-slate-600 ml-1 text-[9px]">[{r.exchange}]</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
