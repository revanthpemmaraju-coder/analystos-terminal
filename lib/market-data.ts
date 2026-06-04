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
}

const INDIAN_NSE = new Set([
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "WIPRO", "ITC", "SBIN", "BHARTIARTL",
  "HINDUNILVR", "ICICIBANK", "KOTAKBANK", "LT", "AXISBANK", "BAJFINANCE",
  "MARUTI", "TATAMOTORS", "TATASTEEL", "SUNPHARMA", "ASIANPAINT", "HCLTECH",
  "ADANIENT", "ADANIPORTS", "NTPC", "POWERGRID", "ONGC", "COALINDIA",
  "M&M", "TECHM", "ULTRACEMCO", "NESTLEIND", "TITAN", "JSWSTEEL",
]);

const COMPANY_ALIASES: Record<string, string> = {
  "tata consultancy": "TCS",
  tcs: "TCS",
  reliance: "RELIANCE",
  "reliance industries": "RELIANCE",
  infosys: "INFY",
  "hdfc bank": "HDFCBANK",
  apple: "AAPL",
  microsoft: "MSFT",
  nvidia: "NVDA",
  tesla: "TSLA",
  amazon: "AMZN",
  google: "GOOGL",
  alphabet: "GOOGL",
  meta: "META",
  facebook: "META",
};

export function toYahooSymbol(input: string): string {
  const raw = input.trim().toUpperCase();
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

  const lowerTokens = message.match(/\b[a-z]{2,6}\b/g) || [];
  for (const token of lowerTokens) {
    const mapped = COMPANY_ALIASES[token];
    if (mapped) found.add(mapped);
  }

  return Array.from(found).slice(0, 5);
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

export async function searchStocks(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`;
  const data = await yahooFetch(url);
  const quotes = data?.quotes || [];

  return quotes
    .filter((item: { quoteType?: string }) =>
      ["EQUITY", "ETF", "INDEX"].includes(item.quoteType || "")
    )
    .map((item: { symbol: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string }) => ({
      symbol: item.symbol,
      name: item.longname || item.shortname || item.symbol,
      exchange: item.exchange || "",
      type: item.quoteType || "EQUITY",
    }));
}

export async function fetchQuote(symbolInput: string): Promise<StockQuote | null> {
  const yahooSymbol = toYahooSymbol(symbolInput);
  if (!yahooSymbol) return null;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
  const data = await yahooFetch(url);
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
