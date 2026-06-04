import { NextRequest, NextResponse } from "next/server";
import { fetchQuote } from "@/lib/market-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get("ticker")?.toUpperCase() || "";

    if (ticker) {
      const quote = await fetchQuote(ticker);
      if (!quote) {
        return NextResponse.json({ error: "Symbol not found" }, { status: 404 });
      }

      return NextResponse.json({
        ticker: quote.displaySymbol,
        name: quote.name,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        vol: quote.volume ? `${(quote.volume / 1_000_000).toFixed(1)}M` : "N/A",
        pe: 0,
        pb: 0,
        evEbitda: 0,
        roe: 0,
        debtEquity: 0,
        high52: quote.fiftyTwoWeekHigh ?? quote.dayHigh,
        low52: quote.fiftyTwoWeekLow ?? quote.dayLow,
        businessModel: `${quote.name} — live quote from ${quote.exchange}. Use Stock AI for full research.`,
        risks: "Market, sector, and macro risks apply. Verify filings before investing.",
        earningsVerdict: `Last price ${quote.price} ${quote.currency} (${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent}% vs prior close).`,
        redFlags: ["Review latest quarterly filings and management guidance."],
        currency: quote.currency,
        exchange: quote.exchange,
      });
    }

    const defaults = ["RELIANCE", "TCS", "HDFCBANK", "INFY"];
    const profiles = await Promise.all(
      defaults.map(async (sym) => {
        const q = await fetchQuote(sym);
        if (!q) return null;
        return {
          ticker: q.displaySymbol,
          name: q.name,
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          vol: q.volume ? `${(q.volume / 1_000_000).toFixed(1)}M` : "N/A",
          pe: 0,
          pb: 0,
          evEbitda: 0,
          roe: 0,
          debtEquity: 0,
          high52: q.fiftyTwoWeekHigh ?? q.dayHigh,
          low52: q.fiftyTwoWeekLow ?? q.dayLow,
          businessModel: q.name,
          risks: "Standard equity market risks.",
          earningsVerdict: "See latest exchange filings.",
          redFlags: [] as string[],
        };
      })
    );

    return NextResponse.json(profiles.filter(Boolean));
  } catch (err) {
    console.error("Market API route failed:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
