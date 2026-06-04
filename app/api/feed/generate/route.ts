import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatMarketContext, resolveQuotesFromMessage } from "@/lib/market-data";

type FeedKind = "brief" | "note";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

const isValidUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function fallbackBrief(): string {
  return (
    "[ANALYSTOS_FEED: MORNING_BRIEF]\n" +
    "- NIFTY / SENSEX: monitor opening range + bank/IT leadership.\n" +
    "- Macro: track USDINR, Brent, US yields.\n" +
    "- Watchlist: RELIANCE / TCS / HDFCBANK — review earnings calendar + news flow.\n" +
    "- Risk: gap opens, headline-driven reversals. Position size accordingly."
  );
}

function fallbackNote(symbol: string): string {
  return (
    `[ANALYST_NOTE: ${symbol}]\n` +
    "- Setup: monitor price action vs prior close + intraday range.\n" +
    "- Catalysts: earnings / guidance, sector rotation, macro rates.\n" +
    "- Risk: volatility + liquidity pockets. Use stops and sizing.\n" +
    "- Action: add to watchlist; validate thesis with DCF + comps."
  );
}

async function callClaude(system: string, user: string, maxTokens = 550): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kind = (body.kind as FeedKind) || "note";
    const userId = String(body.userId || "");
    const symbols: string[] = Array.isArray(body.symbols)
      ? body.symbols.map((s: string) => String(s).trim().toUpperCase()).filter(Boolean).slice(0, 8)
      : [];

    if (!["brief", "note"].includes(kind)) {
      return NextResponse.json({ error: "invalid kind" }, { status: 400 });
    }

    let content = "";
    let title = "";

    if (kind === "brief") {
      title = "Morning Brief";
      if (!anthropicKey || anthropicKey === "your-api-key-here") {
        content = fallbackBrief();
      } else {
        content = await callClaude(
          "You are AnalystOS Feed Editor. Write a tight morning brief for an Indian/global trading desk.\n" +
            "Format:\n" +
            "1) Index snapshot (NIFTY, SENSEX, S&P 500, NASDAQ)\n" +
            "2) Macro (USDINR, crude, rates)\n" +
            "3) 3 stocks to watch (why)\n" +
            "4) Risk note\n" +
            "Keep it concise, terminal-readable, short lines, no markdown tables.",
          "Generate today's brief."
        );
      }
    } else {
      const sym = symbols[0] || "AAPL";
      title = `Analyst Note: ${sym}`;

      const { quotes } = await resolveQuotesFromMessage(sym, [sym]);
      const marketContext = formatMarketContext(quotes);

      if (!anthropicKey || anthropicKey === "your-api-key-here") {
        content = fallbackNote(sym);
      } else {
        content = await callClaude(
          "You write short, high-signal analyst feed notes.\n" +
            "Rules:\n" +
            "- 8–14 lines max\n" +
            "- Include: Setup, Catalysts, Risks, Action\n" +
            "- No hype, no guarantees\n" +
            "- Use the LIVE MARKET DATA block if present\n",
          `SYMBOL: ${sym}\n\nLIVE MARKET DATA:\n${marketContext || "N/A"}\n\nWrite the note.`
        );
      }
    }

    const nowIso = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      user_id: userId,
      kind,
      title,
      symbols,
      content,
      created_at: nowIso,
    };

    const canWriteDb = !!(supabaseUrl && supabaseServiceKey && userId && isValidUuid(userId));
    if (canWriteDb) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await supabase
        .from("analyst_feed_items")
        .insert({
          user_id: userId,
          kind,
          title,
          symbols,
          content,
        })
        .select("*")
        .single();

      if (!error && data) {
        return NextResponse.json({ item: data });
      }
    }

    return NextResponse.json({ item });
  } catch (err: any) {
    console.error("Feed generation failed:", err);
    return NextResponse.json({ error: "Failed to generate feed item" }, { status: 500 });
  }
}

