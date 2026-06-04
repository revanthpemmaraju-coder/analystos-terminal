-- AnalystOS Supabase Database Schema Migration Script
-- Copy and run this script in the SQL Editor of your Supabase dashboard.

-- -------------------------------------------------------------
-- 1. Profiles Table (Extends Supabase auth.users)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'analyst')),
  questions_used_today INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 2. Portfolios Table (Paper Trading Portfolios)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  holdings JSONB DEFAULT '[]'::jsonb, -- Array of {ticker, shares, average_buy_price}
  cash_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for portfolios
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Ensure 1 portfolio per user (matches app logic using upsert on user_id)
CREATE UNIQUE INDEX IF NOT EXISTS portfolios_user_id_unique ON public.portfolios(user_id);

-- Backwards-compatible: add column if the table already exists
ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS cash_balance NUMERIC DEFAULT 0;

-- -------------------------------------------------------------
-- 3. DCF Models Table (Saved Discounted Cash Flow models)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dcf_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  inputs JSONB NOT NULL, -- {revenue, ebitda, growth_rate, wacc, exit_multiple, terminal_growth_rate}
  result JSONB NOT NULL, -- {enterprise_value, equity_value, implied_share_price, sensitivity_grid}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for dcf_models
ALTER TABLE public.dcf_models ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 4. Conversations Table (AI Analyst Chat Logs)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb, -- Array of {role: 'user'|'assistant', content: text, timestamp: text}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 5. Waitlist Table (Lead capture)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  segment TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for waitlist
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- -------------------------------------------------------------

-- Profiles Policies
CREATE POLICY "Allow public read of profiles" ON public.profiles 
  FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Portfolios Policies
CREATE POLICY "Allow users to manage their own portfolios" ON public.portfolios 
  FOR ALL USING (auth.uid() = user_id);

-- DCF Models Policies
CREATE POLICY "Allow users to manage their own DCF models" ON public.dcf_models 
  FOR ALL USING (auth.uid() = user_id);

-- Conversations Policies
CREATE POLICY "Allow users to manage their own chat logs" ON public.conversations 
  FOR ALL USING (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 6. Analyst Feed Items (AI-generated brief + notes)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analyst_feed_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('brief', 'note')),
  title TEXT NOT NULL,
  symbols TEXT[] DEFAULT ARRAY[]::text[],
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.analyst_feed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own feed items" ON public.analyst_feed_items
  FOR ALL USING (auth.uid() = user_id);

-- Waitlist Policies
CREATE POLICY "Allow public inserts to waitlist" ON public.waitlist 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admins/system to view waitlist" ON public.waitlist 
  FOR SELECT USING (true);

-- -------------------------------------------------------------
-- 6. Trigger to automatically create a profile on SignUp
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
