-- Supabase Database Schema for Aurora Divine Gold Ledger & Settlement Engine
-- Includes new tables for Tasks and Transactions (Billing)

-- 1. Create User Roles/Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    branch_id TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure newer columns exist if the table already existed with older schema
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users DROP COLUMN IF EXISTS passkey;
ALTER TABLE public.super_admin_ledger ADD COLUMN IF NOT EXISTS impure_gold_change NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.super_admin_ledger ADD COLUMN IF NOT EXISTS calculated_pure_gold NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.refining_transfers ADD COLUMN IF NOT EXISTS calculated_pure_gold NUMERIC(10,3) DEFAULT 0.000;

-- Silver Support Columns
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS pure_silver_out NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS pure_silver_due NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS impure_silver_in NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS impure_silver_out NUMERIC(10,3) DEFAULT 0.000;

ALTER TABLE public.refining_transfers ADD COLUMN IF NOT EXISTS metal TEXT DEFAULT 'Gold';
ALTER TABLE public.refining_transfers ADD COLUMN IF NOT EXISTS impure_silver_sent NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.refining_transfers ADD COLUMN IF NOT EXISTS calculated_pure_silver NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.refining_transfers ADD COLUMN IF NOT EXISTS refined_pure_silver_achieved NUMERIC(10,3) DEFAULT 0.000;

ALTER TABLE public.super_admin_ledger ADD COLUMN IF NOT EXISTS pure_silver_change NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.super_admin_ledger ADD COLUMN IF NOT EXISTS impure_silver_change NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.super_admin_ledger ADD COLUMN IF NOT EXISTS calculated_pure_silver NUMERIC(10,3) DEFAULT 0.000;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS metal TEXT DEFAULT 'Gold';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metal TEXT DEFAULT 'Gold';

-- Seed Initial Users
INSERT INTO public.users (id, name, role, branch_id, email, phone) VALUES
('STAFF-001', 'Marcus Reynolds', 'Staff', 'BR-DELHI', 'k7474740@gmail.com', '+91 98765 43210')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  role = EXCLUDED.role, 
  branch_id = EXCLUDED.branch_id, 
  email = EXCLUDED.email, 
  phone = EXCLUDED.phone;

INSERT INTO public.users (id, name, role, branch_id, email, phone) VALUES
('ADMIN-001', 'Delhi Branch Admin', 'Admin', 'BR-DELHI', 'k9836282432@gmail.com', '+91 98888 77777')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  role = EXCLUDED.role, 
  branch_id = EXCLUDED.branch_id, 
  email = EXCLUDED.email, 
  phone = EXCLUDED.phone;

INSERT INTO public.users (id, name, role, branch_id, email, phone) VALUES
('SUPER-001', 'Chief Super Admin', 'Super Admin', 'HEAD-OFFICE', 'ssrcreations41@gmail.com', '+91 99999 88888')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  role = EXCLUDED.role, 
  branch_id = EXCLUDED.branch_id, 
  email = EXCLUDED.email, 
  phone = EXCLUDED.phone;

INSERT INTO public.users (id, name, role, branch_id, email, phone) VALUES
('COLL-001', 'Vikram Singh', 'Collection Staff', 'BR-DELHI', 'vikram@auroradivine.com', '+91 91234 56789')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  role = EXCLUDED.role, 
  branch_id = EXCLUDED.branch_id, 
  email = EXCLUDED.email, 
  phone = EXCLUDED.phone;

-- 2. Staff/Admin Gold Ledger Table
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    iso_date DATE NOT NULL,
    customer_name TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    pure_gold_out NUMERIC(10,3) DEFAULT 0.000,
    pure_gold_due NUMERIC(10,3) DEFAULT 0.000,
    impure_gold_in NUMERIC(10,3) DEFAULT 0.000,
    impure_gold_out NUMERIC(10,3) DEFAULT 0.000,
    pure_silver_out NUMERIC(10,3) DEFAULT 0.000,
    pure_silver_due NUMERIC(10,3) DEFAULT 0.000,
    impure_silver_in NUMERIC(10,3) DEFAULT 0.000,
    impure_silver_out NUMERIC(10,3) DEFAULT 0.000,
    purity TEXT DEFAULT '',
    cash_received INTEGER DEFAULT 0,
    cash_paid INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    staff_id TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Refining Dispatch Transfers Queue Table (Between Admin and Super Admin)
CREATE TABLE IF NOT EXISTS public.refining_transfers (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    impure_gold_sent NUMERIC(10,3) NOT NULL,
    date_sent DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    calculated_pure_gold NUMERIC(10,3) DEFAULT 0.000,
    refined_pure_achieved NUMERIC(10,3) DEFAULT 0.000,
    metal TEXT NOT NULL DEFAULT 'Gold',
    impure_silver_sent NUMERIC(10,3) DEFAULT 0.000,
    calculated_pure_silver NUMERIC(10,3) DEFAULT 0.000,
    refined_pure_silver_achieved NUMERIC(10,3) DEFAULT 0.000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Super Admin Corporate Ledger Table
CREATE TABLE IF NOT EXISTS public.super_admin_ledger (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    iso_date DATE NOT NULL,
    type TEXT NOT NULL,
    branch_name TEXT,
    pure_gold_change NUMERIC(10,3) DEFAULT 0.000,
    impure_gold_change NUMERIC(10,3) DEFAULT 0.000,
    calculated_pure_gold NUMERIC(10,3) DEFAULT 0.000,
    pure_silver_change NUMERIC(10,3) DEFAULT 0.000,
    impure_silver_change NUMERIC(10,3) DEFAULT 0.000,
    calculated_pure_silver NUMERIC(10,3) DEFAULT 0.000,
    cash_change NUMERIC(15,2) DEFAULT 0.00,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    metal TEXT NOT NULL DEFAULT 'Gold',
    work_type TEXT NOT NULL,
    assigned_to TEXT NOT NULL,
    status TEXT NOT NULL,
    progress_percentage INTEGER DEFAULT 0,
    impure_weight TEXT,
    pure_weight TEXT,
    date_given TEXT NOT NULL,
    iso_date TEXT NOT NULL,
    estimated_completion TEXT NOT NULL,
    notes TEXT,
    brought_by TEXT,
    source TEXT,
    pieces TEXT,
    weight TEXT,
    purity TEXT,
    category TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    settlement_condition TEXT,
    product_type TEXT,
    logo_name TEXT,
    carat TEXT,
    point_suggestion TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Transactions Table (Billing)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    metal TEXT NOT NULL DEFAULT 'Gold',
    type TEXT NOT NULL,
    work_type TEXT NOT NULL,
    amount TEXT NOT NULL,
    date TEXT NOT NULL,
    iso_date TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL,
    impure_weight TEXT,
    pure_weight TEXT,
    purity_percentage TEXT,
    piece_type TEXT,
    points_count INTEGER,
    points_type TEXT,
    carat_marking TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Refinery Session State Table
CREATE TABLE IF NOT EXISTS public.refinery_state (
    id TEXT PRIMARY KEY DEFAULT 'current_session',
    status TEXT NOT NULL DEFAULT 'idle',
    timer_start BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Seed initial row if not exists
INSERT INTO public.refinery_state (id, status, timer_start)
VALUES ('current_session', 'idle', NULL)
ON CONFLICT (id) DO NOTHING;

-- 8. Stock Allocations (Super Admin to Branch)
CREATE TABLE IF NOT EXISTS public.stock_allocations (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    staff_id TEXT,
    metal TEXT DEFAULT 'Gold',
    pure_weight NUMERIC(10,3) DEFAULT 0.000,
    cash_amount NUMERIC(15,2) DEFAULT 0.00,
    allocated_by TEXT NOT NULL,
    date TEXT NOT NULL,
    iso_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Branch Daily Reports (End of Day Submissions)
CREATE TABLE IF NOT EXISTS public.branch_daily_reports (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    date TEXT NOT NULL,
    iso_date DATE NOT NULL,
    
    opening_pure_gold NUMERIC(10,3) DEFAULT 0.000,
    opening_pure_silver NUMERIC(10,3) DEFAULT 0.000,
    opening_cash NUMERIC(15,2) DEFAULT 0.00,
    
    gold_used NUMERIC(10,3) DEFAULT 0.000,
    silver_used NUMERIC(10,3) DEFAULT 0.000,
    cash_used NUMERIC(15,2) DEFAULT 0.00,
    
    cash_received NUMERIC(15,2) DEFAULT 0.00,
    impure_gold_received NUMERIC(10,3) DEFAULT 0.000,
    impure_silver_received NUMERIC(10,3) DEFAULT 0.000,
    
    closing_pure_gold NUMERIC(10,3) DEFAULT 0.000,
    closing_pure_silver NUMERIC(10,3) DEFAULT 0.000,
    closing_cash NUMERIC(15,2) DEFAULT 0.00,
    
    status TEXT DEFAULT 'Submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refining_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refinery_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_daily_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent conflicts when running schema again
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.ledger_entries;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.refining_transfers;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.super_admin_ledger;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.refinery_state;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.stock_allocations;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.branch_daily_reports;

-- Create helper functions for RLS checks (defined as SECURITY DEFINER to prevent recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS text AS $$
  SELECT branch_id FROM public.users WHERE id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER;

-- Refined policies for public.users
CREATE POLICY "Users: SELECT allowed for authenticated" ON public.users 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users: INSERT/UPDATE/DELETE only by Super Admin" ON public.users 
    FOR ALL USING (public.get_my_role() = 'Super Admin') WITH CHECK (public.get_my_role() = 'Super Admin');

-- Refined policies for public.ledger_entries
CREATE POLICY "Ledger Entries: SELECT same branch or SA" ON public.ledger_entries 
    FOR SELECT USING (public.get_my_role() = 'Super Admin' OR staff_id IS NULL OR (SELECT branch_id FROM public.users WHERE id = staff_id) = public.get_my_branch_id());
CREATE POLICY "Ledger Entries: INSERT allowed for authenticated" ON public.ledger_entries 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Ledger Entries: UPDATE allowed for Admin/SA" ON public.ledger_entries 
    FOR UPDATE USING (public.get_my_role() IN ('Admin', 'Super Admin'));
CREATE POLICY "Ledger Entries: DELETE allowed for SA" ON public.ledger_entries 
    FOR DELETE USING (public.get_my_role() = 'Super Admin');

-- Refined policies for public.transactions
CREATE POLICY "Transactions: SELECT same branch or SA" ON public.transactions 
    FOR SELECT USING (public.get_my_role() = 'Super Admin' OR created_by IS NULL OR (SELECT branch_id FROM public.users WHERE id = created_by) = public.get_my_branch_id());
CREATE POLICY "Transactions: INSERT allowed for all authenticated" ON public.transactions 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Transactions: UPDATE allowed for Admin/SA" ON public.transactions 
    FOR UPDATE USING (public.get_my_role() IN ('Admin', 'Super Admin'));
CREATE POLICY "Transactions: DELETE allowed for SA" ON public.transactions 
    FOR DELETE USING (public.get_my_role() = 'Super Admin');

-- Refined policies for public.tasks
CREATE POLICY "Tasks: SELECT same branch or SA" ON public.tasks 
    FOR SELECT USING (public.get_my_role() = 'Super Admin' OR created_by IS NULL OR (SELECT branch_id FROM public.users WHERE id = created_by) = public.get_my_branch_id() OR (SELECT branch_id FROM public.users WHERE id = assigned_to) = public.get_my_branch_id());
CREATE POLICY "Tasks: INSERT allowed for authenticated" ON public.tasks 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tasks: UPDATE allowed for same branch or SA" ON public.tasks 
    FOR UPDATE USING (public.get_my_role() = 'Super Admin' OR (SELECT branch_id FROM public.users WHERE id = created_by) = public.get_my_branch_id() OR (SELECT branch_id FROM public.users WHERE id = assigned_to) = public.get_my_branch_id());
CREATE POLICY "Tasks: DELETE allowed for SA" ON public.tasks 
    FOR DELETE USING (public.get_my_role() = 'Super Admin');

-- Refined policies for public.super_admin_ledger
CREATE POLICY "Super Admin Ledger: restricted to Super Admin" ON public.super_admin_ledger 
    FOR ALL USING (public.get_my_role() = 'Super Admin') WITH CHECK (public.get_my_role() = 'Super Admin');

-- Refined policies for public.stock_allocations
CREATE POLICY "Stock Allocations: SELECT same branch or SA" ON public.stock_allocations 
    FOR SELECT USING (public.get_my_role() = 'Super Admin' OR branch_id = public.get_my_branch_id());
CREATE POLICY "Stock Allocations: INSERT/UPDATE allowed for Admin/SA" ON public.stock_allocations 
    FOR ALL USING (public.get_my_role() IN ('Admin', 'Super Admin')) WITH CHECK (public.get_my_role() IN ('Admin', 'Super Admin'));

-- Refined policies for public.refining_transfers
CREATE POLICY "Refining Transfers: SELECT/INSERT/UPDATE allowed for Admin/SA" ON public.refining_transfers 
    FOR ALL USING (public.get_my_role() IN ('Admin', 'Super Admin')) WITH CHECK (public.get_my_role() IN ('Admin', 'Super Admin'));

-- Refined policies for public.refinery_state
CREATE POLICY "Refinery State: SELECT/INSERT/UPDATE allowed for Admin/SA" ON public.refinery_state 
    FOR ALL USING (public.get_my_role() IN ('Admin', 'Super Admin')) WITH CHECK (public.get_my_role() IN ('Admin', 'Super Admin'));

-- Refined policies for public.branch_daily_reports
CREATE POLICY "Branch Daily Reports: SELECT same branch or SA" ON public.branch_daily_reports 
    FOR SELECT USING (public.get_my_role() = 'Super Admin' OR branch_id = public.get_my_branch_id());
CREATE POLICY "Branch Daily Reports: INSERT/UPDATE same branch or SA" ON public.branch_daily_reports 
    FOR ALL USING (public.get_my_role() = 'Super Admin' OR branch_id = public.get_my_branch_id()) WITH CHECK (public.get_my_role() = 'Super Admin' OR branch_id = public.get_my_branch_id());

-- ============================================================================
-- APP SETTINGS & MESSAGES SCHEMAS & POLICIES (Merged into master)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.app_settings;
CREATE POLICY "App Settings: SELECT allowed for authenticated" ON public.app_settings 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "App Settings: INSERT/UPDATE/DELETE only for SA" ON public.app_settings 
    FOR ALL USING (public.get_my_role() = 'Super Admin') WITH CHECK (public.get_my_role() = 'Super Admin');

-- Add CHECK constraint to prevent out-of-order clearance policy settings
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS check_policy_ordering;
ALTER TABLE public.app_settings ADD CONSTRAINT check_policy_ordering CHECK (
  key != 'customer_behavior_policy' OR (
    (value->>'excellent')::int < (value->>'good')::int AND
    (value->>'good')::int < (value->>'fine')::int AND
    (value->>'fine')::int < (value->>'poor')::int
  )
);

CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    receiver_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'chat',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.messages;
CREATE POLICY "Messages: SELECT allowed for sender/receiver or SA" ON public.messages 
    FOR SELECT USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id OR public.get_my_role() = 'Super Admin');
CREATE POLICY "Messages: INSERT allowed if you are sender" ON public.messages 
    FOR INSERT WITH CHECK (auth.uid()::text = sender_id);
CREATE POLICY "Messages: UPDATE allowed for sender/receiver" ON public.messages 
    FOR UPDATE USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);
CREATE POLICY "Messages: DELETE allowed for sender or SA" ON public.messages 
    FOR DELETE USING (auth.uid()::text = sender_id OR public.get_my_role() = 'Super Admin');


-- ============================================================================
-- DELETION REQUESTS SCHEMA & SECURE POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    requested_by TEXT,
    reason TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.deletion_requests;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.deletion_requests;
DROP POLICY IF EXISTS "Enable update for all" ON public.deletion_requests;
DROP POLICY IF EXISTS "Enable delete for all" ON public.deletion_requests;

CREATE POLICY "Deletion Requests: SELECT allowed for owner or SA" ON public.deletion_requests
    FOR SELECT USING (requested_by = auth.uid()::text OR public.get_my_role() = 'Super Admin');

CREATE POLICY "Deletion Requests: INSERT allowed for authenticated owners" ON public.deletion_requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND requested_by = auth.uid()::text);

CREATE POLICY "Deletion Requests: UPDATE/DELETE restricted to SA" ON public.deletion_requests
    FOR ALL USING (public.get_my_role() = 'Super Admin') WITH CHECK (public.get_my_role() = 'Super Admin');


-- ============================================================================
-- SECURED RPC DATABASE FUNCTIONS (SECURITY DEFINER with checks)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id text)
RETURNS void AS $$
DECLARE
  v_email text;
  v_auth_user_id uuid;
BEGIN
  -- Authorization check
  IF public.get_my_role() != 'Super Admin' THEN
    RAISE EXCEPTION 'Access Denied: Only Super Admin can perform user deletion';
  END IF;

  -- Prevent deleting Super Admins
  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND role = 'Super Admin') THEN
    RAISE EXCEPTION 'Cannot delete a Super Admin account.';
  END IF;

  -- Get user email from public.users
  SELECT email INTO v_email FROM public.users WHERE id = p_user_id;
  
  IF v_email IS NOT NULL THEN
    -- Find auth.users id
    SELECT id INTO v_auth_user_id FROM auth.users WHERE email = v_email;
    
    IF v_auth_user_id IS NOT NULL THEN
      -- Delete auth.identities
      DELETE FROM auth.identities WHERE user_id = v_auth_user_id;
      -- Delete from auth.users (this revokes login access)
      DELETE FROM auth.users WHERE id = v_auth_user_id;
    END IF;
  END IF;

  -- We must unlink the user from ledger_entries to avoid FK constraint violations
  UPDATE public.ledger_entries SET staff_id = NULL WHERE staff_id = p_user_id;

  -- Delete the user from public.users (will cascade to staff_logs if ON DELETE CASCADE, else SET NULL)
  DELETE FROM public.users WHERE id = p_user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.update_user_credentials(
  p_user_id text,
  p_name text,
  p_email text,
  p_passkey text,
  p_role text,
  p_branch_id text
)
RETURNS void AS $$
DECLARE
  v_old_email text;
  v_auth_user_id uuid;
  v_new_prefix text;
  v_numeric_part text;
  v_new_id text;
BEGIN
  -- Authorization check
  IF public.get_my_role() != 'Super Admin' THEN
    RAISE EXCEPTION 'Access Denied: Only Super Admin can modify user credentials';
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

  -- Update public.users details
  UPDATE public.users 
  SET 
    name = p_name, 
    email = p_email, 
    role = p_role, 
    branch_id = p_branch_id
  WHERE id = p_user_id;

  -- Update ID if it has changed
  IF v_new_id != p_user_id THEN
    -- Update manually matched columns
    UPDATE public.branch_daily_reports SET staff_id = v_new_id WHERE staff_id = p_user_id;
    
    -- Update users primary key (cascades to ledger_entries and staff_logs)
    UPDATE public.users SET id = v_new_id WHERE id = p_user_id;
  END IF;

  -- Update auth.users credentials and metadata
  UPDATE auth.users 
  SET 
    email = p_email, 
    encrypted_password = crypt(p_passkey, gen_salt('bf')),
    raw_user_meta_data = jsonb_build_object('name', p_name, 'role', p_role)
  WHERE id = v_auth_user_id;

  -- Update auth.identities
  UPDATE auth.identities 
  SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(p_email::text))
  WHERE user_id = v_auth_user_id AND provider = 'email';
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

