import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/market-data";

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get("q") || "";
    if (q.length < 1) {
      return NextResponse.json({ results: [] });
    }
    const results = await searchStocks(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Stock search failed:", err);
    return NextResponse.json({ results: [], error: "Search unavailable" }, { status: 200 });
  }
}
