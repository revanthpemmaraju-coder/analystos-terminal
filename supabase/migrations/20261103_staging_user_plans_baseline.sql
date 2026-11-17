-- Empty staging baseline required by 20261104_razorpay_payment_idempotency.sql.
-- This creates no customer rows and must not be applied to an existing production schema.
BEGIN;

CREATE TABLE public.user_plans (
  id UUID NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
  user_id UUID,
  plan TEXT,
  payment_id TEXT,
  updated_at TIMESTAMPTZ,
  CONSTRAINT user_plans_pkey PRIMARY KEY (id),
  CONSTRAINT user_plans_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_plans_valid_plan_ck
    CHECK (
      user_id IS NULL
      OR (plan IS NOT NULL AND plan IN ('free', 'pro', 'analyst'))
    )
);

ALTER TABLE public.user_plans OWNER TO postgres;
CREATE UNIQUE INDEX user_plans_user_id_unique_idx
  ON public.user_plans (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.user_plans
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_plans TO authenticated, service_role;

CREATE POLICY "own plan" ON public.user_plans
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMIT;
