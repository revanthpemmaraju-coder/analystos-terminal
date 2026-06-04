import { NextRequest, NextResponse } from "next/server";
import { fetchQuote } from "@/lib/market-data";

export async function GET(req: NextRequest) {
  try {
    const symbol = new URL(req.url).searchParams.get("symbol") || "";
    if (!symbol) {
      return NextResponse.json({ error: "symbol required" }, { status: 400 });
    }
    const quote = await fetchQuote(symbol);
    if (!quote) {
      return NextResponse.json({ error: "Symbol not found" }, { status: 404 });
    }
    return NextResponse.json({ quote });
  } catch (err) {
    console.error("Quote fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}
