-- Add recurring Razorpay subscriptions without changing legacy one-time payments
-- or rewriting existing user_plans entitlements.
BEGIN;

DO $subscription_preflight$
DECLARE
  capture_definition TEXT;
  plans_check_expression TEXT;
  plans_check_mismatch BOOLEAN;
BEGIN
  IF pg_catalog.to_regclass('public.user_plans') IS NULL THEN
    RAISE EXCEPTION 'Required table public.user_plans does not exist';
  END IF;
  IF pg_catalog.to_regclass('public.payments') IS NULL
     OR pg_catalog.to_regclass('public.ai_usage') IS NULL THEN
    RAISE EXCEPTION 'Required legacy payment and AI usage tables do not exist';
  END IF;
  IF pg_catalog.to_regprocedure(
    'public.record_razorpay_capture(text,text,text,uuid,text,bigint,text)'
  ) IS NULL THEN
    RAISE EXCEPTION 'The existing one-time payment capture RPC is missing';
  END IF;
  IF pg_catalog.to_regprocedure('public.consume_ai_question()') IS NULL THEN
    RAISE EXCEPTION 'The existing AI quota RPC is missing';
  END IF;
  IF (
    SELECT pg_catalog.count(*)
      FROM pg_catalog.pg_proc AS p
      JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('consume_ai_question', 'record_razorpay_capture')
  ) <> 2
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_proc AS p
        WHERE p.oid = 'public.consume_ai_question()'::regprocedure
          AND p.prorettype = 'boolean'::regtype
          AND p.prosecdef
          AND p.proowner = 'postgres'::regrole::oid
          AND EXISTS (
            SELECT 1 FROM pg_catalog.pg_options_to_table(p.proconfig) AS function_option
             WHERE function_option.option_name = 'search_path'
               AND function_option.option_value = ''
          )
          AND pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
          AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
          AND NOT pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
     )
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_proc AS p
        WHERE p.oid = 'public.record_razorpay_capture(text,text,text,uuid,text,bigint,text)'::regprocedure
          AND p.proargnames = ARRAY[
            'p_payment_id', 'p_order_id', 'p_event_id', 'p_user_id',
            'p_plan', 'p_amount', 'p_currency'
          ]::TEXT[]
          AND p.prorettype = 'text'::regtype
          AND p.prosecdef
          AND p.proowner = 'postgres'::regrole::oid
          AND EXISTS (
            SELECT 1 FROM pg_catalog.pg_options_to_table(p.proconfig) AS function_option
             WHERE function_option.option_name = 'search_path'
               AND function_option.option_value = ''
          )
          AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
          AND NOT pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
          AND NOT pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
     )
  THEN
    RAISE EXCEPTION 'Existing payment/quota RPC signatures or access controls differ from the reviewed production contract';
  END IF;
  IF pg_catalog.to_regclass('public.razorpay_subscriptions') IS NOT NULL
     OR pg_catalog.to_regclass('public.razorpay_subscription_events') IS NOT NULL THEN
    RAISE EXCEPTION 'A Razorpay subscription object already exists; inspect it before applying this migration';
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint AS c
     WHERE c.conrelid = 'public.user_plans'::regclass
       AND c.conname = 'user_plans_valid_plan_ck'
       AND c.contype = 'c'
       AND c.convalidated
  ) OR NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint AS c
     WHERE c.conrelid = 'public.payments'::regclass
       AND c.conname = 'payments_check1'
       AND c.contype = 'c'
       AND c.convalidated
  ) OR NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint AS c
     WHERE c.conrelid = 'public.payments'::regclass
       AND c.conname = 'payments_plan_check'
       AND c.contype = 'c'
       AND c.convalidated
  ) THEN
    RAISE EXCEPTION 'Existing payment and entitlement constraints do not match the reviewed one-time schema';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM (VALUES
        ('user_plans', 'user_id', 'uuid', 'YES'),
        ('user_plans', 'plan', 'text', 'YES'),
        ('ai_usage', 'user_id', 'uuid', 'NO'),
        ('ai_usage', 'usage_date', 'date', 'NO'),
        ('ai_usage', 'questions_used', 'integer', 'NO')
      ) AS expected(table_name, column_name, data_type, is_nullable)
      LEFT JOIN information_schema.columns AS actual
        ON actual.table_schema = 'public'
       AND actual.table_name = expected.table_name
       AND actual.column_name = expected.column_name
     WHERE actual.column_name IS NULL
        OR actual.data_type <> expected.data_type
        OR actual.is_nullable <> expected.is_nullable
  ) THEN
    RAISE EXCEPTION 'Existing entitlement or AI usage columns do not match the reviewed schema';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_constraint AS c
     WHERE c.conrelid = 'public.ai_usage'::regclass
       AND c.conname = 'ai_usage_pkey'
       AND c.contype = 'p'
       AND (
         SELECT pg_catalog.array_agg(a.attname::TEXT ORDER BY key_column.ordinality)
           FROM pg_catalog.unnest(c.conkey) WITH ORDINALITY
             AS key_column(attnum, ordinality)
           JOIN pg_catalog.pg_attribute AS a
             ON a.attrelid = c.conrelid AND a.attnum = key_column.attnum
       ) = ARRAY['user_id', 'usage_date']::TEXT[]
  ) THEN
    RAISE EXCEPTION 'public.ai_usage must retain its unique user/date key for atomic quota updates';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO plans_check_expression
    FROM pg_catalog.pg_constraint AS c
   WHERE c.conrelid = 'public.user_plans'::regclass
     AND c.conname = 'user_plans_valid_plan_ck'
     AND c.contype = 'c'
     AND c.convalidated;
  EXECUTE pg_catalog.format(
    $probe$
      SELECT EXISTS (
        SELECT 1
          FROM (VALUES
            (NULL::uuid, NULL::text, TRUE),
            (NULL::uuid, 'free'::text, TRUE),
            (NULL::uuid, 'pro'::text, TRUE),
            (NULL::uuid, 'analyst'::text, TRUE),
            (NULL::uuid, 'invalid'::text, TRUE),
            ('00000000-0000-0000-0000-000000000001'::uuid, NULL::text, FALSE),
            ('00000000-0000-0000-0000-000000000001'::uuid, 'free'::text, TRUE),
            ('00000000-0000-0000-0000-000000000001'::uuid, 'pro'::text, TRUE),
            ('00000000-0000-0000-0000-000000000001'::uuid, 'analyst'::text, TRUE),
            ('00000000-0000-0000-0000-000000000001'::uuid, 'invalid'::text, FALSE)
          ) AS probe(user_id, plan, expected)
         WHERE COALESCE((%s), TRUE) IS DISTINCT FROM probe.expected
      )
    $probe$,
    plans_check_expression
  ) INTO plans_check_mismatch;
  IF plans_check_mismatch THEN
    RAISE EXCEPTION 'user_plans_valid_plan_ck does not retain the reviewed free/pro/analyst semantics';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    'public.record_razorpay_capture(text,text,text,uuid,text,bigint,text)'::regprocedure
  ) INTO capture_definition;
  IF pg_catalog.strpos(capture_definition, '49900') = 0
     OR pg_catalog.strpos(capture_definition, '149900') = 0
     OR pg_catalog.strpos(capture_definition, 'user_plans') = 0 THEN
    RAISE EXCEPTION 'The existing one-time capture RPC differs from the reviewed legacy contract';
  END IF;
END;
$subscription_preflight$;

CREATE TABLE public.razorpay_subscriptions (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  razorpay_subscription_id TEXT NOT NULL UNIQUE
    CHECK (razorpay_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  razorpay_plan_id TEXT NOT NULL
    CHECK (razorpay_plan_id ~ '^plan_[A-Za-z0-9]+$'),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  product TEXT NOT NULL
    CHECK (product IN ('starter_node', 'ai_copilot')),
  entitlement TEXT NOT NULL
    CHECK (
      (product = 'starter_node' AND entitlement = 'pro')
      OR (product = 'ai_copilot' AND entitlement = 'analyst')
    ),
  amount BIGINT NOT NULL
    CHECK (
      (product = 'starter_node' AND amount = 250000)
      OR (product = 'ai_copilot' AND amount = 750000)
    ),
  currency TEXT NOT NULL CHECK (currency = 'INR'),
  status TEXT NOT NULL
    CHECK (status IN (
      'created', 'authenticated', 'active', 'pending', 'halted',
      'cancelled', 'paused', 'resumed', 'completed', 'expired'
    )),
  total_count INTEGER NOT NULL CHECK (total_count = 100),
  paid_count INTEGER NOT NULL DEFAULT 0
    CHECK (paid_count >= 0 AND paid_count <= total_count),
  authenticated_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  current_start TIMESTAMPTZ,
  current_end TIMESTAMPTZ,
  paid_through TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  last_payment_id TEXT
    CHECK (last_payment_id IS NULL OR last_payment_id ~ '^pay_[A-Za-z0-9]+$'),
  last_payment_failed_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CHECK (
    current_start IS NULL
    OR current_end IS NULL
    OR current_end > current_start
  )
);

CREATE UNIQUE INDEX razorpay_subscriptions_one_open_per_user_idx
  ON public.razorpay_subscriptions (user_id)
  WHERE status IN (
    'created', 'authenticated', 'active', 'pending', 'halted', 'paused', 'resumed'
  );
CREATE INDEX razorpay_subscriptions_user_paid_through_idx
  ON public.razorpay_subscriptions (user_id, paid_through DESC);

CREATE TABLE public.razorpay_subscription_events (
  event_id TEXT PRIMARY KEY CHECK (event_id ~ '^evt_[A-Za-z0-9]+$'),
  subscription_id TEXT NOT NULL
    REFERENCES public.razorpay_subscriptions(razorpay_subscription_id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'subscription.authenticated', 'subscription.activated',
      'subscription.charged', 'subscription.completed',
      'subscription.updated', 'subscription.pending',
      'subscription.halted', 'subscription.cancelled',
      'subscription.paused', 'subscription.resumed'
    )),
  payment_id TEXT UNIQUE
    CHECK (payment_id IS NULL OR payment_id ~ '^pay_[A-Za-z0-9]+$'),
  event_created_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.razorpay_subscriptions OWNER TO postgres;
ALTER TABLE public.razorpay_subscription_events OWNER TO postgres;
ALTER TABLE public.razorpay_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.razorpay_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.razorpay_subscription_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.razorpay_subscriptions TO service_role;
GRANT SELECT, INSERT ON TABLE public.razorpay_subscription_events TO service_role;

CREATE OR REPLACE FUNCTION public.get_effective_user_plan()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_user_id UUID := auth.uid();
  plan_rank INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN 'free';
  END IF;

  SELECT COALESCE(pg_catalog.max(plans.rank), 0)
    INTO plan_rank
    FROM (
      SELECT CASE up.plan
        WHEN 'analyst' THEN 2
        WHEN 'pro' THEN 1
        ELSE 0
      END AS rank
        FROM public.user_plans AS up
       WHERE up.user_id = current_user_id
      UNION ALL
      SELECT CASE rs.entitlement
        WHEN 'analyst' THEN 2
        WHEN 'pro' THEN 1
        ELSE 0
      END AS rank
        FROM public.razorpay_subscriptions AS rs
       WHERE rs.user_id = current_user_id
         AND rs.paid_through > pg_catalog.statement_timestamp()
    ) AS plans;

  RETURN CASE plan_rank
    WHEN 2 THEN 'analyst'
    WHEN 1 THEN 'pro'
    ELSE 'free'
  END;
END;
$function$;
ALTER FUNCTION public.get_effective_user_plan() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_effective_user_plan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_user_plan() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_ai_question()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_user_id UUID := auth.uid();
  current_plan TEXT;
  daily_limit INTEGER;
  used_today INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  current_plan := public.get_effective_user_plan();
  daily_limit := CASE current_plan
    WHEN 'pro' THEN 100
    WHEN 'analyst' THEN 500
    ELSE 5
  END;

  INSERT INTO public.ai_usage (user_id, usage_date, questions_used)
  VALUES (current_user_id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;
  SELECT au.questions_used INTO used_today
    FROM public.ai_usage AS au
   WHERE au.user_id = current_user_id AND au.usage_date = CURRENT_DATE
   FOR UPDATE;
  IF used_today >= daily_limit THEN
    RETURN FALSE;
  END IF;
  UPDATE public.ai_usage AS au
     SET questions_used = au.questions_used + 1
   WHERE au.user_id = current_user_id AND au.usage_date = CURRENT_DATE;
  RETURN TRUE;
END;
$function$;
ALTER FUNCTION public.consume_ai_question() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.consume_ai_question() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_question() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.register_razorpay_subscription(
  p_subscription_id TEXT,
  p_plan_id TEXT,
  p_user_id UUID,
  p_product TEXT,
  p_entitlement TEXT,
  p_amount BIGINT,
  p_currency TEXT,
  p_status TEXT,
  p_total_count INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  inserted_id UUID;
BEGIN
  IF p_subscription_id IS NULL OR p_subscription_id !~ '^sub_[A-Za-z0-9]+$'
     OR p_plan_id IS NULL OR p_plan_id !~ '^plan_[A-Za-z0-9]+$'
     OR p_user_id IS NULL
     OR p_product IS NULL OR p_product NOT IN ('starter_node', 'ai_copilot')
     OR p_entitlement IS DISTINCT FROM CASE p_product
       WHEN 'starter_node' THEN 'pro'
       WHEN 'ai_copilot' THEN 'analyst'
       ELSE NULL
     END
     OR p_amount IS DISTINCT FROM CASE p_product
       WHEN 'starter_node' THEN 250000
       WHEN 'ai_copilot' THEN 750000
       ELSE NULL
     END
     OR p_currency IS DISTINCT FROM 'INR'
     OR p_status IS DISTINCT FROM 'created'
     OR p_total_count IS DISTINCT FROM 100
  THEN
    RAISE EXCEPTION 'Invalid subscription registration data';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::TEXT, 0)
  );
  IF EXISTS (
    SELECT 1
      FROM public.razorpay_subscriptions AS rs
     WHERE rs.user_id = p_user_id
       AND (
         rs.status IN (
           'created', 'authenticated', 'active', 'pending',
           'halted', 'paused', 'resumed'
         )
         OR rs.paid_through > pg_catalog.statement_timestamp()
       )
  ) THEN
    RAISE EXCEPTION 'User already has a subscription awaiting confirmation or with paid access';
  END IF;

  INSERT INTO public.razorpay_subscriptions (
    razorpay_subscription_id, razorpay_plan_id, user_id, product,
    entitlement, amount, currency, status, total_count
  )
  VALUES (
    p_subscription_id, p_plan_id, p_user_id, p_product,
    p_entitlement, p_amount, p_currency, p_status, p_total_count
  )
  RETURNING id INTO inserted_id;

  RETURN inserted_id;
END;
$function$;
ALTER FUNCTION public.register_razorpay_subscription(
  TEXT, TEXT, UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, INTEGER
) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.register_razorpay_subscription(
  TEXT, TEXT, UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_razorpay_subscription(
  TEXT, TEXT, UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, INTEGER
) TO service_role;

CREATE OR REPLACE FUNCTION public.record_razorpay_subscription_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_subscription_id TEXT,
  p_provider_status TEXT,
  p_plan_id TEXT,
  p_paid_count INTEGER,
  p_current_start TIMESTAMPTZ,
  p_current_end TIMESTAMPTZ,
  p_ended_at TIMESTAMPTZ,
  p_event_created_at TIMESTAMPTZ,
  p_payment_id TEXT,
  p_payment_amount BIGINT,
  p_currency TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  subscription_row public.razorpay_subscriptions%ROWTYPE;
  inserted_event_id TEXT;
BEGIN
  IF p_event_id IS NULL OR p_event_id !~ '^evt_[A-Za-z0-9]+$'
     OR p_event_type IS NULL OR p_event_type NOT IN (
       'subscription.authenticated', 'subscription.activated',
       'subscription.charged', 'subscription.completed',
       'subscription.updated', 'subscription.pending',
       'subscription.halted', 'subscription.cancelled',
       'subscription.paused', 'subscription.resumed'
     )
     OR p_subscription_id IS NULL OR p_subscription_id !~ '^sub_[A-Za-z0-9]+$'
     OR p_provider_status IS NULL OR p_provider_status NOT IN (
       'created', 'authenticated', 'active', 'pending', 'halted',
       'cancelled', 'paused', 'resumed', 'completed', 'expired'
     )
     OR p_plan_id IS NULL OR p_plan_id !~ '^plan_[A-Za-z0-9]+$'
     OR p_paid_count IS NULL OR p_paid_count < 0 OR p_paid_count > 100
     OR p_event_created_at IS NULL
     OR p_currency IS DISTINCT FROM 'INR'
  THEN
    RAISE EXCEPTION 'Invalid subscription event data';
  END IF;

  SELECT * INTO subscription_row
    FROM public.razorpay_subscriptions AS rs
   WHERE rs.razorpay_subscription_id = p_subscription_id
   FOR UPDATE;
  IF NOT FOUND OR subscription_row.razorpay_plan_id IS DISTINCT FROM p_plan_id THEN
    RAISE EXCEPTION 'Subscription event does not match a registered plan';
  END IF;

  IF p_payment_id IS NOT NULL THEN
    IF p_payment_id !~ '^pay_[A-Za-z0-9]+$'
       OR p_payment_amount IS DISTINCT FROM subscription_row.amount
       OR p_event_type NOT IN (
         'subscription.activated', 'subscription.charged', 'subscription.completed'
       )
       OR p_current_end IS NULL
       OR (p_current_start IS NOT NULL AND p_current_end <= p_current_start)
    THEN
      RAISE EXCEPTION 'Captured subscription payment does not match its billing period';
    END IF;
  ELSIF p_payment_amount IS NOT NULL
     OR p_event_type = 'subscription.charged'
  THEN
    RAISE EXCEPTION 'A captured amount is required for a subscription charge';
  END IF;

  INSERT INTO public.razorpay_subscription_events (
    event_id, subscription_id, event_type, payment_id, event_created_at
  )
  VALUES (
    p_event_id, p_subscription_id, p_event_type, p_payment_id, p_event_created_at
  )
  ON CONFLICT DO NOTHING
  RETURNING event_id INTO inserted_event_id;

  IF inserted_event_id IS NULL THEN
    RETURN 'duplicate';
  END IF;

  UPDATE public.razorpay_subscriptions AS rs
     SET status = CASE
           WHEN rs.last_event_at IS NULL OR p_event_created_at >= rs.last_event_at
             THEN p_provider_status
           ELSE rs.status
         END,
         paid_count = CASE
           WHEN rs.last_event_at IS NULL OR p_event_created_at >= rs.last_event_at
             THEN p_paid_count
           ELSE rs.paid_count
         END,
         authenticated_at = CASE
           WHEN p_event_type = 'subscription.authenticated'
             THEN COALESCE(rs.authenticated_at, p_event_created_at)
           ELSE rs.authenticated_at
         END,
         activated_at = CASE
           WHEN p_event_type = 'subscription.activated'
             THEN COALESCE(rs.activated_at, p_event_created_at)
           ELSE rs.activated_at
         END,
         current_start = CASE
           WHEN rs.last_event_at IS NULL OR p_event_created_at >= rs.last_event_at
             THEN COALESCE(p_current_start, rs.current_start)
           ELSE rs.current_start
         END,
         current_end = CASE
           WHEN rs.last_event_at IS NULL OR p_event_created_at >= rs.last_event_at
             THEN COALESCE(p_current_end, rs.current_end)
           ELSE rs.current_end
         END,
         paid_through = CASE
           WHEN p_payment_id IS NOT NULL
             THEN GREATEST(
               COALESCE(rs.paid_through, p_current_end),
               p_current_end
             )
           ELSE rs.paid_through
         END,
         ended_at = CASE
           WHEN rs.last_event_at IS NULL OR p_event_created_at >= rs.last_event_at
             THEN COALESCE(p_ended_at, rs.ended_at)
           ELSE rs.ended_at
         END,
         last_payment_id = COALESCE(p_payment_id, rs.last_payment_id),
         last_payment_failed_at = CASE
           WHEN p_event_type IN ('subscription.pending', 'subscription.halted')
             THEN p_event_created_at
           WHEN p_payment_id IS NOT NULL
                AND (rs.last_event_at IS NULL OR p_event_created_at >= rs.last_event_at)
             THEN NULL
           ELSE rs.last_payment_failed_at
         END,
         last_event_at = GREATEST(
           COALESCE(rs.last_event_at, p_event_created_at),
           p_event_created_at
         ),
         updated_at = pg_catalog.now()
   WHERE rs.razorpay_subscription_id = p_subscription_id;

  RETURN 'recorded';
END;
$function$;
ALTER FUNCTION public.record_razorpay_subscription_event(
  TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ,
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, BIGINT, TEXT
) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_razorpay_subscription_event(
  TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ,
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, BIGINT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_razorpay_subscription_event(
  TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ,
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, BIGINT, TEXT
) TO service_role;

DO $subscription_security_assertions$
DECLARE
  subscriptions_oid OID := pg_catalog.to_regclass('public.razorpay_subscriptions');
  events_oid OID := pg_catalog.to_regclass('public.razorpay_subscription_events');
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class AS c
     WHERE c.oid = subscriptions_oid
       AND c.relowner = 'postgres'::regrole::oid
       AND c.relrowsecurity
       AND NOT c.relforcerowsecurity
  ) OR NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class AS c
     WHERE c.oid = events_oid
       AND c.relowner = 'postgres'::regrole::oid
       AND c.relrowsecurity
       AND NOT c.relforcerowsecurity
  ) OR EXISTS (
    SELECT 1
      FROM pg_catalog.pg_policies AS policy
     WHERE policy.schemaname = 'public'
       AND policy.tablename IN (
         'razorpay_subscriptions', 'razorpay_subscription_events'
       )
  ) THEN
    RAISE EXCEPTION 'Subscription tables must be postgres-owned, RLS-enabled, and have no client policies';
  END IF;

  IF pg_catalog.has_table_privilege('anon', subscriptions_oid, 'SELECT')
     OR pg_catalog.has_table_privilege('anon', subscriptions_oid, 'INSERT')
     OR pg_catalog.has_table_privilege('anon', subscriptions_oid, 'UPDATE')
     OR pg_catalog.has_table_privilege('anon', events_oid, 'SELECT')
     OR pg_catalog.has_table_privilege('anon', events_oid, 'INSERT')
     OR pg_catalog.has_table_privilege('authenticated', subscriptions_oid, 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', subscriptions_oid, 'INSERT')
     OR pg_catalog.has_table_privilege('authenticated', subscriptions_oid, 'UPDATE')
     OR pg_catalog.has_table_privilege('authenticated', events_oid, 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', events_oid, 'INSERT')
     OR NOT pg_catalog.has_table_privilege('service_role', events_oid, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('service_role', events_oid, 'INSERT')
     OR NOT pg_catalog.has_table_privilege('service_role', subscriptions_oid, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('service_role', subscriptions_oid, 'INSERT')
     OR NOT pg_catalog.has_table_privilege('service_role', subscriptions_oid, 'UPDATE')
     OR pg_catalog.has_table_privilege('service_role', subscriptions_oid, 'DELETE')
     OR pg_catalog.has_table_privilege('service_role', subscriptions_oid, 'TRUNCATE')
     OR pg_catalog.has_table_privilege('service_role', subscriptions_oid, 'REFERENCES')
     OR pg_catalog.has_table_privilege('service_role', subscriptions_oid, 'TRIGGER')
     OR pg_catalog.has_table_privilege('service_role', events_oid, 'UPDATE')
     OR pg_catalog.has_table_privilege('service_role', events_oid, 'DELETE')
     OR pg_catalog.has_table_privilege('service_role', events_oid, 'TRUNCATE')
     OR pg_catalog.has_table_privilege('service_role', events_oid, 'REFERENCES')
     OR pg_catalog.has_table_privilege('service_role', events_oid, 'TRIGGER')
     OR EXISTS (
       SELECT 1
         FROM pg_catalog.pg_class AS c
         CROSS JOIN LATERAL pg_catalog.unnest(
           COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
         ) AS acl_entry(item)
         CROSS JOIN LATERAL pg_catalog.aclexplode(
           ARRAY[acl_entry.item]
         ) AS acl
        WHERE c.oid IN (subscriptions_oid, events_oid)
          AND acl.grantee <> c.relowner
          AND CASE
            WHEN c.oid = subscriptions_oid THEN
              acl.grantee <> 'service_role'::regrole::oid
              OR acl.privilege_type NOT IN ('SELECT', 'INSERT', 'UPDATE')
            ELSE
              acl.grantee <> 'service_role'::regrole::oid
              OR acl.privilege_type NOT IN ('SELECT', 'INSERT')
          END
     ) THEN
    RAISE EXCEPTION 'Subscription table grants must be limited to the expected service_role operations';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_proc AS p
     WHERE p.oid IN (
       'public.get_effective_user_plan()'::regprocedure,
       'public.consume_ai_question()'::regprocedure,
       'public.register_razorpay_subscription(text,text,uuid,text,text,bigint,text,text,integer)'::regprocedure,
       'public.record_razorpay_subscription_event(text,text,text,text,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,bigint,text)'::regprocedure
     )
       AND (
         p.proowner <> 'postgres'::regrole::oid
         OR NOT p.prosecdef
         OR NOT EXISTS (
           SELECT 1
             FROM pg_catalog.pg_options_to_table(p.proconfig) AS function_option
            WHERE function_option.option_name = 'search_path'
              AND function_option.option_value = ''
         )
       )
  ) THEN
    RAISE EXCEPTION 'Subscription SECURITY DEFINER functions must be postgres-owned with an empty search_path';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
       'authenticated', 'public.get_effective_user_plan()', 'EXECUTE'
     )
     OR NOT pg_catalog.has_function_privilege(
       'service_role', 'public.get_effective_user_plan()', 'EXECUTE'
     )
     OR pg_catalog.has_function_privilege(
       'anon', 'public.get_effective_user_plan()', 'EXECUTE'
     )
     OR NOT pg_catalog.has_function_privilege(
       'authenticated', 'public.consume_ai_question()', 'EXECUTE'
     )
     OR NOT pg_catalog.has_function_privilege(
       'service_role', 'public.consume_ai_question()', 'EXECUTE'
     )
     OR pg_catalog.has_function_privilege(
       'anon', 'public.consume_ai_question()', 'EXECUTE'
     )
     OR NOT pg_catalog.has_function_privilege(
       'service_role',
       'public.register_razorpay_subscription(text,text,uuid,text,text,bigint,text,text,integer)',
       'EXECUTE'
     )
     OR NOT pg_catalog.has_function_privilege(
       'service_role',
       'public.record_razorpay_subscription_event(text,text,text,text,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,bigint,text)',
       'EXECUTE'
     )
     OR pg_catalog.has_function_privilege(
       'authenticated',
       'public.register_razorpay_subscription(text,text,uuid,text,text,bigint,text,text,integer)',
       'EXECUTE'
     )
     OR pg_catalog.has_function_privilege(
       'authenticated',
       'public.record_razorpay_subscription_event(text,text,text,text,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,bigint,text)',
       'EXECUTE'
     )
     OR pg_catalog.has_function_privilege(
       'anon',
       'public.register_razorpay_subscription(text,text,uuid,text,text,bigint,text,text,integer)',
       'EXECUTE'
     )
     OR pg_catalog.has_function_privilege(
       'anon',
       'public.record_razorpay_subscription_event(text,text,text,text,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,bigint,text)',
       'EXECUTE'
     )
     OR EXISTS (
       SELECT 1
         FROM pg_catalog.pg_proc AS p
         CROSS JOIN LATERAL pg_catalog.unnest(
           COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
         ) AS acl_entry(item)
         CROSS JOIN LATERAL pg_catalog.aclexplode(
           ARRAY[acl_entry.item]
         ) AS acl
        WHERE p.oid IN (
          'public.get_effective_user_plan()'::regprocedure,
          'public.consume_ai_question()'::regprocedure,
          'public.register_razorpay_subscription(text,text,uuid,text,text,bigint,text,text,integer)'::regprocedure,
          'public.record_razorpay_subscription_event(text,text,text,text,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,bigint,text)'::regprocedure
        )
          AND acl.privilege_type = 'EXECUTE'
          AND acl.grantee <> p.proowner
          AND CASE
            WHEN p.oid IN (
              'public.get_effective_user_plan()'::regprocedure,
              'public.consume_ai_question()'::regprocedure
            ) THEN acl.grantee NOT IN (
              'authenticated'::regrole::oid,
              'service_role'::regrole::oid
            )
            ELSE acl.grantee <> 'service_role'::regrole::oid
          END
     ) THEN
    RAISE EXCEPTION 'Subscription RPC grants do not match the client-read and service-role-write contract';
  END IF;
END;
$subscription_security_assertions$;

COMMIT;
