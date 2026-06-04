import { NextRequest, NextResponse } from "next/server";
import { fetchInstitutionalFlow } from "@/lib/market-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const symbol = new URL(req.url).searchParams.get("symbol") || "";
    if (!symbol) {
      return NextResponse.json({ error: "symbol required" }, { status: 400 });
    }

    const flow = await fetchInstitutionalFlow(symbol);
    if (!flow) {
      return NextResponse.json({ error: "Flow unavailable for symbol" }, { status: 404 });
    }

    return NextResponse.json({ flow });
  } catch (err) {
    console.error("Institutional flow fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch flow" }, { status: 500 });
  }
}

