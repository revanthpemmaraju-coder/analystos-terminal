import { NextResponse } from "next/server";
import { fetchIndexQuotes } from "@/lib/market-data";

export async function GET() {
  try {
    const indices = await fetchIndexQuotes();
    return NextResponse.json({ indices });
  } catch (err) {
    console.error("Indices fetch failed:", err);
    return NextResponse.json({ indices: [] });
  }
}
