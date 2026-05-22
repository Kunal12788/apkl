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
    passkey TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure newer columns exist if the table already existed with older schema
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS passkey TEXT;

-- Seed Initial Users
INSERT INTO public.users (id, name, role, branch_id, email, phone, passkey) VALUES
('STAFF-001', 'Marcus Reynolds', 'Staff', 'BR-DELHI', 'k7474740@gmail.com', '+91 98765 43210', '1234')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  role = EXCLUDED.role, 
  branch_id = EXCLUDED.branch_id, 
  email = EXCLUDED.email, 
  phone = EXCLUDED.phone, 
  passkey = EXCLUDED.passkey;

INSERT INTO public.users (id, name, role, branch_id, email, phone, passkey) VALUES
('ADMIN-001', 'Delhi Branch Admin', 'Admin', 'BR-DELHI', 'k9836282432@gmail.com', '+91 98888 77777', '123')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  role = EXCLUDED.role, 
  branch_id = EXCLUDED.branch_id, 
  email = EXCLUDED.email, 
  phone = EXCLUDED.phone, 
  passkey = EXCLUDED.passkey;

INSERT INTO public.users (id, name, role, branch_id, email, phone, passkey) VALUES
('SUPER-001', 'Chief Super Admin', 'Super Admin', 'HEAD-OFFICE', 'ssrcreations41@gmail.com', '+91 99999 88888', '123')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  role = EXCLUDED.role, 
  branch_id = EXCLUDED.branch_id, 
  email = EXCLUDED.email, 
  phone = EXCLUDED.phone, 
  passkey = EXCLUDED.passkey;

INSERT INTO public.users (id, name, role, branch_id, email, phone, passkey) VALUES
('COLL-001', 'Vikram Singh', 'Collection Staff', 'BR-DELHI', 'vikram@auroradivine.com', '+91 91234 56789', '123')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  role = EXCLUDED.role, 
  branch_id = EXCLUDED.branch_id, 
  email = EXCLUDED.email, 
  phone = EXCLUDED.phone, 
  passkey = EXCLUDED.passkey;

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
    refined_pure_achieved NUMERIC(10,3) DEFAULT 0.000,
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
    cash_change NUMERIC(15,2) DEFAULT 0.00,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_id TEXT NOT NULL,
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

-- Drop existing policies if any to prevent conflicts when running schema again
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.ledger_entries;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.refining_transfers;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.super_admin_ledger;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.transactions;

-- Create policy for all tables to allow only authenticated users
CREATE POLICY "Allow authenticated full access" ON public.users FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access" ON public.ledger_entries FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access" ON public.refining_transfers FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access" ON public.super_admin_ledger FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access" ON public.tasks FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access" ON public.transactions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

