import dotenv from "dotenv";

// Load environment variables for local testing
dotenv.config();

export default async function handler(req, res) {
  // Add CORS headers for edge security
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).send("Bad Request: 'message' field is required in payload.");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    console.error("Configuration Error: ANTHROPIC_API_KEY is not defined or is placeholder.");
    return res.status(500).send("Server Error: Anthropic API credentials are misconfigured.");
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: "You are AnalystOS AI — a professional finance analyst for young professionals in India. Give sharp, structured, jargon-free answers about Indian stocks (NSE/BSE), financial concepts, DCF, valuations, earnings, and career guidance. Keep answers under 150 words. Use Indian context — mention NIFTY, SENSEX, Indian companies like Reliance, TCS, HDFC where relevant. Format with short line breaks for terminal readability.",
        messages: [{ role: "user", content: message }]
      })
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error(`Anthropic API returned error status ${response.status}:`, errorMsg);
      return res.status(response.status).send("AnalystOS AI is initialising. Please try again in a moment.");
    }

    const data = await response.json();
    
    if (!data.content || data.content.length === 0 || !data.content[0].text) {
      console.error("Anthropic API returned an empty content array:", data);
      return res.status(502).send("AnalystOS AI is initialising. Please try again in a moment.");
    }

    const responseText = data.content[0].text;
    
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(responseText);

  } catch (error) {
    console.error("Backend Proxy failed connecting to Anthropic API:", error);
    return res.status(500).send("AnalystOS AI is initialising. Please try again in a moment.");
  }
}
