import { NextRequest } from "next/server";
import { fetchQuoteRealtime } from "@/lib/market-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseSymbols(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toUpperCase())
    .slice(0, 20);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = parseSymbols(searchParams.get("symbols"));
  const intervalMsRaw = Number(searchParams.get("intervalMs") || "5000");
  const intervalMs = Number.isFinite(intervalMsRaw)
    ? Math.min(Math.max(intervalMsRaw, 2500), 30_000)
    : 5000;

  if (symbols.length === 0) {
    return new Response("symbols required", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("ready", { symbols, intervalMs, ts: Date.now() });

      const tick = async () => {
        const now = new Date().toISOString();
        const quotes = await Promise.all(
          symbols.map(async (sym) => {
            try {
              const quote = await fetchQuoteRealtime(sym);
              return quote ? { ok: true, quote, ts: now } : { ok: false, symbol: sym, ts: now };
            } catch {
              return { ok: false, symbol: sym, ts: now };
            }
          })
        );

        send("quotes", quotes);
      };

      // Fire once immediately
      void tick();

      const id = setInterval(() => void tick(), intervalMs);

      const onAbort = () => {
        clearInterval(id);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      req.signal.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

