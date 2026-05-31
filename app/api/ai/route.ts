import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    if (!message) {
      return new NextResponse("Bad Request: 'message' is required in payload", { status: 400 });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return new NextResponse("Configuration Error: Supabase credentials are missing", { status: 500 });
    }

    // Initialize Server-side Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Quota & Plan Verification
    let plan = "free";
    let questionsUsed = 0;
    
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profile) {
        plan = profile.plan || "free";
        questionsUsed = profile.questions_used_today || 0;

        // Enforce quota gate if user is on Free Tier
        if (plan === "free" && questionsUsed >= 5) {
          return NextResponse.json({
            error: "QUOTA_EXCEEDED",
            message: "Daily limit of 5 AI questions reached on the FREE tier. Upgrade to PRO for unlimited queries."
          }, { status: 429 });
        }
      }
    }

    // 2. Transmit request to Anthropic Claude
    if (!anthropicKey || anthropicKey === "your-api-key-here") {
      return new NextResponse("Configuration Error: Anthropic API key is not configured.", { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: "You are an institutional equity research analyst. Answer questions about stocks, earnings, valuations, and markets. Always cite your reasoning. Focus on NSE/BSE Indian stocks and global equities. Provide high-density, structured, professional answers utilizing clear key margins, bullet points, and citation tags. Keep your tone objective, professional, and clear. Format output with standard line-breaks for monospace terminal viewports.",
        messages: [{ role: "user", content: message }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic Claude API returned an error:", errorText);
      return new NextResponse("Claude API Connection Error", { status: 502 });
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    // 3. Update Profiles Table to increment daily check count for Free users
    if (userId && plan === "free") {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ questions_used_today: questionsUsed + 1 })
        .eq("id", userId);
      
      if (updateError) {
        console.warn("DB profile check increment failed:", updateError.message);
      }
    }

    return NextResponse.json({ content: responseText });

  } catch (err: any) {
    console.error("Server Route post failed:", err);
    return new NextResponse("Internal Server Error in API AI route", { status: 500 });
  }
}
