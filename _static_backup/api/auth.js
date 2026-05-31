import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // CORS Headers for global Edge security
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

  const { action } = req.query;
  const { email, password, fullName } = req.body;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === "your-supabase-url") {
    console.warn("Database credentials missing. Simulating database credentials check.");
    // Fallback simulation for seamless dashboard experience if user hasn't linked Supabase yet
    if (action === "signup") {
      return res.status(200).json({
        user: { id: "mock-uid-123", email, fullName },
        message: "Local Mode: Registration successful!"
      });
    } else if (action === "signin") {
      return res.status(200).json({
        session: { access_token: "mock-jwt-token" },
        user: { id: "mock-uid-123", email, isPremium: true },
        message: "Local Mode: Sign in successful!"
      });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    if (action === "signup") {
      // 1. Sign up user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        return res.status(400).send(error.message);
      }

      // 2. Add profile metadata row in database (profiles table)
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: data.user.id,
            email: email,
            full_name: fullName,
            is_premium: false,
            role: "user"
          }
        ]);

      if (profileError) {
        console.error("Profile database row failed to insert:", profileError.message);
      }

      return res.status(200).json({
        user: { id: data.user.id, email: data.user.email, fullName },
        message: "Registration successful!"
      });

    } else if (action === "signin") {
      // Sign in user via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return res.status(400).send(error.message);
      }

      // Query if premium status is active in profile
      let isPremium = false;
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        isPremium = profile.is_premium;
      }

      return res.status(200).json({
        session: { access_token: data.session.access_token },
        user: { id: data.user.id, email: data.user.email, isPremium },
        message: "Sign in successful!"
      });

    } else {
      return res.status(400).send("Bad Request: Invalid action query.");
    }

  } catch (error) {
    console.error("Auth handler failed:", error);
    return res.status(500).send("Internal Server Error during auth operation.");
  }
}
