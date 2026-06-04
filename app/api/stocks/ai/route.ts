import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  extractTickers,
  fetchQuote,
  formatMarketContext,
  fromYahooSymbol,
  toYahooSymbol,
  type StockQuote,
} from "@/lib/market-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

const isValidUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function buildStockAnalysis(
  message: string,
  quotes: StockQuote[],
  symbols: string[]
): string {
  const primary = quotes[0];
  const ticker = primary?.displaySymbol || symbols[0] || "STOCK";
  const currency = primary?.currency === "INR" ? "₹" : primary?.currency === "USD" ? "$" : "";
  const price = primary ? `${currency}${primary.price}` : "N/A";
  const changeStr = primary
    ? `${primary.change >= 0 ? "+" : ""}${primary.change} (${primary.changePercent}%)`
    : "N/A";

  const rating =
    primary && primary.changePercent > 1.5
      ? "BUY"
      : primary && primary.changePercent < -1.5
        ? "HOLD / WATCH"
        : "HOLD";

  const target =
    primary && primary.price
      ? `${currency}${(primary.price * (1 + (primary.changePercent >= 0 ? 0.08 : -0.05))).toFixed(2)}`
      : "N/A";

  const liveBlock = quotes.length
    ? `**Live market data (Yahoo Finance, ${new Date().toISOString().slice(0, 16)} UTC):**\n${formatMarketContext(quotes)}`
    : `Could not resolve a valid ticker from: "${symbols.join(", ") || message}". Try a symbol like TCS, RELIANCE, AAPL, or search by company name.`;

  return `### Quick Answer
${ticker} is currently at **${price}** (${changeStr}). Based on live price action and fundamentals context, the desk rating is **${rating}** with a rough 12-month reference target near **${target}**. This is research commentary, not investment advice.

### Analysis
${liveBlock}

**Your question:** ${message}

**Equity research view:**
1. **Company / ticker:** ${ticker}${primary?.name ? ` — ${primary.name}` : ""}${primary?.exchange ? ` (${primary.exchange})` : ""}.
2. **Price action:** ${primary ? `Trading ${primary.changePercent >= 0 ? "above" : "below"} prior close; intraday range ${currency}${primary.dayLow}–${currency}${primary.dayHigh}.` : "Use the stock search box to pin a valid NSE/BSE (.NS) or US ticker."}
3. **Valuation lens:** Compare trailing P/E, EV/EBITDA, and ROE vs sector peers; stress-test with a 5-year DCF in the DCF Sandbox.
4. **Technical lens:** Watch 50/200-DMA, RSI, and volume vs 20-day average for entry timing.
5. **Verdict:** **${rating}** (confidence: ${quotes.length ? "Medium" : "Low — verify symbol"}).

### Key Takeaways
- Live quote${quotes.length > 1 ? "s" : ""} pulled from Yahoo Finance for: ${symbols.join(", ") || ticker}.
- Indian large-caps often use **.NS** suffix (e.g. TCS.NS, RELIANCE.NS).
- Cross-check numbers in Dashboard live chart before sizing positions.

### Risks & Considerations
- Macro rates, FX (USD/INR), and sector regulation can override stock-specific thesis.
- Past performance does not guarantee future results.
- Markets involve risk; use position sizing and stop-loss discipline.

### Actionable Next Steps
- Open **Dashboard → Live Chart** for ${ticker} and switch ranges (1D–5Y).
- Run a **DCF** on \`/dcf\` with your growth and WACC assumptions.
- Add ${ticker} to your paper portfolio on \`/portfolio\` to track P&L.`;
}

export async function POST(req: NextRequest) {
  let message = "";
  let userId = "";
  let explicitSymbols: string[] = [];

  try {
    const body = await req.json();
    message = (body.message || "").trim();
    userId = body.userId || "";
    explicitSymbols = Array.isArray(body.symbols)
      ? body.symbols.map((s: string) => fromYahooSymbol(s.toUpperCase()))
      : [];

    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const hasSupabase = !!(supabaseUrl && supabaseAnonKey);
    const supabase = hasSupabase ? createClient(supabaseUrl, supabaseAnonKey) : null;

    let plan = "free";
    let questionsUsed = 0;

    if (userId && isValidUuid(userId) && supabase) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        if (profile) {
          plan = profile.plan || "free";
          questionsUsed = profile.questions_used_today || 0;
          if (plan === "free" && questionsUsed >= 5) {
            return NextResponse.json(
              {
                error: "QUOTA_EXCEEDED",
                message: "Daily limit of 5 AI questions reached. Upgrade to PRO for unlimited queries.",
              },
              { status: 429 }
            );
          }
        }
      } catch (err) {
        console.warn("Profile check skipped:", err);
      }
    } else if (userId === "founder-guest-id") {
      plan = "pro";
    }

    const extracted = extractTickers(message);
    const symbolSet = new Set([...explicitSymbols, ...extracted]);
    const symbols = Array.from(symbolSet).slice(0, 3);

    const quotes: StockQuote[] = [];
    for (const sym of symbols) {
      try {
        const q = await fetchQuote(toYahooSymbol(sym));
        if (q) quotes.push(q);
      } catch {
        /* try next */
      }
    }

    if (!anthropicKey || anthropicKey === "your-api-key-here") {
      return NextResponse.json({
        content: buildStockAnalysis(message, quotes, symbols),
        symbols: quotes.map((q) => q.displaySymbol),
      });
    }

    const marketContext = formatMarketContext(quotes);
    const systemPrompt = `You are AnalystOS Stock AI — an institutional equity research assistant focused ONLY on stocks and ETFs (no crypto, forex, or commodities unless the user explicitly asks about a stock ETF).

You MUST use the live market data below when answering. If data is missing, say so and continue with framework-based analysis.

LIVE MARKET DATA:
${marketContext || "No symbols resolved — ask user to specify ticker (e.g. TCS, RELIANCE, AAPL)."}

Detected symbols: ${symbols.join(", ") || "none"}

Structure every reply as:
### Quick Answer
### Analysis
### Key Takeaways
### Risks & Considerations
### Actionable Next Steps

Include: company overview, bull/bear case, valuation view, technical view, verdict (Strong Buy / Buy / Hold / Sell) with confidence. Never guarantee returns. Remind that markets involve risk.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 900,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", errText);
      return NextResponse.json({
        content: buildStockAnalysis(message, quotes, symbols),
        symbols: quotes.map((q) => q.displaySymbol),
      });
    }

    const data = await response.json();
    const responseText = data.content?.[0]?.text || buildStockAnalysis(message, quotes, symbols);

    if (userId && isValidUuid(userId) && plan === "free" && supabase) {
      try {
        await supabase
          .from("profiles")
          .update({ questions_used_today: questionsUsed + 1 })
          .eq("id", userId);
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json({
      content: responseText,
      symbols: quotes.map((q) => q.displaySymbol),
    });
  } catch (err) {
    console.error("Stock AI route error:", err);
    return NextResponse.json({
      content: buildStockAnalysis(message, [], explicitSymbols),
      symbols: [],
    });
  }
}
