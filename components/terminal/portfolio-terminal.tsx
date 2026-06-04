"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, X, GripHorizontal, Home } from "lucide-react";
import {
  ABOUT_TEXT,
  ADMIN_EASTER_EGG,
  CONTACT_TEXT,
  HELP_TEXT,
  PROJECTS,
  TerminalTheme,
  formatProjectDetail,
  formatProjectList,
  getGhostSuggestion,
} from "@/lib/terminal-config";
import { playBootHum, playKeyClick, playSuccessBeep } from "@/lib/terminal-sounds";

interface TerminalLine {
  id: string;
  type: "system" | "input" | "output" | "boot";
  text: string;
}

interface OsWindow {
  id: string;
  title: string;
  content: React.ReactNode;
  x: number;
  y: number;
}

const BOOT_LINES = [
  { text: "Loading AnalystOS Kernel...", delay: 0, suffix: " OK" },
  { text: "Initializing Security Protocols...", delay: 600, suffix: " OK" },
  { text: "Mounting Market Data Feeds...", delay: 1200, suffix: " OK" },
  { text: "Welcome, Guest. Type 'help' to begin or click the quick-links below.", delay: 1900, suffix: "" },
];

const QUICK_COMMANDS = [
  { label: "Help", cmd: "help" },
  { label: "Projects", cmd: "projects" },
  { label: "About", cmd: "about" },
  { label: "Contact", cmd: "contact" },
];

export default function PortfolioTerminal() {
  const router = useRouter();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [bootComplete, setBootComplete] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [theme, setTheme] = useState<TerminalTheme>("matrix");
  const [muted, setMuted] = useState(true);
  const [windows, setWindows] = useState<OsWindow[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootRan = useRef(false);
  const lineSeq = useRef(0);
  const winSeq = useRef(0);

  const ghost = getGhostSuggestion(input);
  const ghostSuffix = ghost && input.trim() ? ghost.slice(input.trim().length) : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = localStorage.getItem("aos_terminal_theme") as TerminalTheme | null;
    const savedMute = localStorage.getItem("aos_terminal_muted");
    // Avoid setState synchronously inside effect (eslint rule)
    setTimeout(() => {
      if (savedTheme) setTheme(savedTheme);
      if (savedMute === "false") setMuted(false);
    }, 0);
  }, []);

  useEffect(() => {
    localStorage.setItem("aos_terminal_theme", theme);
    document.documentElement.setAttribute("data-terminal-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("aos_terminal_muted", String(muted));
  }, [muted]);

  const appendLine = useCallback((line: Omit<TerminalLine, "id">) => {
    setLines((prev) => [
      ...prev,
      { ...line, id: `line-${(lineSeq.current += 1)}` },
    ]);
  }, []);

  const typeLines = useCallback(
    async (text: string, type: TerminalLine["type"] = "output") => {
      const chunks = text.split("\n");
      for (const chunk of chunks) {
        appendLine({ type, text: chunk });
        await new Promise((r) => setTimeout(r, 28));
      }
    },
    [appendLine]
  );

  useEffect(() => {
    if (bootRan.current) return;
    bootRan.current = true;

    const runBoot = async () => {
      playBootHum(muted);
      let elapsed = 0;
      for (const step of BOOT_LINES) {
        const wait = Math.max(0, step.delay - elapsed);
        await new Promise((r) => setTimeout(r, wait));
        elapsed = step.delay;
        const base = step.text;
        appendLine({ type: "boot", text: base });
        await new Promise((r) => setTimeout(r, 280));
        setLines((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.type === "boot" && last.text === base) {
            next[next.length - 1] = { ...last, text: base + step.suffix };
          }
          return next;
        });
      }
      await new Promise((r) => setTimeout(r, 200));
      setBootComplete(true);
      playSuccessBeep(muted);
    };
    runBoot();
  }, [appendLine, muted]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, windows]);

  useEffect(() => {
    if (bootComplete) inputRef.current?.focus();
  }, [bootComplete]);

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const runCommand = useCallback(
    async (raw: string) => {
      const cmd = raw.trim();
      if (!cmd) return;

      appendLine({ type: "input", text: `guest@analystos:~$ ${cmd}` });
      setHistory((prev) => [cmd, ...prev].slice(0, 50));
      setHistoryIdx(-1);

      const lower = cmd.toLowerCase();

      if (lower === "clear") {
        setLines([]);
        playSuccessBeep(muted);
        return;
      }

      if (lower === "help") {
        await typeLines(HELP_TEXT);
        playSuccessBeep(muted);
        return;
      }

      if (lower === "about") {
        await typeLines(ABOUT_TEXT);
        playSuccessBeep(muted);
        return;
      }

      if (lower === "contact") {
        await typeLines(CONTACT_TEXT);
        playSuccessBeep(muted);
        return;
      }

      if (lower === "projects") {
        const id = `win-projects-${(winSeq.current += 1)}`;
        setWindows((prev) => [
          ...prev,
          {
            id,
            title: "PROJECTS.EXE",
            x: 80 + prev.length * 24,
            y: 100 + prev.length * 24,
            content: (
              <div className="space-y-4 text-[11px] leading-relaxed">
                {PROJECTS.map((p) => (
                  <div
                    key={p.id}
                    className="border border-[var(--term-border)] rounded-lg p-3 bg-black/20"
                  >
                    <div className="font-bold text-[var(--term-accent)] mb-1">{p.name}</div>
                    <div className="text-[var(--term-muted)] mb-2">{p.tagline}</div>
                    <button
                      type="button"
                      className="text-[10px] uppercase tracking-wider text-[var(--term-fg)] border border-[var(--term-border)] px-2 py-1 rounded hover:bg-[var(--term-accent)]/10"
                      onClick={() => {
                        closeWindow(id);
                        const detail = formatProjectDetail(p.id);
                        void (async () => {
                          if (detail) await typeLines(detail);
                          else
                            await typeLines(
                              `Project '${p.id}' not found.\nAvailable: ${PROJECTS.map((x) => x.id).join(", ")}`
                            );
                          playSuccessBeep(muted);
                        })();
                      }}
                    >
                      View case study →
                    </button>
                  </div>
                ))}
              </div>
            ),
          },
        ]);
        await typeLines(
          `Opening PROJECTS window...\n\n${formatProjectList()}\n\nTip: projects <id> for full case study`
        );
        playSuccessBeep(muted);
        return;
      }

      if (lower.startsWith("projects ")) {
        const id = lower.replace("projects ", "").trim();
        const detail = formatProjectDetail(id);
        if (detail) {
          await typeLines(detail);
        } else {
          await typeLines(
            `Project '${id}' not found.\nAvailable: ${PROJECTS.map((p) => p.id).join(", ")}`
          );
        }
        playSuccessBeep(muted);
        return;
      }

      if (lower === "sudo" || lower === "admin") {
        await typeLines(ADMIN_EASTER_EGG);
        playSuccessBeep(muted);
        return;
      }

      if (lower.startsWith("theme ")) {
        const t = lower.replace("theme ", "").trim() as TerminalTheme;
        if (["matrix", "light", "synthwave"].includes(t)) {
          setTheme(t);
          await typeLines(`Theme switched → ${t.toUpperCase()}`);
        } else {
          await typeLines("Unknown theme. Try: theme matrix | theme light | theme synthwave");
        }
        playSuccessBeep(muted);
        return;
      }

      if (lower === "dashboard") {
        router.push("/dashboard?founder=revanth_gate_pro");
        return;
      }
      if (lower === "analyst") {
        router.push("/analyst");
        return;
      }
      if (lower === "dcf") {
        router.push("/dcf");
        return;
      }
      if (lower === "portfolio") {
        router.push("/portfolio");
        return;
      }

      await typeLines(
        `Command not recognized: '${cmd}'\nType 'help' for available commands or use quick-links below.`
      );
    },
    [appendLine, typeLines, muted, router]
  );

  const runQuickCommand = (cmd: string) => {
    setInput("");
    void runCommand(cmd);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    setInput("");
    void runCommand(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && ghost) {
      e.preventDefault();
      setInput(ghost);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(next);
      setInput(history[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setInput("");
        return;
      }
      const next = historyIdx - 1;
      setHistoryIdx(next);
      setInput(history[next]);
    }
  };

  const onPointerDownWindow = (id: string, e: React.PointerEvent) => {
    const win = windows.find((w) => w.id === id);
    if (!win) return;
    setDragging(id);
    setDragOffset({ x: e.clientX - win.x, y: e.clientY - win.y });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      setWindows((prev) =>
        prev.map((w) =>
          w.id === dragging
            ? { ...w, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
            : w
        )
      );
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, dragOffset]);

  return (
    <div className="terminal-shell min-h-screen flex flex-col relative">
      <div className="crt-overlay pointer-events-none" aria-hidden />
      <div className="crt-vignette pointer-events-none" aria-hidden />
      <div className="crt-scanlines pointer-events-none" aria-hidden />

      <header className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-[var(--term-border)] bg-[var(--term-bg)]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff3860]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffdd57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-accent)]" />
          <span className="font-mono text-[11px] text-[var(--term-muted)] ml-2 tracking-widest">
            ANALYSTOS://PORTFOLIO
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="p-2 rounded border border-[var(--term-border)] text-[var(--term-muted)] hover:text-[var(--term-fg)] transition-colors"
            title={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase border border-[var(--term-border)] rounded hover:border-[var(--term-accent)] text-[var(--term-muted)] hover:text-[var(--term-fg)]"
          >
            <Home className="w-3 h-3" />
            Home
          </Link>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 font-mono text-[12px] md:text-[13px] relative z-10 terminal-glow-text"
      >
        <AnimatePresence>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`mb-1 whitespace-pre-wrap leading-relaxed ${
                line.type === "input"
                  ? "text-[var(--term-accent)]"
                  : line.type === "boot"
                    ? "text-[var(--term-muted)]"
                    : "text-[var(--term-fg)]"
              }`}
            >
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {windows.map((win) => (
        <div
          key={win.id}
          className="terminal-os-window fixed z-30 w-[min(420px,calc(100vw-2rem))] border border-[var(--term-border)] rounded-lg shadow-2xl bg-[var(--term-bg)]/95 backdrop-blur-xl"
          style={{ left: win.x, top: win.y }}
        >
          <div
            className="flex items-center justify-between px-3 py-2 border-b border-[var(--term-border)] cursor-grab active:cursor-grabbing bg-black/30"
            onPointerDown={(e) => onPointerDownWindow(win.id, e)}
          >
            <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--term-accent)]">
              <GripHorizontal className="w-3 h-3 opacity-50" />
              {win.title}
            </div>
            <button
              type="button"
              onClick={() => closeWindow(win.id)}
              className="p-1 hover:text-[#ff3860]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4 max-h-[320px] overflow-y-auto font-mono text-[var(--term-fg)]">
            {win.content}
          </div>
        </div>
      ))}

      <footer className="relative z-20 border-t border-[var(--term-border)] bg-[var(--term-bg)]/90 backdrop-blur-md px-4 py-3 space-y-3">
        <div className="flex flex-wrap gap-2 justify-center">
          {QUICK_COMMANDS.map((q) => (
            <button
              key={q.cmd}
              type="button"
              disabled={!bootComplete}
              onClick={() => runQuickCommand(q.cmd)}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-[var(--term-border)] rounded-full text-[var(--term-muted)] hover:text-[var(--term-fg)] hover:border-[var(--term-accent)] hover:shadow-[0_0_12px_var(--term-glow)] transition-all disabled:opacity-40"
            >
              [ {q.label} ]
            </button>
          ))}
          <button
            type="button"
            disabled={!bootComplete}
            onClick={() => runQuickCommand("dashboard")}
            className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-[var(--term-accent)]/40 rounded-full text-[var(--term-accent)] hover:bg-[var(--term-accent)]/10 transition-all disabled:opacity-40"
          >
            [ Launch App ]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
          <label className="flex items-center gap-2 font-mono text-[12px]">
            <span className="text-[var(--term-accent)] shrink-0">guest@aos:~$</span>
            <div className="relative flex-1">
              {ghostSuffix && (
                <span
                  className="absolute left-0 top-0 pointer-events-none text-[var(--term-muted)] opacity-40 whitespace-pre"
                  aria-hidden
                >
                  {input}
                  <span className="opacity-70">{ghostSuffix}</span>
                </span>
              )}
              <input
                ref={inputRef}
                type="text"
                value={input}
                disabled={!bootComplete}
                onChange={(e) => {
                  playKeyClick(muted);
                  setInput(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent outline-none text-[var(--term-fg)] caret-[var(--term-accent)] relative z-[1]"
                placeholder={bootComplete ? "Type a command…" : "Booting…"}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </label>
          <p className="text-[9px] text-center text-[var(--term-muted)] mt-2 font-mono">
            Tab → accept suggestion · ↑↓ history · theme matrix | light | synthwave
          </p>
        </form>
      </footer>
    </div>
  );
}
