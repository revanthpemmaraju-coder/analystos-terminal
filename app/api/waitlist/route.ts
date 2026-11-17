import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-utils";
import { createRateLimiter } from "@/lib/rate-limit";

const rateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 5 });

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const { allowed } = rateLimiter.check(ip);
  if (!allowed) return errorResponse("Too Many Requests", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  if (typeof body !== "object" || body === null || !("email" in body)) {
    return errorResponse("Email is required.", 400);
  }

  const email = body.email;
  if (typeof email !== "string" || !email.trim()) {
    return errorResponse("Email is required.", 400);
  }

  const sanitizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    return errorResponse("Please enter a valid email address.", 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Waitlist API requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    return NextResponse.json(
      { error: "The waitlist is temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existingUser, error: fetchError } = await supabase
      .from("waitlist")
      .select("email")
      .eq("email", sanitizedEmail)
      .maybeSingle();

    if (fetchError) {
      console.error("Waitlist lookup failed:", fetchError.code);
      return NextResponse.json(
        { error: "Unable to verify waitlist registration." },
        { status: 503 },
      );
    }

    if (existingUser) {
      return NextResponse.json({
        message: "You are already on the waitlist.",
        isNew: false,
      });
    }

    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email: sanitizedEmail });

    if (insertError?.code === "23505") {
      const { data: duplicate, error: duplicateError } = await supabase
        .from("waitlist")
        .select("email")
        .eq("email", sanitizedEmail)
        .maybeSingle();
      if (!duplicateError && duplicate) {
        return NextResponse.json({
          message: "You are already on the waitlist.",
          isNew: false,
        });
      }
    }

    if (insertError) {
      console.error("Waitlist insert failed:", insertError.code);
      return NextResponse.json(
        { error: "Unable to save waitlist registration." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      message: "Successfully joined the waitlist.",
      isNew: true,
    });
  } catch (error) {
    console.error(
      "Waitlist request failed:",
      error instanceof Error ? error.name : "Unknown server error.",
    );
    return NextResponse.json(
      { error: "The waitlist is temporarily unavailable." },
      { status: 503 },
    );
  }
}
