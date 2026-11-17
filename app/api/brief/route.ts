import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY || "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

  try {
    // 1. Generate Brief Content utilizing Claude Sonnet
    if (!anthropicKey || anthropicKey === "your-api-key-here") {
      return new NextResponse("Anthropic key missing", { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        system: "You are the AnalystOS Morning bulletin editor. Compile a highly structured financial briefing representing the daily NSE/BSE and global indices outlook. Include: 1. domestic index ticks, 2. top 3 sector movers, 3. global macro news (crude, currency), 4. key stock to watch with intrinsic PE ratios. Keep answers strictly professional and formatted with short line breaks for terminal readability.",
        messages: [{ role: "user", content: "Generate the morning brief for India trading desk" }]
      })
    });

    if (!response.ok) {
      throw new Error("Claude connection failed");
    }

    const data = await response.json();
    const briefText = data.content[0].text;

    // 2. Email Subscribers using Resend (Pro/Analyst plan users)
    const shouldSendEmail = resendApiKey && resendApiKey !== "re_your_resend_api_key";
    if (shouldSendEmail && (!supabaseUrl || !supabaseServiceKey)) {
      console.error(
        "Brief email delivery requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }

    if (shouldSendEmail && supabaseUrl && supabaseServiceKey) {
      const resend = new Resend(resendApiKey);
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      
      // Query paid subscriber emails
      const { data: subscribers, error: subscribersError } = await supabase
        .from("user_plans")
        .select("user_id")
        .in("plan", ["pro", "analyst"])
        .not("user_id", "is", null);
      if (subscribersError) throw subscribersError;

      const { data: activeSubscriptions, error: subscriptionsError } = await supabase
        .from("razorpay_subscriptions")
        .select("user_id")
        .gt("paid_through", new Date().toISOString());
      if (subscriptionsError) throw subscriptionsError;

      const subscriberIds = new Set([
        ...(subscribers || []).map(({ user_id }) => user_id).filter(Boolean),
        ...(activeSubscriptions || []).map(({ user_id }) => user_id).filter(Boolean),
      ]);

      if (subscriberIds.size) {
        const recipients = await Promise.all(
          [...subscriberIds].map(async (user_id) => {
            const { data, error } = await supabase.auth.admin.getUserById(user_id);
            if (error) throw error;
            return data.user?.email || null;
          }),
        );
        const emailList = [...new Set(recipients.filter((email): email is string => !!email))];

        if (emailList.length) await resend.emails.send({
          from: "briefing@analystos.app",
          to: emailList,
          subject: `AnalystOS Morning Briefing: India Trade Desk`,
          text: briefText
        });
        
        console.log(`[RESEND_EMAIL]: Successfully sent briefing to ${emailList.length} subscribers.`);
      }
    }

    return NextResponse.json({ content: briefText });

  } catch (err: any) {
    console.error("Morning Brief compilation failed:", err);
    return errorResponse("Morning Brief is currently unavailable.", 503);
  }
}
