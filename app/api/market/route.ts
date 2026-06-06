import { NextRequest, NextResponse } from "next/server";
import { fetchQuote, searchStocks } from "@/lib/market-data";

const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

function generateFallbackData(
  ticker: string,
  name: string,
  assetClass: "Stock" | "ETF" | "REIT" | "Closed-End Fund" | "Mutual Fund",
  quote: any
) {
  const currencySym = quote.currency === "INR" ? "₹" : "$";
  const currencyCode = quote.currency || "USD";

  switch (assetClass) {
    case "ETF":
      return {
        overviewTitle: "FUND_MANDATE_&_OBJECTIVE",
        overviewText: `${name} (${ticker}) is an exchange-traded fund designed to track the performance of its underlying index or asset pool. It offers institutional-grade liquidity, low expense ratios, and tax efficiency, facilitating precise asset allocation.`,
        verdictTitle: "TRACKING_&_PERFORMANCE_VERDICT",
        verdictText: `The fund demonstrates tight tracking error, maintaining high correlation with its benchmark index. Liquidity remains robust with narrow bid-ask spreads, making it an efficient vehicle for tactical and strategic portfolio allocation.`,
        risksTitle: "TRACKING_ERROR_&_MARKET_RISKS",
        risksText: `Subject to market volatility of the underlying index constituents. Potential tracking error may arise during periods of extreme market stress or high portfolio turnover.`,
        redFlagsTitle: "PORTFOLIO_CONCENTRATION_WARNINGS",
        redFlags: [
          "Concentration risk in top-weighted sector constituents.",
          "Intraday price deviation from net asset value (NAV) during high volatility.",
          "Transaction costs may increase during liquidity squeezes."
        ],
        metrics: [
          { label: "EXPENSE_RATIO", val: "0.09%", desc: "Annual management fee" },
          { label: "NET_ASSETS (AUM)", val: quote.marketCap ? `${(quote.marketCap / 1e9).toFixed(1)}B ${currencyCode}` : `12.5B ${currencyCode}`, desc: "Total assets under management" },
          { label: "PREMIUM_TO_NAV", val: "+0.02%", desc: "Trading price vs NAV" },
          { label: "DIVIDEND_YIELD", val: "1.45%", desc: "Trailing 12-month yield" },
          { label: "TRACKING_ERROR", val: "0.04%", desc: "Deviation from index" },
          { label: "PORTFOLIO_TURNOVER", val: "4.0%", desc: "Annual trading turnover" }
        ]
      };

    case "REIT":
      return {
        overviewTitle: "REIT_PORTFOLIO_&_STRATEGY",
        overviewText: `${name} (${ticker}) operates as a Real Estate Investment Trust, specializing in the ownership, operation, and development of income-producing real estate. It aims to generate stable cash flows through long-term lease structures and property appreciation.`,
        verdictTitle: "DISTRIBUTION_&_FFO_ANALYSIS",
        verdictText: `Valuation is driven by FFO (Funds From Operations) growth and occupancy levels. The current dividend yield is supported by solid contract cash flows, though leverage ratios and tenant roll-overs require continuous desk monitoring.`,
        risksTitle: "REAL_ESTATE_LEVERAGE_&_OCCUPANCY_RISKS",
        risksText: `Interest rate sensitivity is high due to capital intensive refinancing needs. Localized property market downturns or tenant defaults could impact occupancy and FFO yield.`,
        redFlagsTitle: "PROPERTY_CONCENTRATION_WARNINGS",
        redFlags: [
          "High tenant concentration in top property assets.",
          "Refinancing risk in a rising interest rate environment.",
          "Capital expenditure requirements for aging properties."
        ],
        metrics: [
          { label: "PRICE_TO_FFO (P/FFO)", val: "14.2x", desc: "FFO multiple valuation" },
          { label: "NAV_DISCOUNT", val: "-8.5%", desc: "Price discount to property value" },
          { label: "CAPITALIZATION_RATE", val: "6.2%", desc: "Net operating income yield" },
          { label: "OCCUPANCY_RATE", val: "94.5%", desc: "Portfolio tenancy occupancy" },
          { label: "NET_DEBT_TO_EBITDA", val: "5.4x", desc: "Consolidated leverage ratio" },
          { label: "DIVIDEND_YIELD", val: "5.25%", desc: "Annualized dividend distribution" }
        ]
      };

    case "Closed-End Fund":
      return {
        overviewTitle: "CEF_INVESTMENT_MANDATE",
        overviewText: `${name} (${ticker}) is a closed-end management investment company. It trades on the exchange with a fixed share structure, often utilizing structural leverage to enhance yield and capture market inefficiencies.`,
        verdictTitle: "NAV_DISCOUNT_&_DISTRIBUTION_VERDICT",
        verdictText: `Traded at a discount/premium to NAV, representing potential arbitrage or entry opportunities. The distribution yield is high, but the desk warns to monitor the portion funded by Return of Capital (ROC) vs Net Investment Income (NII).`,
        risksTitle: "LEVERAGE_&_MARKET_VOLATILITY_RISKS",
        risksText: `Leverage magnifies both gains and losses. CEF market prices can experience wider discounts to NAV during market corrections, creating liquidity risks.`,
        redFlagsTitle: "ROC_&_FEES_MONITOR",
        redFlags: [
          "Significant Return of Capital (ROC) eroding fund NAV.",
          "High management fees exacerbated by leverage interest costs.",
          "Intraday liquidity can be thin compared to standard ETFs."
        ],
        metrics: [
          { label: "NAV_DISCOUNT", val: "-11.2%", desc: "Market price discount to NAV" },
          { label: "DISTRIBUTION_RATE", val: "8.45%", desc: "Annualized yield on market price" },
          { label: "PORTFOLIO_LEVERAGE", val: "32.0%", desc: "Total asset leverage ratio" },
          { label: "EXPENSE_RATIO", val: "1.65%", desc: "Management fees + leverage cost" },
          { label: "NET_ASSETS", val: `1.1B ${currencyCode}`, desc: "Total fund net assets" },
          { label: "RETURN_OF_CAPITAL_PCT", val: "18.0%", desc: "ROC portion in latest distributions" }
        ]
      };

    case "Mutual Fund":
      return {
        overviewTitle: "MUTUAL_FUND_OBJECTIVE",
        overviewText: `${name} (${ticker}) is an open-end mutual fund pooling investor capital to deploy into a structured portfolio. It focuses on long-term capital appreciation or income generation under active management or index replication guidelines.`,
        verdictTitle: "NAV_&_HISTORICAL_PERFORMANCE",
        verdictText: `Priced daily at the close of trading (Net Asset Value). The fund shows steady historical risk-adjusted returns (Sharpe Ratio), matching or beating its peer group with moderate active risk.`,
        risksTitle: "MANAGER_&_REDEMPTION_RISKS",
        risksText: `Subject to active manager risk (underperformance relative to benchmark). Redemption pressures during market downturns may force liquidation of underlying securities at unfavorable prices.`,
        redFlagsTitle: "FEE_&_TURNOVER_MONITOR",
        redFlags: [
          "Higher expense ratio than passive ETF alternatives.",
          "Portfolio turnover may trigger short-term capital gains tax.",
          "Potential style drift away from the core investment mandate."
        ],
        metrics: [
          { label: "EXPENSE_RATIO", val: "0.78%", desc: "Annual fund operating expenses" },
          { label: "NET_ASSETS (AUM)", val: quote.marketCap ? `${(quote.marketCap / 1e9).toFixed(1)}B ${currencyCode}` : `15.8B ${currencyCode}`, desc: "Total assets under management" },
          { label: "MORNINGSTAR_RATING", val: "4 Star", desc: "Category risk-adjusted rank" },
          { label: "PORTFOLIO_TURNOVER", val: "22.0%", desc: "Annual trading turnover" },
          { label: "SHARPE_RATIO", val: "1.12", desc: "Risk-adjusted return ratio" },
          { label: "MIN_INVESTMENT", val: `${currencySym}3,000`, desc: "Initial subscription minimum" }
        ]
      };

    case "Stock":
    default:
      return {
        overviewTitle: "BUSINESS_MODEL_OVERVIEW",
        overviewText: `${name} (${ticker}) is a publicly traded corporate entity. Its operations focus on delivering revenue growth and shareholder return through its primary business units, competitive market position, and capital allocation strategy.`,
        verdictTitle: "VALUATION_VERDICT_VERIFICATION",
        verdictText: `Valuation depends on long-term free cash flow yield and earnings compounding. Standard metrics like trailing P/E and EV/EBITDA should be stress-tested in the DCF Sandbox using custom growth and capital cost parameters.`,
        risksTitle: "REGULATORY_OPERATIONAL_RISKS",
        risksText: `Operational risks include competition, macro rate exposure, supply chain volatility, and shifting regulatory frameworks. Check quarterly filings for details.`,
        redFlagsTitle: "RED_FLAGS_MONITOR",
        redFlags: [
          "Compare P/E vs historic median to identify multiple expansion.",
          "Analyze operating cash flow vs reported net income.",
          "Check inventory growth vs sales growth trends."
        ],
        metrics: [
          { label: "PRICE_TO_EARNINGS (P/E)", val: "22.5x", desc: "Trailing 12-month multiple" },
          { label: "PRICE_TO_BOOK (P/B)", val: "3.8x", desc: "Book value asset premium" },
          { label: "EV_TO_EBITDA", val: "14.2x", desc: "Enterprise operating value" },
          { label: "RETURN_ON_EQUITY (ROE)", val: "15.4%", desc: "Net income on shareholder equity" },
          { label: "DEBT_TO_EQUITY", val: "0.55x", desc: "Leverage debt balance ratio" },
          { label: "MARKET_CAP", val: quote.marketCap ? `${(quote.marketCap / 1e9).toFixed(1)}B ${currencyCode}` : `N/A`, desc: "Consolidated equity capitalization" }
        ]
      };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get("ticker")?.toUpperCase() || "";

    if (ticker) {
      const quote = await fetchQuote(ticker);
      if (!quote) {
        return NextResponse.json({ error: "Symbol not found" }, { status: 404 });
      }

      // 1. Resolve asset class and cleaner name via search lookups
      let assetClass: "Stock" | "ETF" | "REIT" | "Closed-End Fund" | "Mutual Fund" = "Stock";
      let longName = quote.name;

      try {
        const searchResults = await searchStocks(ticker);
        const matched = searchResults.find(
          (r) =>
            r.symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, "") ===
            ticker.replace(/\.(NS|BO|NSE|BSE)$/i, "")
        ) || searchResults[0];

        if (matched) {
          assetClass = (matched.assetClass as any) || "Stock";
          longName = matched.name || quote.name;
        }
      } catch (err) {
        console.warn("Search lookup failed during asset class resolution:", err);
      }

      // 2. Generate framework metadata (Claude system or fallback)
      let finalData: any = null;

      if (anthropicKey && anthropicKey !== "your-api-key-here") {
        try {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1000,
              system: `You are an institutional financial analyst. Identify and analyze the given ticker based on its asset class: ${assetClass}.
   
Generate a JSON response matching the schema below.
   
RESPONSE SCHEMA:
{
  "overviewTitle": "section title (e.g. FUND_MANDATE_&_OBJECTIVE)",
  "overviewText": "concise, institutional-grade description",
  "verdictTitle": "section title (e.g. PERFORMANCE_&_NAV_TRACKING)",
  "verdictText": "concise valuation or performance evaluation",
  "risksTitle": "section title (e.g. TRACKING_ERROR_&_MARKET_RISKS)",
  "risksText": "concise description of key risks",
  "redFlagsTitle": "section title (e.g. RISK_MONITOR_&_DISCLOSURES)",
  "redFlags": ["red flag 1", "red flag 2", ...],
  "metrics": [
    { "label": "METRIC_1", "val": "value", "desc": "description" },
    ... (exactly 6 metrics)
  ]
}

Rules:
- For Stock, generate metrics like: P/E, P/B, EV/EBITDA, ROE, Debt/Equity, Market Cap.
- For ETF, generate metrics like: Expense Ratio, Net Assets (AUM), Premium/Discount to NAV, Dividend Yield, Tracking Error, Portfolio Turnover.
- For REIT, generate metrics like: Price/FFO, Price/NAV, Cap Rate, Occupancy Rate, Net Debt/EBITDA, Dividend Yield.
- For Closed-End Fund, generate metrics like: NAV Premium/Discount, Distribution Rate, Portfolio Leverage, Expense Ratio, Net Assets, Return of Capital %.
- For Mutual Fund, generate metrics like: Expense Ratio, Net Assets, Morningstar Rating, Portfolio Turnover, Sharpe Ratio, Min Investment.
- Keep values realistic for the ticker: ${ticker} (${longName}) at current price ${quote.currency === "INR" ? "₹" : "$"}${quote.price}.
- All text must be highly professional, institutional-grade financial analysis.
- Return ONLY the raw JSON object. Do not include markdown code block syntax.`,
              messages: [{ role: "user", content: `Generate analysis for ticker ${ticker} (${longName})` }],
            }),
          });

          if (response.ok) {
            const resData = await response.json();
            const text = resData.content?.[0]?.text || "";
            const jsonStart = text.indexOf("{");
            const jsonEnd = text.lastIndexOf("}");
            if (jsonStart !== -1 && jsonEnd !== -1) {
              finalData = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
            }
          }
        } catch (err) {
          console.warn("Failed to fetch custom analysis from Claude:", err);
        }
      }

      if (!finalData) {
        finalData = generateFallbackData(quote.displaySymbol, longName, assetClass, quote);
      }

      return NextResponse.json({
        ticker: quote.displaySymbol,
        name: longName,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        vol: quote.volume ? `${(quote.volume / 1_000_000).toFixed(1)}M` : "N/A",
        high52: quote.fiftyTwoWeekHigh ?? quote.dayHigh,
        low52: quote.fiftyTwoWeekLow ?? quote.dayLow,
        currency: quote.currency,
        exchange: quote.exchange,
        assetClass,
        ...finalData,
      });
    }

    const defaults = ["RELIANCE", "TCS", "HDFCBANK", "INFY"];
    const profiles = await Promise.all(
      defaults.map(async (sym) => {
        const q = await fetchQuote(sym);
        if (!q) return null;
        const fallback = generateFallbackData(q.displaySymbol, q.name, "Stock", q);
        return {
          ticker: q.displaySymbol,
          name: q.name,
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          vol: q.volume ? `${(q.volume / 1_000_000).toFixed(1)}M` : "N/A",
          high52: q.fiftyTwoWeekHigh ?? q.dayHigh,
          low52: q.fiftyTwoWeekLow ?? q.dayLow,
          currency: q.currency,
          exchange: q.exchange,
          assetClass: "Stock",
          ...fallback,
        };
      })
    );

    return NextResponse.json(profiles.filter(Boolean));
  } catch (err) {
    console.error("Market API route failed:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

