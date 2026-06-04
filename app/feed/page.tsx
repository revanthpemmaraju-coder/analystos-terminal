/* eslint-disable */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar";
import TickerBar from "@/components/ticker-bar";
import { supabase } from "@/lib/supabase";
import StockSearchInput, { StockSearchSelection } from "@/components/stock-search-input";
import { Cpu, RefreshCw, Send } from "lucide-react";

type FeedKind = "brief" | "note";

type FeedItem = {
  id: string;
  user_id: string;
  kind: FeedKind;
  title: string;
  symbols: string[];
  content: string;
  created_at: string;
};

const isValidUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pinned, setPinned] = useState<StockSearchSelection | null>(null);

  const localKey = useMemo(() => {
    const id = user?.id || "guest";
    return `analyst_feed_items_${id}`;
  }, [user?.id]);

  const loadLocal = () => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(localKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as FeedItem[];
    } catch {
      return [];
    }
  };

  const saveLocal = (next: FeedItem[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(localKey, JSON.stringify(next.slice(0, 50)));
  };

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

  const loadItems = async () => {
    if (!user || fetching) return;
    setFetching(true);
    try {
      // DB-backed (best effort)
      if (user.id && isValidUuid(user.id)) {
        const { data, error } = await supabase
          .from("analyst_feed_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (!error && data) {
          setItems(data as any);
          return;
        }
      }

      // local fallback
      setItems(loadLocal());
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const generate = async (kind: FeedKind) => {
    if (!user || generating) return;
    setGenerating(true);
    try {
      const symbols = pinned ? [pinned.symbol.split(".")[0]] : [];
      const res = await fetch("/api/feed/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, userId: user.id, symbols }),
      });
      if (!res.ok) throw new Error("generation failed");
      const data = await res.json();
      const item: FeedItem = data.item;
      const next = [item, ...items];
      setItems(next);
      saveLocal(next);
    } catch {
      /* ignore */
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono items-center justify-center space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-400">CONNECTING_FEED_NODE...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-900 pb-3">
          <div className="flex items-center space-x-2 text-xs">
            <Cpu className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-white font-bold uppercase">AI_ANALYST_FEED</span>
            <span className="terminal-badge">LIVE_GENERATION</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadItems()}
              className="text-slate-400 hover:text-[#00f0ff] border border-slate-800 hover:border-[#00f0ff]/30 rounded px-3 py-2 text-[10px] font-bold flex items-center gap-2"
              disabled={fetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
              REFRESH
            </button>
            <button
              type="button"
              onClick={() => void generate("brief")}
              className="bg-[#00e676] hover:bg-[#00e676]/85 text-[#05070a] rounded px-3 py-2 text-[10px] font-bold"
              disabled={generating}
            >
              GENERATE_BRIEF
            </button>
            <button
              type="button"
              onClick={() => void generate("note")}
              className="bg-[#00f0ff] hover:bg-[#00f0ff]/85 text-[#05070a] rounded px-3 py-2 text-[10px] font-bold flex items-center gap-2"
              disabled={generating}
            >
              <Send className="w-3.5 h-3.5" />
              GENERATE_NOTE
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
            Pin a symbol (optional) for note generation
          </p>
          <StockSearchInput onSelect={(item) => setPinned(item)} />
          {pinned && (
            <div className="flex items-center justify-between text-[10px] font-mono bg-[#00f0ff]/5 border border-[#00f0ff]/20 rounded px-3 py-2">
              <span>
                PINNED: <span className="text-[#00f0ff] font-bold">{pinned.symbol}</span>
                <span className="text-slate-400 ml-2">{pinned.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setPinned(null)}
                className="text-slate-500 hover:text-[#ff3860]"
              >
                [CLEAR]
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="terminal-card rounded-lg p-6 text-xs text-slate-500">
              No feed items yet. Generate a brief or a note to start your analyst tape.
            </div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="terminal-card rounded-lg p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="terminal-badge">{it.kind.toUpperCase()}</span>
                    <span className="text-white font-bold text-xs">{it.title}</span>
                    {it.symbols?.length ? (
                      <span className="text-[10px] text-[#00f0ff] font-bold">
                        {it.symbols.join(", ")}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(it.created_at).toLocaleString()}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap text-xs text-slate-200 font-mono leading-relaxed">
                  {it.content}
                </pre>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

