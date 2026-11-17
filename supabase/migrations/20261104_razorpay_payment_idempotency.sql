-- AnalystOS subscription, payment history, and AI quota migration.
-- One-time migration for the inspected public.user_plans schema.
-- Execute the entire file as one script. Do not select or run individual sections.
-- Manual SQL Editor execution does not register this version with Supabase CLI.
-- After a successful manual run, use `supabase migration repair --status applied 20261104`
-- before a later db push; never edit Supabase migration-history rows directly.

BEGIN;

-- Lock and validate the existing entitlement table before changing it.
-- Any exception aborts this transaction; do not issue COMMIT after an error.
DO $preflight$
DECLARE
  plans_oid OID;
  plans_owner OID;
  plans_rls_forced BOOLEAN;
  expected_columns INTEGER;
  actual_columns INTEGER;
  mismatch_count INTEGER;
  primary_key_count INTEGER;
  foreign_key_count INTEGER;
  check_constraint_count INTEGER;
  check_expression TEXT;
  check_semantics_mismatch BOOLEAN;
  constraint_count INTEGER;
  index_count INTEGER;
  user_id_index_predicate TEXT;
  user_id_index_predicate_mismatch BOOLEAN;
  policy_count INTEGER;
  policy_is_expected BOOLEAN;
  consume_function_oid OID;
  consume_function_owner OID;
  capture_function_oid OID;
  capture_function_owner OID;
  named_function_count INTEGER;
  relid OID;
  relkind "char";
  table_label TEXT;
BEGIN
  IF pg_catalog.to_regrole('anon') IS NULL
     OR pg_catalog.to_regrole('authenticated') IS NULL
     OR pg_catalog.to_regrole('service_role') IS NULL
     OR pg_catalog.to_regrole('postgres') IS NULL THEN
    RAISE EXCEPTION 'Required Supabase roles anon, authenticated, service_role, or postgres are missing';
  END IF;
  plans_oid := pg_catalog.to_regclass('public.user_plans');
  IF plans_oid IS NULL THEN
    RAISE EXCEPTION 'Required table public.user_plans does not exist';
  END IF;
  SELECT c.relowner, c.relkind, c.relforcerowsecurity
    INTO plans_owner, relkind, plans_rls_forced
    FROM pg_catalog.pg_class AS c
   WHERE c.oid = plans_oid;
  IF relkind <> 'r' THEN
    RAISE EXCEPTION 'public.user_plans must be an ordinary table';
  END IF;
  IF plans_rls_forced THEN
    RAISE EXCEPTION 'public.user_plans must retain its reviewed non-forced RLS setting';
  END IF;
  IF plans_owner IN (
    'anon'::regrole::oid,
    'authenticated'::regrole::oid,
    'service_role'::regrole::oid
  ) THEN
    RAISE EXCEPTION 'public.user_plans is owned by a client or service role; transfer it to a trusted database owner first';
  END IF;

  EXECUTE 'LOCK TABLE public.user_plans IN ACCESS EXCLUSIVE MODE';

  -- Require exactly the reviewed columns and nullability; defaults may vary.
  SELECT pg_catalog.count(*) INTO actual_columns
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'user_plans';
  expected_columns := 5;
  SELECT pg_catalog.count(*) INTO mismatch_count
    FROM (VALUES
      ('id', 'uuid', 'NO'),
      ('user_id', 'uuid', 'YES'),
      ('plan', 'text', 'YES'),
      ('payment_id', 'text', 'YES'),
      ('updated_at', 'timestamp with time zone', 'YES')
    ) AS expected(column_name, data_type, is_nullable)
    LEFT JOIN information_schema.columns AS actual
      ON actual.table_schema = 'public'
     AND actual.table_name = 'user_plans'
     AND actual.column_name = expected.column_name
   WHERE actual.column_name IS NULL
      OR actual.data_type <> expected.data_type
      OR actual.is_nullable <> expected.is_nullable;
  IF actual_columns <> expected_columns OR mismatch_count <> 0 THEN
    RAISE EXCEPTION 'public.user_plans must have exactly id uuid NOT NULL, user_id uuid NULL, plan text NULL, payment_id text NULL, updated_at timestamptz NULL';
  END IF;

  SELECT pg_catalog.count(*) INTO constraint_count
    FROM pg_catalog.pg_constraint AS c
   WHERE c.conrelid = plans_oid;
  SELECT pg_catalog.count(*) INTO primary_key_count
    FROM pg_catalog.pg_constraint AS c
    JOIN pg_catalog.pg_attribute AS a
      ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
   WHERE c.conrelid = plans_oid
     AND c.contype = 'p'
     AND c.conname = 'user_plans_pkey'
     AND pg_catalog.array_length(c.conkey, 1) = 1
     AND a.attname = 'id';
  IF primary_key_count <> 1 THEN
    RAISE EXCEPTION 'public.user_plans must retain user_plans_pkey PRIMARY KEY (id)';
  END IF;

  SELECT pg_catalog.count(*) INTO foreign_key_count
    FROM pg_catalog.pg_constraint AS c
    JOIN pg_catalog.pg_attribute AS local_column
      ON local_column.attrelid = c.conrelid AND local_column.attnum = c.conkey[1]
    JOIN pg_catalog.pg_attribute AS referenced_column
      ON referenced_column.attrelid = c.confrelid AND referenced_column.attnum = c.confkey[1]
    JOIN pg_catalog.pg_class AS referenced_table ON referenced_table.oid = c.confrelid
    JOIN pg_catalog.pg_namespace AS referenced_schema ON referenced_schema.oid = referenced_table.relnamespace
   WHERE c.conrelid = plans_oid
     AND c.contype = 'f'
     AND c.conname = 'user_plans_user_id_fkey'
     AND c.convalidated
     AND pg_catalog.array_length(c.conkey, 1) = 1
     AND pg_catalog.array_length(c.confkey, 1) = 1
     AND local_column.attname = 'user_id'
     AND referenced_schema.nspname = 'auth'
     AND referenced_table.relname = 'users'
     AND referenced_column.attname = 'id';
  IF foreign_key_count <> 1 THEN
    RAISE EXCEPTION 'public.user_plans must retain user_plans_user_id_fkey REFERENCES auth.users(id)';
  END IF;

  SELECT pg_catalog.count(*) INTO check_constraint_count
    FROM pg_catalog.pg_constraint AS c
   WHERE c.conrelid = plans_oid
     AND c.conname = 'user_plans_valid_plan_ck'
     AND c.contype = 'c'
     AND c.convalidated;
  IF check_constraint_count <> 1 THEN
    RAISE EXCEPTION 'public.user_plans must retain the validated user_plans_valid_plan_ck with the reviewed free/pro/analyst definition';
  END IF;
  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO check_expression
    FROM pg_catalog.pg_constraint AS c
   WHERE c.oid = (
     SELECT c2.oid
       FROM pg_catalog.pg_constraint AS c2
      WHERE c2.conrelid = plans_oid
        AND c2.conname = 'user_plans_valid_plan_ck'
        AND c2.contype = 'c'
        AND c2.convalidated
   );
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
    check_expression
  ) INTO check_semantics_mismatch;
  IF check_semantics_mismatch THEN
    RAISE EXCEPTION 'public.user_plans_valid_plan_ck does not enforce user_id IS NULL OR (plan IS NOT NULL AND plan IN (free, pro, analyst))';
  END IF;

  IF constraint_count <> 3 THEN
    RAISE EXCEPTION 'public.user_plans must have exactly the reviewed primary key, user foreign key, and valid-plan check; unexpected constraints exist';
  END IF;

  SELECT pg_catalog.count(*) INTO index_count
    FROM pg_catalog.pg_index AS i
   WHERE i.indrelid = plans_oid;
  IF index_count <> 2 OR NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_index AS i
      JOIN pg_catalog.pg_class AS index_table ON index_table.oid = i.indexrelid
      JOIN pg_catalog.pg_am AS access_method ON access_method.oid = index_table.relam
      JOIN pg_catalog.pg_constraint AS constraint_row
        ON constraint_row.conindid = i.indexrelid
      JOIN pg_catalog.pg_attribute AS a
        ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
     WHERE i.indrelid = plans_oid
       AND index_table.relname = 'user_plans_pkey'
       AND i.indisprimary
       AND i.indisunique
       AND i.indisvalid
       AND i.indisready
       AND index_table.relkind = 'i'
       AND access_method.amname = 'btree'
       AND constraint_row.conname = 'user_plans_pkey'
       AND constraint_row.contype = 'p'
       AND a.attname = 'id'
       AND i.indnatts = 1
       AND i.indnkeyatts = 1
       AND i.indpred IS NULL
       AND i.indexprs IS NULL
  ) THEN
    RAISE EXCEPTION 'public.user_plans must retain the unique primary-key index user_plans_pkey on (id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_index AS i
      JOIN pg_catalog.pg_class AS index_table ON index_table.oid = i.indexrelid
      JOIN pg_catalog.pg_am AS access_method ON access_method.oid = index_table.relam
      JOIN pg_catalog.pg_attribute AS a
        ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
     WHERE i.indrelid = plans_oid
       AND index_table.relname = 'user_plans_user_id_unique_idx'
       AND access_method.amname = 'btree'
       AND i.indisunique
       AND NOT i.indisprimary
       AND i.indisexclusion = FALSE
       AND i.indisvalid
       AND i.indisready
       AND i.indislive
       AND i.indpred IS NOT NULL
       AND i.indexprs IS NULL
       AND i.indnatts = 1
       AND i.indnkeyatts = 1
       AND a.attname = 'user_id'
       AND NOT EXISTS (
         SELECT 1
           FROM pg_catalog.pg_constraint AS constraint_row
          WHERE constraint_row.conindid = i.indexrelid
       )
  ) THEN
    RAISE EXCEPTION 'public.user_plans must retain user_plans_user_id_unique_idx as a valid unique btree partial index on (user_id)';
  END IF;
  SELECT pg_catalog.pg_get_expr(i.indpred, i.indrelid)
    INTO user_id_index_predicate
    FROM pg_catalog.pg_index AS i
    JOIN pg_catalog.pg_class AS index_table ON index_table.oid = i.indexrelid
   WHERE i.indrelid = plans_oid
     AND index_table.relname = 'user_plans_user_id_unique_idx';
  EXECUTE pg_catalog.format(
    $probe$
      SELECT EXISTS (
        SELECT 1
          FROM (VALUES
            (NULL::uuid, FALSE),
            ('00000000-0000-0000-0000-000000000001'::uuid, TRUE)
          ) AS probe(user_id, expected)
         WHERE COALESCE((%s), FALSE) IS DISTINCT FROM probe.expected
      )
    $probe$,
    user_id_index_predicate
  ) INTO user_id_index_predicate_mismatch;
  IF user_id_index_predicate_mismatch THEN
    RAISE EXCEPTION 'user_plans_user_id_unique_idx must be partial on user_id IS NOT NULL';
  END IF;

  SELECT pg_catalog.count(*) INTO policy_count
    FROM pg_catalog.pg_policies
   WHERE schemaname = 'public' AND tablename = 'user_plans';
  SELECT pg_catalog.count(*) = 1 INTO policy_is_expected
    FROM pg_catalog.pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'user_plans'
     AND policyname = 'own plan'
     AND permissive = 'PERMISSIVE'
     AND roles = ARRAY['authenticated']::name[]
     AND cmd = 'SELECT'
     AND pg_catalog.regexp_replace(qual, '[[:space:]]+', '', 'g') =
       '(auth.uid()=user_id)'
     AND with_check IS NULL;
  IF NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class AS c WHERE c.oid = plans_oid)
     OR policy_count <> 1
     OR NOT COALESCE(policy_is_expected, FALSE) THEN
    RAISE EXCEPTION 'public.user_plans must have RLS enabled and exactly the inspected own plan policy; inspect policies before applying';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.user_plans
     WHERE user_id IS NOT NULL
     GROUP BY user_id
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate non-null public.user_plans.user_id values exist; reconcile without deleting subscription data';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_plans
     WHERE user_id IS NOT NULL
       AND (plan IS NULL OR plan NOT IN ('free', 'pro', 'analyst'))
  ) THEN
    RAISE EXCEPTION 'Invalid or null plan values exist for an assigned user; reconcile before applying';
  END IF;

  -- Inspect current effective client privileges before revoking them. Also fail
  -- closed on unrelated role grants that would need a separate access review.
  RAISE NOTICE 'Pre-migration effective user_plans privileges: anon INSERT/UPDATE/DELETE/TRUNCATE=%, authenticated INSERT/UPDATE/DELETE/TRUNCATE=%',
    pg_catalog.has_table_privilege('anon', plans_oid, 'INSERT')
      OR pg_catalog.has_table_privilege('anon', plans_oid, 'UPDATE')
      OR pg_catalog.has_table_privilege('anon', plans_oid, 'DELETE')
      OR pg_catalog.has_table_privilege('anon', plans_oid, 'TRUNCATE'),
    pg_catalog.has_table_privilege('authenticated', plans_oid, 'INSERT')
      OR pg_catalog.has_table_privilege('authenticated', plans_oid, 'UPDATE')
      OR pg_catalog.has_table_privilege('authenticated', plans_oid, 'DELETE')
      OR pg_catalog.has_table_privilege('authenticated', plans_oid, 'TRUNCATE');

  SELECT c.relowner INTO plans_owner FROM pg_catalog.pg_class AS c WHERE c.oid = plans_oid;
  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class AS c
      CROSS JOIN LATERAL pg_catalog.unnest(
        COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
      ) AS acl_entry(item)
      CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[acl_entry.item]) AS acl
     WHERE c.oid = plans_oid
       AND acl.grantee NOT IN (
         0,
         plans_owner,
         'anon'::regrole::oid,
         'authenticated'::regrole::oid,
         'service_role'::regrole::oid
       )
       AND acl.privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) THEN
    RAISE EXCEPTION 'Unexpected non-client role has write-capable privileges on public.user_plans; review its grants first';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_attribute AS a
      CROSS JOIN LATERAL pg_catalog.unnest(a.attacl) AS acl_entry(item)
      CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[acl_entry.item]) AS acl
     WHERE a.attrelid = plans_oid
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND acl.grantee NOT IN (
         0,
         plans_owner,
         'anon'::regrole::oid,
         'authenticated'::regrole::oid,
         'service_role'::regrole::oid
       )
       AND acl.privilege_type IN ('INSERT', 'UPDATE', 'REFERENCES')
  ) THEN
    RAISE EXCEPTION 'Unexpected non-client column grant exists on public.user_plans; review grants before applying';
  END IF;

  -- The existing quota RPC is expected to be consume_ai_question() RETURNS
  -- boolean. Permit that exact signature for CREATE OR REPLACE; reject overloads,
  -- procedures, or an incompatible return type.
  SELECT pg_catalog.count(*)
    INTO named_function_count
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'consume_ai_question';
  SELECT p.oid INTO consume_function_oid
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'consume_ai_question'
   LIMIT 1;
  SELECT p.proowner INTO consume_function_owner
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'consume_ai_question'
   LIMIT 1;
  IF named_function_count > 0 AND (
    named_function_count <> 1
    OR consume_function_owner <> 'postgres'::regrole::oid
    OR NOT EXISTS (
      SELECT 1
        FROM pg_catalog.pg_proc AS p
       WHERE p.oid = consume_function_oid
         AND p.prokind = 'f'
         AND p.pronargs = 0
         AND p.prorettype = 'boolean'::regtype
         AND NOT p.proretset
         AND p.proargmodes IS NULL
         AND p.prosecdef
         AND EXISTS (
           SELECT 1
             FROM pg_catalog.pg_options_to_table(p.proconfig) AS function_option
            WHERE function_option.option_name = 'search_path'
              AND function_option.option_value = ''
         )
         AND pg_catalog.has_function_privilege(
           'authenticated', p.oid, 'EXECUTE'
         )
         AND pg_catalog.has_function_privilege(
           'service_role', p.oid, 'EXECUTE'
         )
         AND NOT pg_catalog.has_function_privilege(
           'anon', p.oid, 'EXECUTE'
         )
    )
  ) THEN
    RAISE EXCEPTION 'public.consume_ai_question exists with an unexpected overload or incompatible signature; expected exactly consume_ai_question() RETURNS boolean';
  END IF;

  -- Capture may be absent or have precisely the signature implemented below.
  -- CREATE OR REPLACE cannot change return types or input parameter names.
  SELECT pg_catalog.count(*)
    INTO named_function_count
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'record_razorpay_capture';
  SELECT p.oid INTO capture_function_oid
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'record_razorpay_capture'
   LIMIT 1;
  SELECT p.proowner INTO capture_function_owner
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'record_razorpay_capture'
   LIMIT 1;
  IF named_function_count > 0 AND (
    named_function_count <> 1
    OR capture_function_owner <> 'postgres'::regrole::oid
    OR NOT EXISTS (
      SELECT 1
        FROM pg_catalog.pg_proc AS p
       WHERE p.oid = capture_function_oid
         AND p.prokind = 'f'
         AND p.pronargs = 7
         AND p.proargtypes[0] = 'text'::regtype
         AND p.proargtypes[1] = 'text'::regtype
         AND p.proargtypes[2] = 'text'::regtype
         AND p.proargtypes[3] = 'uuid'::regtype
         AND p.proargtypes[4] = 'text'::regtype
         AND p.proargtypes[5] = 'bigint'::regtype
         AND p.proargtypes[6] = 'text'::regtype
         AND p.prorettype = 'text'::regtype
         AND NOT p.proretset
         AND p.proargmodes IS NULL
         AND p.prosecdef
         AND EXISTS (
           SELECT 1
             FROM pg_catalog.pg_options_to_table(p.proconfig) AS function_option
            WHERE function_option.option_name = 'search_path'
              AND function_option.option_value = ''
         )
         AND p.proargnames = ARRAY[
           'p_payment_id', 'p_order_id', 'p_event_id', 'p_user_id',
           'p_plan', 'p_amount', 'p_currency'
         ]::text[]
         AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
         AND NOT pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
         AND NOT pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
    )
  ) THEN
    RAISE EXCEPTION 'public.record_razorpay_capture exists with an unexpected overload or incompatible signature; expected the seven named parameters and TEXT return type in this migration';
  END IF;
END;
$preflight$;

-- Adopt existing payment/quota tables only after validating their complete
-- structural and security metadata. No existing records are rewritten.
DO $existing_objects_preflight$
DECLARE
  table_label TEXT;
  object_oid OID;
  object_owner OID;
  object_kind "char";
  object_rls BOOLEAN;
  object_rls_forced BOOLEAN;
  actual_columns INTEGER;
  expected_columns INTEGER;
  mismatch_count INTEGER;
  constraint_count INTEGER;
  index_count INTEGER;
  acl_count INTEGER;
  distinct_acl_count INTEGER;
  check_expression TEXT;
  semantics_mismatch BOOLEAN;
BEGIN
  FOREACH table_label IN ARRAY ARRAY['payments', 'ai_usage'] LOOP
    object_oid := pg_catalog.to_regclass(pg_catalog.format('public.%I', table_label));
    IF object_oid IS NULL THEN
      IF table_label = 'payments' AND EXISTS (
        SELECT 1
          FROM pg_catalog.pg_class AS c
          JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relname = 'payments_user_id_created_at_idx'
      ) THEN
        RAISE EXCEPTION 'payments_user_id_created_at_idx exists without public.payments; inspect before applying';
      END IF;
      CONTINUE;
    END IF;

    SELECT c.relkind, c.relowner, c.relrowsecurity, c.relforcerowsecurity
      INTO object_kind, object_owner, object_rls, object_rls_forced
      FROM pg_catalog.pg_class AS c
     WHERE c.oid = object_oid;
    IF object_kind <> 'r' THEN
      RAISE EXCEPTION 'public.% exists but is not an ordinary table', table_label;
    END IF;
    IF object_owner IN (
      'anon'::regrole::oid,
      'authenticated'::regrole::oid,
      'service_role'::regrole::oid
    ) THEN
      RAISE EXCEPTION 'public.% is owned by an untrusted API role', table_label;
    END IF;
    EXECUTE pg_catalog.format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE', table_label);

    SELECT pg_catalog.count(*) INTO actual_columns
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = table_label;
    IF table_label = 'payments' THEN
      SELECT pg_catalog.count(*) INTO mismatch_count
        FROM (VALUES
          ('id', 'uuid', 'NO'), ('user_id', 'uuid', 'NO'),
          ('razorpay_order_id', 'text', 'NO'), ('razorpay_payment_id', 'text', 'YES'),
          ('event_id', 'text', 'YES'), ('plan', 'text', 'NO'),
          ('amount', 'bigint', 'NO'), ('currency', 'text', 'NO'),
          ('status', 'text', 'NO'), ('created_at', 'timestamp with time zone', 'NO'),
          ('updated_at', 'timestamp with time zone', 'NO'),
          ('captured_at', 'timestamp with time zone', 'YES')
        ) AS expected(column_name, data_type, is_nullable)
        LEFT JOIN information_schema.columns AS actual
          ON actual.table_schema = 'public'
         AND actual.table_name = table_label
         AND actual.column_name = expected.column_name
       WHERE actual.column_name IS NULL
          OR actual.data_type <> expected.data_type
          OR actual.is_nullable <> expected.is_nullable;
      expected_columns := 12;
    ELSE
      SELECT pg_catalog.count(*) INTO mismatch_count
        FROM (VALUES
          ('user_id', 'uuid', 'NO'),
          ('usage_date', 'date', 'NO'),
          ('questions_used', 'integer', 'NO')
        ) AS expected(column_name, data_type, is_nullable)
        LEFT JOIN information_schema.columns AS actual
          ON actual.table_schema = 'public'
         AND actual.table_name = table_label
         AND actual.column_name = expected.column_name
       WHERE actual.column_name IS NULL
          OR actual.data_type <> expected.data_type
          OR actual.is_nullable <> expected.is_nullable;
      expected_columns := 3;
    END IF;
    IF actual_columns <> expected_columns OR mismatch_count <> 0 THEN
      RAISE EXCEPTION 'Existing public.% has an incompatible column schema', table_label;
    END IF;

    IF NOT object_rls OR object_rls_forced
       OR EXISTS (
         SELECT 1
           FROM pg_catalog.pg_policies
          WHERE schemaname = 'public' AND tablename = table_label
       ) THEN
      RAISE EXCEPTION 'Existing public.% must have RLS enabled and no policies', table_label;
    END IF;

    IF table_label = 'payments' THEN
      SELECT pg_catalog.count(*) INTO constraint_count
        FROM pg_catalog.pg_constraint AS c
       WHERE c.conrelid = object_oid;
      IF constraint_count <> 10
         OR (SELECT pg_catalog.count(*)
               FROM (VALUES
                 ('payments_pkey', 'p'),
                 ('payments_user_id_fkey', 'f'),
                 ('payments_check', 'c'),
                 ('payments_check1', 'c'),
                 ('payments_currency_check', 'c'),
                 ('payments_event_id_key', 'u'),
                 ('payments_plan_check', 'c'),
                 ('payments_razorpay_order_id_key', 'u'),
                 ('payments_razorpay_payment_id_key', 'u'),
                 ('payments_status_check', 'c')
               ) AS expected(constraint_name, constraint_type)
               JOIN pg_catalog.pg_constraint AS c
                 ON c.conrelid = object_oid
                AND c.conname = expected.constraint_name
                AND c.contype::text = expected.constraint_type
                AND c.convalidated) <> 10
         OR EXISTS (
               SELECT 1
                 FROM pg_catalog.pg_constraint AS c
                WHERE c.conrelid = object_oid AND NOT c.convalidated
             ) THEN
        RAISE EXCEPTION 'Existing public.payments constraints do not match the ten validated production constraints';
      END IF;

      IF NOT EXISTS (
        SELECT 1
          FROM pg_catalog.pg_constraint AS c
          JOIN pg_catalog.pg_attribute AS a
            ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
         WHERE c.conrelid = object_oid AND c.conname = 'payments_pkey'
           AND c.contype = 'p' AND pg_catalog.array_length(c.conkey, 1) = 1
           AND a.attname = 'id'
      ) OR NOT EXISTS (
        SELECT 1
          FROM pg_catalog.pg_constraint AS c
          JOIN pg_catalog.pg_attribute AS local_column
            ON local_column.attrelid = c.conrelid AND local_column.attnum = c.conkey[1]
          JOIN pg_catalog.pg_attribute AS referenced_column
            ON referenced_column.attrelid = c.confrelid AND referenced_column.attnum = c.confkey[1]
          JOIN pg_catalog.pg_class AS referenced_table ON referenced_table.oid = c.confrelid
          JOIN pg_catalog.pg_namespace AS referenced_schema ON referenced_schema.oid = referenced_table.relnamespace
         WHERE c.conrelid = object_oid AND c.conname = 'payments_user_id_fkey'
           AND c.contype = 'f' AND c.convalidated
           AND c.confdeltype = 'r' AND c.confupdtype = 'a'
           AND pg_catalog.array_length(c.conkey, 1) = 1
           AND pg_catalog.array_length(c.confkey, 1) = 1
           AND local_column.attname = 'user_id'
           AND referenced_schema.nspname = 'auth'
           AND referenced_table.relname = 'users'
           AND referenced_column.attname = 'id'
      ) OR (
        SELECT pg_catalog.count(*)
          FROM (VALUES
            ('payments_event_id_key', 'event_id'),
            ('payments_razorpay_order_id_key', 'razorpay_order_id'),
            ('payments_razorpay_payment_id_key', 'razorpay_payment_id')
          ) AS expected(constraint_name, column_name)
          JOIN pg_catalog.pg_constraint AS c
            ON c.conrelid = object_oid
           AND c.conname = expected.constraint_name
           AND c.contype = 'u' AND c.convalidated
          JOIN pg_catalog.pg_attribute AS a
            ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
         WHERE pg_catalog.array_length(c.conkey, 1) = 1
           AND a.attname = expected.column_name
      ) <> 3 THEN
        RAISE EXCEPTION 'Existing public.payments primary, foreign-key, or unique constraints are incompatible';
      END IF;

      SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid) INTO check_expression
        FROM pg_catalog.pg_constraint AS c
       WHERE c.conrelid = object_oid AND c.conname = 'payments_check'
         AND c.contype = 'c' AND c.convalidated;
      EXECUTE pg_catalog.format(
        $probe$
          SELECT EXISTS (
            SELECT 1
              FROM (VALUES
                ('pro'::text, 49900::bigint, TRUE),
                ('analyst'::text, 149900::bigint, TRUE),
                ('pro'::text, 149900::bigint, FALSE),
                ('analyst'::text, 49900::bigint, FALSE),
                ('free'::text, 49900::bigint, FALSE)
              ) AS probe(plan, amount, expected)
             WHERE COALESCE((%s), TRUE) IS DISTINCT FROM probe.expected
          )
        $probe$,
        check_expression
      ) INTO semantics_mismatch;
      IF semantics_mismatch THEN
        RAISE EXCEPTION 'payments_check does not enforce the reviewed plan/amount mapping';
      END IF;

      SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid) INTO check_expression
        FROM pg_catalog.pg_constraint AS c
       WHERE c.conrelid = object_oid AND c.conname = 'payments_check1'
         AND c.contype = 'c' AND c.convalidated;
      EXECUTE pg_catalog.format(
        $probe$
          SELECT EXISTS (
            SELECT 1
              FROM (VALUES
                ('created'::text, NULL::text, NULL::text, NULL::timestamptz, TRUE),
                ('captured'::text, 'pay_x'::text, 'evt_x'::text, pg_catalog.now(), TRUE),
                ('created'::text, 'pay_x'::text, NULL::text, NULL::timestamptz, FALSE),
                ('created'::text, NULL::text, 'evt_x'::text, NULL::timestamptz, FALSE),
                ('created'::text, NULL::text, NULL::text, pg_catalog.now(), FALSE),
                ('captured'::text, NULL::text, 'evt_x'::text, pg_catalog.now(), FALSE),
                ('captured'::text, 'pay_x'::text, NULL::text, pg_catalog.now(), FALSE),
                ('captured'::text, 'pay_x'::text, 'evt_x'::text, NULL::timestamptz, FALSE)
              ) AS probe(status, razorpay_payment_id, event_id, captured_at, expected)
             WHERE COALESCE((%s), TRUE) IS DISTINCT FROM probe.expected
          )
        $probe$,
        check_expression
      ) INTO semantics_mismatch;
      IF semantics_mismatch THEN
        RAISE EXCEPTION 'payments_check1 does not enforce the reviewed capture-state fields';
      END IF;

      SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid) INTO check_expression
        FROM pg_catalog.pg_constraint AS c
       WHERE c.conrelid = object_oid AND c.conname = 'payments_currency_check'
         AND c.contype = 'c' AND c.convalidated;
      EXECUTE pg_catalog.format(
        $probe$
          SELECT EXISTS (
            SELECT 1
              FROM (VALUES ('INR'::text, TRUE), ('USD'::text, FALSE))
                AS probe(currency, expected)
             WHERE COALESCE((%s), TRUE) IS DISTINCT FROM probe.expected
          )
        $probe$,
        check_expression
      ) INTO semantics_mismatch;
      IF semantics_mismatch THEN
        RAISE EXCEPTION 'payments_currency_check does not enforce INR';
      END IF;

      SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid) INTO check_expression
        FROM pg_catalog.pg_constraint AS c
       WHERE c.conrelid = object_oid AND c.conname = 'payments_plan_check'
         AND c.contype = 'c' AND c.convalidated;
      EXECUTE pg_catalog.format(
        $probe$
          SELECT EXISTS (
            SELECT 1
              FROM (VALUES ('pro'::text, TRUE), ('analyst'::text, TRUE),
                           ('free'::text, FALSE))
                AS probe(plan, expected)
             WHERE COALESCE((%s), TRUE) IS DISTINCT FROM probe.expected
          )
        $probe$,
        check_expression
      ) INTO semantics_mismatch;
      IF semantics_mismatch THEN
        RAISE EXCEPTION 'payments_plan_check does not enforce the reviewed paid plans';
      END IF;

      SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid) INTO check_expression
        FROM pg_catalog.pg_constraint AS c
       WHERE c.conrelid = object_oid AND c.conname = 'payments_status_check'
         AND c.contype = 'c' AND c.convalidated;
      EXECUTE pg_catalog.format(
        $probe$
          SELECT EXISTS (
            SELECT 1
              FROM (VALUES ('created'::text, TRUE), ('captured'::text, TRUE),
                           ('failed'::text, FALSE))
                AS probe(status, expected)
             WHERE COALESCE((%s), TRUE) IS DISTINCT FROM probe.expected
          )
        $probe$,
        check_expression
      ) INTO semantics_mismatch;
      IF semantics_mismatch THEN
        RAISE EXCEPTION 'payments_status_check does not enforce created/captured';
      END IF;

      SELECT pg_catalog.count(*) INTO index_count
        FROM pg_catalog.pg_index AS i
       WHERE i.indrelid = object_oid;
      IF index_count <> 5
         OR (SELECT pg_catalog.count(*)
               FROM (VALUES
                 ('payments_pkey', 'id', 'p'),
                 ('payments_event_id_key', 'event_id', 'u'),
                 ('payments_razorpay_order_id_key', 'razorpay_order_id', 'u'),
                 ('payments_razorpay_payment_id_key', 'razorpay_payment_id', 'u')
               ) AS expected(index_name, column_name, constraint_type)
               JOIN pg_catalog.pg_class AS index_table
                 ON index_table.relnamespace = 'public'::regnamespace
                AND index_table.relname = expected.index_name
               JOIN pg_catalog.pg_index AS i ON i.indexrelid = index_table.oid
               JOIN pg_catalog.pg_am AS am ON am.oid = index_table.relam
               JOIN pg_catalog.pg_constraint AS c
                 ON c.conindid = i.indexrelid
                AND c.conname = expected.index_name
                AND c.contype::text = expected.constraint_type
               JOIN pg_catalog.pg_attribute AS a
                 ON a.attrelid = object_oid AND a.attnum = i.indkey[0]
              WHERE i.indrelid = object_oid AND am.amname = 'btree'
                AND i.indisvalid AND i.indisready AND i.indislive
                AND i.indisunique AND i.indisprimary = (expected.constraint_type = 'p')
                AND i.indnatts = 1 AND i.indnkeyatts = 1
                AND i.indpred IS NULL AND i.indexprs IS NULL
                AND a.attname = expected.column_name) <> 4
         OR NOT EXISTS (
               SELECT 1
                 FROM pg_catalog.pg_class AS index_table
                 JOIN pg_catalog.pg_index AS i ON i.indexrelid = index_table.oid
                 JOIN pg_catalog.pg_am AS am ON am.oid = index_table.relam
                 JOIN pg_catalog.pg_attribute AS user_column
                   ON user_column.attrelid = object_oid AND user_column.attname = 'user_id'
                 JOIN pg_catalog.pg_attribute AS date_column
                   ON date_column.attrelid = object_oid AND date_column.attname = 'created_at'
                WHERE index_table.relnamespace = 'public'::regnamespace
                  AND index_table.relname = 'payments_user_id_created_at_idx'
                  AND i.indrelid = object_oid AND am.amname = 'btree'
                  AND i.indisvalid AND i.indisready AND i.indislive
                  AND NOT i.indisunique AND NOT i.indisprimary
                  AND i.indnatts = 2 AND i.indnkeyatts = 2
                  AND i.indkey[0] = user_column.attnum
                  AND i.indkey[1] = date_column.attnum
                  AND (i.indoption[1]::integer & 1) = 1
                  AND i.indpred IS NULL AND i.indexprs IS NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM pg_catalog.pg_constraint AS c
                     WHERE c.conindid = i.indexrelid
                  )
             ) THEN
        RAISE EXCEPTION 'Existing public.payments indexes do not match the five reviewed production indexes';
      END IF;

      IF EXISTS (
        SELECT 1
          FROM pg_catalog.pg_class AS c
          CROSS JOIN LATERAL pg_catalog.unnest(
            COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
          ) AS item(acl_item)
          CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
         WHERE c.oid = object_oid
           AND acl.grantee NOT IN (
             object_owner, 'postgres'::regrole::oid, 'service_role'::regrole::oid
           )
      ) OR EXISTS (
        SELECT 1
          FROM pg_catalog.pg_class AS c
          CROSS JOIN LATERAL pg_catalog.unnest(
            COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
          ) AS item(acl_item)
          CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
         WHERE c.oid = object_oid
           AND acl.grantee = 'service_role'::regrole::oid
           AND (acl.privilege_type NOT IN ('SELECT', 'INSERT') OR acl.is_grantable)
      ) OR (
        SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_class AS c
          CROSS JOIN LATERAL pg_catalog.unnest(
            COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
          ) AS item(acl_item)
          CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
         WHERE c.oid = object_oid
           AND acl.grantee = 'service_role'::regrole::oid
           AND acl.privilege_type IN ('SELECT', 'INSERT')
      ) <> 2
         OR EXISTS (
           SELECT 1
             FROM pg_catalog.pg_attribute AS a
             CROSS JOIN LATERAL pg_catalog.unnest(a.attacl) AS item(acl_item)
             CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
            WHERE a.attrelid = object_oid AND a.attnum > 0
              AND NOT a.attisdropped AND acl.grantee <> object_owner
         )
         OR NOT pg_catalog.has_table_privilege('service_role', object_oid, 'SELECT')
         OR NOT pg_catalog.has_table_privilege('service_role', object_oid, 'INSERT')
         OR NOT pg_catalog.has_table_privilege('postgres', object_oid, 'SELECT')
         OR NOT pg_catalog.has_table_privilege('postgres', object_oid, 'INSERT')
         OR NOT pg_catalog.has_table_privilege('postgres', object_oid, 'UPDATE')
         OR NOT pg_catalog.has_table_privilege('postgres', object_oid, 'DELETE')
         OR NOT pg_catalog.has_table_privilege('postgres', object_oid, 'TRUNCATE')
         OR NOT pg_catalog.has_table_privilege('postgres', object_oid, 'REFERENCES')
         OR NOT pg_catalog.has_table_privilege('postgres', object_oid, 'TRIGGER')
         OR EXISTS (
           SELECT 1
             FROM (VALUES ('anon'::text), ('authenticated'), ('service_role')) AS roles(role_name)
             CROSS JOIN (VALUES
               ('UPDATE'::text), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
             ) AS privileges(privilege_name)
            WHERE pg_catalog.has_table_privilege(
              roles.role_name, object_oid, privileges.privilege_name
            )
         )
         OR pg_catalog.has_table_privilege('anon', object_oid, 'SELECT')
         OR pg_catalog.has_table_privilege('anon', object_oid, 'INSERT')
         OR pg_catalog.has_table_privilege('authenticated', object_oid, 'SELECT')
         OR pg_catalog.has_table_privilege('authenticated', object_oid, 'INSERT') THEN
        RAISE EXCEPTION 'Existing public.payments grants do not match postgres ownership and service_role SELECT/INSERT only';
      END IF;
    ELSE
      SELECT pg_catalog.count(*) INTO constraint_count
        FROM pg_catalog.pg_constraint AS c
       WHERE c.conrelid = object_oid;
      IF constraint_count <> 3
         OR NOT EXISTS (
           SELECT 1
             FROM pg_catalog.pg_constraint AS c
             JOIN pg_catalog.pg_attribute AS a
               ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
             JOIN pg_catalog.pg_attribute AS b
               ON b.attrelid = c.conrelid AND b.attnum = c.conkey[2]
            WHERE c.conrelid = object_oid AND c.conname = 'ai_usage_pkey'
              AND c.contype = 'p'
              AND c.convalidated AND pg_catalog.array_length(c.conkey, 1) = 2
              AND a.attname = 'user_id' AND b.attname = 'usage_date'
         )
         OR NOT EXISTS (
           SELECT 1
             FROM pg_catalog.pg_constraint AS c
             JOIN pg_catalog.pg_attribute AS local_column
               ON local_column.attrelid = c.conrelid AND local_column.attnum = c.conkey[1]
             JOIN pg_catalog.pg_attribute AS referenced_column
               ON referenced_column.attrelid = c.confrelid AND referenced_column.attnum = c.confkey[1]
             JOIN pg_catalog.pg_class AS referenced_table ON referenced_table.oid = c.confrelid
             JOIN pg_catalog.pg_namespace AS referenced_schema ON referenced_schema.oid = referenced_table.relnamespace
            WHERE c.conrelid = object_oid
              AND c.conname = 'ai_usage_user_id_fkey'
              AND c.contype = 'f' AND c.convalidated
              AND c.confdeltype = 'c'
              AND pg_catalog.array_length(c.conkey, 1) = 1
              AND pg_catalog.array_length(c.confkey, 1) = 1
              AND local_column.attname = 'user_id'
              AND referenced_schema.nspname = 'auth'
              AND referenced_table.relname = 'users'
              AND referenced_column.attname = 'id'
         )
         OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint AS c
              WHERE c.conrelid = object_oid
                AND c.conname = 'ai_usage_questions_used_check'
                AND c.contype = 'c' AND c.convalidated) <> 1
         OR EXISTS (
           SELECT 1 FROM pg_catalog.pg_constraint AS c
            WHERE c.conrelid = object_oid AND NOT c.convalidated
         ) THEN
        RAISE EXCEPTION 'Existing public.ai_usage constraints do not match its user/date primary key, auth cascade, and nonnegative counter';
      END IF;

      SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid) INTO check_expression
        FROM pg_catalog.pg_constraint AS c
       WHERE c.conrelid = object_oid AND c.contype = 'c' AND c.convalidated;
      EXECUTE pg_catalog.format(
        $probe$
          SELECT EXISTS (
            SELECT 1
              FROM (VALUES (-1::integer, FALSE), (0::integer, TRUE), (1::integer, TRUE))
                AS probe(questions_used, expected)
             WHERE COALESCE((%s), TRUE) IS DISTINCT FROM probe.expected
          )
        $probe$,
        check_expression
      ) INTO semantics_mismatch;
      IF semantics_mismatch THEN
        RAISE EXCEPTION 'Existing public.ai_usage check does not enforce questions_used >= 0';
      END IF;

      SELECT pg_catalog.count(*) INTO index_count
        FROM pg_catalog.pg_index AS i WHERE i.indrelid = object_oid;
      IF index_count <> 1 OR NOT EXISTS (
        SELECT 1
          FROM pg_catalog.pg_constraint AS c
          JOIN pg_catalog.pg_index AS i ON i.indexrelid = c.conindid
          JOIN pg_catalog.pg_class AS index_table ON index_table.oid = i.indexrelid
          JOIN pg_catalog.pg_am AS am ON am.oid = index_table.relam
          JOIN pg_catalog.pg_attribute AS user_column
            ON user_column.attrelid = object_oid AND user_column.attname = 'user_id'
          JOIN pg_catalog.pg_attribute AS date_column
            ON date_column.attrelid = object_oid AND date_column.attname = 'usage_date'
         WHERE c.conrelid = object_oid AND c.contype = 'p'
           AND c.conname = 'ai_usage_pkey'
           AND i.indrelid = object_oid AND am.amname = 'btree'
           AND index_table.relname = 'ai_usage_pkey'
           AND i.indisprimary AND i.indisunique
           AND i.indisvalid AND i.indisready AND i.indislive
           AND i.indnatts = 2 AND i.indnkeyatts = 2
           AND i.indkey[0] = user_column.attnum
           AND i.indkey[1] = date_column.attnum
           AND i.indpred IS NULL AND i.indexprs IS NULL
      ) THEN
        RAISE EXCEPTION 'Existing public.ai_usage indexes must be exactly its valid user_id/usage_date primary-key index';
      END IF;

      SELECT pg_catalog.count(*),
             pg_catalog.count(DISTINCT privilege_type)
        INTO acl_count, distinct_acl_count
        FROM information_schema.role_table_grants
       WHERE table_schema = 'public'
         AND table_name = 'ai_usage'
         AND grantee = 'postgres'
         AND is_grantable = 'YES'
         AND privilege_type IN (
           'DELETE', 'INSERT', 'REFERENCES', 'SELECT',
           'TRIGGER', 'TRUNCATE', 'UPDATE'
         );
      IF acl_count <> 7 OR distinct_acl_count <> 7
         OR EXISTS (
           SELECT 1
             FROM information_schema.role_table_grants
            WHERE table_schema = 'public'
              AND table_name = 'ai_usage'
              AND (
                grantee <> 'postgres'
                OR is_grantable <> 'YES'
                OR privilege_type NOT IN (
                  'DELETE', 'INSERT', 'REFERENCES', 'SELECT',
                  'TRIGGER', 'TRUNCATE', 'UPDATE'
                )
              )
         )
         OR EXISTS (
           SELECT 1
             FROM (VALUES
               ('DELETE'::text), ('INSERT'), ('REFERENCES'), ('SELECT'),
               ('TRIGGER'), ('TRUNCATE'), ('UPDATE')
             ) AS expected(privilege_type)
             WHERE NOT EXISTS (
               SELECT 1
                 FROM information_schema.role_table_grants
                WHERE table_schema = 'public'
                  AND table_name = 'ai_usage'
                  AND grantee = 'postgres'
                  AND privilege_type = expected.privilege_type
                  AND is_grantable = 'YES'
             )
         ) THEN
        RAISE EXCEPTION 'Existing public.ai_usage table ACL must match the postgres-only seven-privilege grant inventory';
      END IF;

      SELECT pg_catalog.count(*),
              pg_catalog.count(DISTINCT (column_name || ':' || privilege_type))
        INTO acl_count, distinct_acl_count
        FROM information_schema.column_privileges
       WHERE table_schema = 'public'
         AND table_name = 'ai_usage'
         AND grantee = 'postgres'
         AND is_grantable = 'YES'
         AND privilege_type IN ('INSERT', 'REFERENCES', 'SELECT', 'UPDATE');
      IF acl_count <> 12 OR distinct_acl_count <> 12
         OR EXISTS (
           SELECT 1
              FROM information_schema.column_privileges
             WHERE table_schema = 'public'
               AND table_name = 'ai_usage'
               AND (
                 column_name NOT IN ('user_id', 'usage_date', 'questions_used')
                 OR grantee <> 'postgres'
                 OR is_grantable <> 'YES'
                 OR privilege_type NOT IN ('INSERT', 'REFERENCES', 'SELECT', 'UPDATE')
               )
         )
         OR EXISTS (
           SELECT 1
             FROM (VALUES
               ('user_id'::text), ('usage_date'), ('questions_used')
             ) AS expected_column(column_name)
             CROSS JOIN (VALUES
               ('INSERT'::text), ('REFERENCES'), ('SELECT'), ('UPDATE')
             ) AS expected_privilege(privilege_type)
             WHERE NOT EXISTS (
               SELECT 1
                 FROM information_schema.column_privileges
                WHERE table_schema = 'public'
                  AND table_name = 'ai_usage'
                  AND column_name = expected_column.column_name
                  AND grantee = 'postgres'
                  AND privilege_type = expected_privilege.privilege_type
                  AND is_grantable = 'YES'
             )
         ) THEN
        RAISE EXCEPTION 'Existing public.ai_usage column ACL must match postgres INSERT/REFERENCES/SELECT/UPDATE grantable on every column';
      END IF;

      IF pg_catalog.has_table_privilege('anon', object_oid, 'SELECT')
         OR pg_catalog.has_table_privilege('anon', object_oid, 'INSERT')
         OR pg_catalog.has_table_privilege('authenticated', object_oid, 'SELECT')
         OR pg_catalog.has_table_privilege('authenticated', object_oid, 'INSERT')
         OR pg_catalog.has_table_privilege('service_role', object_oid, 'SELECT')
         OR pg_catalog.has_table_privilege('service_role', object_oid, 'INSERT')
         OR pg_catalog.has_table_privilege('anon', object_oid, 'UPDATE')
         OR pg_catalog.has_table_privilege('anon', object_oid, 'DELETE')
         OR pg_catalog.has_table_privilege('anon', object_oid, 'TRUNCATE')
         OR pg_catalog.has_table_privilege('anon', object_oid, 'REFERENCES')
         OR pg_catalog.has_table_privilege('anon', object_oid, 'TRIGGER')
         OR pg_catalog.has_table_privilege('authenticated', object_oid, 'UPDATE')
         OR pg_catalog.has_table_privilege('authenticated', object_oid, 'DELETE')
         OR pg_catalog.has_table_privilege('authenticated', object_oid, 'TRUNCATE')
         OR pg_catalog.has_table_privilege('authenticated', object_oid, 'REFERENCES')
         OR pg_catalog.has_table_privilege('authenticated', object_oid, 'TRIGGER')
         OR pg_catalog.has_table_privilege('service_role', object_oid, 'UPDATE')
         OR pg_catalog.has_table_privilege('service_role', object_oid, 'DELETE')
         OR pg_catalog.has_table_privilege('service_role', object_oid, 'TRUNCATE')
         OR pg_catalog.has_table_privilege('service_role', object_oid, 'REFERENCES')
         OR pg_catalog.has_table_privilege('service_role', object_oid, 'TRIGGER')
      ) THEN
        RAISE EXCEPTION 'Existing public.ai_usage grants do not match the reviewed postgres-only privilege inventory';
      END IF;
    END IF;
  END LOOP;
END;
$existing_objects_preflight$;

-- Revoke table-level and column-level client writes, including inherited effects
-- that would remain effective through PUBLIC or the client roles.
ALTER TABLE public.user_plans
  ALTER COLUMN id SET DEFAULT pg_catalog.gen_random_uuid(),
  ALTER COLUMN updated_at SET DEFAULT pg_catalog.now();

REVOKE ALL PRIVILEGES ON TABLE public.user_plans FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_plans FROM service_role;
REVOKE INSERT (id, user_id, plan, payment_id, updated_at),
       UPDATE (id, user_id, plan, payment_id, updated_at),
       REFERENCES (id, user_id, plan, payment_id, updated_at)
  ON TABLE public.user_plans FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, user_id, plan, payment_id, updated_at),
       UPDATE (id, user_id, plan, payment_id, updated_at),
       REFERENCES (id, user_id, plan, payment_id, updated_at)
  ON TABLE public.user_plans FROM service_role;
GRANT SELECT ON TABLE public.user_plans TO authenticated;
GRANT SELECT ON TABLE public.user_plans TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_plans TO postgres;

DO $create_payments_if_absent$
BEGIN
  IF pg_catalog.to_regclass('public.payments') IS NULL THEN
    CREATE TABLE public.payments (
      id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
      razorpay_order_id TEXT NOT NULL UNIQUE,
      razorpay_payment_id TEXT UNIQUE,
      event_id TEXT UNIQUE,
      plan TEXT NOT NULL CHECK (plan IN ('pro', 'analyst')),
      amount BIGINT NOT NULL CHECK (
        (plan = 'pro' AND amount = 49900)
        OR (plan = 'analyst' AND amount = 149900)
      ),
      currency TEXT NOT NULL CHECK (currency = 'INR'),
      status TEXT NOT NULL DEFAULT 'created'
        CHECK (status IN ('created', 'captured')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
      captured_at TIMESTAMPTZ,
      CHECK (
        (status = 'created' AND razorpay_payment_id IS NULL AND event_id IS NULL AND captured_at IS NULL)
        OR
        (status = 'captured' AND razorpay_payment_id IS NOT NULL AND event_id IS NOT NULL AND captured_at IS NOT NULL)
      )
    );
  END IF;
END;
$create_payments_if_absent$;
ALTER TABLE public.payments
  ALTER COLUMN id SET DEFAULT pg_catalog.gen_random_uuid(),
  ALTER COLUMN status SET DEFAULT 'created',
  ALTER COLUMN created_at SET DEFAULT pg_catalog.now(),
  ALTER COLUMN updated_at SET DEFAULT pg_catalog.now();
CREATE INDEX IF NOT EXISTS payments_user_id_created_at_idx
  ON public.payments (user_id, created_at DESC);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.payments FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.payments FROM service_role;
REVOKE ALL (id, user_id, razorpay_order_id, razorpay_payment_id, event_id,
            plan, amount, currency, status, created_at, updated_at, captured_at)
  ON TABLE public.payments FROM PUBLIC, anon, authenticated, service_role;

-- Remove only payments-table ACLs inherited by API roles through membership
-- roles, plus PUBLIC ACLs. This does not alter role memberships or other objects.
DO $payment_acl_cleanup$
DECLARE
  acl_entry RECORD;
  grantee_name TEXT;
  grantee_sql TEXT;
BEGIN
  FOR acl_entry IN
    SELECT DISTINCT acl.grantee, acl.privilege_type
      FROM pg_catalog.pg_class AS c
      CROSS JOIN LATERAL pg_catalog.unnest(
        COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
      ) AS item(acl_item)
      CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
     WHERE c.oid = 'public.payments'::regclass
       AND acl.grantee <> c.relowner
       AND CASE WHEN acl.grantee = 0 THEN TRUE ELSE
         pg_catalog.pg_has_role('anon'::name, acl.grantee, 'USAGE')
         OR pg_catalog.pg_has_role('authenticated'::name, acl.grantee, 'USAGE')
         OR pg_catalog.pg_has_role('service_role'::name, acl.grantee, 'USAGE')
       END
  LOOP
    IF acl_entry.grantee = 0 THEN
      grantee_sql := 'PUBLIC';
    ELSE
      SELECT r.rolname INTO grantee_name
        FROM pg_catalog.pg_roles AS r
       WHERE r.oid = acl_entry.grantee;
      grantee_sql := pg_catalog.quote_ident(grantee_name);
    END IF;
    EXECUTE pg_catalog.format(
      'REVOKE %s ON TABLE public.payments FROM %s',
      acl_entry.privilege_type,
      grantee_sql
    );
  END LOOP;

  FOR acl_entry IN
    SELECT DISTINCT a.attname, acl.grantee, acl.privilege_type
      FROM pg_catalog.pg_attribute AS a
      CROSS JOIN LATERAL pg_catalog.unnest(a.attacl) AS item(acl_item)
      CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
     WHERE a.attrelid = 'public.payments'::regclass
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND acl.grantee <> (
         SELECT c.relowner FROM pg_catalog.pg_class AS c
          WHERE c.oid = a.attrelid
       )
       AND CASE WHEN acl.grantee = 0 THEN TRUE ELSE
         pg_catalog.pg_has_role('anon'::name, acl.grantee, 'USAGE')
         OR pg_catalog.pg_has_role('authenticated'::name, acl.grantee, 'USAGE')
         OR pg_catalog.pg_has_role('service_role'::name, acl.grantee, 'USAGE')
       END
  LOOP
    IF acl_entry.grantee = 0 THEN
      grantee_sql := 'PUBLIC';
    ELSE
      SELECT r.rolname INTO grantee_name
        FROM pg_catalog.pg_roles AS r
       WHERE r.oid = acl_entry.grantee;
      grantee_sql := pg_catalog.quote_ident(grantee_name);
    END IF;
    EXECUTE pg_catalog.format(
      'REVOKE %s (%I) ON TABLE public.payments FROM %s',
      acl_entry.privilege_type,
      acl_entry.attname,
      grantee_sql
    );
  END LOOP;
END;
$payment_acl_cleanup$;

-- The order API needs to insert and read registered orders. Captures modify
-- payments only through the postgres-owned SECURITY DEFINER RPC.
GRANT SELECT, INSERT ON TABLE public.payments TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payments TO postgres;

DO $create_ai_usage_if_absent$
BEGIN
  IF pg_catalog.to_regclass('public.ai_usage') IS NULL THEN
    CREATE TABLE public.ai_usage (
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      usage_date DATE NOT NULL,
      questions_used INTEGER NOT NULL DEFAULT 0 CHECK (questions_used >= 0),
      PRIMARY KEY (user_id, usage_date)
    );
  END IF;
END;
$create_ai_usage_if_absent$;
ALTER TABLE public.ai_usage
  ALTER COLUMN questions_used SET DEFAULT 0;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.ai_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.ai_usage FROM service_role;
REVOKE ALL (user_id, usage_date, questions_used)
  ON TABLE public.ai_usage FROM PUBLIC, anon, authenticated, service_role;
DO $ai_usage_acl_cleanup$
DECLARE
  acl_entry RECORD;
  grantee_name TEXT;
  grantee_sql TEXT;
BEGIN
  FOR acl_entry IN
    SELECT DISTINCT acl.grantee, acl.privilege_type
      FROM pg_catalog.pg_class AS c
      CROSS JOIN LATERAL pg_catalog.unnest(
        COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
      ) AS item(acl_item)
      CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
     WHERE c.oid = 'public.ai_usage'::regclass
       AND acl.grantee <> c.relowner
       AND CASE WHEN acl.grantee = 0 THEN TRUE ELSE
         pg_catalog.pg_has_role('anon'::name, acl.grantee, 'USAGE')
         OR pg_catalog.pg_has_role('authenticated'::name, acl.grantee, 'USAGE')
         OR pg_catalog.pg_has_role('service_role'::name, acl.grantee, 'USAGE')
       END
  LOOP
    IF acl_entry.grantee = 0 THEN
      grantee_sql := 'PUBLIC';
    ELSE
      SELECT r.rolname INTO grantee_name
        FROM pg_catalog.pg_roles AS r
       WHERE r.oid = acl_entry.grantee;
      grantee_sql := pg_catalog.quote_ident(grantee_name);
    END IF;
    EXECUTE pg_catalog.format(
      'REVOKE %s ON TABLE public.ai_usage FROM %s',
      acl_entry.privilege_type,
      grantee_sql
    );
  END LOOP;

  FOR acl_entry IN
    SELECT DISTINCT a.attname, acl.grantee, acl.privilege_type
      FROM pg_catalog.pg_attribute AS a
      CROSS JOIN LATERAL pg_catalog.unnest(a.attacl) AS item(acl_item)
      CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
     WHERE a.attrelid = 'public.ai_usage'::regclass
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND acl.grantee <> (
         SELECT c.relowner FROM pg_catalog.pg_class AS c
          WHERE c.oid = a.attrelid
       )
       AND CASE WHEN acl.grantee = 0 THEN TRUE ELSE
         pg_catalog.pg_has_role('anon'::name, acl.grantee, 'USAGE')
         OR pg_catalog.pg_has_role('authenticated'::name, acl.grantee, 'USAGE')
         OR pg_catalog.pg_has_role('service_role'::name, acl.grantee, 'USAGE')
       END
  LOOP
    IF acl_entry.grantee = 0 THEN
      grantee_sql := 'PUBLIC';
    ELSE
      SELECT r.rolname INTO grantee_name
        FROM pg_catalog.pg_roles AS r
       WHERE r.oid = acl_entry.grantee;
      grantee_sql := pg_catalog.quote_ident(grantee_name);
    END IF;
    EXECUTE pg_catalog.format(
      'REVOKE %s (%I) ON TABLE public.ai_usage FROM %s',
      acl_entry.privilege_type,
      acl_entry.attname,
      grantee_sql
    );
  END LOOP;
END;
$ai_usage_acl_cleanup$;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ai_usage TO postgres;

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

  SELECT COALESCE(up.plan, 'free') INTO current_plan
    FROM public.user_plans AS up
   WHERE up.user_id = current_user_id;
  IF NOT FOUND THEN
    current_plan := 'free';
  END IF;
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

CREATE OR REPLACE FUNCTION public.record_razorpay_capture(
  p_payment_id TEXT,
  p_order_id TEXT,
  p_event_id TEXT,
  p_user_id UUID,
  p_plan TEXT,
  p_amount BIGINT,
  p_currency TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  payment_row public.payments%ROWTYPE;
  expected_amount BIGINT;
BEGIN
  expected_amount := CASE p_plan
    WHEN 'pro' THEN 49900
    WHEN 'analyst' THEN 149900
    ELSE NULL
  END;
  IF p_payment_id IS NULL OR p_order_id IS NULL OR p_event_id IS NULL
    OR p_user_id IS NULL OR p_currency IS DISTINCT FROM 'INR'
    OR p_payment_id !~ '^pay_[A-Za-z0-9]+$'
    OR p_order_id !~ '^order_[A-Za-z0-9]+$'
    OR p_event_id !~ '^evt_[A-Za-z0-9]+$'
    OR expected_amount IS NULL OR p_amount IS DISTINCT FROM expected_amount
  THEN
    RAISE EXCEPTION 'Invalid captured payment data';
  END IF;

  SELECT * INTO payment_row FROM public.payments AS p
   WHERE p.razorpay_order_id = p_order_id FOR UPDATE;
  IF NOT FOUND
    OR payment_row.user_id IS DISTINCT FROM p_user_id
    OR payment_row.plan IS DISTINCT FROM p_plan
    OR payment_row.amount IS DISTINCT FROM p_amount
    OR payment_row.currency IS DISTINCT FROM p_currency
  THEN
    RAISE EXCEPTION 'Captured payment does not match registered order';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments AS p
     WHERE p.id <> payment_row.id
       AND (p.razorpay_payment_id = p_payment_id OR p.event_id = p_event_id)
  ) THEN
    RAISE EXCEPTION 'Payment or event ID is already associated with another order';
  END IF;
  IF payment_row.status = 'captured' THEN
    IF payment_row.razorpay_payment_id = p_payment_id THEN
      RETURN 'duplicate';
    END IF;
    RAISE EXCEPTION 'Order already has a different captured payment';
  END IF;

  UPDATE public.payments
     SET razorpay_payment_id = p_payment_id,
         event_id = p_event_id,
         status = 'captured',
         captured_at = pg_catalog.now(),
         updated_at = pg_catalog.now()
   WHERE id = payment_row.id;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::TEXT, 0));
  INSERT INTO public.user_plans AS up (user_id, plan, payment_id, updated_at)
  VALUES (p_user_id, p_plan, p_payment_id, pg_catalog.now())
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL
  DO UPDATE SET
    plan = CASE
      WHEN up.plan = 'analyst' OR EXCLUDED.plan = 'analyst' THEN 'analyst'
      ELSE 'pro'
    END,
    payment_id = EXCLUDED.payment_id,
    updated_at = EXCLUDED.updated_at;
  RETURN 'recorded';
END;
$function$;
ALTER FUNCTION public.record_razorpay_capture(TEXT, TEXT, TEXT, UUID, TEXT, BIGINT, TEXT)
  OWNER TO postgres;

DO $subscription_function_acl_cleanup$
DECLARE
  function_row RECORD;
  acl_role RECORD;
  grantee_sql TEXT;
BEGIN
  FOR function_row IN
    SELECT p.oid, n.nspname, p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_args,
           p.proowner
      FROM pg_catalog.pg_proc AS p
      JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
     WHERE p.oid IN (
       'public.consume_ai_question()'::regprocedure,
       'public.record_razorpay_capture(text,text,text,uuid,text,bigint,text)'::regprocedure
     )
  LOOP
    FOR acl_role IN
      SELECT DISTINCT acl.grantee, r.rolname
        FROM pg_catalog.pg_proc AS p
        CROSS JOIN LATERAL pg_catalog.unnest(
          COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
        ) AS item(acl_item)
        CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
        LEFT JOIN pg_catalog.pg_roles AS r ON r.oid = acl.grantee
       WHERE p.oid = function_row.oid
         AND acl.grantee <> p.proowner
    LOOP
      grantee_sql := CASE
        WHEN acl_role.grantee = 0 THEN 'PUBLIC'
        ELSE pg_catalog.quote_ident(acl_role.rolname)
      END;
      EXECUTE pg_catalog.format(
        'REVOKE ALL PRIVILEGES ON FUNCTION %I.%I(%s) FROM %s',
        function_row.nspname,
        function_row.proname,
        function_row.identity_args,
        grantee_sql
      );
    END LOOP;
  END LOOP;
END;
$subscription_function_acl_cleanup$;

GRANT EXECUTE ON FUNCTION public.consume_ai_question() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_razorpay_capture(TEXT, TEXT, TEXT, UUID, TEXT, BIGINT, TEXT)
  TO service_role;

-- Postconditions fail the transaction if inherited grants or memberships leave
-- an unintended client/server write path. These assertions run before COMMIT.
DO $security_assertions$
DECLARE
  plans_oid OID := pg_catalog.to_regclass('public.user_plans');
  payments_oid OID := pg_catalog.to_regclass('public.payments');
  usage_oid OID := pg_catalog.to_regclass('public.ai_usage');
  unexpected_payment_privileges TEXT;
  usage_acl_count INTEGER;
  usage_acl_distinct_count INTEGER;
  check_expression TEXT;
  check_semantics_mismatch BOOLEAN;
  user_plans_index_count INTEGER;
  user_plans_policy_count INTEGER;
  user_id_index_predicate TEXT;
  user_id_index_predicate_mismatch BOOLEAN;
BEGIN
  IF (SELECT pg_catalog.count(*)
        FROM pg_catalog.pg_constraint AS c
       WHERE c.conrelid = plans_oid) <> 3
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_constraint AS c
         JOIN pg_catalog.pg_attribute AS a
           ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
        WHERE c.conrelid = plans_oid
          AND c.conname = 'user_plans_pkey'
          AND c.contype = 'p'
          AND pg_catalog.array_length(c.conkey, 1) = 1
          AND a.attname = 'id'
     )
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_constraint AS c
         JOIN pg_catalog.pg_attribute AS local_column
           ON local_column.attrelid = c.conrelid AND local_column.attnum = c.conkey[1]
         JOIN pg_catalog.pg_attribute AS referenced_column
           ON referenced_column.attrelid = c.confrelid AND referenced_column.attnum = c.confkey[1]
         JOIN pg_catalog.pg_class AS referenced_table ON referenced_table.oid = c.confrelid
         JOIN pg_catalog.pg_namespace AS referenced_schema ON referenced_schema.oid = referenced_table.relnamespace
        WHERE c.conrelid = plans_oid
          AND c.conname = 'user_plans_user_id_fkey'
          AND c.contype = 'f'
          AND c.convalidated
          AND pg_catalog.array_length(c.conkey, 1) = 1
          AND pg_catalog.array_length(c.confkey, 1) = 1
          AND local_column.attname = 'user_id'
          AND referenced_schema.nspname = 'auth'
          AND referenced_table.relname = 'users'
          AND referenced_column.attname = 'id'
     )
     OR (SELECT pg_catalog.count(*)
           FROM pg_catalog.pg_constraint AS c
          WHERE c.conrelid = plans_oid
            AND c.conname = 'user_plans_valid_plan_ck'
            AND c.contype = 'c'
            AND c.convalidated) <> 1 THEN
    RAISE EXCEPTION 'user_plans constraints changed: expected the reviewed primary key, auth user foreign key, and unchanged valid-plan check';
  END IF;

  SELECT pg_catalog.count(*) INTO user_plans_policy_count
    FROM pg_catalog.pg_policies AS policy
   WHERE policy.schemaname = 'public'
     AND policy.tablename = 'user_plans';
  IF NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class AS c WHERE c.oid = plans_oid)
     OR (SELECT c.relforcerowsecurity FROM pg_catalog.pg_class AS c WHERE c.oid = plans_oid)
     OR user_plans_policy_count <> 1
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_policies AS policy
        WHERE policy.schemaname = 'public'
          AND policy.tablename = 'user_plans'
          AND policy.policyname = 'own plan'
          AND policy.permissive = 'PERMISSIVE'
          AND policy.roles = ARRAY['authenticated']::name[]
          AND policy.cmd = 'SELECT'
          AND pg_catalog.regexp_replace(policy.qual, '[[:space:]]+', '', 'g') =
            '(auth.uid()=user_id)'
          AND policy.with_check IS NULL
     ) THEN
    RAISE EXCEPTION 'user_plans RLS must remain enabled with exactly the own-plan authenticated SELECT policy';
  END IF;

  SELECT pg_catalog.pg_get_expr(c.conbin, c.conrelid)
    INTO check_expression
    FROM pg_catalog.pg_constraint AS c
   WHERE c.conrelid = plans_oid
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
    check_expression
  ) INTO check_semantics_mismatch;
  IF check_semantics_mismatch THEN
    RAISE EXCEPTION 'user_plans_valid_plan_ck semantics changed from the reviewed free/pro/analyst rule';
  END IF;

  SELECT pg_catalog.count(*) INTO user_plans_index_count
    FROM pg_catalog.pg_index AS i
   WHERE i.indrelid = plans_oid;
  IF user_plans_index_count <> 2
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_index AS i
         JOIN pg_catalog.pg_class AS index_table ON index_table.oid = i.indexrelid
         JOIN pg_catalog.pg_am AS access_method ON access_method.oid = index_table.relam
         JOIN pg_catalog.pg_constraint AS constraint_row
           ON constraint_row.conindid = i.indexrelid
         JOIN pg_catalog.pg_attribute AS a
           ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
        WHERE i.indrelid = plans_oid
          AND index_table.relname = 'user_plans_pkey'
          AND i.indisprimary
          AND i.indisunique
          AND i.indisvalid
          AND i.indisready
          AND index_table.relkind = 'i'
          AND access_method.amname = 'btree'
          AND constraint_row.conname = 'user_plans_pkey'
          AND constraint_row.contype = 'p'
          AND a.attname = 'id'
          AND i.indnatts = 1
          AND i.indnkeyatts = 1
          AND i.indpred IS NULL
          AND i.indexprs IS NULL
     )
     OR NOT EXISTS (
       SELECT 1
         FROM pg_catalog.pg_index AS i
         JOIN pg_catalog.pg_class AS index_table ON index_table.oid = i.indexrelid
         JOIN pg_catalog.pg_am AS access_method ON access_method.oid = index_table.relam
         JOIN pg_catalog.pg_attribute AS a
           ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
        WHERE i.indrelid = plans_oid
          AND index_table.relname = 'user_plans_user_id_unique_idx'
          AND access_method.amname = 'btree'
          AND i.indisunique
          AND NOT i.indisprimary
          AND i.indisexclusion = FALSE
          AND i.indisvalid
          AND i.indisready
          AND i.indislive
          AND i.indpred IS NOT NULL
          AND i.indexprs IS NULL
          AND i.indnatts = 1
          AND i.indnkeyatts = 1
          AND a.attname = 'user_id'
          AND NOT EXISTS (
            SELECT 1
              FROM pg_catalog.pg_constraint AS constraint_row
             WHERE constraint_row.conindid = i.indexrelid
          )
     ) THEN
    RAISE EXCEPTION 'user_plans indexes changed: expected exactly user_plans_pkey and user_plans_user_id_unique_idx with the reviewed definitions';
  END IF;
  SELECT pg_catalog.pg_get_expr(i.indpred, i.indrelid)
    INTO user_id_index_predicate
    FROM pg_catalog.pg_index AS i
    JOIN pg_catalog.pg_class AS index_table ON index_table.oid = i.indexrelid
   WHERE i.indrelid = plans_oid
     AND index_table.relname = 'user_plans_user_id_unique_idx';
  EXECUTE pg_catalog.format(
    $probe$
      SELECT EXISTS (
        SELECT 1
          FROM (VALUES
            (NULL::uuid, FALSE),
            ('00000000-0000-0000-0000-000000000001'::uuid, TRUE)
          ) AS probe(user_id, expected)
         WHERE COALESCE((%s), FALSE) IS DISTINCT FROM probe.expected
      )
    $probe$,
    user_id_index_predicate
  ) INTO user_id_index_predicate_mismatch;
  IF user_id_index_predicate_mismatch THEN
    RAISE EXCEPTION 'user_plans_user_id_unique_idx predicate changed from user_id IS NOT NULL';
  END IF;

  IF NOT pg_catalog.has_table_privilege('authenticated', plans_oid, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('service_role', plans_oid, 'SELECT')
     OR pg_catalog.has_table_privilege('anon', plans_oid, 'SELECT')
     OR pg_catalog.has_any_column_privilege('anon', plans_oid, 'SELECT') THEN
    RAISE EXCEPTION 'user_plans must be readable by authenticated users only';
  END IF;
  IF pg_catalog.has_table_privilege('anon', plans_oid, 'INSERT')
     OR pg_catalog.has_table_privilege('anon', plans_oid, 'UPDATE')
     OR pg_catalog.has_table_privilege('anon', plans_oid, 'DELETE')
     OR pg_catalog.has_table_privilege('anon', plans_oid, 'TRUNCATE')
     OR pg_catalog.has_table_privilege('anon', plans_oid, 'REFERENCES')
     OR pg_catalog.has_table_privilege('anon', plans_oid, 'TRIGGER')
     OR pg_catalog.has_table_privilege('authenticated', plans_oid, 'INSERT')
     OR pg_catalog.has_table_privilege('authenticated', plans_oid, 'UPDATE')
     OR pg_catalog.has_table_privilege('authenticated', plans_oid, 'DELETE')
     OR pg_catalog.has_table_privilege('authenticated', plans_oid, 'TRUNCATE')
     OR pg_catalog.has_table_privilege('authenticated', plans_oid, 'REFERENCES')
     OR pg_catalog.has_table_privilege('authenticated', plans_oid, 'TRIGGER')
     OR pg_catalog.has_table_privilege('service_role', plans_oid, 'INSERT')
     OR pg_catalog.has_table_privilege('service_role', plans_oid, 'UPDATE')
     OR pg_catalog.has_table_privilege('service_role', plans_oid, 'DELETE')
     OR pg_catalog.has_table_privilege('service_role', plans_oid, 'TRUNCATE')
     OR pg_catalog.has_table_privilege('service_role', plans_oid, 'REFERENCES')
     OR pg_catalog.has_table_privilege('service_role', plans_oid, 'TRIGGER') THEN
    RAISE EXCEPTION 'Unexpected effective write privilege remains on user_plans';
  END IF;
  IF pg_catalog.has_any_column_privilege('anon', plans_oid, 'INSERT')
     OR pg_catalog.has_any_column_privilege('anon', plans_oid, 'UPDATE')
     OR pg_catalog.has_any_column_privilege('anon', plans_oid, 'REFERENCES')
     OR pg_catalog.has_any_column_privilege('authenticated', plans_oid, 'INSERT')
     OR pg_catalog.has_any_column_privilege('authenticated', plans_oid, 'UPDATE')
     OR pg_catalog.has_any_column_privilege('authenticated', plans_oid, 'REFERENCES')
     OR pg_catalog.has_any_column_privilege('service_role', plans_oid, 'INSERT')
     OR pg_catalog.has_any_column_privilege('service_role', plans_oid, 'UPDATE')
     OR pg_catalog.has_any_column_privilege('service_role', plans_oid, 'REFERENCES') THEN
    RAISE EXCEPTION 'Unexpected effective column-level write privilege remains on user_plans';
  END IF;
  IF NOT pg_catalog.has_table_privilege('postgres', plans_oid, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('postgres', plans_oid, 'INSERT')
     OR NOT pg_catalog.has_table_privilege('postgres', plans_oid, 'UPDATE')
     OR NOT pg_catalog.has_table_privilege('postgres', payments_oid, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('postgres', payments_oid, 'INSERT')
     OR NOT pg_catalog.has_table_privilege('postgres', payments_oid, 'UPDATE')
     OR NOT pg_catalog.has_table_privilege('postgres', payments_oid, 'DELETE')
     OR NOT pg_catalog.has_table_privilege('postgres', payments_oid, 'TRUNCATE')
     OR NOT pg_catalog.has_table_privilege('postgres', payments_oid, 'REFERENCES')
     OR NOT pg_catalog.has_table_privilege('postgres', payments_oid, 'TRIGGER')
     OR NOT pg_catalog.has_table_privilege('postgres', usage_oid, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('postgres', usage_oid, 'INSERT')
     OR NOT pg_catalog.has_table_privilege('postgres', usage_oid, 'UPDATE') THEN
    RAISE EXCEPTION 'The trusted postgres function owner must have required table privileges';
  END IF;

  SELECT pg_catalog.string_agg(
           pg_catalog.format('%s.%s', checked_role.role_name, checked_privilege.privilege),
           ', ' ORDER BY checked_role.role_name, checked_privilege.privilege
         )
    INTO unexpected_payment_privileges
    FROM (VALUES ('anon'::TEXT), ('authenticated'), ('service_role')) AS checked_role(role_name)
    CROSS JOIN (VALUES
      ('SELECT'::TEXT), ('INSERT'), ('UPDATE'), ('DELETE'),
      ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
    ) AS checked_privilege(privilege)
   WHERE pg_catalog.has_table_privilege(
           checked_role.role_name,
           payments_oid,
           checked_privilege.privilege
         )
     AND NOT (
       checked_role.role_name = 'service_role'
       AND checked_privilege.privilege IN ('SELECT', 'INSERT')
     );
  IF unexpected_payment_privileges IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected effective privileges remain on payments: %',
      unexpected_payment_privileges;
  END IF;
  IF NOT pg_catalog.has_table_privilege('service_role', payments_oid, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('service_role', payments_oid, 'INSERT') THEN
    RAISE EXCEPTION 'service_role must retain SELECT and INSERT on payments for order registration and verification';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class AS c
      CROSS JOIN LATERAL pg_catalog.unnest(
        COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
      ) AS item(acl_item)
      CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
     WHERE c.oid = payments_oid
       AND acl.grantee = 0
  ) THEN
    RAISE EXCEPTION 'PUBLIC retains a direct table privilege on payments';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_attribute AS a
      CROSS JOIN LATERAL pg_catalog.unnest(a.attacl) AS item(acl_item)
      CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
     WHERE a.attrelid = payments_oid
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND CASE WHEN acl.grantee = 0 THEN TRUE ELSE
         pg_catalog.pg_has_role('anon'::name, acl.grantee, 'USAGE')
         OR pg_catalog.pg_has_role('authenticated'::name, acl.grantee, 'USAGE')
         OR pg_catalog.pg_has_role('service_role'::name, acl.grantee, 'USAGE')
       END
  ) THEN
    RAISE EXCEPTION 'PUBLIC or an API role/membership role retains a column-level payments grant';
  END IF;
  IF pg_catalog.has_table_privilege('anon', payments_oid, 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', payments_oid, 'SELECT')
     OR pg_catalog.has_any_column_privilege('anon', payments_oid, 'SELECT')
     OR pg_catalog.has_any_column_privilege('authenticated', payments_oid, 'SELECT') THEN
    RAISE EXCEPTION 'anon or authenticated can read payments directly';
  END IF;
  IF pg_catalog.has_any_column_privilege('anon', payments_oid, 'SELECT')
     OR pg_catalog.has_any_column_privilege('anon', payments_oid, 'INSERT')
     OR pg_catalog.has_any_column_privilege('anon', payments_oid, 'UPDATE')
     OR pg_catalog.has_any_column_privilege('anon', payments_oid, 'REFERENCES')
     OR pg_catalog.has_any_column_privilege('authenticated', payments_oid, 'SELECT')
     OR pg_catalog.has_any_column_privilege('authenticated', payments_oid, 'INSERT')
     OR pg_catalog.has_any_column_privilege('authenticated', payments_oid, 'UPDATE')
     OR pg_catalog.has_any_column_privilege('authenticated', payments_oid, 'REFERENCES') THEN
    RAISE EXCEPTION 'Unexpected effective column-level privilege remains on client roles for payments';
  END IF;
  IF pg_catalog.has_table_privilege('anon', usage_oid, 'SELECT')
     OR pg_catalog.has_table_privilege('anon', usage_oid, 'INSERT')
     OR pg_catalog.has_table_privilege('anon', usage_oid, 'UPDATE')
     OR pg_catalog.has_table_privilege('anon', usage_oid, 'DELETE')
     OR pg_catalog.has_table_privilege('anon', usage_oid, 'TRUNCATE')
     OR pg_catalog.has_table_privilege('anon', usage_oid, 'REFERENCES')
     OR pg_catalog.has_table_privilege('anon', usage_oid, 'TRIGGER')
     OR pg_catalog.has_table_privilege('authenticated', usage_oid, 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', usage_oid, 'INSERT')
     OR pg_catalog.has_table_privilege('authenticated', usage_oid, 'UPDATE')
     OR pg_catalog.has_table_privilege('authenticated', usage_oid, 'DELETE')
     OR pg_catalog.has_table_privilege('authenticated', usage_oid, 'TRUNCATE')
     OR pg_catalog.has_table_privilege('authenticated', usage_oid, 'REFERENCES')
     OR pg_catalog.has_table_privilege('authenticated', usage_oid, 'TRIGGER')
     OR pg_catalog.has_table_privilege('service_role', usage_oid, 'SELECT')
     OR pg_catalog.has_table_privilege('service_role', usage_oid, 'INSERT')
     OR pg_catalog.has_table_privilege('service_role', usage_oid, 'UPDATE')
     OR pg_catalog.has_table_privilege('service_role', usage_oid, 'DELETE')
     OR pg_catalog.has_table_privilege('service_role', usage_oid, 'TRUNCATE')
     OR pg_catalog.has_table_privilege('service_role', usage_oid, 'REFERENCES')
     OR pg_catalog.has_table_privilege('service_role', usage_oid, 'TRIGGER') THEN
    RAISE EXCEPTION 'Unexpected effective privileges remain on ai_usage';
  END IF;
  IF pg_catalog.has_any_column_privilege('anon', usage_oid, 'SELECT')
     OR pg_catalog.has_any_column_privilege('anon', usage_oid, 'INSERT')
     OR pg_catalog.has_any_column_privilege('anon', usage_oid, 'UPDATE')
     OR pg_catalog.has_any_column_privilege('authenticated', usage_oid, 'SELECT')
     OR pg_catalog.has_any_column_privilege('authenticated', usage_oid, 'INSERT')
     OR pg_catalog.has_any_column_privilege('authenticated', usage_oid, 'UPDATE')
     OR pg_catalog.has_any_column_privilege('anon', usage_oid, 'REFERENCES')
     OR pg_catalog.has_any_column_privilege('authenticated', usage_oid, 'REFERENCES')
     OR pg_catalog.has_any_column_privilege('service_role', usage_oid, 'SELECT')
     OR pg_catalog.has_any_column_privilege('service_role', usage_oid, 'REFERENCES')
     OR pg_catalog.has_any_column_privilege('service_role', usage_oid, 'INSERT')
     OR pg_catalog.has_any_column_privilege('service_role', usage_oid, 'UPDATE') THEN
    RAISE EXCEPTION 'Unexpected effective column-level write privilege remains on ai_usage';
  END IF;
  SELECT pg_catalog.count(*),
         pg_catalog.count(DISTINCT privilege_type)
    INTO usage_acl_count, usage_acl_distinct_count
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND table_name = 'ai_usage'
     AND grantee = 'postgres'
     AND is_grantable = 'YES'
     AND privilege_type IN (
       'DELETE', 'INSERT', 'REFERENCES', 'SELECT',
       'TRIGGER', 'TRUNCATE', 'UPDATE'
     );
  IF usage_acl_count <> 7 OR usage_acl_distinct_count <> 7
     OR EXISTS (
       SELECT 1
         FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND table_name = 'ai_usage'
          AND (
            grantee <> 'postgres'
            OR is_grantable <> 'YES'
            OR privilege_type NOT IN (
              'DELETE', 'INSERT', 'REFERENCES', 'SELECT',
              'TRIGGER', 'TRUNCATE', 'UPDATE'
            )
          )
     )
     OR NOT pg_catalog.has_table_privilege('postgres', usage_oid, 'DELETE')
     OR NOT pg_catalog.has_table_privilege('postgres', usage_oid, 'INSERT')
     OR NOT pg_catalog.has_table_privilege('postgres', usage_oid, 'REFERENCES')
     OR NOT pg_catalog.has_table_privilege('postgres', usage_oid, 'SELECT')
     OR NOT pg_catalog.has_table_privilege('postgres', usage_oid, 'TRIGGER')
     OR NOT pg_catalog.has_table_privilege('postgres', usage_oid, 'TRUNCATE')
     OR NOT pg_catalog.has_table_privilege('postgres', usage_oid, 'UPDATE') THEN
    RAISE EXCEPTION 'ai_usage table ACL must match the postgres-only seven grantable privilege inventory';
  END IF;

  SELECT pg_catalog.count(*),
         pg_catalog.count(DISTINCT (column_name || ':' || privilege_type))
    INTO usage_acl_count, usage_acl_distinct_count
    FROM information_schema.column_privileges
   WHERE table_schema = 'public'
     AND table_name = 'ai_usage'
     AND grantee = 'postgres'
     AND is_grantable = 'YES'
     AND privilege_type IN ('INSERT', 'REFERENCES', 'SELECT', 'UPDATE');
  IF usage_acl_count <> 12 OR usage_acl_distinct_count <> 12
     OR EXISTS (
       SELECT 1
         FROM information_schema.column_privileges
        WHERE table_schema = 'public'
          AND table_name = 'ai_usage'
          AND (
            grantee <> 'postgres'
            OR is_grantable <> 'YES'
            OR column_name NOT IN ('user_id', 'usage_date', 'questions_used')
            OR privilege_type NOT IN ('INSERT', 'REFERENCES', 'SELECT', 'UPDATE')
          )
     )
     OR EXISTS (
       SELECT 1
         FROM (VALUES
           ('user_id'::text), ('usage_date'), ('questions_used')
         ) AS expected_column(column_name)
         CROSS JOIN (VALUES
           ('INSERT'::text), ('REFERENCES'), ('SELECT'), ('UPDATE')
         ) AS expected_privilege(privilege_type)
        WHERE NOT EXISTS (
          SELECT 1
            FROM information_schema.column_privileges
           WHERE table_schema = 'public'
             AND table_name = 'ai_usage'
             AND column_name = expected_column.column_name
             AND grantee = 'postgres'
             AND privilege_type = expected_privilege.privilege_type
             AND is_grantable = 'YES'
        )
     ) THEN
    RAISE EXCEPTION 'ai_usage column ACL must match postgres INSERT/REFERENCES/SELECT/UPDATE grantable on every column';
  END IF;

  IF pg_catalog.has_function_privilege(
       'authenticated',
       'public.record_razorpay_capture(text,text,text,uuid,text,bigint,text)',
       'EXECUTE'
     )
     OR pg_catalog.has_function_privilege(
       'anon',
       'public.record_razorpay_capture(text,text,text,uuid,text,bigint,text)',
       'EXECUTE'
     )
     OR NOT pg_catalog.has_function_privilege(
       'service_role',
       'public.record_razorpay_capture(text,text,text,uuid,text,bigint,text)',
       'EXECUTE'
     )
     OR pg_catalog.has_function_privilege('anon', 'public.consume_ai_question()', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('authenticated', 'public.consume_ai_question()', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('service_role', 'public.consume_ai_question()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected effective EXECUTE privilege remains on subscription functions';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
     WHERE p.oid = 'public.consume_ai_question()'::regprocedure
       AND p.proowner = 'postgres'::regrole::oid
       AND p.prosecdef
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
     WHERE p.oid = 'public.record_razorpay_capture(text,text,text,uuid,text,bigint,text)'::regprocedure
       AND p.proowner = 'postgres'::regrole::oid
       AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'Subscription SECURITY DEFINER functions must be owned by trusted postgres';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_proc AS p
      CROSS JOIN LATERAL pg_catalog.unnest(
        COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
      ) AS item(acl_item)
      CROSS JOIN LATERAL pg_catalog.aclexplode(ARRAY[item.acl_item]) AS acl
     WHERE p.oid IN (
       'public.consume_ai_question()'::regprocedure,
       'public.record_razorpay_capture(text,text,text,uuid,text,bigint,text)'::regprocedure
     )
       AND acl.privilege_type = 'EXECUTE'
       AND acl.grantee <> p.proowner
       AND CASE
         WHEN p.oid = 'public.consume_ai_question()'::regprocedure
           THEN acl.grantee NOT IN (
             'authenticated'::regrole::oid,
             'service_role'::regrole::oid
           )
         ELSE acl.grantee <> 'service_role'::regrole::oid
       END
  ) THEN
    RAISE EXCEPTION 'Unexpected direct EXECUTE grant remains on subscription functions';
  END IF;

  IF NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class AS c WHERE c.oid = payments_oid)
     OR NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class AS c WHERE c.oid = usage_oid)
     OR (SELECT c.relforcerowsecurity FROM pg_catalog.pg_class AS c WHERE c.oid = payments_oid)
     OR (SELECT c.relforcerowsecurity FROM pg_catalog.pg_class AS c WHERE c.oid = usage_oid)
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_policies
          WHERE schemaname = 'public' AND tablename = 'payments') <> 0 THEN
    RAISE EXCEPTION 'RLS must be enabled on payments and it must have no client-accessible policies';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_policies
       WHERE schemaname = 'public' AND tablename = 'ai_usage') <> 0 THEN
    RAISE EXCEPTION 'ai_usage must not have client-accessible RLS policies';
  END IF;
END;
$security_assertions$;

COMMIT;

-- Post-migration verification queries (read only):
-- SELECT user_id, plan, payment_id, updated_at
--   FROM public.user_plans ORDER BY updated_at DESC;
-- SELECT schemaname, tablename, policyname, cmd, roles
--   FROM pg_catalog.pg_policies
--  WHERE schemaname = 'public' AND tablename IN ('user_plans', 'payments', 'ai_usage');
-- SELECT tablename, indexname, indexdef
--   FROM pg_catalog.pg_indexes
--  WHERE schemaname = 'public' AND tablename IN ('user_plans', 'payments', 'ai_usage');
-- SELECT grantee, table_name, privilege_type
--   FROM information_schema.role_table_grants
--  WHERE table_schema = 'public'
--    AND table_name IN ('user_plans', 'payments', 'ai_usage')
--  ORDER BY table_name, grantee, privilege_type;
-- SELECT pg_catalog.has_table_privilege('anon', 'public.user_plans', 'UPDATE') AS anon_can_update_plan,
--        pg_catalog.has_table_privilege('authenticated', 'public.user_plans', 'UPDATE') AS user_can_update_plan,
--        pg_catalog.has_table_privilege('authenticated', 'public.user_plans', 'SELECT') AS user_can_read_plan;
--
-- Rollback: this migration is atomic, but after a successful commit its payment
-- and usage tables may contain records. Do not drop them to roll back. Disable
-- checkout/webhook/quota callers first, then use a separately reviewed rollback
-- that preserves payment history and the current user_plans entitlements.
