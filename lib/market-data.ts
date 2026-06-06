export interface StockQuote {
  symbol: string;
  displaySymbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  marketState: string;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  exchange: string;
}

export interface ChartPoint {
  time: number;
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  assetClass?: string;
}

const INDIAN_NSE = new Set([
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "WIPRO", "ITC", "SBIN", "BHARTIARTL",
  "HINDUNILVR", "ICICIBANK", "KOTAKBANK", "LT", "AXISBANK", "BAJFINANCE",
  "MARUTI", "TATAMOTORS", "TATASTEEL", "SUNPHARMA", "ASIANPAINT", "HCLTECH",
  "ADANIENT", "ADANIPORTS", "NTPC", "POWERGRID", "ONGC", "COALINDIA",
  "M&M", "TECHM", "ULTRACEMCO", "NESTLEIND", "TITAN", "JSWSTEEL",
]);

/** Shorthand / colloquial names → NSE/BSE ticker */
const TICKER_ALIASES: Record<string, string> = {
  HDFC: "HDFCBANK",
  ICICI: "ICICIBANK",
  SBI: "SBIN",
  INFOSYS: "INFY",
  TATAMOTORS: "TATAMOTORS",
  "TATA MOTORS": "TATAMOTORS",
  WIPRO: "WIPRO",
  BHARTI: "BHARTIARTL",
  AIRTEL: "BHARTIARTL",
  HUL: "HINDUNILVR",
  HINDUNILEVER: "HINDUNILVR",
  ASIANPAINT: "ASIANPAINT",
  BAJAJ: "BAJFINANCE",
  MARUTI: "MARUTI",
  ADANI: "ADANIENT",
  GOOGLE: "GOOGL",
  FACEBOOK: "META",
  BERKSHIRE: "BRK-B",
};

const COMPANY_ALIASES: Record<string, string> = {
  "tata consultancy": "TCS",
  tcs: "TCS",
  reliance: "RELIANCE",
  "reliance industries": "RELIANCE",
  infosys: "INFY",
  infy: "INFY",
  hdfc: "HDFCBANK",
  "hdfc bank": "HDFCBANK",
  hdfcbank: "HDFCBANK",
  icici: "ICICIBANK",
  "icici bank": "ICICIBANK",
  sbi: "SBIN",
  "state bank": "SBIN",
  wipro: "WIPRO",
  airtel: "BHARTIARTL",
  bharti: "BHARTIARTL",
  maruti: "MARUTI",
  tesla: "TSLA",
  apple: "AAPL",
  microsoft: "MSFT",
  nvidia: "NVDA",
  amazon: "AMZN",
  google: "GOOGL",
  alphabet: "GOOGL",
  meta: "META",
  facebook: "META",
};

const QUERY_STOP_WORDS = new Set([
  "analyze", "analysis", "review", "stock", "stocks", "share", "shares",
  "should", "invest", "buy", "sell", "hold", "now", "today", "please",
  "tell", "me", "what", "about", "the", "is", "it", "good", "bad", "for",
  "and", "or", "vs", "give", "show", "explain", "report", "opinion",
  "perform", "run", "do", "how", "can", "you", "this", "that", "will",
  "would", "could", "want", "need", "like", "my", "i", "a", "an", "in",
  "on", "at", "to", "of", "with", "price", "target", "verdict",
]);

export function normalizeTicker(input: string): string {
  const raw = input.trim().toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, "");
  if (!raw) return "";
  return TICKER_ALIASES[raw] || raw;
}

export function toYahooSymbol(input: string): string {
  const raw = normalizeTicker(input.trim());
  if (!raw) return "";
  if (raw.includes(".")) return raw;
  if (INDIAN_NSE.has(raw)) return `${raw}.NS`;
  if (/^\d{4}$/.test(raw)) return `${raw}.T`;
  return raw;
}

export function fromYahooSymbol(symbol: string): string {
  return symbol.replace(/\.(NS|BO|NSE|BSE)$/i, "").toUpperCase();
}

export function extractTickers(message: string): string[] {
  const found = new Set<string>();
  const lower = message.toLowerCase();

  const dollarMatches = message.match(/\$([A-Za-z0-9.-]{1,12})/g);
  if (dollarMatches) {
    for (const m of dollarMatches) {
      found.add(fromYahooSymbol(m.replace("$", "").toUpperCase()));
    }
  }

  for (const [alias, ticker] of Object.entries(COMPANY_ALIASES)) {
    if (lower.includes(alias)) found.add(ticker);
  }

  const upperTokens = message.match(/\b[A-Z]{1,5}\b/g) || [];
  const stop = new Set([
    "I", "A", "AN", "THE", "AND", "OR", "VS", "AI", "DCF", "ROE", "PE", "PB",
    "EPS", "CEO", "CFO", "IPO", "ETF", "USD", "INR", "BUY", "SELL", "HOLD",
    "NOW", "FOR", "ON", "IT", "IS", "AT", "TO", "OF", "IN", "MY", "ME", "DO",
    "IF", "BE", "BY", "AS", "US", "UK", "EU", "Q1", "Q2", "Q3", "Q4",
  ]);
  for (const token of upperTokens) {
    if (!stop.has(token) && token.length >= 2) found.add(token);
  }

  const lowerTokens = message.match(/\b[a-z][a-z0-9&.-]{1,24}\b/gi) || [];
  for (const token of lowerTokens) {
    const key = token.toLowerCase();
    const mapped = COMPANY_ALIASES[key];
    if (mapped) found.add(mapped);
    else if (key.length >= 2 && key.length <= 6 && !QUERY_STOP_WORDS.has(key)) {
      found.add(normalizeTicker(key));
    }
  }

  return Array.from(found).slice(0, 5);
}

/** Best search phrase from a natural-language question */
export function extractSearchQuery(message: string): string {
  const lower = message.toLowerCase();

  const aliasKeys = Object.keys(COMPANY_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliasKeys) {
    if (lower.includes(alias)) return COMPANY_ALIASES[alias];
  }

  for (const [shorthand, ticker] of Object.entries(TICKER_ALIASES)) {
    if (lower.includes(shorthand.toLowerCase())) return ticker;
  }

  const words = lower
    .replace(/[^\w\s&.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !QUERY_STOP_WORDS.has(w));

  if (words.length === 0) return message.trim().slice(0, 32);
  const joined = words.slice(0, 3).join(" ");
  return normalizeTicker(words[0]) || joined;
}

function pickBestSearchResult(
  results: SearchResult[],
  query: string
): SearchResult | null {
  const equities = results.filter((r) => r.type === "EQUITY");
  if (!equities.length) return results[0] || null;

  const q = normalizeTicker(query);
  const qLower = query.toLowerCase();

  const exact = equities.find(
    (r) =>
      fromYahooSymbol(r.symbol) === q ||
      r.symbol.toUpperCase() === `${q}.NS` ||
      r.name.toLowerCase().includes(qLower)
  );
  if (exact) return exact;

  const nse = equities.find(
    (r) => r.symbol.endsWith(".NS") && fromYahooSymbol(r.symbol).startsWith(q.slice(0, 4))
  );
  if (nse) return nse;

  const indian = equities.find((r) => r.symbol.endsWith(".NS") || r.exchange === "NSI");
  if (indian && (qLower.includes("hdfc") || qLower.includes("tcs") || qLower.includes("reliance"))) {
    return indian;
  }

  return equities[0];
}

/** Resolve symbols and fetch live quotes — aliases + Yahoo search fallback */
export async function resolveQuotesFromMessage(
  message: string,
  explicitSymbols: string[] = []
): Promise<{ quotes: StockQuote[]; symbols: string[] }> {
  const candidates = new Set<string>([
    ...explicitSymbols.map((s) => normalizeTicker(fromYahooSymbol(s))),
    ...extractTickers(message).map((s) => normalizeTicker(s)),
  ]);

  const quotes: StockQuote[] = [];
  const symbols: string[] = [];

  for (const sym of candidates) {
    if (!sym) continue;
    try {
      const q = await fetchQuote(sym);
      if (q && !quotes.some((x) => x.displaySymbol === q.displaySymbol)) {
        quotes.push(q);
        symbols.push(q.displaySymbol);
      }
    } catch {
      /* try next candidate */
    }
  }

  if (quotes.length === 0) {
    const searchQuery = extractSearchQuery(message);
    try {
      const results = await searchStocks(searchQuery);
      const best = pickBestSearchResult(results, searchQuery);
      if (best) {
        const q = await fetchQuote(best.symbol);
        if (q) {
          quotes.push(q);
          symbols.push(q.displaySymbol);
        }
      }
    } catch {
      /* search failed */
    }
  }

  return { quotes, symbols };
}

async function yahooFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AnalystOS/1.0)",
      Accept: "application/json",
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Yahoo API error: ${res.status}`);
  return res.json();
}

async function yahooFetchNoStore(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AnalystOS/1.0)",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo API error: ${res.status}`);
  return res.json();
}

export function detectAssetClass(item: {
  symbol: string;
  name: string;
  quoteType?: string;
  sector?: string;
  industry?: string;
}): "Stock" | "ETF" | "REIT" | "Closed-End Fund" | "Mutual Fund" {
  const quoteType = item.quoteType?.toUpperCase() || "";
  const sector = item.sector?.toLowerCase() || "";
  const industry = item.industry?.toLowerCase() || "";
  const name = item.name?.toLowerCase() || "";

  if (quoteType === "ETF") return "ETF";
  if (
    quoteType === "MUTUALFUND" ||
    quoteType === "MUTUAL_FUND" ||
    quoteType === "MUTUAL"
  ) {
    return "Mutual Fund";
  }

  if (quoteType === "EQUITY") {
    if (industry.includes("reit") || sector === "real estate") {
      return "REIT";
    }
    if (
      (industry.includes("asset management") || sector.includes("financial")) &&
      (name.includes("closed-end") ||
        name.includes("term trust") ||
        name.includes("income fund") ||
        name.includes("high income") ||
        name.includes("tax-free") ||
        name.includes("municipal fund") ||
        name.includes("equity fund") ||
        (name.includes("trust") && name.includes("fund")))
    ) {
      return "Closed-End Fund";
    }
    return "Stock";
  }

  // Fallback heuristics based on name and symbol
  if (name.includes("etf")) return "ETF";
  if (name.includes("reit") || name.includes("real estate investment trust")) return "REIT";
  if (name.includes("closed-end") || name.includes("closed end")) return "Closed-End Fund";
  if (name.includes("mutual fund") || name.includes("index fund")) return "Mutual Fund";

  return "Stock";
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`;
  const data = await yahooFetch(url);
  const quotes = data?.quotes || [];

  return quotes
    .map((item: { symbol: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string; sector?: string; industry?: string }) => {
      const name = item.longname || item.shortname || item.symbol;
      const assetClass = detectAssetClass({
        symbol: item.symbol,
        name,
        quoteType: item.quoteType,
        sector: item.sector,
        industry: item.industry,
      });
      return {
        symbol: item.symbol,
        name,
        exchange: item.exchange || "",
        type: item.quoteType || "EQUITY",
        assetClass,
      };
    });
}

export async function fetchQuote(symbolInput: string): Promise<StockQuote | null> {
  const candidates = [
    toYahooSymbol(symbolInput),
    symbolInput.trim().toUpperCase(),
  ].filter(Boolean);

  const unique = [...new Set(candidates)];

  for (const yahooSymbol of unique) {
    const quote = await fetchQuoteRaw(yahooSymbol);
    if (quote) return quote;
  }

  return null;
}

async function fetchQuoteRaw(yahooSymbol: string): Promise<StockQuote | null> {
  if (!yahooSymbol) return null;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
  let data: Awaited<ReturnType<typeof yahooFetch>>;
  try {
    data = await yahooFetch(url);
  } catch {
    return null;
  }
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  return {
    symbol: yahooSymbol,
    displaySymbol: fromYahooSymbol(yahooSymbol),
    name: meta.longName || meta.shortName || fromYahooSymbol(yahooSymbol),
    price: Number(price.toFixed(price < 10 ? 4 : 2)),
    change: Number(change.toFixed(price < 10 ? 4 : 2)),
    changePercent: Number(changePercent.toFixed(2)),
    currency: meta.currency || "USD",
    marketState: meta.marketState || "REGULAR",
    previousClose: Number(previousClose.toFixed(2)),
    dayHigh: meta.regularMarketDayHigh ?? price,
    dayLow: meta.regularMarketDayLow ?? price,
    volume: meta.regularMarketVolume ?? 0,
    marketCap: meta.marketCap,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    exchange: meta.fullExchangeName || meta.exchangeName || "",
  };
}

async function fetchQuoteRawRealtime(yahooSymbol: string): Promise<StockQuote | null> {
  if (!yahooSymbol) return null;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
  let data: Awaited<ReturnType<typeof yahooFetchNoStore>>;
  try {
    data = await yahooFetchNoStore(url);
  } catch {
    return null;
  }
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta;
  const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  return {
    symbol: yahooSymbol,
    displaySymbol: fromYahooSymbol(yahooSymbol),
    name: meta.longName || meta.shortName || fromYahooSymbol(yahooSymbol),
    price: Number(price.toFixed(price < 10 ? 4 : 2)),
    change: Number(change.toFixed(price < 10 ? 4 : 2)),
    changePercent: Number(changePercent.toFixed(2)),
    currency: meta.currency || "USD",
    marketState: meta.marketState || "REGULAR",
    previousClose: Number(previousClose.toFixed(2)),
    dayHigh: meta.regularMarketDayHigh ?? price,
    dayLow: meta.regularMarketDayLow ?? price,
    volume: meta.regularMarketVolume ?? 0,
    marketCap: meta.marketCap,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    exchange: meta.fullExchangeName || meta.exchangeName || "",
  };
}

/**
 * Real-time-ish quote fetch.
 * Uses `cache: "no-store"` to avoid Next.js fetch caching for streaming/polling UIs.
 */
export async function fetchQuoteRealtime(symbolInput: string): Promise<StockQuote | null> {
  const candidates = [
    toYahooSymbol(symbolInput),
    symbolInput.trim().toUpperCase(),
  ].filter(Boolean);

  const unique = [...new Set(candidates)];

  for (const yahooSymbol of unique) {
    const quote = await fetchQuoteRawRealtime(yahooSymbol);
    if (quote) return quote;
  }

  return null;
}

export interface InstitutionalFlowSnapshot {
  symbol: string;
  displaySymbol: string;
  updatedAt: string;
  majorHolders?: {
    percentInsiders?: number | null;
    percentInstitutions?: number | null;
    institutionsFloatPercent?: number | null;
    institutionsCount?: number | null;
  };
  netSharePurchaseActivity?: {
    period?: string | null;
    netPercentInsiderSharesPurchased?: number | null;
    netSharesPurchased?: number | null;
    totalInsiderSharesHeld?: number | null;
  };
  topInstitutions?: Array<{
    name: string;
    position?: number | null;
    value?: number | null;
    pctHeld?: number | null;
    reportDate?: string | null;
  }>;
  topFunds?: Array<{
    name: string;
    position?: number | null;
    value?: number | null;
    pctHeld?: number | null;
    reportDate?: string | null;
  }>;
  insiderTransactions?: Array<{
    insider: string;
    startDate?: string | null;
    transactionText?: string | null;
    shares?: number | null;
    value?: number | null;
    ownership?: string | null;
  }>;
}

function yahooNumberMaybe(v: any): number | null {
  const raw = v?.raw ?? v;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function yahooDateMaybe(v: any): string | null {
  const raw = v?.fmt ?? v?.raw ?? v;
  if (raw == null) return null;
  if (typeof raw === "string") return raw;
  // epoch seconds
  if (typeof raw === "number") return new Date(raw * 1000).toISOString().slice(0, 10);
  return null;
}

/**
 * Institutional flow tracking via Yahoo quoteSummary modules.
 * Note: Yahoo does not provide true "tape-level" institutional order flow. This surface provides
 * institutional ownership breakdown + recent insider net purchase activity when available.
 */
export async function fetchInstitutionalFlow(symbolInput: string): Promise<InstitutionalFlowSnapshot | null> {
  const yahooSymbol = toYahooSymbol(symbolInput);
  if (!yahooSymbol) return null;

  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}` +
    `?modules=majorHoldersBreakdown,netSharePurchaseActivity,institutionOwnership,fundOwnership,insiderTransactions`;

  let data: any;
  try {
    data = await yahooFetchNoStore(url);
  } catch {
    return null;
  }

  const result = data?.quoteSummary?.result?.[0];
  if (!result) return null;

  const major = result.majorHoldersBreakdown || {};
  const net = result.netSharePurchaseActivity || {};

  const instList: any[] = result.institutionOwnership?.ownershipList || [];
  const fundList: any[] = result.fundOwnership?.ownershipList || [];
  const insiderTx: any[] = result.insiderTransactions?.transactions || [];

  const snapshot: InstitutionalFlowSnapshot = {
    symbol: yahooSymbol,
    displaySymbol: fromYahooSymbol(yahooSymbol),
    updatedAt: new Date().toISOString(),
    majorHolders: {
      percentInsiders: yahooNumberMaybe(major.percentInsiders),
      percentInstitutions: yahooNumberMaybe(major.percentInstitutions),
      institutionsFloatPercent: yahooNumberMaybe(major.institutionsFloatPercent),
      institutionsCount: yahooNumberMaybe(major.institutionsCount),
    },
    netSharePurchaseActivity: {
      period: net.period?.fmt ?? net.period ?? null,
      netPercentInsiderSharesPurchased: yahooNumberMaybe(net.netPercentInsiderSharesPurchased),
      netSharesPurchased: yahooNumberMaybe(net.netSharesPurchased),
      totalInsiderSharesHeld: yahooNumberMaybe(net.totalInsiderSharesHeld),
    },
    topInstitutions: instList.slice(0, 10).map((x) => ({
      name: x.organization?.fmt || x.organization || "Institution",
      position: yahooNumberMaybe(x.position),
      value: yahooNumberMaybe(x.value),
      pctHeld: yahooNumberMaybe(x.pctHeld),
      reportDate: yahooDateMaybe(x.reportDate),
    })),
    topFunds: fundList.slice(0, 10).map((x) => ({
      name: x.organization?.fmt || x.organization || "Fund",
      position: yahooNumberMaybe(x.position),
      value: yahooNumberMaybe(x.value),
      pctHeld: yahooNumberMaybe(x.pctHeld),
      reportDate: yahooDateMaybe(x.reportDate),
    })),
    insiderTransactions: insiderTx.slice(0, 15).map((x) => ({
      insider: x.filerName?.fmt || x.filerName || "Insider",
      startDate: yahooDateMaybe(x.startDate),
      transactionText: x.transactionText?.fmt || x.transactionText || null,
      shares: yahooNumberMaybe(x.shares),
      value: yahooNumberMaybe(x.value),
      ownership: x.ownership?.fmt || x.ownership || null,
    })),
  };

  return snapshot;
}

export type ChartRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y";
export type ChartInterval = "1m" | "5m" | "15m" | "1h" | "1d" | "1wk";

const RANGE_MAP: Record<ChartRange, { range: string; interval: ChartInterval }> = {
  "1d": { range: "1d", interval: "5m" },
  "5d": { range: "5d", interval: "15m" },
  "1mo": { range: "1mo", interval: "1d" },
  "3mo": { range: "3mo", interval: "1d" },
  "6mo": { range: "6mo", interval: "1d" },
  "1y": { range: "1y", interval: "1d" },
  "5y": { range: "5y", interval: "1wk" },
};

export async function fetchChart(
  symbolInput: string,
  chartRange: ChartRange = "1mo"
): Promise<{ quote: StockQuote | null; points: ChartPoint[] }> {
  const yahooSymbol = toYahooSymbol(symbolInput);
  const { range, interval } = RANGE_MAP[chartRange];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
  const data = await yahooFetch(url);
  const result = data?.chart?.result?.[0];
  if (!result) return { quote: null, points: [] };

  const meta = result.meta;
  const timestamps: number[] = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0] || {};
  const closes: number[] = quotes.close || [];
  const opens: number[] = quotes.open || [];
  const highs: number[] = quotes.high || [];
  const lows: number[] = quotes.low || [];
  const volumes: number[] = quotes.volume || [];

  const points: ChartPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null || Number.isNaN(close)) continue;
    const d = new Date(timestamps[i] * 1000);
    points.push({
      time: timestamps[i],
      date:
        chartRange === "1d" || chartRange === "5d"
          ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      close: Number(close.toFixed(close < 10 ? 4 : 2)),
      open: Number((opens[i] ?? close).toFixed(2)),
      high: Number((highs[i] ?? close).toFixed(2)),
      low: Number((lows[i] ?? close).toFixed(2)),
      volume: volumes[i] ?? 0,
    });
  }

  const price = meta.regularMarketPrice ?? meta.previousClose ?? points.at(-1)?.close ?? 0;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  const quote: StockQuote = {
    symbol: yahooSymbol,
    displaySymbol: fromYahooSymbol(yahooSymbol),
    name: meta.longName || meta.shortName || fromYahooSymbol(yahooSymbol),
    price: Number(price.toFixed(price < 10 ? 4 : 2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    currency: meta.currency || "USD",
    marketState: meta.marketState || "REGULAR",
    previousClose: Number(previousClose.toFixed(2)),
    dayHigh: meta.regularMarketDayHigh ?? price,
    dayLow: meta.regularMarketDayLow ?? price,
    volume: meta.regularMarketVolume ?? 0,
    marketCap: meta.marketCap,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    exchange: meta.fullExchangeName || meta.exchangeName || "",
  };

  return { quote, points };
}

export async function fetchIndexQuotes(): Promise<
  Array<{ name: string; value: number; change: number; changePercent: number }>
> {
  const indices = [
    { name: "NIFTY 50", symbol: "^NSEI" },
    { name: "SENSEX", symbol: "^BSESN" },
    { name: "S&P 500", symbol: "^GSPC" },
    { name: "NASDAQ", symbol: "^IXIC" },
    { name: "DOW JONES", symbol: "^DJI" },
    { name: "FTSE 100", symbol: "^FTSE" },
  ];

  const results = await Promise.all(
    indices.map(async (idx) => {
      try {
        const q = await fetchQuote(idx.symbol);
        if (!q) return null;
        return {
          name: idx.name,
          value: q.price,
          change: q.change,
          changePercent: q.changePercent,
        };
      } catch {
        return null;
      }
    })
  );

  return results.filter(Boolean) as Array<{
    name: string;
    value: number;
    change: number;
    changePercent: number;
  }>;
}

export function formatMarketContext(quotes: StockQuote[]): string {
  if (!quotes.length) return "No live quote data available for mentioned symbols.";
  return quotes
    .map(
      (q) =>
        `${q.displaySymbol} (${q.name}): ${q.price} ${q.currency}, ${q.change >= 0 ? "+" : ""}${q.change} (${q.changePercent}%), Day range ${q.dayLow}-${q.dayHigh}, Prev close ${q.previousClose}, Exchange: ${q.exchange}`
    )
    .join("\n");
}
