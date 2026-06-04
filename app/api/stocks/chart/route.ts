import { NextRequest, NextResponse } from "next/server";
import { ChartRange, fetchChart } from "@/lib/market-data";

const VALID_RANGES: ChartRange[] = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"];

export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;
    const symbol = params.get("symbol") || "";
    const range = (params.get("range") || "1mo") as ChartRange;

    if (!symbol) {
      return NextResponse.json({ error: "symbol required" }, { status: 400 });
    }
    if (!VALID_RANGES.includes(range)) {
      return NextResponse.json({ error: "invalid range" }, { status: 400 });
    }

    const data = await fetchChart(symbol, range);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Chart fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch chart" }, { status: 500 });
  }
}
