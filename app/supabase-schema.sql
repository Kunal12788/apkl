-- Supabase Database Schema for Aurora Divine Gold Ledger & Settlement Engine

-- 1. Create User Roles/Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- e.g., 'STAFF-001', 'ADMIN-001', 'SUPER-001'
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'Staff', 'Admin', 'Super Admin'
    branch_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Seed Initial Users
INSERT INTO public.users (id, name, role, branch_id) VALUES
('STAFF-001', 'Staff Member One', 'Staff', 'BR-DELHI')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, name, role, branch_id) VALUES
('ADMIN-001', 'Delhi Branch Admin', 'Admin', 'BR-DELHI')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, name, role, branch_id) VALUES
('SUPER-001', 'Chief Super Admin', 'Super Admin', 'HEAD-OFFICE')
ON CONFLICT (id) DO NOTHING;


-- 2. Staff/Admin Gold Ledger Table
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id TEXT PRIMARY KEY, -- e.g. TXN-XXXX
    date TEXT NOT NULL,
    iso_date DATE NOT NULL,
    customer_name TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'Tunch Only', 'Exchange', 'Pending Settlement', 'Pure Gold Sale', 'Refining Dispatch'
    pure_gold_out NUMERIC(10,3) DEFAULT 0.000,
    pure_gold_due NUMERIC(10,3) DEFAULT 0.000,
    impure_gold_in NUMERIC(10,3) DEFAULT 0.000,
    impure_gold_out NUMERIC(10,3) DEFAULT 0.000,
    purity TEXT DEFAULT '',
    cash_received INTEGER DEFAULT 0,
    cash_paid INTEGER DEFAULT 0,
    status TEXT NOT NULL, -- 'Completed', 'Pending Pure', 'Pending Cash', 'No Settlement'
    staff_id TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- 3. Refining Dispatch Transfers Queue Table (Between Admin and Super Admin)
CREATE TABLE IF NOT EXISTS public.refining_transfers (
    id TEXT PRIMARY KEY, -- e.g. TRF-XXX
    branch_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    impure_gold_sent NUMERIC(10,3) NOT NULL,
    date_sent DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Processed'
    refined_pure_achieved NUMERIC(10,3) DEFAULT 0.000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- 4. Super Admin Corporate Ledger Table
CREATE TABLE IF NOT EXISTS public.super_admin_ledger (
    id TEXT PRIMARY KEY, -- e.g. SAL-XXXX
    date TEXT NOT NULL,
    iso_date DATE NOT NULL,
    type TEXT NOT NULL, -- 'Allocation', 'Refining Yield', 'Stock Correction'
    branch_name TEXT,
    pure_gold_change NUMERIC(10,3) DEFAULT 0.000,
    cash_change NUMERIC(15,2) DEFAULT 0.00,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
