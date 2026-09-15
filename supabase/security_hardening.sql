-- ============================================================================
-- AURORA DIVINE: COMPLETE DATABASE SECURITY HARDENING MIGRATION
-- ============================================================================

-- 1. HARDEN CUSTOMERS TABLE
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- Backfill branch_id from users for existing customers
UPDATE public.customers c
SET branch_id = u.branch_id
FROM public.users u
WHERE c.created_by = u.id AND c.branch_id IS NULL;

-- Drop insecure public policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable update for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.customers;
DROP POLICY IF EXISTS "Customers: SELECT same branch or SA" ON public.customers;
DROP POLICY IF EXISTS "Customers: INSERT allowed for authenticated" ON public.customers;
DROP POLICY IF EXISTS "Customers: UPDATE allowed for same branch or SA" ON public.customers;
DROP POLICY IF EXISTS "Customers: DELETE allowed only for SA" ON public.customers;

-- Create strict policies for customers
CREATE POLICY "Customers: SELECT same branch or SA" ON public.customers
    FOR SELECT USING (
      auth.role() = 'authenticated' AND (
        public.get_my_role() = 'Super Admin' 
        OR branch_id = public.get_my_branch_id() 
        OR (SELECT branch_id FROM public.users WHERE id = created_by) = public.get_my_branch_id()
        OR created_by IS NULL
      )
    );

CREATE POLICY "Customers: INSERT allowed for authenticated" ON public.customers
    FOR INSERT WITH CHECK (
      auth.role() = 'authenticated'
    );

CREATE POLICY "Customers: UPDATE allowed for same branch or SA" ON public.customers
    FOR UPDATE USING (
      auth.role() = 'authenticated' AND (
        public.get_my_role() = 'Super Admin' 
        OR branch_id = public.get_my_branch_id() 
        OR (SELECT branch_id FROM public.users WHERE id = created_by) = public.get_my_branch_id()
      )
    );

CREATE POLICY "Customers: DELETE allowed only for SA" ON public.customers
    FOR DELETE USING (
      public.get_my_role() = 'Super Admin'
    );

-- 2. HARDEN DELETION_REQUESTS TABLE
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.deletion_requests;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.deletion_requests;
DROP POLICY IF EXISTS "Enable update for all" ON public.deletion_requests;
DROP POLICY IF EXISTS "Enable delete for all" ON public.deletion_requests;
DROP POLICY IF EXISTS "Deletion Requests: SELECT authenticated" ON public.deletion_requests;
DROP POLICY IF EXISTS "Deletion Requests: INSERT authenticated" ON public.deletion_requests;
DROP POLICY IF EXISTS "Deletion Requests: UPDATE Admin or SA" ON public.deletion_requests;
DROP POLICY IF EXISTS "Deletion Requests: DELETE SA only" ON public.deletion_requests;

CREATE POLICY "Deletion Requests: SELECT authenticated" ON public.deletion_requests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Deletion Requests: INSERT authenticated" ON public.deletion_requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Deletion Requests: UPDATE Admin or SA" ON public.deletion_requests
    FOR UPDATE USING (public.get_my_role() IN ('Admin', 'Super Admin'));

CREATE POLICY "Deletion Requests: DELETE SA only" ON public.deletion_requests
    FOR DELETE USING (public.get_my_role() = 'Super Admin');

-- 3. HARDEN BRANCHES TABLE
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.branches;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.branches;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.branches;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.branches;
DROP POLICY IF EXISTS "Branches: SELECT authenticated" ON public.branches;
DROP POLICY IF EXISTS "Branches: MODIFY Super Admin only" ON public.branches;

CREATE POLICY "Branches: SELECT authenticated" ON public.branches
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Branches: MODIFY Super Admin only" ON public.branches
    FOR ALL USING (public.get_my_role() = 'Super Admin')
    WITH CHECK (public.get_my_role() = 'Super Admin');

-- 4. HARDEN USER CREDENTIALS & PASSKEYS
-- Create isolated user_secrets table accessible ONLY by Super Admin
CREATE TABLE IF NOT EXISTS public.user_secrets (
    user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    passkey TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User Secrets: Super Admin only" ON public.user_secrets;
CREATE POLICY "User Secrets: Super Admin only" ON public.user_secrets
    FOR ALL USING (public.get_my_role() = 'Super Admin')
    WITH CHECK (public.get_my_role() = 'Super Admin');

-- Migrate existing non-null passkeys from users to user_secrets
INSERT INTO public.user_secrets (user_id, passkey)
SELECT id, passkey FROM public.users WHERE passkey IS NOT NULL AND passkey != ''
ON CONFLICT (user_id) DO UPDATE SET passkey = EXCLUDED.passkey;

-- Clear plaintext passkeys from public.users so regular queries cannot steal them
UPDATE public.users SET passkey = NULL;

-- 5. HARDEN STOCK_ALLOCATIONS TABLE
ALTER TABLE public.stock_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access" ON public.stock_allocations;
DROP POLICY IF EXISTS "Stock Allocations: SELECT same branch or SA" ON public.stock_allocations;
DROP POLICY IF EXISTS "Stock Allocations: INSERT/UPDATE allowed for Admin/SA" ON public.stock_allocations;
DROP POLICY IF EXISTS "Stock Allocations: DELETE allowed for SA" ON public.stock_allocations;

CREATE POLICY "Stock Allocations: SELECT same branch or SA" ON public.stock_allocations
    FOR SELECT USING (
      public.get_my_role() = 'Super Admin' 
      OR branch_id = public.get_my_branch_id()
    );

CREATE POLICY "Stock Allocations: INSERT/UPDATE allowed for Admin/SA" ON public.stock_allocations
    FOR INSERT WITH CHECK (
      public.get_my_role() IN ('Admin', 'Super Admin')
    );

CREATE POLICY "Stock Allocations: UPDATE allowed for Admin/SA" ON public.stock_allocations
    FOR UPDATE USING (
      public.get_my_role() IN ('Admin', 'Super Admin')
    ) WITH CHECK (
      public.get_my_role() IN ('Admin', 'Super Admin')
    );

CREATE POLICY "Stock Allocations: DELETE allowed for SA" ON public.stock_allocations
    FOR DELETE USING (
      public.get_my_role() = 'Super Admin'
    );

-- 6. HARDEN REFINING_TRANSFERS & REFINERY_STATE
ALTER TABLE public.refining_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refinery_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access" ON public.refining_transfers;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.refinery_state;
DROP POLICY IF EXISTS "Refining Transfers: Admin/SA access only" ON public.refining_transfers;
DROP POLICY IF EXISTS "Refinery State: Admin/SA access only" ON public.refinery_state;

CREATE POLICY "Refining Transfers: Admin/SA access only" ON public.refining_transfers
    FOR ALL USING (public.get_my_role() IN ('Admin', 'Super Admin'))
    WITH CHECK (public.get_my_role() IN ('Admin', 'Super Admin'));

CREATE POLICY "Refinery State: Admin/SA access only" ON public.refinery_state
    FOR ALL USING (public.get_my_role() IN ('Admin', 'Super Admin'))
    WITH CHECK (public.get_my_role() IN ('Admin', 'Super Admin'));

-- 7. HARDEN BRANCH_DAILY_REPORTS
ALTER TABLE public.branch_daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access" ON public.branch_daily_reports;
DROP POLICY IF EXISTS "Branch Daily Reports: SELECT same branch or SA" ON public.branch_daily_reports;
DROP POLICY IF EXISTS "Branch Daily Reports: INSERT/UPDATE same branch or SA" ON public.branch_daily_reports;
DROP POLICY IF EXISTS "Branch Daily Reports: DELETE SA only" ON public.branch_daily_reports;

CREATE POLICY "Branch Daily Reports: SELECT same branch or SA" ON public.branch_daily_reports
    FOR SELECT USING (
      public.get_my_role() = 'Super Admin' 
      OR branch_id = public.get_my_branch_id()
    );

CREATE POLICY "Branch Daily Reports: INSERT/UPDATE same branch or SA" ON public.branch_daily_reports
    FOR ALL USING (
      public.get_my_role() = 'Super Admin' 
      OR branch_id = public.get_my_branch_id()
    ) WITH CHECK (
      public.get_my_role() = 'Super Admin' 
      OR branch_id = public.get_my_branch_id()
    );

CREATE POLICY "Branch Daily Reports: DELETE SA only" ON public.branch_daily_reports
    FOR DELETE USING (
      public.get_my_role() = 'Super Admin'
    );

-- 8. HARDEN APP_SETTINGS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access" ON public.app_settings;
DROP POLICY IF EXISTS "App Settings: SELECT authenticated" ON public.app_settings;
DROP POLICY IF EXISTS "App Settings: MODIFY Super Admin only" ON public.app_settings;

CREATE POLICY "App Settings: SELECT authenticated" ON public.app_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "App Settings: MODIFY Super Admin only" ON public.app_settings
    FOR ALL USING (public.get_my_role() = 'Super Admin')
    WITH CHECK (public.get_my_role() = 'Super Admin');

-- 9. HARDEN PAYMENTS & CUSTOMER_ADVANCES
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_advances ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.customer_advances ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- Backfill branch_id
UPDATE public.payments p
SET branch_id = u.branch_id
FROM public.users u
WHERE p.recorded_by = u.id AND p.branch_id IS NULL;

UPDATE public.customer_advances a
SET branch_id = u.branch_id
FROM public.users u
WHERE a.created_by = u.id AND a.branch_id IS NULL;

DROP POLICY IF EXISTS "Allow authenticated full access" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.customer_advances;
DROP POLICY IF EXISTS "Payments: SELECT same branch or SA" ON public.payments;
DROP POLICY IF EXISTS "Payments: INSERT/UPDATE authenticated" ON public.payments;
DROP POLICY IF EXISTS "Customer Advances: SELECT same branch or SA" ON public.customer_advances;
DROP POLICY IF EXISTS "Customer Advances: INSERT/UPDATE authenticated" ON public.customer_advances;

CREATE POLICY "Payments: SELECT same branch or SA" ON public.payments
    FOR SELECT USING (
      public.get_my_role() = 'Super Admin' 
      OR branch_id = public.get_my_branch_id() 
      OR (SELECT branch_id FROM public.users WHERE id = recorded_by) = public.get_my_branch_id()
      OR recorded_by IS NULL
    );

CREATE POLICY "Payments: INSERT/UPDATE authenticated" ON public.payments
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Customer Advances: SELECT same branch or SA" ON public.customer_advances
    FOR SELECT USING (
      public.get_my_role() = 'Super Admin' 
      OR branch_id = public.get_my_branch_id() 
      OR (SELECT branch_id FROM public.users WHERE id = created_by) = public.get_my_branch_id()
      OR created_by IS NULL
    );

CREATE POLICY "Customer Advances: INSERT/UPDATE authenticated" ON public.customer_advances
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 10. UPDATE update_user_credentials TO SYNC user_secrets
CREATE OR REPLACE FUNCTION public.update_user_credentials(
  p_user_id text,
  p_name text,
  p_email text,
  p_passkey text,
  p_role text,
  p_branch_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_email text;
  v_auth_user_id uuid;
  v_new_prefix text;
  v_numeric_part text;
  v_new_id text;
BEGIN
  -- Check permission: only Super Admin can run this
  IF public.get_my_role() != 'Super Admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admin can update user credentials.';
  END IF;

  -- Get old email from public.users
  SELECT email INTO v_old_email FROM public.users WHERE id = p_user_id;
  
  IF v_old_email IS NULL THEN
    RAISE EXCEPTION 'User not found in public.users';
  END IF;

  -- Find the user_id in auth.users by email
  SELECT id INTO v_auth_user_id 
  FROM auth.users 
  WHERE email = v_old_email;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in auth.users for email: %', v_old_email;
  END IF;

  -- Calculate new ID based on role prefix
  IF p_role = 'Admin' THEN
    v_new_prefix := 'ADMIN-';
  ELSIF p_role = 'Collection Staff' THEN
    v_new_prefix := 'COLL-';
  ELSIF p_role = 'Super Admin' THEN
    v_new_prefix := 'SUPER-';
  ELSE
    v_new_prefix := 'STAFF-';
  END IF;

  v_numeric_part := substring(p_user_id from '[0-9]+');
  IF v_numeric_part IS NULL OR v_numeric_part = '' THEN
    v_numeric_part := floor(1000 + random() * 9000)::text;
  END IF;
  
  v_new_id := v_new_prefix || v_numeric_part;

  -- Ensure ID uniqueness
  IF v_new_id != p_user_id AND EXISTS (SELECT 1 FROM public.users WHERE id = v_new_id) THEN
    v_new_id := v_new_prefix || floor(1000 + random() * 9000)::text;
  END IF;

  -- Update public.users details (WITHOUT storing passkey in users)
  UPDATE public.users 
  SET 
    name = p_name, 
    email = p_email, 
    passkey = NULL,
    role = p_role, 
    branch_id = p_branch_id
  WHERE id = p_user_id;

  -- Store / update passkey strictly in user_secrets
  IF p_passkey IS NOT NULL AND p_passkey != '' THEN
    INSERT INTO public.user_secrets (user_id, passkey, updated_at)
    VALUES (p_user_id, p_passkey, NOW())
    ON CONFLICT (user_id) DO UPDATE 
    SET passkey = EXCLUDED.passkey, updated_at = NOW();
  END IF;

  -- Update ID if it has changed
  IF v_new_id != p_user_id THEN
    UPDATE public.branch_daily_reports SET staff_id = v_new_id WHERE staff_id = p_user_id;
    UPDATE public.user_secrets SET user_id = v_new_id WHERE user_id = p_user_id;
    UPDATE public.users SET id = v_new_id WHERE id = p_user_id;
  END IF;

  -- Update auth.users credentials and metadata
  IF p_passkey IS NOT NULL AND p_passkey != '' THEN
    UPDATE auth.users 
    SET 
      email = p_email, 
      encrypted_password = crypt(p_passkey, gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object('name', p_name, 'role', p_role)
    WHERE id = v_auth_user_id;
  ELSE
    UPDATE auth.users 
    SET 
      email = p_email, 
      raw_user_meta_data = jsonb_build_object('name', p_name, 'role', p_role)
    WHERE id = v_auth_user_id;
  END IF;

  -- Update auth.identities
  UPDATE auth.identities 
  SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(p_email::text))
  WHERE user_id = v_auth_user_id AND provider = 'email';
  
END;
$$;
