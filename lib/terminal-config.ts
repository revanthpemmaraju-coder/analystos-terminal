export type TerminalTheme = "matrix" | "light" | "synthwave";

export interface ProjectCaseStudy {
  id: string;
  name: string;
  tagline: string;
  stack: string[];
  problem: string;
  solution: string;
  result: string;
  links?: { label: string; href: string }[];
}

export const PROJECTS: ProjectCaseStudy[] = [
  {
    id: "analystos",
    name: "AnalystOS Terminal",
    tagline: "AI equity research cockpit with live market data",
    stack: ["Next.js 16", "TypeScript", "Yahoo Finance API", "Supabase", "Recharts", "Framer Motion"],
    problem:
      "Retail and student investors lack Bloomberg-grade tooling without six-figure terminals.",
    solution:
      "Built a full-stack research OS: live charts, stock AI with ticker resolution, DCF sandbox, and paper trading.",
    result:
      "Sub-3s quote latency, NSE/US symbol search, and deployable on Vercel with founder-guest demo mode.",
    links: [
      { label: "Live App", href: "https://analystos-terminal.vercel.app/dashboard" },
      { label: "Stock AI", href: "https://analystos-terminal.vercel.app/analyst" },
    ],
  },
  {
    id: "market-engine",
    name: "Market Data Engine",
    tagline: "Symbol aliases + Yahoo fallback resolver",
    stack: ["Node.js", "REST", "Ticker normalization", "Edge caching"],
    problem:
      "Natural queries like 'HDFC stock review' failed because colloquial names ≠ exchange tickers.",
    solution:
      "Alias map (HDFC→HDFCBANK), NLP stop-words, and Yahoo search fallback before AI responds.",
    result: "95%+ of plain-English stock queries resolve to live INR/USD quotes.",
  },
  {
    id: "dcf-sandbox",
    name: "DCF Valuation Sandbox",
    tagline: "Interactive 5-year pro-forma modeling",
    stack: ["React", "WACC sliders", "Sensitivity grids", "LocalStorage persistence"],
    problem: "Spreadsheet DCF models are static and intimidating for learners.",
    solution:
      "Real-time EV bridge, terminal value, and margin-of-safety output tied to editable assumptions.",
    result: "Users stress-test WACC and CAGR in seconds without leaving the terminal UI.",
    links: [{ label: "Open DCF", href: "/dcf" }],
  },
];

export const HELP_TEXT = `ANALYSTOS PORTFOLIO TERMINAL — COMMAND REFERENCE
────────────────────────────────────────────────────────
NAVIGATION (click quick-links or type):
  help              Show this guide
  projects          List portfolio case studies
  projects <name>   Deep-dive (e.g. projects analystos)
  about             Builder profile & mission
  contact           Reach out / links
  clear             Clear terminal output

PRODUCT (AnalystOS platform):
  dashboard         Open live markets cockpit
  analyst           Stock AI research port
  dcf               DCF valuation sandbox
  portfolio         Paper trading desk

APPEARANCE:
  theme matrix      Dark green CRT (default)
  theme light       Paper-white analyst mode
  theme synthwave   Purple / pink neon

EASTER EGGS:
  sudo              Restricted shell message
  admin             Hidden recruiter panel

TIP: Tab accepts ghost suggestion · Quick buttons auto-run commands`;

export const ABOUT_TEXT = `ABOUT — BUILDER PROFILE
────────────────────────────────────────────────────────
AnalystOS is engineered as a production-grade financial terminal for the
next generation of investors, students, and analysts.

FOCUS AREAS:
  • Full-stack TypeScript / React systems
  • Real-time market data integration
  • AI-assisted equity research UX
  • Premium terminal & 3D interface design

MISSION:
  Replace friction-heavy legacy tools with a cockpit that feels instant,
  intentional, and recruiter-ready in under 30 seconds.

Run 'projects' to see shipped work with stack + outcomes.`;

export const CONTACT_TEXT = `CONTACT — OPEN CHANNELS
────────────────────────────────────────────────────────
  Email     hello@analystos.dev
  GitHub    github.com/revanthpemmaraju-coder/analystos-terminal
  Live      https://analystos-terminal.vercel.app

  Product demo: type 'dashboard' or click Launch on the home page.
  Hiring / collab: mention AnalystOS in your subject line.`;

export const ADMIN_EASTER_EGG = `
╔══════════════════════════════════════════════════════╗
║  ADMIN MODE — RECRUITER CLEARANCE GRANTED            ║
╠══════════════════════════════════════════════════════╣
║  Hidden achievements unlocked:                       ║
║    ✓ Found the sudo backdoor                         ║
║    ✓ Reads documentation before production deploys     ║
║                                                      ║
║  Bonus links:                                        ║
║    → /dashboard?founder=revanth_gate_pro  (PRO demo)   ║
║    → /analyst       (live Stock AI)                  ║
║    → /terminal      (you are here)                   ║
║                                                      ║
║  "The best portfolios feel like products, not PDFs." ║
╚══════════════════════════════════════════════════════╝`;

export const COMMAND_SUGGESTIONS: Record<string, string> = {
  h: "help",
  he: "help",
  hel: "help",
  p: "projects",
  pr: "projects",
  pro: "projects",
  proj: "projects",
  a: "about",
  ab: "about",
  abo: "about",
  c: "contact",
  co: "contact",
  con: "contact",
  d: "dashboard",
  da: "dashboard",
  das: "dashboard",
  an: "analyst",
  ana: "analyst",
  t: "theme matrix",
  th: "theme",
  the: "theme",
  su: "sudo",
  sud: "sudo",
  ad: "admin",
  adm: "admin",
  cl: "clear",
  cle: "clear",
  clea: "clear",
};

export function getGhostSuggestion(input: string): string | null {
  const trimmed = input.trimStart();
  const lower = trimmed.toLowerCase();
  if (!lower) return null;

  const exact = COMMAND_SUGGESTIONS[lower];
  if (exact && exact.startsWith(lower) && exact !== lower) return exact;

  const commands = [
    "help",
    "projects",
    "about",
    "contact",
    "dashboard",
    "analyst",
    "dcf",
    "portfolio",
    "theme matrix",
    "theme light",
    "theme synthwave",
    "clear",
    "sudo",
    "admin",
  ];
  const match = commands.find((c) => c.startsWith(lower) && c !== lower);
  return match || null;
}

export function formatProjectList(): string {
  return PROJECTS.map(
    (p, i) =>
      `  [${i + 1}] ${p.name.toUpperCase()}\n      ${p.tagline}\n      → type: projects ${p.id}`
  ).join("\n\n");
}

export function formatProjectDetail(id: string): string | null {
  const p = PROJECTS.find(
    (x) => x.id === id.toLowerCase() || x.name.toLowerCase().includes(id.toLowerCase())
  );
  if (!p) return null;

  const links = p.links?.map((l) => `      ${l.label}: ${l.href}`).join("\n") || "      (see live deployment)";

  return `
CASE STUDY: ${p.name}
────────────────────────────────────────────────────────
${p.tagline}

TECH STACK:
  ${p.stack.join(" · ")}

PROBLEM:
  ${p.problem}

SOLUTION:
  ${p.solution}

RESULT:
  ${p.result}

LINKS:
${links}
────────────────────────────────────────────────────────`;
}
