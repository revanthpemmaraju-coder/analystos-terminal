/* -------------------------------------------------------------
 * ANALYSTOS SECURE BACKEND GATEWAY
 * Production-ready Express API serving static compiled assets
 * and proxying LLM requests safely.
 * ------------------------------------------------------------- */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname equivalent in ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend cross-origin requests
app.use(cors());

// Parse incoming JSON body payloads
app.use(express.json());

// API Endpoint: POST /api/chat
app.post("/api/chat", async (req, res) => {
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
    
    // Set headers and return only the raw generated response text
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.send(responseText);

  } catch (error) {
    console.error("Backend Proxy failed connecting to Anthropic API:", error);
    return res.status(500).send("AnalystOS AI is initialising. Please try again in a moment.");
  }
});

// Serve compiled frontend assets from /dist in production
app.use(express.static(path.join(__dirname, "dist")));

// Fallback all non-API paths to static client index.html
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "dist", "index.html"), (err) => {
    if (err) {
      // Return dev setup statement if dist folder has not been compiled yet
      res.status(404).send("AnalystOS Dev Gateway active. Please boot the client dev server.");
    }
  });
});

// Boot Server listener
app.listen(PORT, () => {
  console.log("=============================================================");
  console.log(`AnalystOS Full-Stack Server active on http://localhost:${PORT}`);
  console.log("Mode: API Gateway & Static Files Server");
  console.log("=============================================================");
});
