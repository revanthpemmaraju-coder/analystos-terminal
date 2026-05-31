import { NextRequest, NextResponse } from "next/server";

interface StockProfile {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  vol: string;
  pe: number;
  pb: number;
  evEbitda: number;
  roe: number;
  debtEquity: number;
  high52: number;
  low52: number;
  businessModel: string;
  risks: string;
  earningsVerdict: string;
  redFlags: string[];
}

const STOCK_DATABASE: Record<string, StockProfile> = {
  RELIANCE: {
    ticker: "RELIANCE",
    name: "Reliance Industries Ltd.",
    price: 2450.40,
    change: 42.10,
    changePercent: 1.75,
    vol: "2.8M",
    pe: 26.4,
    pb: 2.1,
    evEbitda: 14.8,
    roe: 11.2,
    debtEquity: 0.38,
    high52: 2620,
    low52: 2180,
    businessModel: "Diversified conglomerate with leading presence in oil-to-chemicals (O2C), telecom (Jio), and retail segments. Rapidly scaling green energy capital projects.",
    risks: "Volatility in international petrochemical margins, capital allocation inefficiencies in massive renewable investments, and telecom subscriber growth stagnation.",
    earningsVerdict: "Strong double-digit digital services growth and retail EBITDA margin expansion offset cyclical petrochemical refining weaknesses. Long thesis remains fully intact.",
    redFlags: ["Substantial capital expenditure commitments", "Rising net consolidated leverage in telecom scaling"]
  },
  TCS: {
    ticker: "TCS",
    name: "Tata Consultancy Services",
    price: 3820.15,
    change: 98.40,
    changePercent: 2.64,
    vol: "1.1M",
    pe: 28.2,
    pb: 8.5,
    evEbitda: 18.5,
    roe: 38.6,
    debtEquity: 0.02,
    high52: 4250,
    low52: 3120,
    businessModel: "Global IT services and consulting giant. High retention rates with enterprise buy-side segments, serving BFSI, retail, tech, and manufacturing industries globally.",
    risks: "Slowing discretionary cloud spend in European/US banking sectors, wage inflation in tech talent, and geopolitical tech deployment constraints.",
    earningsVerdict: "Solid EBITDA margin retention at 26.2%. Enterprise orders pipeline remains robust, driven by digital transformation and AI integration partnerships.",
    redFlags: ["Slowing headcount net additions", "Extended payment cycles in international markets"]
  },
  HDFCBANK: {
    ticker: "HDFCBANK",
    name: "HDFC Bank Limited",
    price: 1510.60,
    change: -12.40,
    changePercent: -0.81,
    vol: "4.5M",
    pe: 16.8,
    pb: 2.8,
    evEbitda: 11.2,
    roe: 16.2,
    debtEquity: 1.15,
    high52: 1720,
    low52: 1360,
    businessModel: "India's premier private sector banking institution, dominating retail credit, wholesale banking, digital transactional pipelines, and mortgage lending post-merger.",
    risks: "Post-merger margins compression, deposit mobilization costs rising, and retail asset quality strains in unsecured credit portfolios.",
    earningsVerdict: "Stable net interest margins (NIMs) at 3.4% post-merger. Strong retail advances growth continues. Underappreciated valuation discount suggests BUY rating.",
    redFlags: ["Rising deposit acquisition costs", "Post-merger integration adjustments dragging returns"]
  },
  INFY: {
    ticker: "INFY",
    name: "Infosys Limited",
    price: 1420.25,
    change: 18.50,
    changePercent: 1.32,
    vol: "1.9M",
    pe: 22.5,
    pb: 6.8,
    evEbitda: 14.2,
    roe: 31.4,
    debtEquity: 0.04,
    high52: 1680,
    low52: 1185,
    businessModel: "Premium tier global IT services, outsourcing, and digital engineering services company with highly diversified operations across North America and Europe.",
    risks: "Exposure to US discretionary capital cutbacks, high employee attrition rates in core segments, and slower transition to high-value AI design frameworks.",
    earningsVerdict: "Strong margins defense at 21.1%. IT consolidation deals in Northern Europe driving revenues. Intrinsic value implies upside of +12.4%.",
    redFlags: ["Decline in premium active client counts", "Promoter pledge margin reviews active"]
  }
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get("ticker")?.toUpperCase() || "";

    if (ticker) {
      const profile = STOCK_DATABASE[ticker];
      if (profile) {
        // Recalculate slightly to simulate live feed variance
        const delta = (Math.random() - 0.5) * 1.5;
        const newPrice = Number((profile.price + delta).toFixed(2));
        const newChange = Number((profile.change + delta).toFixed(2));
        const newPercent = Number(((newChange / (newPrice - newChange)) * 100).toFixed(2));

        return NextResponse.json({
          ...profile,
          price: newPrice,
          change: newChange,
          changePercent: newPercent
        });
      } else {
        // Fallback for custom search tickers
        return NextResponse.json({
          ticker,
          name: `${ticker} Equity Shares`,
          price: 520.40,
          change: 5.20,
          changePercent: 1.01,
          vol: "500K",
          pe: 19.5,
          pb: 1.8,
          evEbitda: 12.4,
          roe: 14.5,
          debtEquity: 0.25,
          high52: 600,
          low52: 410,
          businessModel: "Generic domestic corporate entity shares. Details compiling under weekly OCR scans.",
          risks: "Regulatory exposure, sector competition, and raw capital volatility.",
          earningsVerdict: "Stable operations metrics with conservative growth projections.",
          redFlags: ["Information compiling"]
        });
      }
    }

    // Default return all tickers overview
    return NextResponse.json(Object.values(STOCK_DATABASE));

  } catch (err) {
    console.error("Market API route failed:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
